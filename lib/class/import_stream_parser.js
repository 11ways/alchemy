const libstream = require('stream');

/**
 * The ImportStreamParser class:
 * Handles parsing of Alchemy's binary import stream format.
 * 
 * Stream format:
 * - 0x01 [1-byte size] [model name]: Model header
 * - 0x02 [4-byte size BE] [document data]: Document data
 * - 0xFF [4-byte size BE] [extra data]: Extra import data for current document
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
const ImportStreamParser = Function.inherits('Alchemy.Base', function ImportStreamParser(input, options) {

	// The input stream to parse
	this.input = input;

	// Options
	this.options = options || {};

	// The model resolver function - receives model name, returns Model instance
	// Can throw an error to abort parsing
	this.model_resolver = null;

	// State machine variables
	this.current_type = null;
	this.extra_stream = null;
	this.stopped = false;
	this.paused = false;
	this.buffer = null;
	this.model = null;
	this.value = null;
	this.seen = 0;
	this.left = 0;
	this.size = 0;
	this.doc = null;

	// Track stream end and pending imports
	this.stream_ended = false;
	this.pending_import = false;

	// The pledge that resolves when parsing is complete
	this.pledge = new Pledge();
});

/**
 * Set the model resolver function.
 * Called when a 0x01 model header is encountered.
 * 
 * The resolver receives (model_name, current_model) and should:
 * - Return a Model instance to use for subsequent documents
 * - Throw an error to abort parsing
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {Function}   resolver   (model_name, current_model) => Model
 */
ImportStreamParser.setMethod(function setModelResolver(resolver) {
	this.model_resolver = resolver;
});

/**
 * Start parsing the input stream.
 * Returns a Pledge that resolves when parsing is complete.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @return   {Pledge}
 */
ImportStreamParser.setMethod(function parse() {

	let that = this;

	if (!this.model_resolver) {
		return Pledge.reject(new Error('No model resolver has been set'));
	}

	this.input.on('data', function onData(data) {

		if (that.stopped) {
			return;
		}

		if (that.buffer) {
			that.buffer = Buffer.concat([that.buffer, data]);
		} else {
			that.buffer = data;
		}

		that.handleBuffer();
	});

	this.input.on('end', function onEnd() {
		that.stream_ended = true;

		// Only resolve if we're not in the middle of importing a document
		if (!that.stopped && !that.pending_import) {
			that.pledge.resolve();
		}
	});

	this.input.on('error', function onError(err) {
		that.stopped = true;
		that.pledge.reject(err);
	});

	return this.pledge;
});

/**
 * Handle the current buffer data.
 * Implements the state machine for parsing packet headers.
 *
 * State machine:
 * - current_type = null: waiting for a new packet header
 * - current_type = 0x01/0x02/0xFF: header parsed, processing payload
 *
 * We must NOT set current_type until we have the FULL header,
 * otherwise a TCP chunk boundary could leave us in an invalid state.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
ImportStreamParser.setMethod(function handleBuffer() {

	if (this.paused) {
		return;
	}

	if (!this.current_type) {
		// Need at least 1 byte to peek at the marker type
		if (this.buffer.length < 1) {
			return;
		}

		let marker = this.buffer.readUInt8(0);

		if (marker == 0x01) {
			// Type 0x01: 1-byte marker + 1-byte size = 2 bytes header
			if (this.buffer.length < 2) {
				return; // Wait for more data (don't consume the marker yet)
			}
			this.current_type = marker;
			this.size = this.buffer.readUInt8(1);
			this.buffer = this.buffer.slice(2);
		} else if (marker == 0x02) {
			// Type 0x02: 1-byte marker + 4-byte size = 5 bytes header
			if (this.buffer.length < 5) {
				return; // Wait for more data (don't consume the marker yet)
			}
			this.current_type = marker;
			this.size = this.buffer.readUInt32BE(1);
			this.buffer = this.buffer.slice(5);
		} else if (marker == 0xFF) {
			// Type 0xFF: 1-byte marker + 4-byte size = 5 bytes header
			if (this.buffer.length < 5) {
				return; // Wait for more data (don't consume the marker yet)
			}
			this.current_type = marker;
			this.size = this.buffer.readUInt32BE(1);
			this.buffer = this.buffer.slice(5);
			this.seen = 0;

			if (!this.doc) {
				this.stopped = true;
				this.pledge.reject(new Error('Found extra import data, but no active document'));
			} else {
				this.extra_stream = new libstream.PassThrough();
				this.doc.extraImportFromStream(this.extra_stream);
			}
		} else {
			// Unknown marker - this shouldn't happen in valid data
			this.stopped = true;
			this.pledge.reject(new Error('Unknown marker byte: 0x' + marker.toString(16)));
			return;
		}
	}

	this.handlePayload();
});

/**
 * Handle the payload data after a header has been parsed.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 */
ImportStreamParser.setMethod(function handlePayload() {

	let that = this;

	// Handle extra data streaming (0xFF)
	if (this.current_type == 0xFF) {
		this.left = this.size - this.seen;
		this.value = this.buffer.slice(0, this.left);

		this.seen += this.value.length;

		if (this.value.length == this.buffer.length) {
			this.buffer = null;
		} else if (this.value.length < this.buffer.length) {
			this.buffer = this.buffer.slice(this.left);
		}

		this.extra_stream.write(this.value);

		if (this.value.length == this.left) {
			this.extra_stream.end();
			this.current_type = null;

			if (this.buffer) {
				this.handleBuffer();
			}
		}

		return;
	}

	// Wait for full payload
	if (this.buffer.length >= this.size) {
		this.value = this.buffer.slice(0, this.size);
		this.buffer = this.buffer.slice(this.size);
	} else {
		// Wait for next call
		return;
	}

	// Handle model header (0x01)
	if (this.current_type == 0x01) {
		let model_name = this.value.toString();

		try {
			this.model = this.model_resolver(model_name, this.model);
			this.doc = null;
		} catch (err) {
			this.stopped = true;
			return this.pledge.reject(err);
		}

		if (!this.model) {
			this.stopped = true;
			return this.pledge.reject(new Error('Model resolver returned no model for "' + model_name + '"'));
		}

		this.current_type = null;
		this.size = 0;
	}
	// Handle document data (0x02)
	else if (this.current_type == 0x02) {
		this.doc = this.model.createDocument();
		this.input.pause();
		this.paused = true;
		this.pending_import = true;

		this.doc.importFromBuffer(this.value, this.options).done(function done(err, result) {

			that.pending_import = false;

			if (err) {
				that.stopped = true;
				return that.pledge.reject(err);
			}

			that.current_type = null;
			that.paused = false;

			// Check if there's more data to process
			if (that.buffer && that.buffer.length > 0) {
				that.input.resume();
				that.handleBuffer();
				return;
			}

			// No more data in buffer
			that.input.resume();

			// If the stream has ended and there's no more data, resolve
			if (that.stream_ended && !that.stopped) {
				that.pledge.resolve();
			}
		});

		return;
	}

	// Continue processing remaining buffer
	if (this.buffer && this.buffer.length) {
		this.handleBuffer();
	}
});

/**
 * See if the given object is a stream
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.0.5
 *
 * @return   {boolean}
 */
function isStream(obj) {
	return obj && (typeof obj._read == 'function' || typeof obj._write == 'function') && typeof obj.on === 'function';
};

/**
 * The Linkup class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {string}   type
 */
var Linkup = Blast.Collection.Function.inherits('Informer', function ClientLinkup(client, type, data) {

	var server_object,
	    id;

	if (type && typeof type == 'object' && type.id && data == null) {
		server_object = type;
		id = server_object.id;
		type = server_object.type;
		data = server_object.data;
	} else {
		id = type + '-' + Blast.Classes.Crypto.pseudoHex();
	}

	// The identifier
	this.id = id;

	// The typename of the link
	this.type = type;

	// The initial submitted data
	this.initialData = data;

	// Has this linkup been destroyed?
	this.destroyed = false;

	// Make the linkup store itself
	client.linkups[this.id] = this;

	// The parent server
	this.client = client;

	// Listen for socket disconnection
	this._onClientClose = () => {
		this._markDisconnected();
	};
	client.on('close', this._onClientClose);

	if (server_object) {
		this.submit('ready');
	} else {
		// Establish the link
		client._submit('linkup', {type: type, id: this.id, data: data});

		// The server will send the `connected_to_server` event
		this.on('connected_to_server', () => {
			this.emit('ready');
		});
	}

	this.on('__destroy__', () => {
		this._destroy();
	});
});

/**
 * Add a reference to its scene_id
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Linkup.setProperty(function scene_id() {

	if (Blast.isBrowser) {
		return hawkejs.scene?.scene_id;
	}

	return this.conduit?.scene_id;
});

/**
 * Submit a message to the server on this link
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.10
 *
 * @param    {string}   type
 * @param    {Object}   data
 * @param    {Function} callback
 */
Linkup.setAfterMethod('ready', function submit(type, data, stream, callback) {
	this.client.submit([this.id, type], data, stream, callback);
});

/**
 * Submit a message to the server on this link and return a promise
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.2
 * @version  1.1.2
 *
 * @param    {string}   type
 * @param    {Object}   data
 */
Linkup.setMethod(function demand(type, data, stream) {

	const that = this;

	let pledge = new Classes.Pledge(),
	    args = [type, data];

	if (stream) {
		args.push(stream);
	}

	this.submit(...args, function done(err, result) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(result);
	});

	return pledge;
});

/**
 * Create a stream
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Linkup.setMethod(function createStream() {
	return this.client.createStream();
});

/**
 * Destroy this linkup (and tell the server)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 */
Linkup.setMethod(function destroy() {
	if (this.destroyed) {
		return;
	}

	this.submit('__destroy__');
	this._destroy();
	this.removeAllListeners();
});

/**
 * Mark the linkup as disconnected due to socket close
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Linkup.setMethod(function _markDisconnected() {
	if (this.destroyed) {
		return;
	}

	// Emit the close event so listeners can handle disconnect
	this.emit('close');
});

/**
 * Make sure the linkup is removed
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.4.0
 */
Linkup.setMethod(function _destroy() {
	this.destroyed = true;
	delete this.client.linkups[this.id];

	// Remove the close listener from the client
	if (this._onClientClose) {
		this.client.removeListener('close', this._onClientClose);
		this._onClientClose = null;
	}

	this.emit('destroyed');
});

/**
 * Actually make the socket.io connection,
 * this requires the socket.io js to be loaded
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {string}   address     Address to connect to
 * @param    {Object}   data        Announcement data
 * @param    {Function} callback
 */
var Client = Blast.Collection.Function.inherits('Informer', function ClientSocket() {

	var that = this;

	// Connected is false
	this.connected = false;

	// The packet queue
	this.queue = [];

	// The callbacks
	this.callbacks = {};

	// Established linkups
	this.linkups = {};

	// The client message counter
	this.counter = 0;

	// The server object
	this.server = null;

	// The server stream
	this.serverstream = null;

	// The timesync offset
	this.offset = 0;

	// The connection latency
	this.latency = 0;

	// Enable auto reconnect
	this.reconnect = true;

	// Server-linkup listeners
	this.server_linkup_listeners = {};

	this.emitPacket = function emitPacket(packet) {

		var stream;

		if (packet.stream) {
			stream = packet.stream;
			delete packet.stream;
			that.serverstream.emit('payload', stream, packet);
		} else {
			that.server.emit('payload', packet);
		}
	};
});

/**
 * Get an offset-corrected timestamp
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.1
 * @version  0.2.1
 *
 * @return   {number}
 */
Client.setMethod(function now() {
	return Date.now() + (this.offset || 0);
});

/**
 * Low level socket emit
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Client.setMethod(function _submit() {
	var that = this,
	    args = Array.cast(arguments);

	this.afterOnce('connected', function connected() {
		that.server.emit.apply(that.server, args);
	});
});

/**
 * Submit method
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {string}   type
 * @param    {Object}   data
 * @param    {IOStream} stream
 * @param    {Function} callback
 */
Client.setMethod(function submit(type, data, stream, callback) {

	var packet = {},
	    regular_stream;

	if (isStream(data)) {
		callback = stream;
		stream = data;
		data = undefined;
	} else if (typeof data === 'function') {
		callback = data;
		data = undefined;
	}

	if (!stream || typeof stream == 'function') {
		callback = stream;
		stream = undefined;
	} else if (stream && stream.constructor.name != 'IOStream') {
		// Keep the regular stream
		regular_stream = stream;

		// Create an IOStream
		stream = this.createStream();

		// Pipe the regular stream into the IOStream
		regular_stream.pipe(stream);
	}

	if (Array.isArray(type)) {
		packet.link = type[0];
		packet.type = type[1];
	} else {
		packet.type = type;
	}

	if (data && data.constructor.name == 'IOStream') {
		stream = data;
		packet.noData = true;
	} else {
		packet.data = data;
	}

	packet.id = 'c' + (++this.counter);
	packet.stream = stream;

	if (typeof callback == 'function') {
		this.callbacks[packet.id] = callback;
		packet.respond = true;
	}

	if (this.connected) {
		this.emitPacket(packet);
	} else {
		this.queue.push(packet);
	}
});

/**
 * Create a stream we can send through a websocket connection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Client.setMethod(function createStream() {

	var stream;

	if (Blast.isNode) {
		stream = alchemy.use('socket.io-stream').createStream();
	} else {
		stream = ss.createStream();
	}

	return stream;
});

/**
 * Make the actual connection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.12
 *
 * @param    {Function} callback
 */
Client.setMethod(function connect(address, data, callback) {

	// @TODO: Actual disconnects will cause problems
	// (Though the library reconnects behind the scenes)
	if (this.connected || this.hasBeenSeen('connecting')) {
		this.afterOnce('connected', callback);
		return;
	}

	let that = this,
	    io_client,
	    serverstream,
	    config = {},
	    server;

	if (typeof address == 'function') {
		callback = address;
		data = {};
		address = null;
	} else if (typeof data == 'function') {
		callback = data;
		data = {};
	}

	if (!data || typeof data != 'object') {
		data = {};
	}

	if (typeof io != 'undefined') {
		io_client = io;
	} else if (typeof alchemy?.use == 'function') {
		io_client = alchemy.use('socket.io-client');
	} else {
		return callback(new Error('Could not find socket.io client library'));
	}

	// The address to connect to
	this.address = address;

	if (Blast.isNode) {
		data.connection_type = 'node';
		data.discovery = alchemy.discovery_id;
	} else {
		data.connection_type = 'browser';
		data.scene = hawkejs.scene.sceneId;
		data.last_update = alchemy.last_update;
	}

	if (!this.reconnect) {
		config.reconnection = false;
	}

	if (Blast.isNode) {
		let msgpack_parser = alchemy.use('socket.io-msgpack-parser');

		if (msgpack_parser) {
			config.parser = msgpack_parser;
		}
	}

	// Create the connection to the server
	if (address) {
		server = io_client(address, config);
	} else {
		server = io_client(config);
	}

	if (Blast.isNode) {
		serverstream = alchemy.use('socket.io-stream')(server);
	} else {
		serverstream = ss(server);
	}

	this.server = server;
	this.serverstream = serverstream;

	// Announce ourselves when we've connected
	server.on('connect', function onConnect() {
		server.emit('announce', data);
	});

	// Emit the close event once we get disconnected from the server
	server.on('disconnect', function closed() {
		that.connected = false;
		that.emit('close');
	});

	// Listen to timesync commands
	server.on('timesync', function gotTimesync(data) {

		// When offset is not defined,
		// the server is actually requesting our timestamp
		if (data.offset == null) {
			data.client_time = Date.now();
			server.emit('timesync', data);
			return;
		}

		// If the offset property is set,
		// the timesync procedure has finished

		// Set the values in this object
		that.offset = data.offset || 0;
		that.latency = data.latency || 0;

		// Emit it as an event, too
		that.emit('timesynced', that.offset, that.latency);
	});

	// Listen for the ready event
	server.on('ready', function onReady() {

		that.connected = true;

		if (callback) {
			callback();
		}

		that.emit('connected');

		// Emit all the queued packets
		that.queue.forEach(that.emitPacket);

		// Request a timesync
		that.server.emit('timesync', {start: Date.now()});

		// Reset the queue
		that.queue.length = 0;
	});

	server.on('error', function(err) {
		console.log('Socket error:', err);
	});

	// Listen for cookies
	server.on('alchemy-set-cookie', function setCookie(data) {
		if (Blast.isNode) {
			// @TODO: set node cookie?
		} else {
			hawkejs.scene.cookie(data.name, data.value, data.options);
		}
	});

	// Listen for server initiated linkups
	server.on('linkup', function gotLinkup(config) {

		var linkup = new Linkup(that, config),
		    i;

		// Look through the server-linkup callbacks
		if (that.server_linkup_listeners[config.type]) {
			for (i = 0; i < that.server_linkup_listeners[config.type].length; i++) {
				that.server_linkup_listeners[config.type][i].call(that, linkup, config.data);
			}
		}

		// Emit it on the client itself
		that.emit(linkup.type, linkup, null);
	});

	// Listen for payloads
	server.on('payload', onPacket);

	// Listen for payloads with streams
	serverstream.on('payload', function onPayload(stream, packet) {
		packet.stream = stream;
		onPacket(packet);
	});

	// Listen for responses with streams
	serverstream.on('response', function onStreamingResponse(stream, packet) {
		packet.stream = stream;
		onResponse(packet);
	});

	// Listen for responses
	server.on('response', onResponse);

	// The function that handles responses
	function onResponse(packet) {

		if (typeof that.callbacks[packet.respond_to] === 'function') {

			if (packet.err && typeof packet.err == 'object') {
				try {
					packet.err = JSON.undry(packet.err);
				} catch (err) {
					console.log('Error undrying error:', err, packet);
				}
			}

			try {
				if (packet.data && typeof packet.data == 'object') {
					packet.data = JSON.undry(packet.data);
				}
			} catch (err) {
				console.log('ERROR UNDRYING PACKET:', err, packet);
				return;
			}

			if (packet.noData) {
				that.callbacks[packet.respond_to](packet.err, packet.stream);
			} else if (packet.stream) {
				that.callbacks[packet.respond_to](packet.err, packet.data, packet.stream);
			} else {
				that.callbacks[packet.respond_to](packet.err, packet.data);
			}
		}

		delete that.callbacks[packet.respond_to];
	}

	// The function that handles packets
	function onPacket(packet) {

		var respond;

		try {
			if (packet.data && typeof packet.data == 'object') {
				packet.data = JSON.undry(packet.data);
			}
		} catch (err) {
			console.log('ERROR UNDRYING PACKET:', err, packet);
			return;
		}

		if (packet.respond) {
			respond = function respond(err, data) {
				var responsePacket = {};

				responsePacket.err = err;
				responsePacket.respond_to = packet.id;
				responsePacket.data = data;

				server.emit('response', responsePacket);
			};
		}

		// See if this is for a specific linkup
		if (packet.link) {
			if (that.linkups[packet.link]) {
				if (packet.stream) {
					that.linkups[packet.link].emit(packet.type, packet.data, packet.stream, respond, null);
				} else {
					that.linkups[packet.link].emit(packet.type, packet.data, respond, null);
				}
			}

			return;
		}

		if (packet.stream) {
			that.emit(packet.type, packet.data, packet.stream, respond, null);
		} else {
			that.emit(packet.type, packet.data, respond, null);
		}
	}
});

/**
 * Create a namespace and inform the server
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {string}   type    The typename of link to create
 * @param    {Object}   data    The initial data to submit
 * @param    {Function} cb      Called when link isready
 *
 * @return   {Linkup}
 */
Client.setMethod(function linkup(type, data, cb) {

	if (typeof data == 'function') {
		cb = data;
		data = {};
	}

	let link = new Linkup(this, type, data);

	if (cb) {
		link.once('ready', function whenReady() {
			cb.call(link, link);
		});
	}

	return link;
});

/**
 * Listen for specific server-initiated linkups
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {string}   type    The typename of link to listen to
 * @param    {Function} callback
 */
Client.setMethod(function onLinkup(type, callback) {

	if (this.server_linkup_listeners[type] == null) {
		this.server_linkup_listeners[type] = [];
	}

	this.server_linkup_listeners[type].push(callback);
});
var clients   = alchemy.shared('Socket.clients'),
    types     = alchemy.shared('Socket.types'),
    iostream  = alchemy.use('socket.io-stream'),
    yenc      = alchemy.use('yenc-stream'),
    path      = alchemy.use('path'),
    fs        = alchemy.use('fs');

/**
 * The Socket Client
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.create(function SocketClient() {

	this.title = 'General';

	/**
	 * Set the title properties
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}   parent   The parent class
	 * @param    {Function}   child    The (extended) child class
	 */
	this.__extended__ = function __extended__(parent, child) {

		// Extract the name
		var name     = child.name.replace(/SocketClient$/, ''),
		    typeName = name.underscore(),
		    title    = name.titleize();

		child.prototype.typeName = typeName;

		// Do not let the child inherit the extendonly setting
		if (!child.prototype.hasOwnProperty('title')) {
			child.prototype.title = title;
		}

		types[typeName] = child;
	};

	/**
	 * Initiate this socket client
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Socket}   socket
	 */
	this.preInit = function preInit(socket) {

		var that = this;

		// The connection id
		this.id = socket.id;

		// Store it in the clients object
		clients[this.id] = this;

		// Store the socket
		this.socket = socket;

		// Get the connecting address
		this.address = socket.handshake.address;

		// The amount of submissions
		this.counter = 0;

		// Collection of callbacks
		this.callbacks = {};

		// Listen to payloads from the client
		this.socket.on('payload', function(packet) {

			var respond;

			if (packet.respond) {
				respond = function respondToPayload(data) {
					
					var responsePacket = {};

					responsePacket.respond_to = packet.id;
					responsePacket.data = data;

					that.socket.emit('response', responsePacket);
				};
			}

			that.emit(packet.type, packet.data, respond);
		});

		// Listen to responses
		this.socket.on('response', function(packet) {
			if (typeof that.callbacks[packet.respond_to] === 'function') {
				that.callbacks[packet.respond_to](packet.data);
			}

			delete that.callbacks[packet.respond_to];
		});

		/**
		 * Listen to fileTransfers,
		 * these will send a yenc-encoded stream
		 *
		 * @author   Jelle De Loecker   <jelle@codedor.be>
		 * @since    0.0.1
		 * @version  0.0.1
		 */
		iostream(this.socket).on('fileTransfer', function(stream, packet) {

			var respond;

			if (packet.respond) {
				respond = function respondToFileTransfer(data) {
					
					var responsePacket = {};

					responsePacket.respond_to = packet.id;
					responsePacket.data = data;

					that.socket.emit('response', responsePacket);
				};
			}

			// Emit the yenc-decoded stream
			that.emit('fileTransfer', stream.pipe(yenc.decodeStream()), packet, respond);
		});

		// Tell the client we're ready
		this.socket.emit('ready');

		// Emit an alchemy event
		alchemy.emit('io.client', this);
	};

	/**
	 * Submit a message to the client
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   type
	 * @param    {Object}   data
	 * @param    {Function} callback
	 */
	this.submit = function submit(type, data, callback) {

		var packet = {};

		if (typeof data === 'undefined') {
			data = type;
			type = 'message';
		}

		packet.type = type;
		packet.data = data;
		packet.id   = 's' + (++this.counter);

		if (typeof callback == 'function') {
			this.callbacks[packet.id] = callback;
			packet.respond = true;
		}

		this.socket.emit('payload', packet);
	};

	/**
	 * Send a file to the client
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}   filepath
	 * @param    {Function} callback
	 */
	this.sendFile = function sendFile(filepath, data, callback) {

		// Create the stream
		var stream  = iostream.createStream(),
		    id      = 's' + (++this.counter),
		    respond = false,
		    packet;

		if (typeof data == 'function') {
			callback = data;
			data = undefined;
		}

		if (typeof callback === 'function') {
			this.callbacks[id] = callback;
			respond = true;
		}

		packet = {
			id       : id,
			data     : data,
			path     : filepath,
			respond  : respond,
			basename : path.basename(filepath)
		};

		// Send the stream to the server
		iostream(this.socket).emit('fileTransfer', stream, packet);

		// Pipe content into the stream
		fs.createReadStream(filepath).pipe(yenc.encodeStream()).pipe(stream);
	};

});

types.general = alchemy.classes.SocketClient;
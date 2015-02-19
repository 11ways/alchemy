var types     = alchemy.shared('Socket.types'),
    iostream  = alchemy.use('socket.io-stream'),
    yenc      = alchemy.use('yenc-stream'),
    path      = alchemy.use('path'),
    fs        = alchemy.use('fs');

/**
 * The "socket" stage:
 * 
 * Create the socket.io listener
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.1.0
 * @version       1.0.0
 */
alchemy.sputnik.defineStage('socket', function socketStage () {

	var io = alchemy.use('socket.io');

	// Create the Socket.io listener
	alchemy.io = io.listen(alchemy.server);

	// Don't output too much socket.io debug info
	alchemy.io.set('log level', 1);

	/**
	 * Handle connections
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 */
	alchemy.io.sockets.on('connection', function onConnect(socket){

		var soconduit = new alchemy.classes.SocketConduit(socket);
	});
});

/**
 * Connect to another alchemy instance
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.1.0
 * @version       0.1.0
 */
alchemy.callServer = function callServer(address, data, callback) {

	var io           = alchemy.use('socket.io-client'),
	    socket       = io.connect(address, {reconnect: true}),
	    EventEmitter = require('events').EventEmitter,
	    server       = new EventEmitter(),
	    connected    = false,
	    queue        = [],
	    callbacks    = {},
	    clientcount  = 0,
	    emitPacket;

	if (typeof data === 'function') {
		callback = data;
		data = {};
	}

	if (!data || typeof data !== 'object') {
		data = {};
	}

	/**
	 * Emit a packet to the server
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.0.1
	 * @version   0.0.1
	 *
	 * @param     {Object}   packet
	 */
	emitPacket = function emitPacket(packet) {
		socket.emit('payload', packet);
	};

	/**
	 * Announce ourselves once the connection is made
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	socket.once('connect', function(){

		if (!data.type) {
			data.type = 'alchemy';
		}

		socket.emit('announce', data);
	});

	/**
	 * Wait for the server tells us we're ready
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	socket.once('ready', function() {
		connected = true;

		if (callback) {
			callback(server);
		}

		// Emit all the queued packets
		queue.forEach(emitPacket);

		queue.length = 0;
	});

	/**
	 * Listen for payload messages
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	socket.on('payload', function(packet) {

		var respond;

		if (packet.respond) {
			respond = function respondToPayload(data) {
				
				var responsePacket = {};

				responsePacket.respond_to = packet.id;
				responsePacket.data = data;

				socket.emit('response', responsePacket);
			};
		}

		server.emit(packet.type, packet.data, respond);
	});

	/**
	 * Listen for response messages
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	socket.on('response', function(packet) {

		if (typeof callbacks[packet.respond_to] === 'function') {
			callbacks[packet.respond_to](packet.data);
		}

		delete callbacks[packet.respond_to];
	});

	/**
	 * Listen to fileTransfers,
	 * these will send a yenc-encoded stream
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	iostream(socket).on('fileTransfer', function(stream, packet) {

		var decodeStream = stream.pipe(yenc.decodeStream()),
		    respond;

		if (packet.respond) {
			respond = function respondToFileTransfer(data) {
				
				var responsePacket = {};

				responsePacket.respond_to = packet.id;
				responsePacket.data = data;

				socket.emit('response', responsePacket);
			};
		}

		// Emit the decoded yenc stream
		server.emit('fileTransfer', decodeStream, packet, respond);
	});

	/**
	 * Submit a message to the server
	 *
	 * @author    Jelle De Loecker   <jelle@codedor.be>
	 * @since     0.0.1
	 * @version   0.0.1
	 *
	 * @param    {String}   type
	 * @param    {Object}   data
	 * @param    {Function} callback
	 */
	server.submit = function submit(type, data, callback) {

		var packet = {};

		if (typeof data === 'undefined') {
			data = type;
			type = 'message';
		}

		packet.type = type;
		packet.data = data;
		packet.id   = 'c' + (++clientcount);

		if (typeof callback == 'function') {
			callbacks[packet.id] = callback;
			packet.respond = true;
		}

		if (connected) {
			emitPacket(packet);
		} else {
			queue.push(packet);
		}
	};

	/**
	 * Send a yenc-encoded file
	 */
	server.sendFile = function sendFile(filepath, data, callback) {

		// Create the stream
		var stream  = iostream.createStream(),
		    id      = 'c' + (++clientcount),
		    respond = false,
		    packet;

		if (typeof callback === 'function') {
			callbacks[id] = callback;
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
		iostream(socket).emit('fileTransfer', stream, packet);

		// Pipe content into the stream
		fs.createReadStream(filepath).pipe(yenc.encodeStream()).pipe(stream);
	};

	return server;
};
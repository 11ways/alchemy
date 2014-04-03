var types     = alchemy.shared('Socket.types'),
    iostream  = alchemy.use('socket.io-stream'),
    yenc      = alchemy.use('yenc-stream'),
    fs        = alchemy.use('fs');

/**
 * The "socket" stage:
 * 
 * Create the socket.io listener
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
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
	 * @version  0.0.1
	 */
	alchemy.io.sockets.on('connection', function(socket){

		// Wait for the client to announce itself
		socket.once('announce', function(packet) {

			var type = packet.type;

			// If the type does not exist, fallback to the general client
			if (!types[type]) {
				type = 'general';
			}

			// Create the appropriate client type
			new types[type](socket);
		});
	});
});

/**
 * Connect to another alchemy instance
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.callServer = function callServer(address, callback) {

	var io           = alchemy.use('socket.io-client'),
	    socket       = io.connect(address, {reconnect: true}),
	    EventEmitter = require('events').EventEmitter,
	    server       = new EventEmitter(),
	    connected    = false,
	    queue        = [],
	    callbacks    = {},
	    clientcount  = 0,
	    emitPacket;

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

	// Announce ourselves when we've connected
	socket.once('connect', function(){
		socket.emit('announce', {type: 'alchemy'});
	});

	// Listen for the ready event
	socket.once('ready', function() {
		connected = true;

		if (callback) {
			callback(server);
		}

		// Emit all the queued packets
		queue.forEach(emitPacket);

		queue.length = 0;
	});

	// Listen for payloads
	socket.on('payload', function(packet) {

		var respond;

		if (packet.respond) {
			respond = function(data) {
				
				var responsePacket = {};

				responsePacket.respond_to = packet.id;
				responsePacket.data = data;

				socket.emit('response', responsePacket);
			};
		}

		server.emit(packet.type, packet.data, respond);
	});

	// Listen for responses
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

		var output = fs.createWriteStream('/tmp/receivedc');

		// If the client needs a response, listen to the end of the output stream
		if (packet.respond) {
			output.on('finish', function() {
				// Send a response to the client
				socket.emit('response', {respond_to: packet.id});
			});
		}

		// Start streaming the file
		stream.pipe(yenc.decodeStream()).pipe(output);
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
	server.sendFile = function sendFile(path, callback) {

		// Create the stream
		var stream  = iostream.createStream(),
		    id      = 'c' + (++clientcount),
		    respond = false;

		if (typeof callback === 'function') {
			callbacks[id] = callback;
			respond = true;
		}

		// Send the stream to the server
		iostream(socket).emit('fileTransfer', stream, {path: path, id: id, respond: respond});

		// Pipe content into the stream
		fs.createReadStream(path).pipe(yenc.encodeStream()).pipe(stream);
	};

	return server;
};
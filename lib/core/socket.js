var types = alchemy.shared('Socket.types');

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

};
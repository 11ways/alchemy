/**
 * The global client-side alchemy object
 *
 * @type   {Object}
 */
window.alchemy = {};

(function() {

var connecting  = false,
    connected   = false,
    clientcount = 0,
    queue       = [],
    callbacks   = {},
    events      = {},
    makeConnection,
    emitPacket;

alchemy.server = false;

/**
 * Actually make the socket.io connection,
 * this requires the socket.io js to be loaded
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.0.1
 * @version   0.0.1
 */
makeConnection = function makeConnection(callback) {

	// Create the connection to the server
	var server = io.connect();

	// Announce ourselves when we've connected
	server.once('connect', function(){
		server.emit('announce', {type: 'browser'});
	});

	// Listen for the ready event
	server.once('ready', function() {
		connected = true;

		if (callback) {
			callback();
		}

		// Emit all the queued packets
		queue.forEach(emitPacket);

		queue.length = 0;
	});

	// Listen for payloads
	server.on('payload', function(packet) {

		var respond;

		if (!events[packet.type]) {
			return;
		}

		if (packet.respond) {
			respond = function(data) {
				
				var responsePacket = {};

				responsePacket.respond_to = packet.id;
				responsePacket.data = data;

				alchemy.server.emit('response', responsePacket);
			};
		}

		events[packet.type].forEach(function(fnc) {
			fnc(packet.data, respond);
		});
	});

	// Listen for responses
	server.on('response', function(packet) {

		if (typeof callbacks[packet.respond_to] === 'function') {
			callbacks[packet.respond_to](packet.data);
		}

		delete callbacks[packet.respond_to];
	});

	alchemy.server = server;
};

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
	alchemy.server.emit('payload', packet);
};

/**
 * Create a socket.io connection to the server
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.0.1
 * @version   0.0.1
 *
 * @param     {Function}   callback
 */
alchemy.connect = function connect(callback) {

	var ioscript;

	if (typeof window.io === 'undefined') {

		$.getScript('/socket.io/socket.io.js', function(script, textStatus, jqXHR) {
			makeConnection(callback);
		});
	} else {
		makeConnection(callback);
	}

};

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
alchemy.submit = function submit(type, data, callback) {

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
 * Listen for server messages
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.0.1
 * @version   0.0.1
 *
 * @param    {String}   type
 * @param    {Function} callback
 */
alchemy.listen = alchemy.on = function listen(type, callback) {

	if (!events[type]) {
		events[type] = [];
	}

	events[type].push(callback);
};

}());
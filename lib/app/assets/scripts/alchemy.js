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
    linkups     = {},
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

	// Create the sceneid
	hawkejs.scene.data();

	// var streams;

	// 		hawkejs.require('socket.io-stream', function() {
	// 			streams = ss(socket);

	// 			socket.emit('test');

	// 			streams.on('file', function(stream) {
	// 				console.log('Got a file stream', stream);
	// 			})

	// 			var rstream = ss.createStream();

	// 		});

	// Announce ourselves when we've connected
	server.on('connect', function onConnect() {
		server.emit('announce', {type: 'browser', scene: hawkejs.scene.sceneId});
	});

	// Listen for the ready event
	server.on('ready', function() {
		connected = true;

		if (callback) {
			callback();
		}

		// Emit all the queued packets
		queue.forEach(emitPacket);

		queue.length = 0;
	});

	server.on('error', function(err) {
		console.log('Socket error:', err);
	})

	// Listen for cookies
	server.on('alchemy-set-cookie', function setCookie(data) {
		hawkejs.scene.cookie(data.name, data.value, data.options);
	});

	// Listen for payloads
	server.on('payload', function onPayload(packet) {

		var respond;

		if (!packet.link && !events[packet.type]) {
			return;
		}

		if (packet.respond) {
			respond = function respond(err, data) {
				
				var responsePacket = {};

				responsePacket.err = err;
				responsePacket.respond_to = packet.id;
				responsePacket.data = data;

				alchemy.server.emit('response', responsePacket);
			};
		}

		// See if this is for a specific linkup
		if (packet.link) {

			if (linkups[packet.link]) {
				linkups[packet.link].emit(packet.type, packet.data, respond, null);
			}

			return;
		}

		events[packet.type].forEach(function(fnc) {
			fnc(packet.data, respond);
		});
	});

	// Listen for responses
	server.on('response', function(packet) {

		if (typeof callbacks[packet.respond_to] === 'function') {
			callbacks[packet.respond_to](packet.err, packet.data);
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
 * @version   1.0.0
 *
 * @param     {Function}   callback
 */
alchemy.connect = function connect(callback) {

	var ioscript;

	if (typeof window.io === 'undefined') {
		hawkejs.require('/socket.io/socket.io.js', function() {
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

	if (Array.isArray(type)) {
		packet.link = type[0];
		packet.type = type[1];
	} else {
		packet.type = type;
	}

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
 * Create a namespace and inform the server
 *
 * @author    Jelle De Loecker   <jelle@kipdola.be>
 * @since     1.0.0
 * @version   1.0.0
 *
 * @param    {String}   name
 */
alchemy.linkup = function linkup(type) {
	return new Linkup(type);
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

/**
 * The Linkup class
 *
 * @author    Jelle De Loecker   <jelle@kipdola.be>
 * @since     1.0.0
 * @version   1.0.0
 *
 * @param    {String}   name
 */
var Linkup = __Protoblast.Collection.Function.inherits('Informer', function Linkup(name) {

	this.type = name;
	this.id = name + '-' + __Protoblast.Classes.Crypto.pseudoHex();

	// Make the linkup store itself
	linkups[this.id] = this;

	// Establish the link
	alchemy.server.emit('linkup', {type: name, id: this.id});
});

/**
 * Submit a message to the server on this link
 *
 * @author    Jelle De Loecker   <jelle@kipdola.be>
 * @since     1.0.0
 * @version   1.0.0
 *
 * @param    {String}   type
 * @param    {Object}   data
 * @param    {Function} callback
 */
Linkup.setMethod(function submit(type, data, callback) {
	alchemy.submit([this.id, type], data, callback);
});

// Make the connection
alchemy.connect();

}());
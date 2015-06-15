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
	var server = io.connect(),
	    serverstream = ss(server);

	// Create the sceneid
	hawkejs.scene.data();

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
	});

	// Listen for cookies
	server.on('alchemy-set-cookie', function setCookie(data) {
		hawkejs.scene.cookie(data.name, data.value, data.options);
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

		if (typeof callbacks[packet.respond_to] === 'function') {

			if (packet.noData) {
				callbacks[packet.respond_to](packet.err, packet.stream);
			} else if (packet.stream) {
				callbacks[packet.respond_to](packet.err, packet.data, packet.stream);
			} else {
				callbacks[packet.respond_to](packet.err, packet.data);
			}
		}

		delete callbacks[packet.respond_to];
	}

	// The function that handles packets
	function onPacket(packet) {

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
				if (packet.stream) {
					linkups[packet.link].emit(packet.type, packet.data, packet.stream, respond, null);
				} else {
					linkups[packet.link].emit(packet.type, packet.data, respond, null);
				}
			}

			return;
		}

		events[packet.type].forEach(function(fnc) {
			if (packet.stream) {
				fnc(packet.data, packet.stream, respond);
			} else {
				fnc(packet.data, respond);
			}
		});
	}

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
		hawkejs.require(['/socket.io/socket.io.js', 'socket.io-stream'], function() {
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
 * @param    {String}   type    The typename of link to create
 * @param    {Object}   data    The initial data to submit
 *
 * @return   {Linkup}
 */
alchemy.linkup = function linkup(type, data) {
	return new Linkup(type, data);
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
 * @param    {String}   type
 */
var Linkup = __Protoblast.Collection.Function.inherits('Informer', function Linkup(type, data) {

	// The identifier
	this.id = type + '-' + __Protoblast.Classes.Crypto.pseudoHex();

	// The typename of the link
	this.type = type;

	// The initial submitted data
	this.initialData = data;

	// Make the linkup store itself
	linkups[this.id] = this;

	// Establish the link
	alchemy.server.emit('linkup', {type: type, id: this.id, data: data});
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
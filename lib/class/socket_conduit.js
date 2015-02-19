var iostream = alchemy.use('socket.io-stream');

/**
 * The Socket Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 */
var SocketConduit = Function.inherits('Conduit', function SocketConduit(socket) {

	var that = this;

	// Indicate this is a websocket
	this.websocket = socket;
	this.socket = socket;

	// Store the headers
	this.headers = socket.handshake.headers;

	// Cookies to send to the client
	this.newCookies = {};
	this.newCookieHeader = [];

	// The amount of submissions
	this.counter = 0;

	// Collection of callbacks
	this.callbacks = {};

	// Create a stream instance
	this.stream = iostream(socket);

	// Linkup storage
	this.linkups = {};

	this.parseRequest();

	// Listen for announcements
	socket.on('announce', function onAnnounce(data) {
		that.onAnnounce(data);
	});

	// Listen for payloads
	socket.on('payload', function onPayload(packet) {
		that.onPayload(packet);
	});

	// Listen for responses
	socket.on('response', function onResponse(packet) {
		that.onResponse(packet);
	});

	// Listen for linkups
	socket.on('linkup', function onLinkup(packet) {
		that.onLinkup(packet);
	});
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
SocketConduit.setMethod(function parseRequest() {
	this.parseShortcuts();
	this.parseLanguages();
});

/**
 * Handle a client announcement
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   data
 */
SocketConduit.setMethod(function onAnnounce(data) {

	var connections;

	// Store the scene information
	this.type = data.type;
	this.sceneId = data.sceneId;

	// Get the user's conduit connections
	connections = this.session('connections');

	if (!connections) {
		connections = {};
		this.session('connections', connections);
	}

	// Store this conduit under the scene id
	connections[data.sceneId] = this;

	// Tell the client we're ready
	this.websocket.emit('ready');
});

/**
 * Handle a linkup
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   packet
 */
SocketConduit.setMethod(function onLinkup(packet) {

	var id = packet.id,
	    type = packet.type,
	    linkup;

	// See if any socket routes have been set
	if (Router.linkupRoutes[packet.type]) {
		fnc = Router.linkupRoutes[packet.type];

		// Create the new linkup instance
		linkup = new Linkup(this, type, id);

		if (typeof fnc === 'function') {
			fnc.call(this, this, linkup);
		} else if (typeof fnc === 'string') { // Strings like 'StaticController#index'

			split = fnc.split('#');
			controller = split[0];
			action = split[1];

			instance = Controller.get(controller, this);
			instance.packetType = packet.type;
			instance.doAction(action, [this, linkup]);
		}
	}

	// Emit it on the socket itself
	this.emit(packet.type, linkup, null);
});

/**
 * Handle a client packet
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   packet
 */
SocketConduit.setMethod(function onPayload(packet) {

	var that = this,
	    controller,
	    instance,
	    respond,
	    action,
	    split,
	    fnc;

	if (packet.respond) {
		respond = function respondToPayload(err, data) {

			var responsePacket = {};

			responsePacket.err = err;
			responsePacket.respond_to = packet.id;
			responsePacket.data = data;

			that.socket.emit('response', responsePacket);
		};
	}

	// See if this is for a specific linkup
	if (packet.link) {

		if (this.linkups[packet.link]) {
			this.linkups[packet.link].emit(packet.type, packet.data, respond, null);
		}

		return;
	}

	// See if any socket routes have been set
	if (Router.socketRoutes[packet.type]) {
		fnc = Router.socketRoutes[packet.type];

		if (typeof fnc === 'function') {
			fnc.call(this, this, packet.data, respond);
		} else if (typeof fnc === 'string') { // Strings like 'StaticController#index'

			split = fnc.split('#');
			controller = split[0];
			action = split[1];

			instance = Controller.get(controller, this);
			instance.packetType = packet.type;
			instance.doAction(action, [this, packet.data, respond]);
		}
	}

	// Emit it on the socket itself
	that.emit(packet.type, packet.data, respond, null);
});

/**
 * Handle a client response
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   packet
 */
SocketConduit.setMethod(function onResponse(packet) {

	if (typeof this.callbacks[packet.respond_to] === 'function') {
		this.callbacks[packet.respond_to](packet.err, packet.data);
	}

	delete this.callbacks[packet.respond_to];
});

/**
 * Submit a message to the client
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   type
 * @param    {Object}   data
 * @param    {Function} callback
 */
SocketConduit.setMethod(function submit(type, data, callback) {

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
	packet.id   = 's' + (++this.counter);

	if (typeof callback == 'function') {
		this.callbacks[packet.id] = callback;
		packet.respond = true;
	}

	this.socket.emit('payload', packet);
});

/**
 * The Linkup class
 *
 * @author    Jelle De Loecker   <jelle@kipdola.be>
 * @since     1.0.0
 * @version   1.0.0
 *
 * @param    {SocketConduit}   conduit
 * @param    {String}          type
 * @param    {String}          id
 */
var Linkup = Function.inherits('Informer', function Linkup(conduit, type, id) {

	this.conduit = conduit;
	this.type = type;
	this.id = id;

	// Make it store itself
	conduit.linkups[id] = this;
});

Linkup.setMethod(function submit(type, data, callback) {
	this.conduit.submit([this.id, type], data, callback);
});
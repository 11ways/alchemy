var iostream = alchemy.use('socket.io-stream');

/**
 * The Socket Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {IncomingMessage}   req
 * @param    {ServerResponse}    res
 */
var SocketConduit = Function.inherits('Conduit', function SocketConduit(socket, announcement) {

	var that = this;

	// Indicate this is a websocket
	this.websocket = socket;
	this.socket = socket;

	// Store the headers
	this.headers = socket.handshake.headers;

	// Store the announcement data
	this.announcement = announcement;

	// Detect node clients
	if (this.headers['user-agent'] == 'node-XMLHttpRequest') {
		this.isNodeClient = true;
	}

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

	this.parseAnnouncement();
	if (!this.isNodeClient) this.parseRequest();

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

	// Listen for disconnects
	socket.on('disconnect', function onDisconnect() {

		var key;

		that.emit('disconnect');

		for (key in that.linkups) {
			that.linkups[key].emit('disconnect');
		}
	});

	// Listen for payloads on the stream socket
	this.stream.on('payload', function onStreamPayload(stream, packet) {
		packet.stream = stream;
		that.onPayload(packet);
	});

	// Listen for responses on the stream socket
	this.stream.on('response', function onStreamResponse(stream, data) {
		packet.stream = stream;
		that.onPayload(packet);
	});

	// Listen to data subscriptions
	this.on('subscribe-data', function gotSubscriptionRequest(arr) {

		if (!Array.isArray(arr)) {
			return;
		}

		that.registerBindings(arr);
	});
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   data
 */
SocketConduit.setMethod(function parseAnnouncement() {

	var connections,
	    data = this.announcement;

	// Store the scene information
	this.connection_type = data.connection_type;
	this.last_update = data.last_update || Date.now();
	this.sceneId = data.scene;

	// Register the connection in the user's session
	this.createSession().registerConnection(this);

	// Tell the client we're ready
	this.websocket.emit('ready');
});

/**
 * Handle a linkup
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
		linkup = new Linkup(this, type, id, packet.data);

		if (typeof fnc === 'function') {
			fnc.call(this, this, linkup);
		} else if (typeof fnc === 'string') { // Strings like 'StaticController#index'

			split = fnc.split('#');
			controller = split[0];
			action = split[1];

			instance = Controller.get(controller, this);
			instance.packetType = packet.type;
			instance.doAction(action, [this, linkup, packet.data]);
		}
	}

	// Emit it on the socket itself
	this.emit(packet.type, linkup, null);
});

/**
 * Handle a client packet
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
		respond = function respondToPayload(err, data, stream) {

			var responsePacket = {};

			responsePacket.err = err;
			responsePacket.respond_to = packet.id;

			if (data && data.constructor.name == 'IOStream') {
				responsePacket.noData = true;
				stream = data;
			} else {
				responsePacket.data = data;
			}

			if (stream && stream.constructor.name == 'IOStream') {
				return that.stream.emit('response', stream, responsePacket);
			}

			that.socket.emit('response', responsePacket);
		};
	}

	// See if this is for a specific linkup
	if (packet.link) {

		if (this.linkups[packet.link]) {
			if (packet.stream) {
				this.linkups[packet.link].emit(packet.type, packet.data, packet.stream, respond, null);
			} else {
				this.linkups[packet.link].emit(packet.type, packet.data, respond, null);
			}
		}

		return;
	}

	// See if any socket routes have been set
	if (Router.socketRoutes[packet.type]) {
		fnc = Router.socketRoutes[packet.type];

		if (typeof fnc === 'function') {
			if (packet.stream) {
				fnc.call(this, this, packet.data, packet.stream, respond);
			} else {
				fnc.call(this, this, packet.data, respond);
			}
		} else if (typeof fnc === 'string') { // Strings like 'StaticController#index'

			split = fnc.split('#');
			controller = split[0];
			action = split[1];

			instance = Controller.get(controller, this);
			instance.packetType = packet.type;

			if (packet.stream) {
				instance.doAction(action, [this, packet.data, packet.stream, respond]);
			} else {
				instance.doAction(action, [this, packet.data, respond]);
			}
		}
	}

	// Emit it on the socket itself
	if (packet.stream) {
		that.emit(packet.type, packet.data, packet.stream, respond, null);
	} else {
		that.emit(packet.type, packet.data, respond, null);
	}
});

/**
 * Handle a client response
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   type
 * @param    {Object}   data
 * @param    {IOStream} stream
 * @param    {Function} callback
 */
SocketConduit.setMethod(function submit(type, data, stream, callback) {

	var packet = {};

	if (typeof data === 'function') {
		callback = data;
		data = undefined;
	}

	if (!stream || stream.constructor.name != 'IOStream') {
		callback = stream;
		stream = undefined;
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

	packet.id = 's' + (++this.counter);

	if (typeof callback == 'function') {
		this.callbacks[packet.id] = callback;
		packet.respond = true;
	}

	if (stream) {
		return this.stream.emit('payload', stream, packet);
	}

	this.socket.emit('payload', packet);
});

/**
 * Create a stream we can send through a websocket connection
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
SocketConduit.setMethod(function createStream() {
	return iostream.createStream();
});

/**
 * The Linkup class
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.0
 * @version   1.0.0
 *
 * @param    {SocketConduit}   conduit
 * @param    {String}          type
 * @param    {String}          id
 * @param    {Object}          data
 */
var Linkup = Function.inherits('Informer', function Linkup(conduit, type, id, data) {

	// The socket conduit
	this.conduit = conduit;

	// The typename
	this.type = type;

	// The unique identifier, as created by the client
	this.id = id;

	// The initial data
	this.initialData = data;

	// Make it store itself
	conduit.linkups[id] = this;
});

/**
 * Destroy this link
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.0
 * @version   1.0.0
 */
Linkup.setMethod(function destroy() {

	// Remove all listeners
	this.simpleListeners = {};
	this.filterListeners = {};

	// Remove if from the linkups list
	delete this.conduit.linkups[this.id];
});

/**
 * Submit a message to the client
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.0
 * @version   1.0.0
 *
 * @param    {String}     type
 * @param    {Object}     data
 * @param    {IOStream}   stream
 * @param    {Function}   callback
 */
Linkup.setMethod(function submit(type, data, stream, callback) {
	this.conduit.submit([this.id, type], data, stream, callback);
});
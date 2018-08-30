var iostream = alchemy.use('socket.io-stream'),
    libstream = require('stream');

/**
 * The Socket Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 *
 * @param    {Socker}   socket
 * @param    {Object}   announcement
 */
var SocketConduit = Function.inherits('Alchemy.Conduit', function SocketConduit(socket, announcement) {

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
	this.new_cookies = {};
	this.new_cookie_header = [];

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
 * Return the client IP address
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.1
 * @version  0.2.1
 */
SocketConduit.setProperty(function ip() {

	var sock = this.socket;

	if (!sock) {
		return null;
	}

	return sock.conn.remoteAddress || null;
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
SocketConduit.setMethod(function parseRequest() {
	this.parseShortcuts();
	this.parseLanguages();
});

/**
 * Handle a client announcement
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.3
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
	this.getSession().registerConnection(this);

	// Tell the client we're ready
	this.websocket.emit('ready');

	if (alchemy.settings.debug) {
		log.info('Established websocket connection to', this.ip, 'using', this.useragent.family, this.useragent.major);
	}
});

/**
 * Handle an incoming linkup
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {Object}   packet
 */
SocketConduit.setMethod(function onLinkup(packet) {

	var controller,
	    instance,
	    section,
	    linkup,
	    router,
	    action,
	    split,
	    type,
	    temp,
	    fnc,
	    id;

	temp = packet.type;

	// Make sure a type is defined
	if (!temp) {
		return;
	}

	id = packet.id;

	// Split by at symbol to get the optional sub section
	temp = temp.split('@');

	if (temp.length == 2) {
		section = temp[0];
		type = temp[1];

		router = Router.subSections[section];

		if (!router) {
			return;
		}

	} else {
		type = temp[0];
		router = Router;
	}

	// See if any socket routes have been set
	if (router.linkupRoutes[type]) {
		fnc = router.linkupRoutes[type];

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
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   packet
 */
SocketConduit.setMethod(function onPayload(packet) {

	var that = this,
	    controller,
	    instance,
	    respond,
	    action,
	    linkup,
	    route,
	    split,
	    args,
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
		linkup = this.linkups[packet.link];

		// Do NOT allow packets of the 'linkup_packet' type,
		// we use that internally for the entire packet
		if (packet.type == 'linkup_packet') {
			return;
		}

		if (linkup) {
			if (packet.stream) {
				linkup.emit(packet.type, packet.data, packet.stream, respond, null);
			} else {
				linkup.emit(packet.type, packet.data, respond, null);
			}

			// Also emit as a linkup_packet
			linkup.emit('linkup_packet', packet, respond, null);
		}

		return;
	}

	// Normalize data-server-events
	if (packet.type == 'data-server-event') {

		// See if data is valid, otherwise do nothing
		if (!packet.data || !packet.data[0]) {
			return;
		}

		// Get the real type
		packet.type = packet.data[0];

		// Store the rest as arguments
		packet.args = packet.data.slice(1);
	}

	// See if any socket routes have been set
	if (Router.socketRoutes[packet.type]) {
		route = Router.socketRoutes[packet.type];

		if (packet.args) {
			args = packet.args;

			// Add "respond" callback to the bottom
			args.push(respond);
		} else if (packet.stream) {
			args = [packet.data, packet.stream, respond];
		} else {
			args = [packet.data, respond];
		}

		route.callHandler(this, args);
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
 * @since    0.2.0
 * @version  0.2.0
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
 * @version  1.0.5
 *
 * @param    {String}   type
 * @param    {Object}   data
 * @param    {IOStream} stream
 * @param    {Function} callback
 */
SocketConduit.setMethod(function submit(type, data, stream, callback) {

	var packet = {},
	    regular_stream;

	if (alchemy.isStream(data)) {
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
		// Make sure the data is converted to client-side friendly code
		data = JSON.clone(data, 'toHawkejs');

		// Now create a DRY object
		packet.data = JSON.toDryObject(data);
	}

	packet.id = 's' + (++this.counter);

	if (typeof callback == 'function') {
		this.callbacks[packet.id] = callback;
		packet.respond = true;
	}

	console.log('Emitting', packet)

	if (stream) {
		// Emit on the IOStream socket
		return this.stream.emit('payload', stream, packet);
	}

	this.socket.emit('payload', packet);
});

/**
 * Create a stream we can send through a websocket connection
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
SocketConduit.setMethod(function createStream() {
	return iostream.createStream();
});

/**
 * Create a linkup to the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
SocketConduit.setMethod(function linkup(type, data, cb) {

	var client,
	    id;

	if (typeof data == 'function') {
		cb = data;
		data = {};
	}

	id = type + '-' + Crypto.pseudoHex();
	client = new Linkup(this, type, id, data);

	this.socket.emit('linkup', {type: type, id: id, data: data});

	if (cb) {
		client.once('ready', function whenReady() {
			cb.call(client, client);
		});
	}

	return client;
});

/**
 * The Linkup class
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   0.2.0
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

	// Tell the client it's ready
	this.submit('ready');
});

/**
 * Destroy this link
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   0.2.0
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
 * @since     0.2.0
 * @version   0.2.0
 *
 * @param    {String}     type
 * @param    {Object}     data
 * @param    {IOStream}   stream
 * @param    {Function}   callback
 */
Linkup.setMethod(function submit(type, data, stream, callback) {
	this.conduit.submit([this.id, type], data, stream, callback);
});

/**
 * Create a stream
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   0.2.0
 */
Linkup.setMethod(function createStream() {
	return this.conduit.createStream();
});

/**
 * Send an error to the client
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   0.2.0
 *
 * @param    {Error}      err
 * @param    {Function}   callback
 */
Linkup.setMethod(function error(err, callback) {
	console.log('Error:', err);
	this.submit('error', {stack: err.stack, message: err.message}, callback);
});
var iostream = alchemy.use('socket.io-stream'),
    libstream = require('stream');

/**
 * The Socket Conduit Class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Socker}   socket
 * @param    {Object}   announcement
 */
var SocketConduit = Function.inherits('Alchemy.Conduit', function Socket(socket, announcement) {

	var that = this;

	// Indicate this is a websocket
	this.websocket = socket;
	this.socket = socket;

	// Store the headers
	this.headers = socket.handshake.headers;

	// Store the announcement data
	this.announcement = announcement;

	if (!this.canCreateSocketConnection()) {
		return;
	}

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

		let key;

		that.emit('disconnect');

		for (key in that.linkups) {
			that.linkups[key].destroy();
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.1
 * @version  1.3.1
 */
SocketConduit.setProperty(function ip() {

	let handshake = this.socket?.handshake;

	if (!handshake) {
		return null;
	}

	if (handshake.headers) {
		let forwarded_for = handshake.headers['x-forwarded-for'] || handshake.headers['x-real-ip'];

		if (forwarded_for) {

			// Forwarded for can contain multiple ip addresses,
			// return the first one
			if (forwarded_for.indexOf(',') > -1) {
				forwarded_for = forwarded_for.before(',');
			}

			return forwarded_for;
		}
	}

	return handshake.address || null;
});

/**
 * Is this client still connected?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 *
 * @type     {boolean}
 */
SocketConduit.setProperty(function is_connected() {
	return this.socket?.connected || false;
});

/**
 * Is this client allowed to create a socket connection?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
SocketConduit.setMethod(function canCreateSocketConnection() {

	if (this.isCrawler()) {
		return false;
	}

	return true;
});

/**
 * Parse the request, get information from the url
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Object}   data
 */
SocketConduit.setMethod(function parseAnnouncement() {

	var connections,
	    data = this.announcement;

	// Store the scene information
	this.connection_type = data.connection_type;
	this.last_update = data.last_update || Date.now();
	this.scene_id = data.scene;

	// Register the connection in the user's session
	this.getSession().registerConnection(this);

	// Tell the client we're ready
	this.websocket.emit('ready');

	if (alchemy.settings.debugging.debug) {
		log.info('Established websocket connection to', this.ip, 'using', this.useragent.family, this.useragent.major);
	}
});

/**
 * Handle an incoming linkup
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

		linkup.submit('connected_to_server');

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.4
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

			var responsePacket = {
				err         : null,
				respond_to  : packet.id,
				noData      : false,
				data        : null
			};

			if (err) {
				err = JSON.clone(err, 'toHawkejs');
				responsePacket.err = JSON.toDryObject(err);
			}

			if (data && data.constructor.name == 'IOStream') {
				responsePacket.noData = true;
				stream = data;
			} else {
				// Make sure the data is converted to client-side friendly code
				data = JSON.clone(data, 'toHawkejs');

				// Now create a DRY object
				responsePacket.data = JSON.toDryObject(data);
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

			let test = linkup.simpleListeners.get(packet.type);

			if (!test) {
				console.error('Linkup', linkup, 'has no listener for', packet.type);
			}

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.0.5
 *
 * @param    {string}   type
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

	if (stream) {
		// Emit on the IOStream socket
		return this.stream.emit('payload', stream, packet);
	}

	this.socket.emit('payload', packet);
});

/**
 * Create a stream we can send through a websocket connection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
SocketConduit.setMethod(function createStream() {
	return iostream.createStream();
});

/**
 * Create a linkup to the client
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {SocketConduit}   conduit
 * @param    {string}          type
 * @param    {string}          id
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

	this.on('__destroy__', () => {
		this._destroy();
	});
});

/**
 * Add a reference to its scene_id
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Linkup.setProperty(function scene_id() {
	return this.conduit?.scene_id;
});

/**
 * Destroy this link
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.10
 */
Linkup.setMethod(function destroy() {

	// Tell the client
	this.submit('__destroy__');

	// Actually do the destroying
	this._destroy();

	// Remove all listeners
	this.removeAllListeners();
});

/**
 * Make sure the linkup is removed
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Linkup.setMethod(function _destroy() {

	// Remove it from the linkups list
	delete this.conduit.linkups[this.id];

	this.emit('destroyed');
});

/**
 * Submit a message to the client
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {string}     type
 * @param    {Object}     data
 * @param    {IOStream}   stream
 * @param    {Function}   callback
 */
Linkup.setMethod(function submit(type, data, stream, callback) {
	this.conduit.submit([this.id, type], data, stream, callback);
});

/**
 * Submit a message to the server on this link and return a promise
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.2
 * @version  1.1.2
 *
 * @param    {string}   type
 * @param    {Object}   data
 */
Linkup.setMethod(function demand(type, data, stream) {

	const that = this;

	let pledge = new Classes.Pledge(),
	    args = [type, data];

	if (stream) {
		args.push(stream);
	}

	this.submit(...args, function done(err, result) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(result);
	});

	return pledge;
});

/**
 * Create a stream
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Linkup.setMethod(function createStream() {
	return this.conduit.createStream();
});

/**
 * Send an error to the client
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Error}      err
 * @param    {Function}   callback
 */
Linkup.setMethod(function error(err, callback) {
	console.log('Error:', err);
	this.submit('error', {stack: err.stack, message: err.message}, callback);
});
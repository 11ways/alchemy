var server     = alchemy.use('dgram').createSocket({type: 'udp4', reuseAddr: true}),
    libbson    = alchemy.use('bson'),
    bson       = new libbson.BSONPure.BSON(),
    emitter    = alchemy.use('events').EventEmitter,
    maxSize    = 65536,
    mevents    = new emitter(),
    udpIp      = '230.185.192.47',
    udpPort    = 4002,
    callbacks  = {},
    id         = Crypto.pseudoHex(),
    services   = alchemy.shared('alchemy.services'),
    bound;

// Listen for multicast error messages
server.on('error', function onError(err) {
	log.error('Error listening to multicast address', udpIp + ':' + udpPort, {err: err});
});

// Store the discovery id
alchemy.discoveryId = id;

/**
 * Submit data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.2.0
 *
 * @param    {Object}   packet
 */
function submit(packet) {

	var buffer;

	if (!bound) {
		return mevents.on('_udpReady', function delayedSend() {
			submit(packet);
		});
	}

	// Set the packet origin
	packet.origin = id;

	// Set the server http port
	packet.http_port = alchemy.settings.port;

	// Serialize the buffer
	buffer = bson.serialize(packet);

	// Transmit the buffer
	server.send(buffer, 0, buffer.length, udpPort, udpIp, function callback(err) {
		if (err && err.code == 'EMSGSIZE') {
			maxSize = ~~(maxSize * 0.9);
		}
	});
};

Function.while(function test() {
	return !bound;
}, function task(next) {

	// Increment the port by 1
	var port = udpPort;

	function gotBindError() {
		udpPort++;
		next();
	}

	// Add the error listener
	server.once('error', gotBindError);

	/**
	 * Bind to the UDP server port
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  0.2.0
	 */
	server.bind(port, function onBound() {

		// Remove the bind error listener
		server.removeListener('error', gotBindError);

		// The same device needs to receive the message,
		// otherwise other instances on the same machine won't pick it up
		server.setMulticastLoopback(true);

		// Allow up to 10 hops
		server.setMulticastTTL(10);

		// Let the program exit if this is the only socket connection left
		server.unref();

		if (udpIp && udpIp !== '0.0.0.0' && udpIp !== '::0') {
			server.addMembership(udpIp);
		}

		bound = true;

		next();
	});
}, function done() {
	mevents.emit('_udpReady');
});

/**
 * Listen for messages
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
server.on('message', function gotMessage(message, rinfo) {

	var packet,
	    respond;

	try {
		packet = bson.deserialize(message);
	} catch(err) {
		log.warn('Received corrupt multicast message from ' + rinfo.address);
		return;
	}

	// Ignore packets that come from here
	if (packet.origin == id) {
		return;
	}

	packet.remote = rinfo;

	if (packet.respond) {
		respond = function respond(data) {

			console.log('Responding with', data);
			
			var response_packet = {
				type         : 'response',
				response_to  : packet.id,
				data         : data
			};

			submit(response_packet);
		};
	}

	// Emit it as a multicast event
	alchemy.emit('multicast', packet, respond, null);

	if (packet.response_to) {
		if (typeof callbacks[packet.response_to] === 'function') {
			callbacks[packet.response_to](packet.data, packet);
		}
	} else {
		// Emit it for multicast listeners only
		mevents.emit(packet.type, packet.data, packet, respond, null);
	}
});

/**
 * Multicast a message to other alchemy instances
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {String}   type
 * @param    {Object}   data         The data to broadcast
 * @param    {Boolean}  accumulate   Group response data
 * @param    {Function} callback
 */
alchemy.multicast = function multicast(type, data, accumulate, callback) {

	var respond = false,
	    packet,
	    acc,
	    id;

	id = String(alchemy.ObjectId());

	if (typeof accumulate == 'function') {
		callback = accumulate;
		accumulate = false;
	}

	if (typeof callback == 'function') {
		respond = true;

		if (accumulate) {
			acc = new alchemy.classes.Accumulator(callback);

			callbacks[id] = acc.addData.bind(acc);
		} else {
			callbacks[id] = callback;
		}
	}

	// Create a packet object
	packet = {
		id       : id,
		type     : type,
		data     : data,
		respond  : respond
	};

	submit(packet);
};

/**
 * Listen for multicast messages
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {String}   type
 * @param    {Function} callback
 */
alchemy.onMulticast = function onMulticast(type, callback) {
	mevents.on(type, callback);
};

/**
 * Respond to discovery requests
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
mevents.on('discover_services', function gotDiscoverRequest(_requirements, packet, respond) {

	var service_keys = Object.keys(services),
	    requirements;

	// Make sure requirements is an array
	requirements = Array.cast(_requirements);

	// If the required services are not met, do nothing
	if (requirements.length && service_keys.shared(requirements).length != requirements.length) {
		return;
	}

	// Return all the available service names
	respond(service_keys);
});

/**
 * Detect instances with optional required services
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Array}    requirements   Instance must have these services
 * @param    {Function} callback
 */
alchemy.discover = function discover(requirements, callback) {

	if (typeof requirements == 'function') {
		callback = requirements;
		requirements = [];
	}

	alchemy.multicast('discover_services', requirements, true, function gotResponse(responses) {
		callback(null, responses);
	});
};

/**
 * Configure a service
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   service_name
 * @param    {Object}   config
 */
alchemy.configureService = function configureService(service_name, config) {

	var status;

	if (arguments.length == 1) {
		config = {};
	}

	if (!config) {
		status = 'disabled';

		// A falsy config means the service needs to be disabled
		delete services[service_name];
	} else {
		status = 'enabled';

		// Store the config for the service
		services[service_name] = config;
	}

	// Log some info
	log.info('Service ' + JSON.stringify(service_name) + ' has been ' + status);
};
'use strict';

var bson       = alchemy.use('bson'),
    emitter    = alchemy.use('events').EventEmitter,
    maxSize    = 65536,
    mevents    = new emitter(),
    udpIp      = alchemy.settings.network.multicast_ipv4,
    udpPort    = 4002,
    callbacks  = {},
    services   = alchemy.shared('alchemy.services'),
    submits    = 0,
    messages   = 0,
    binding,
    errors     = 0,
    server,
    bound;

/**
 * Submit data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.4.3
 *
 * @param    {Object}   packet
 */
function submit(packet) {

	var buffer;

	if (!udpIp) {
		throw new Error('No multicast_ipv4 ip address has been set');
	}

	if (!bound) {
		return alchemy.initMulticast(function delayedSend() {
			submit(packet);
		});
	}

	alchemy.setStatus('multicast_submits', ++submits);

	// Set the packet origin
	packet.origin = alchemy.discovery_id;

	// Set the server http port
	packet.http_port = alchemy.settings.network.port;

	// Serialize the buffer
	buffer = bson.serialize(packet);

	// Transmit the buffer
	server.send(buffer, 0, buffer.length, udpPort, udpIp, function callback(err) {

		if (err) {
			log.error('Multicast error:', err);
			alchemy.setStatus('multicast_errors', ++errors);

			if (err.code == 'EMSGSIZE') {
				maxSize = ~~(maxSize * 0.9);
				alchemy.setStatus('multicast_maxsize', maxSize);
			}
		}
	});
};

/**
 * Listen for messages
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.4.3
 */
function onServerMessage(message, rinfo) {

	var packet,
	    respond;

	alchemy.setStatus('multicast_messages', ++messages);

	try {
		packet = bson.deserialize(message);
	} catch(err) {
		log.warn('Received corrupt multicast message from ' + rinfo.address);
		return;
	}

	// Ignore packets that come from here
	if (packet.origin == alchemy.discovery_id) {
		return;
	}

	packet.remote = rinfo;

	if (packet.respond) {
		respond = function respond(data) {

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
};

/**
 * Prepare multicast
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.1
 * @version  0.4.3
 *
 * @param    {Function} callback
 */
Alchemy.setMethod(function initMulticast(callback) {

	var that = this;

	if (!callback) {
		callback = Function.thrower;
	}

	if (!udpIp) {
		return Blast.setImmediate(function noIp() {
			callback(new Error('You need to set multicast_ipv4 ip address first'));
		});
	}

	if (this.hasBeenSeen('ready_multicast')) {
		return Blast.setImmediate(callback);
	}

	if (binding) {
		return this.afterOnce('ready_multicast', callback);
	}

	if (!server) {
		let dgram = alchemy.use('dgram');

		server = dgram.createSocket({
			type      : 'udp4',
			reuseAddr : true
		});

		// Listen for multicast error messages
		server.on('error', function onError(err) {
			log.error('Error listening to multicast address', udpIp + ':' + udpPort, {err: err});
		});

		// And listen for messages
		server.on('message', onServerMessage);
	}

	binding = true;

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
		 * @author   Jelle De Loecker <jelle@elevenways.be>
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

		// Indicate we are indeed listening
		that.setStatus('multicast_ipv4', udpIp + ':' + udpPort);

		// Emit the ready events
		mevents.emit('_udpReady');
		that.emit('ready_multicast');

		// And finally: callback
		callback();
	});
});

/**
 * Multicast a message to other alchemy instances
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {string}   type
 * @param    {Object}   data         The data to broadcast
 * @param    {boolean}  accumulate   Group response data
 * @param    {Function} callback
 */
Alchemy.setMethod(function multicast(type, data, accumulate, callback) {

	var respond = false,
	    packet,
	    acc,
	    id;

	id = String(this.ObjectId());

	if (typeof accumulate == 'function') {
		callback = accumulate;
		accumulate = false;
	}

	if (typeof callback == 'function') {
		respond = true;

		if (accumulate) {
			acc = new Classes.Alchemy.Accumulator(callback);

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
});

/**
 * Listen for multicast messages
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.4.0
 *
 * @param    {string}   type
 * @param    {Function} callback
 */
Alchemy.setMethod(function onMulticast(type, callback) {
	mevents.on(type, callback);
});

/**
 * Respond to discovery requests
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {Array}    requirements   Instance must have these services
 * @param    {Function} callback
 */
Alchemy.setMethod(function discover(requirements, callback) {

	if (typeof requirements == 'function') {
		callback = requirements;
		requirements = [];
	}

	this.multicast('discover_services', requirements, true, function gotResponse(responses) {
		callback(null, responses);
	});
});

/**
 * Configure a service
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {string}   service_name
 * @param    {Object}   config
 */
Alchemy.setMethod(function configureService(service_name, config) {

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
});

if (alchemy.settings.network.multicast_on_boot) {
	alchemy.initMulticast();
}
var server     = alchemy.use('dgram').createSocket('udp4'),
    bson       = alchemy.use('bson').BSONPure.BSON,
    emitter    = alchemy.use('events').EventEmitter,
    mevents    = new emitter(),
    udpIp      = '', // 230.185.192.47
    udpPort    = 4002,
    callbacks  = {},
    id         = Crypto.pseudoHex(),
    bound;

// Listen for multicast error messages
server.on('error', function(err) {
	log.error('Error listening to multicast address', {err: err});
});

/**
 * Submit data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {Object}   packet
 */
function submit(packet) {

	var buffer;

	// Set the packet origin
	packet.origin = id;

	// Serialize the buffer
	buffer = bson.serialize(packet);

	// Transmit the buffer
	server.send(buffer, 0, buffer.length, udpPort, udpIp);
};

Function.while(function test() {
	return !bound;
}, function task(next) {

	// Increment the port by 1
	var port = ++udpPort;

	function gotBindError() {
		next();
	}

	// Add the error listener
	server.once('error', gotBindError);

	/**
	 * Bind to the UDP server port
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.1.0
	 * @version  1.0.0
	 */
	server.bind(port, function onBound() {

		// Remove the bind error listener
		server.removeListener('error', gotBindError);

		// @todo: find out why this is not working
		// (sending instance still receives its own multicast message)
		server.setMulticastLoopback(false);

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
	console.log('Done! Bound to port', udpPort);
});


console.log('Attaching listener');

/**
 * Listen for messages
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
server.on('message', function gotMessage(message, rinfo) {

	var packet,
	    respond;

	    console.log('Got message', message, 'from', rinfo)

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

	console.log('Got a message: ', packet, message, rinfo);

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
		console.log('Emitting packet', packet.type, packet);
		// Emit it for multicast listeners only
		mevents.emit(packet.type, packet.data, packet, respond, null);
	}
});

/**
 * Multicast a message to other alchemy instances
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {String}   type
 * @param    {Function} callback
 */
alchemy.onMulticast = function onMulticast(type, callback) {
	mevents.on(type, callback);
};

var server     = alchemy.use('dgram').createSocket('udp4'),
    bson       = alchemy.use('bson').BSONPure.BSON,
    emitter    = alchemy.use('events').EventEmitter,
    mevents    = new emitter(),
    udpIp      = '',
    udpPort    = 4002,
    callbacks  = {},
    submit;

// Listen for multicast error messages
server.on('error', function(err) {
	log.error('Error listening to multicast address', {err: err});
})

/**
 * Submit data
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Object}   packet
 */
submit = function submit(packet) {

	var buffer;

	// Serialize the buffer
	buffer = bson.serialize(packet);

	// Transmit the buffer
	server.send(buffer, 0, buffer.length, udpPort, udpIp);
};

/**
 * Bind to the UDP server port
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
server.bind(udpPort, function() {

	server.setMulticastTTL(10);

	// Let the program exit if this is the only socket connection left
	server.unref();

	if (udpIp && udpIp !== '0.0.0.0' && udpIp !== '::0') {
		server.addMembership(udpIp);
	}
});

/**
 * Listen for messages
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
server.on('message', function(message, rinfo) {

	var packet,
	    respond;

	try {
		packet = bson.deserialize(message);
	} catch(err) {
		log.warn('Received corrupt multicast message from ' + rinfo.address);
		return;
	}

	packet.remote = rinfo;

	if (packet.respond) {
		respond = function(data) {
			
			var response_packet = {
				type         : 'response',
				response_to  : packet.id,
				data         : data
			};

			submit(response_packet);
		};
	}

	// Emit it as a multicast event
	alchemy.emit('multicast', packet, respond);

	if (packet.response_to) {
		if (typeof callbacks[packet.response_to] === 'function') {
			callbacks[packet.response_to](packet.data, packet);
		}
	} else {
		// Emit it for multicast listeners only
		mevents.emit(packet.type, packet.data, packet, respond);
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

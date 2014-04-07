var server     = alchemy.use('dgram').createSocket('udp4'),
    bson       = alchemy.use('bson').BSONPure.BSON,
    udpIp      = '239.47.0.1',
    udpPort    = 4002,
    callbacks  = {};

server.on('message', function(message, rinfo) {
    console.log('server got message: ' + message + ' from ' + 
                 rinfo.address + ':' + rinfo.port);
});

server.bind(udpPort, function() {

	server.setMulticastTTL(10);
	server.addMembership(udpIp);
	
	var message = new Buffer('this is a message');

	server.send(message, 0, message.length, udpPort, udpIp);

});

/**
 * Multicast a message to other alchemy instances
 *
 * @author        Jelle De Loecker   <jelle@codedor.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.multicast = function multicast(data, callback) {

	var respond = false,
	    packet,
	    buffer,
	    id;

	id = String(alchemy.ObjectId());

	if (typeof callback == 'function') {
		respond = true;

		callbacks[id] = callback;
	}

	// Create a packet object
	packet = {
		id       : id,
		data     : data,
		respond  : respond
	};

	// Serialize the buffer
	buffer = bson.serialize(packet);

	// Transmit the buffer
	server.send(buffer, 0, buffer.length, udpPort, udpIp);
};
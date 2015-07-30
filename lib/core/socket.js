var types     = alchemy.shared('Socket.types'),
    iostream  = alchemy.use('socket.io-stream'),
    yenc      = alchemy.use('yenc-stream'),
    path      = alchemy.use('path'),
    fs        = alchemy.use('fs');

/**
 * The "socket" stage:
 * 
 * Create the socket.io listener
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.1.0
 * @version       1.0.0
 */
alchemy.sputnik.defineStage('socket', function socketStage () {

	var io = alchemy.use('socket.io');

	// Create the Socket.io listener
	alchemy.io = io.listen(alchemy.server);

	// Don't output too much socket.io debug info
	alchemy.io.set('log level', 1);

	/**
	 * Handle connections
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 */
	alchemy.io.sockets.on('connection', function onConnect(socket){
		var soconduit = new alchemy.classes.SocketConduit(socket);
	});
});

/**
 * Connect to another alchemy instance
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.1.0
 * @version       1.0.0
 */
alchemy.callServer = function callServer(address, data, callback) {

	var server = new alchemy.classes.ClientSocket();

	server.connect(address, data, callback);

	return server;
};
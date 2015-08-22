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

	var clientPath,
	    streamPath,
	    io;

	io = alchemy.use('socket.io');

	// Create the Socket.io listener
	alchemy.io = io.listen(alchemy.server, {serveClient: false});

	// Don't output too much socket.io debug info
	alchemy.io.set('log level', 1);

	// Get the core client path
	clientPath = path.dirname(alchemy.findModule('socket.io-client').modulePath);
	clientPath = path.resolve(clientPath, 'socket.io.js');

	// Get the stream client path
	streamPath = path.dirname(alchemy.findModule('socket.io-stream').modulePath);
	streamPath = path.resolve(streamPath, 'socket.io-stream.js');

	// Serve the socket io core file
	Router.use('/scripts/socket.io.js', function getSocketIo(req, res, next) {
		alchemy.minifyScript(clientPath, function gotMinifiedPath(err, mpath) {
			req.conduit.serveFile(mpath || clientPath);
		});
	});

	// Serve the socket io stream file
	Router.use('/scripts/socket.io-stream.js', function getSocketStream(req, res, next) {
		alchemy.minifyScript(streamPath, function gotMinifiedPath(err, mpath) {
			req.conduit.serveFile(mpath || streamPath);
		});
	});

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

// Tell the client to connect or not
alchemy.hawkejs.on({type: 'viewrender', status: 'begin', client: false}, function onBegin(viewRender) {
	viewRender.expose('enable_websockets', !!alchemy.settings.config.enable_websockets);
});
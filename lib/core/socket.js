'use strict';

var types     = alchemy.shared('Socket.types'),
    iostream,
    path      = alchemy.use('path'),
    fs        = alchemy.use('fs');

/**
 * The "socket" stage:
 * 
 * Create the socket.io listener
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.1.0
 * @version       1.0.3
 */
alchemy.sputnik.defineStage('socket', function socketStage () {

	var clientPath,
	    streamPath,
	    io;

	if (!alchemy.settings.websockets) {
		log.info('Websockets have been disabled');
		return;
	} else {
		log.info('Websockets have been enabled');
	}

	io = alchemy.use('socket.io');

	if (!io) {
		return log.error('Could not load socket.io!');
	}

	iostream = alchemy.use('socket.io-stream');

	// Create the Socket.io listener
	alchemy.io = io.listen(alchemy.server, {serveClient: false});

	// Get the core client path
	clientPath = path.dirname(alchemy.findModule('socket.io-client').modulePath);
	clientPath = path.resolve(clientPath, '..', 'dist', 'socket.io.slim.js');

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
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  0.2.0
	 */
	alchemy.io.sockets.on('connection', function onConnect(socket){

		var syncs = {},
		    latencies = [],
		    latency_avg = 2,
		    offset = 0;

		socket.on('timesync', function gotTimesyncRequest(data) {

			var received = Date.now(),
			    latency;

			// This is the initial request
			if (data.count == null) {
				data.count = 0;
				data.latency_trip = 0;

				// Reset the latencies array
				latencies.length = 0;
			}

			// Do 8 round trips to determine latency
			if (data.latency_trip <= 8) {

				if (data.last_sent) {

					// Latency is the timestamp when we received the response
					// minus the timestamp when we sent the request
					latency = received - data.last_sent;
					latencies.push(latency);
				}

				// Wait before responding
				setTimeout(function waitForLatency() {
					data.last_sent = Date.now();
					socket.emit('timesync', data);
				}, 100 + (data.latency_trip * 150));

				data.latency_trip++;
			} else if (data.latency_trip) {

				latency_avg = ~~(Math.median(latencies) / 2);
				offset = (received - latency_avg) - data.client_time;

				socket.emit('timesync', {offset: offset, latency: latency_avg});
			}
		});

		// Wait for the announcement
		socket.once('announce', function gotAnnouncement(data) {

			var SocketClass,
			    class_name;

			// Try getting the socket class of this type
			if (typeof data.type == 'string') {
				class_name = data.type.classify();
				SocketClass = Classes.Alchemy[class_name + 'SocketConduit'];
			}

			// If no socket class was found get the regular class
			if (!SocketClass) {
				SocketClass = Classes.Alchemy.SocketConduit;
			}

			new SocketClass(socket, data);
		});
	});
});

/**
 * Connect to another alchemy instance
 *
 * @author        Jelle De Loecker   <jelle@develry.be>
 * @since         0.1.0
 * @version       0.4.0
 */
Alchemy.setMethod(function callServer(address, data, callback) {

	var server = new Classes.ClientSocket();

	server.reconnect = false;

	server.connect(address, data, callback);

	return server;
});

// Tell the client to connect or not
alchemy.hawkejs.on({type: 'viewrender', status: 'begin', client: false}, function onBegin(viewRender) {
	viewRender.expose('enable_websockets', !!alchemy.settings.websockets);
});
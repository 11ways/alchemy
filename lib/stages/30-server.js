const libfs = require('fs');

/**
 * The "server" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const server = STAGES.createStage('server');

/**
 * The "server.create_http" stage:
 * Create the server instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const create_http = server.createStage('create_http', () => {

	// Create the server
	alchemy.server = alchemy.modules.http.createServer();

	// Listen for requests
	alchemy.server.on('request', (request, response) => Router.resolve(request, response));
});

/**
 * The "server.websocket" stage:
 * Setup the websocket system
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const websocket = server.createStage('websocket', () => {

	let msgpack_parser,
	    iostream,
	    types     = alchemy.shared('Socket.types'),
	    path      = alchemy.use('path'),
	    fs        = alchemy.use('fs');

	const websockets = alchemy.settings.network.use_websockets;

	if (!websockets || websockets === 'never') {
		log.info('Websockets have been disabled');
		return;
	} else {
		if (websockets == 'optional') {
			log.info('Websockets have been enabled optionally');
		} else {
			log.info('Websockets have been enabled, clients will automatically connect');
		}
	}

	const socket_io = alchemy.use('socket.io');

	if (!socket_io) {
		return log.error('Could not load socket.io!');
	}

	iostream = alchemy.use('socket.io-stream');
	msgpack_parser = alchemy.use('socket.io-msgpack-parser');

	let socket_io_options = {
		serveClient : false,
	};

	if (msgpack_parser) {
		socket_io_options.parser = msgpack_parser;
	}

	if (!alchemy.server) {
		throw new Error('No server has been created yet, unable to start socket.io');
	}

	// Create the Socket.io listener
	alchemy.io = socket_io(alchemy.server, socket_io_options);

	// Get the core client path
	let client_path = alchemy.findModule('socket.io-client').module_dir;

	if (msgpack_parser) {
		client_path = path.join(client_path, 'dist', 'socket.io.msgpack.min.js');
	} else {
		client_path = path.join(client_path, 'dist', 'socket.io.min.js');
	}

	// Get the stream client path
	let stream_path = path.dirname(alchemy.findModule('@11ways/socket.io-stream').module_path);
	stream_path = path.resolve(stream_path, 'socket.io-stream.js');

	// Serve the socket io core file
	Router.use('/scripts/socket.io.js', function getSocketIo(req, res, next) {
		alchemy.minifyScript(client_path, function gotMinifiedPath(err, mpath) {
			req.conduit.serveFile(mpath || client_path);
		});
	});

	// Serve the socket io stream file
	Router.use('/scripts/socket.io-stream.js', function getSocketStream(req, res, next) {
		alchemy.minifyScript(stream_path, function gotMinifiedPath(err, mpath) {
			req.conduit.serveFile(mpath || stream_path);
		});
	});

	/**
	 * Handle connections
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
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
				SocketClass = Classes.Alchemy.Conduit[class_name + 'Socket'];
			}

			// If no socket class was found get the regular class
			if (!SocketClass) {
				SocketClass = Classes.Alchemy.Conduit.Socket;
			}

			new SocketClass(socket, data);
		});
	});

});

/**
 * The "server.warn_debug" stage:
 * Start the server
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const warn_debug = server.createStage('warn_debug', () => {
	// See if we want to enable debugging
	if (alchemy.getSetting('debugging.debug')) {
		log.info('Hawkejs debugging has been ENABLED');
		alchemy.hawkejs._debug = true;
	}
});

/**
 * The "server.start" stage:
 * Start the server
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const start = server.createStage('start', () => {

	if (process.send) {
		// Create a connection to the hohenheim parent
		alchemy.hohenheim = new Classes.Alchemy.Reciprocal(process, 'hohenheim');
	}

	if (alchemy.getSetting('client_mode')) {
		return server.launch(true);
	}

	alchemy.exposeDefaultStaticVariables();

	let port = alchemy.getSetting('network.port'),
	    socket = alchemy.getSetting('network.socket');

	// If a falsy (non-null) port is given (and no socket file), do nothing
	if (!port && port !== null && !socket) {
		return;
	}

	let listen_target;

	// Are we using a socket file?
	if (typeof socket == 'string') {
		let stat;

		try {
			stat = libfs.statSync(socket);
		} catch (err) {
			// File not found, so it's safe to use
			console.log(err);
		}

		if (stat) {
			log.info('Found existing socketfile at', socket, ', need to remove it');
			libfs.unlinkSync(socket);
		}

		listen_target = socket;
	}

	if (!listen_target && port) {
		listen_target = port;
	}

	// Start listening on the given port
	// The actual `requests` listener is defined in the 'http' stage
	alchemy.server.listen(listen_target, function areListening(){

		let address = alchemy.server.address();
		let url = alchemy.getSetting('network.main_url');

		if (typeof address == 'string') {
			alchemy.setSetting('network.socket', address);
			log.info('HTTP server listening on socket file', address);

			const set_socketfile_chmod = alchemy.getSetting('network.socketfile_chmod');

			// Make readable by everyone
			if (set_socketfile_chmod) {
				libfs.chmodSync(address, set_socketfile_chmod);
			}
		} else {
			// Get the actual server port
			alchemy.setSetting('network.port', address.port);
			log.info('HTTP server listening on port', address.port);

			if (!url) {
				url = 'http://localhost:' + address.port;
			}
		}

		if (url) {
			let pretty_url = alchemy.colors.bg.getRgb(1, 0, 1) + alchemy.colors.fg.getRgb(5, 3, 0) + ' ' + url + ' ' + alchemy.colors.reset;
			log.info('Served at »»', pretty_url, '««');
		}

		// If this process is a child, tell the parent we're ready
		if (process.send) {
			log.info('Letting the parent know we\'re ready!');
			process.send({alchemy: {ready: true}});

			process.on('disconnect', function onParentExit() {
				log.info('Parent exited, closing down');
				process.exit();
			});
		}

		server.launch(true);
	});

	// Listen for errors (like EADDRINUSE)
	alchemy.server.on('error', function onError(err) {

		if (process.send) {
			process.send({alchemy: {error: err}});
			return process.exit();
		}

		throw err;
	});
});

/**
 * The "server.listening" stage:
 * At this point the server is listening for incoming requests
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const listening = server.createStage('listening', () => {

});

STAGES.afterStages(['datasource', 'server.websocket'], () => {

	// Need to wait for all classes to load
	Blast.loaded(function hasLoaded() {
		server.launch([
			'create_http',
			'warn_debug',
			'start'
		]);

		// Indicate the server has started
		alchemy.started = true;
	});
});
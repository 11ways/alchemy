'use strict';

/**
 * The basic http module, used to create the server.
 *
 * @link   http://nodejs.org/api/http.html
 */
alchemy.use('http', 'http');

/**
 * This module contains utilities for handling and transforming file paths.
 * Almost all these methods perform only string transformations.
 * The file system is not consulted to check whether paths are valid.
 *
 * @link   http://nodejs.org/api/path.html
 */
alchemy.use('path', 'path');

/**
 * File I/O is provided by simple wrappers around standard POSIX functions.
 *
 * @link   http://nodejs.org/api/fs.html
 */
alchemy.use('graceful-fs', 'fs');

/**
 * Usefull utilities.
 *
 * @link   http://nodejs.org/api/util.html
 */
alchemy.use('util', 'util');

/**
 * The native mongodb library
 *
 * @link   https://npmjs.org/package/mongodb
 */
alchemy.use('mongodb', 'mongodb');

/**
 * The LESS interpreter.
 *
 * @link   https://npmjs.org/package/less
 */
alchemy.use('less', 'less');

/**
 * Hawkejs view engine
 *
 * @link   https://npmjs.org/package/hawkejs
 */
alchemy.hawkejs = Classes.Hawkejs.Hawkejs.getInstance();

/**
 * The function to detect when everything is too busy
 */
alchemy.toobusy = alchemy.use('toobusy-js', 'toobusy');

/**
 * Compatibility for old Sputnik stage system
 */
alchemy.sputnik = STAGES.createSputnikShim({
	http          : 'server.create_http',
	core_app      : 'load_app.core_app',
	plugins       : 'load_app.plugins',
	base_app      : 'load_app.main_app',
	middleware    : 'routes.middleware',
	datasources   : 'datasource',
	define_debug  : 'server.warn_debug',
	socket        : 'server.websocket',
	hawkejs_setup : 'routes.hawkejs',
	routes        : 'routes',
	start_server  : 'server.start',
	listening     : 'server.listening',
});

/**
 * Real-time apps made cross-browser & easy with a WebSocket-like API.
 *
 * @link   https://npmjs.org/package/socket.io
 */
alchemy.use('socket.io', 'io');

/**
 * Allow streams over a socket.io connection
 */
alchemy.use('@11ways/socket.io-stream', 'socket.io-stream');

/**
 * Recursively mkdir, like `mkdir -p`.
 * This is a requirement fetched from express
 *
 * @link   https://npmjs.org/package/mkdirp
 */
alchemy.use('mkdirp', 'mkdirp');

/**
 * Base useragent library
 *
 * @link   https://npmjs.org/package/useragent
 */
alchemy.use('useragent');

/**
 * Enable the `satisfies` method in the `useragent` library
 *
 * @link   https://www.npmjs.com/package/useragent#adding-more-features-to-the-useragent
 */
require('useragent/features');
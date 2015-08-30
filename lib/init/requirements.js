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
alchemy.hawkejs = new (alchemy.use('hawkejs', 'hawkejs'))();

/**
 * The function to detect when everything is too busy
 */
alchemy.toobusy = alchemy.use('toobusy-js', 'toobusy');

/**
 * Load Sputnik, the stage-based launcher
 */
alchemy.sputnik = new (alchemy.use('sputnik', 'sputnik'))();

/**
 * Real-time apps made cross-browser & easy with a WebSocket-like API.
 *
 * @link   https://npmjs.org/package/socket.io
 */
alchemy.use('socket.io', 'io');

/**
 * Lib to help you hash passwords.
 *
 * @link   https://npmjs.org/package/bcrypt
 */
alchemy.use('bcrypt', 'bcrypt');

/**
 * Recursively mkdir, like `mkdir -p`.
 * This is a requirement fetched from express
 *
 * @link   https://npmjs.org/package/mkdirp
 */
alchemy.use('mkdirp', 'mkdirp');

/**
 * Automatic expiring "cache" for Node.js.
 *
 * @link   https://npmjs.org/package/expirable
 */
alchemy.use('expirable', 'expirable');

/**
 * Watch files and folders for changes
 *
 * @link   https://npmjs.org/package/chokidar
 */
alchemy.use('chokidar', 'chokidar');

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
alchemy.use('fs', 'fs');

/**
 * Usefull utilities.
 *
 * @link   http://nodejs.org/api/util.html
 */
alchemy.use('util', 'util');

/**
 * Sinatra inspired web development framework.
 * Serves as the basis for Alchemy MVC.
 *
 * @link   https://npmjs.org/package/express
 */
alchemy.use('express', 'express');

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
 * The LESS middleware.
 *
 * @link   https://npmjs.org/package/less-middleware
 */
alchemy.use('less-middleware', 'lessmw')

/**
 * Hawkejs view engine
 *
 * @link   https://npmjs.org/package/hawkejs
 */
alchemy.hawkejs = new (alchemy.use('hawkejs', 'hawkejs'))();

/**
 * JSON-DRY
 */
var dry = alchemy.use('json-dry');
alchemy.stringify = dry.stringify;
alchemy.parse = dry.parse;

/**
 * The function to detect when everything is too busy
 */
alchemy.toobusy = alchemy.use('toobusy-js', 'toobusy');

/**
 * Real-time apps made cross-browser & easy with a WebSocket-like API.
 *
 * @link   https://npmjs.org/package/socket.io
 */
alchemy.use('socket.io', 'io');

/**
 * Async is a utility module which provides straight-forward,
 * powerful functions for working with asynchronous JavaScript.
 *
 * @link   https://npmjs.org/package/async
 */
alchemy.use('async', 'async');

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
 * A module for generating random strings.
 *
 * @link   https://npmjs.org/package/randomstring
 */
alchemy.use('randomstring', 'randomstring');

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

/**
 * The Fuery queue system
 */
alchemy.use('fuery');

/**
 * Start the timer after requiring
 * 
 * @type {Integer}
 */
alchemy._TimerStart = Date.now();
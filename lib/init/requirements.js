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
 * Mongoose is a MongoDB object modeling tool.
 * Alchemy MVC uses MongoDB through this wrapper.
 *
 * @link   https://npmjs.org/package/mongoose
 */
alchemy.use('mongoose', 'mongoose');

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
 * A Node.js templating engine built upon TJ Holowaychuk's EJS.
 *
 * @link   https://npmjs.org/package/hawkejs
 */
var hawkejs = alchemy.use('hawkejs', 'hawkejs');
alchemy.hawkejs = hawkejs;

alchemy.stringify = alchemy.hawkejs.stringify;
alchemy.parse = alchemy.hawkejs.parse;
alchemy.getObjectPath = alchemy.hawkejs.getObjectPath;

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
alchemy._TimerStart = (new Date).getTime();
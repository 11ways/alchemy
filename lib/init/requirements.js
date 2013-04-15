/**
 * The basic http module, used to create the server.
 *
 * @link   http://nodejs.org/api/http.html
 */
var http = alchemy.use('http');

/**
 * This module contains utilities for handling and transforming file paths.
 * Almost all these methods perform only string transformations.
 * The file system is not consulted to check whether paths are valid.
 *
 * @link   http://nodejs.org/api/path.html
 */
var path = alchemy.use('path');

/**
 * File I/O is provided by simple wrappers around standard POSIX functions.
 *
 * @link   http://nodejs.org/api/fs.html
 */
var fs = alchemy.use('fs');

/**
 * Usefull utilities.
 *
 * @link   http://nodejs.org/api/util.html
 */
var util = alchemy.use('util');

/**
 * Sinatra inspired web development framework.
 * Serves as the basis for Alchemy MVC.
 *
 * @link   https://npmjs.org/package/express
 */
var express = alchemy.use('express');
alchemy.express = express;

/**
 * Mongoose is a MongoDB object modeling tool.
 * Alchemy MVC uses MongoDB through this wrapper.
 *
 * @link   https://npmjs.org/package/mongoose
 */
var mongoose = alchemy.use('mongoose');

/**
 * The LESS interpreter.
 *
 * @link   https://npmjs.org/package/less
 */
var less = alchemy.use('less');

/**
 * The LESS middleware.
 *
 * @link   https://npmjs.org/package/less-middleware
 */
var lessmw = alchemy.use('less-middleware')

/**
 * A Node.js templating engine built upon TJ Holowaychuk's EJS.
 *
 * @link   https://npmjs.org/package/hawkejs
 */
var hawkejs = alchemy.use('hawkejs');
alchemy.hawkejs = hawkejs;

/**
 * Real-time apps made cross-browser & easy with a WebSocket-like API.
 *
 * @link   https://npmjs.org/package/socket.io
 */
var io = alchemy.use('socket.io');

/**
 * Async is a utility module which provides straight-forward,
 * powerful functions for working with asynchronous JavaScript.
 *
 * @link   https://npmjs.org/package/async
 */
var async = alchemy.use('async');

/**
 * Lib to help you hash passwords.
 *
 * @link   https://npmjs.org/package/bcrypt
 */
var bcrypt = alchemy.use('bcrypt');

/**
 * fs.rename but works across devices. same as the unix utility 'mv'.
 *
 * @link   https://npmjs.org/package/mv
 */
var mv = alchemy.use('mv');

/**
 * Recursively mkdir, like `mkdir -p`.
 *
 * @link   https://npmjs.org/package/mkdirp
 */
var mkdirp = alchemy.use('mkdirp');

/**
 * A module for generating random strings.
 *
 * @link   https://npmjs.org/package/randomstring
 */
var randomstring = alchemy.use('randomstring');

/**
 * Automatic expiring "cache" for Node.js.
 *
 * @link   https://npmjs.org/package/expirable
 */
var expirable = alchemy.use('expirable');

/**
 * Start the timer after requiring
 * 
 * @type {Integer}
 */
alchemy._TimerStart = (new Date).getTime();
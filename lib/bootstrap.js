/**
 * The alchemy global, where everything will be stored
 *
 * @type   object
 */
var alchemy = global.alchemy = {};

/**
 * All requirements will also be cached in here
 *
 * @type   object
 */
alchemy.requirements = {};

/**
 * All classes will be stored here
 *
 * @type   object
 */
alchemy.classes = {};

/**
 * All model classes will be stored here
 *
 * @type   object
 */
alchemy.models = {};

/**
 * All controller classes will be stored here
 *
 * @type   object
 */
alchemy.controllers = {};

/**
 * Alchemy class instances will be stored here
 */
alchemy.instances = {
	controllers: {},
	models: {}
};

/**
 * Load in basic functions.
 */
require('./basics');
require('./core/inflections');
console.log('Loaded inflections');

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
 * Create an event emitter for alchemy,
 * and alias some functions
 */
var Events = new (require('events').EventEmitter)();
alchemy.on = function(){Events.on.apply(this, arguments);}
alchemy.emit = function(){Events.emit.apply(this, arguments);}
alchemy.once = function(){Events.once.apply(this, arguments);}
alchemy.removeListener = function(){Events.removeListener.apply(this, arguments);}

// Prepare the settings object
var settings = alchemy._settings = {};

// Get the local (environment) specific settings
var local = require(path.resolve(root, 'config', 'local'));
settings.environment = local.environment;

// Get default settings
var default_settings = require(path.resolve(root, 'config', 'default'));
settings.config = default_settings;

// Get the config
var env_config = require(path.resolve(root, 'config', settings.environment, 'config'));

// Overwrite default config with environment config
for (var i in env_config) settings.config[i] = env_config[i];

/**
 * Load in database functions.
 */
require('./database');

/**
 * Load in core components.
 */
require('./core/base_class');
require('./core/component');
require('./core/controller');
require('./core/model');
require('./core/routing');

var store = new express.session.MemoryStore;

// Get the root directory
var root = path.dirname(require.main.filename);

// Set the root global
global.ROOT = root;

// Set the types global
global.Types = mongoose.Types;

alchemy.cache = new expirable('5 minutes');

// Say we're not connected to a database yet
alchemy._datasourcesConnected = false;
alchemy._associationsCreated = false;

alchemy.on('datasourcesConnected', function() {
	alchemy._datasourcesConnected = true;
});

alchemy.on('associationsCreated', function() {
	alchemy._associationsCreated = true;
});

// Initialize express
var app = express();
alchemy._app = app;

// Get the database settings
var datasources = require(path.resolve(root, 'config', settings.environment, 'database'));
settings.datasources = datasources;

// Create the app
alchemy._server = http.createServer(app);

// Load in the lib app folder structure
alchemy.useTree(__dirname);

// Load in the app
alchemy.useTree(path.resolve(root, 'app'));

// Register all the models in the database, every time a connection is made
alchemy.on('datasourcesConnected', function(){alchemy.registerModels();});

// Initialize db connections
alchemy.addDatasources(settings.datasources);

// See if we want to enable debugging
if (settings.config.debug) {
	hawkejs._debug = true;
	app.use(express.logger('dev'));
}

// Add our extra hawkejs helpers
hawkejs.addHelpers(path.join(__dirname, 'core', 'inflections.js'), {server: false, common: false});

// Use hawkejs as our template engine, map it to the .ejs extension
app.engine('ejs', hawkejs.__express);

// Add client side suport
if (settings.config.hawkejsClient) hawkejs.enableClientSide(app, express, path.resolve(root, 'app', 'view'), path.resolve(root, 'public', 'views'));

app.configure(function(){
	
	// Express configurations
	app.set('view engine', 'ejs');
	
	// Enable gzip/deflate compression
	if (settings.config.compression) app.use(express.compress());
	
	// Enable json, urlencode & multipart decoding
	if (settings.config.decoding) app.use(express.bodyParser());
	
	// Enable (signed) cookie support
	if (settings.config.cookies) app.use(express.cookieParser(settings.config.cookies));
	
	app.use(express.methodOverride());
	
	// Enable sessions
	if (settings.config.sessions) app.use(express.cookieSession());
		
	//app.use('/img', express.static(path.join(__dirname, 'public', 'img')));
		
	app.use(lessmw({src    : path.resolve(root, 'assets', 'less'),
					paths  : [],
					dest   : path.resolve(root, 'public', 'stylesheets'),
					prefix : '/stylesheets'
					}));
		
	app.use(express.static(path.resolve(root, 'public')));

	// Add Hawkejs' middleware
	app.use(hawkejs.middleware);
});

// Load the routes
require(path.resolve(root, 'config', 'routes'));

alchemy._server.listen(settings.config.port, function(){
	console.log('Listening on ' + settings.config.port);
});
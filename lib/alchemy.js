/**
 * All our external requirements
 */
var express = require('express');
var mongoose = require('mongoose');
var http = require('http');
var less = require('less');
var lessmw = require('less-middleware')
var path = require('path');
var store = new express.session.MemoryStore;
var bcrypt = require('bcrypt');
var async = require('async');
var io = require('socket.io');
var util = require('util');
var randomstring = require('randomstring');
var fs = require('fs');
var mv = require('mv');
var mkdirp = require('mkdirp');
var hawkejs = require('hawkejs');
var expirable = require('expirable');

// Add inflection support to string objects
require('./inflections');

// Get the root directory
var root = path.dirname(require.main.filename);

// Set the root global
global.ROOT = root;

// Set the types global
global.Types = mongoose.Types;

// Set the alchemy global
var alchemy = global.alchemy = {};

alchemy.cache = new expirable('5 minutes');
alchemy.classes = {};

// Initialize express
var app = express();
alchemy._app = app;

// Prepare the settings object
var settings = alchemy._settings = {};

// Get the local (environment) specific settings
var local = require(path.resolve(root, 'config', 'local'));
settings.environment = local.environment;

// Get default settings
var default_settings = require(path.resolve(root, 'config', 'default'));
settings.config = default_settings;

// Get the database settings
var datasources = require(path.resolve(root, 'config', settings.environment, 'database'));
settings.datasources = datasources;

// Get the config
var env_config = require(path.resolve(root, 'config', settings.environment, 'config'));

// Overwrite default config with environment config
for (var i in env_config) settings.config[i] = env_config[i];

var db_connections = {};

// Connect to the databases
(function() {
	
	var d;
	var uri;
	
	for (var name in datasources) {
		
		// Get the current datasource settings
		d = datasources[name];
		
		// Prepare the uri string
		uri = 'mongodb://';
		
		// Add a login & password if needed
		if (d.login && d.password) {
			uri += d.login + ':' + d.password + '@';
		}
		
		// Add the host name or ip
		uri += d.host;
		
		// Add a port if set
		if (d.port) {
			uri += ':' + d.port;
		}
		
		// Add the database name
		uri += '/' + d.database;
		
		// Create the connection
		db_connections[name] = mongoose.createConnection(uri);
		
		db_connections[name].on('error', console.error.bind(console, 'Database (' + name + ') connection error:'));
		
		db_connections[name].once('open', function callback () {
			// Database connection has been made
		});
		
	}
})();

alchemy._db_connections = db_connections;

// Get the core files
require('./core/base_class');
require('./core/model');
require('./core/controller');
require('./core/component');

require('./components/auth_component');

// Create the app
alchemy._server = http.createServer(app);

// Require the helpers
require('./helpers');
require('./globals');

// Store alchemy class instances in here
alchemy.instances = {
	controllers: {},
	models: {}
};

// Load in the app
alchemy.loadApp(path.resolve(root, 'app'));
console.log('Debug: ' + settings.config.debug);
// See if we want to enable debugging
if (settings.config.debug) {
	hawkejs._debug = true;
	app.use(express.logger('dev'));
}

// Add our extra hawkejs helpers
hawkejs.addHelpers(path.join(__dirname, 'inflections.js'), {server: false, common: false});
hawkejs.addHelpers(path.join(__dirname, 'hawkejs-helpers.js'));

// Use hawkejs as our template engine, map it to the .ejs extension
app.engine('ejs', hawkejs.__express);

// Add client side suport
if (settings.config.hawkejsClient) hawkejs.enableClientSide(app, express, path.resolve(root, 'app', 'views'), path.resolve(root, 'public', 'views'));

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

// Like `.apply`, but with some predefined variables in its scope
/**
 * Run a function in the given context, with the given arguments,
 * and add the scope_args to its scope
 *
 * This is a proof-of-concept function.
 * This code is very slow because of the use of eval()
 *
 * @param   {object}   context    The context, which will bind to `this`
 * @param   {array}    args       The arguments to pass to the function
 * @param   {object}   scope_args The variables to inject into the scope
 */
Function.prototype.compel = function(context, args, scope_args) {
	
	var code = '';
	
	// Every scope_args entry will be added to this code
	for (var name in scope_args) {
		code += 'var ' + name + ' = scope_args["' + name + '"];';
	}
	
	// eval the code, so these variables are available in this scope
	eval(code);
	
	if (!this.__source__) this.__source__ = String(this);
	
	eval('var fnc = ' + this.__source__);

	// Apply the function source
	return fnc.apply(context, args);
}


// Load the routes
require(path.resolve(root, 'config', 'routes'));

alchemy._server.listen(settings.config.port, function(){
	console.log('Listening on ' + settings.config.port);
});
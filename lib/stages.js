/**
 * This file is loaded after the main 'init' & 'core' folder files.
 * Its main purpose is to launch the server in several stages.
 *
 * Alchemy: Node.js MVC Framework
 * Copyright 2013-2013
 *
 * Licensed under The MIT License
 * Redistributions of files must retain the above copyright notice.
 *
 * @copyright   Copyright 2013-2013
 * @since       0.0.1
 * @license     MIT License (http://www.opensource.org/licenses/mit-license.php)
 */
var path       = alchemy.modules.path,
    settings   = alchemy.settings,
    http       = alchemy.modules.http,
    hawkejs    = alchemy.modules.hawkejs,
    express    = alchemy.modules.express,
    lessmw     = alchemy.modules.lessmw,
    MongoStore = require('connect-mongo'),
    toobusy;

// Configure 'toobusy' if it is enabled in the config
if (settings.config.toobusy) {

	// Require the toobusy module
	toobusy = require('toobusy');

	// If the config is a number, use that as the lag threshold
	if (typeof settings.config.toobusy === 'number') {
		toobusy.maxLag(settings.config.toobusy);
	}
}

// Get the database settings
var datasources = require(path.resolve(PATH_ROOT, 'app', 'config', settings.environment, 'database'));
settings.datasources = datasources;

alchemy.sputnik.defineStage('views', function() {
	log.info('Loading views...');
});

alchemy.sputnik.defineStage('stylesheets', function() {
	log.info('Loading stylesheets...');
});

/**
 * The "express" stage:
 * 
 * Create the express app and server (but do not start it yet)
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.sputnik.defineStage('express', function expressStage () {

	// Store the express class directly under the alchemy object
	alchemy.express = alchemy.modules.express;
	
	// Create an express application
	alchemy.app = alchemy.express();
	
	// Create the server
	alchemy.server = alchemy.modules.http.createServer(alchemy.app);
	
});

/**
 * The "coreApp" stage:
 * 
 * Load in Alchemy's main 'app' folder.
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.sputnik.defineStage('coreApp', function coreAppStage () {

	alchemy.usePath(path.resolve(PATH_CORE, 'app'), {order: 20});
	
});

/**
 * The "datasources" stage:
 * 
 * Make a connection to all the datasources.
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.sputnik.defineStage('datasources', function datasourcesStage () {
	// Initialize db connections
	alchemy.initDatasources(settings.datasources);
});

/**
 * The "plugins" stage:
 * 
 * Initialize the defined plugins.
 *
 * @author        Jelle De Loecker   <jelle@kipdola.be>
 * @since         0.0.1
 * @version       0.0.1
 */
alchemy.sputnik.defineStage('plugins', function() {

	// Prevent the baseApp from loading
	this.prevent('baseApp');
	this.prevent('datasources');

	// Load in the plugins
	alchemy.startPlugins();
	
});

// Define the base app state
alchemy.sputnik.defineStage('baseApp', function() {
	
	// Load in the app
	alchemy.usePath(APP_ROOT, {order: 0});
	
});

// Begin defining debug state
alchemy.sputnik.defineStage('defineDebug', function() {
	
	// See if we want to enable debugging
	if (settings.config.debug) {
		alchemy.hawkejs._debug = true;
		alchemy.app.use(alchemy.express.logger({stream: log.expressStream}));
	}
});

// Define hawkejs setup
alchemy.sputnik.defineStage('hawkejsSetup', function() {

	alchemy.hawkejs.utils.logger = function logger(message, separate, level, meta) {
		
		if (level === undefined) level = 'info';

		if (level == 'info') {
			log.verbose(message, {level: 3});
		} else if (level == 'error') {
			log.error(message, {level: 3});
		}
	};

	// Add our extra hawkejs helpers
	alchemy.hawkejs.addHelpers(path.join(__dirname, 'init', 'inflections.js'), {server: false, common: false});
	
	// Use hawkejs as our template engine, map it to the .ejs extension
	alchemy.app.engine('ejs', alchemy.hawkejs.__express);
	
	// Add client side suport
	if (settings.config.hawkejsClient) alchemy.hawkejs.enableClientSide(alchemy.app, alchemy.express, alchemy._sourceViewDirs.reverse(), path.resolve(APP_ROOT, 'public', 'views'));

	// Make sure the doExposure drone runs
	alchemy.hawkejs.afterPayload(function(next, payload) {
		payload.request.drones['doExposure'] = true;
		next();
	});
});

// Define middleware
alchemy.sputnik.defineStage('middleware', function() {

	var dbc = settings.datasources.default;

	// Express configurations
	alchemy.app.set('view engine', 'ejs');

	var compress     = alchemy.express.compress(),
	    jsonparser   = alchemy.express.json(),
	    urlencparser = alchemy.express.urlencoded(),
	    multiparser  = alchemy.express.multipart(),
	    lessMiddle;

	lessMiddle = lessmw({
		src:   path.resolve(PATH_TEMP, 'stylesheets'), // Source folder
		paths: [], // Import paths
		prefix: '/public/stylesheets'
	});

	// Add middleware functions that have to use the native express/connect middleware function

	// Enable (signed) cookie support
	if (settings.config.cookies) alchemy.app.use(alchemy.express.cookieParser(settings.config.cookies));

	alchemy.app.use(alchemy.express.methodOverride());

	// Enable sessions
	if (settings.config.sessions === 'cookie') {
		// Store session in a cookie on the client side
		alchemy.app.use(alchemy.express.cookieSession());
	} else if (settings.config.sessions === 'server') {
		// Store it on the server, but clear after restart
		alchemy.app.use(alchemy.express.session({secret: settings.config.sessionKey}));
	} else if (settings.config.sessions === 'persistent') {
		// Store it on the server and inside mongo
		alchemy.app.use(alchemy.express.session({
			secret: settings.config.sessionKey,
			store: new MongoStore({
				db: dbc.database,
				host: dbc.host,
				port: dbc.port,
				username: dbc.login,
				password: dbc.password,
				collection: 'alchemy_sessions'
			})
		}));
	}

	// The entire PATH_TEMP folder is publicly accessible
	alchemy.static('/', PATH_TEMP);
	
	// Add middleware functions using alchemy's handler
	alchemy.app.use(alchemy.doMiddleware);
	
	// See if the server isn't too busy
	alchemy.addMiddleware(9999, 'toobusy', function(req, res, next){
		if (settings.config.toobusy) {
			req.toobusy = toobusy(); 
		} else {
			req.toobusy = false;
		}

		next();
	});

	// Enable gzip/deflate compression
	alchemy.addMiddleware(9990, 'compression', function(req, res, next){
		if (settings.config.compression) compress(req, res, next);
		else next();
	});

	// Enable json, urlencode & multipart decoding
	alchemy.addMiddleware(9001, 'decoding-json', function(req, res, next){
		if (settings.config.decoding) jsonparser(req, res, next);
		else next();
	});

	alchemy.addMiddleware(9010, 'decoding-url', function(req, res, next){
		if (settings.config.decoding) urlencparser(req, res, next);
		else next();
	});

	// @todo: Make sure we don't get spammed with files.
	// these will need to be removed manually
	alchemy.addMiddleware(9015, 'decoding-multipart', function(req, res, next){
		if (settings.config.decoding) multiparser(req, res, next);
		else next();
	});

	// Add less middleware
	alchemy.addMiddleware(800, 'less', function(req, res, next){
		lessMiddle(req, res, next);
	});
	
	// Add hawkejs middleware
	alchemy.addMiddleware(500, 'hawkejs', function(req, res, next){
		alchemy.hawkejs.middleware(req, res, next);
	});

	// The last express middleware is always router,
	// It is assigned number 100 in alchemy
	alchemy.app.use(alchemy.app.router);
});

// Link static files
alchemy.sputnik.defineStage('static', function() {
	
	// Prevent the routes stage from beginning while this hasn't finished
	this.prevent('routes');

});

alchemy.sputnik.after('static', function() {
	alchemy.setStatic();
});

// Load the routes
alchemy.sputnik.defineStage('routes', function() {
	require(path.resolve(APP_ROOT, 'config', 'routes'));
});

alchemy.sputnik.defineStage('startServer', function() {
	alchemy.server.listen(settings.config.port, function(){
		log.info('HTTP server listening on port ' + String(settings.config.port).bold.blue, {level: 1});
	});
});

alchemy.sputnik.after(['datasources', 'static'], function() {
	alchemy.sputnik.launch('startServer');
});

alchemy.sputnik.launch([
	'express',
	'coreApp',
	'plugins',
	'baseApp',
	'middleware',
	'datasources',
	'defineDebug',
	'hawkejsSetup',
	'views',
	'stylesheets',
	'static',
	'routes']);
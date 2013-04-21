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
var path = alchemy.modules.path;
var settings = alchemy._settings;
var http = alchemy.modules.http;
var hawkejs = alchemy.modules.hawkejs;
var express = alchemy.modules.express;
var lessmw = alchemy.modules.lessmw;

// Get the database settings
var datasources = require(path.resolve(root, 'app', 'config', settings.environment, 'database'));
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

	// Load in the plugins
	alchemy.startPlugins();
	
});

// Define the base app state
alchemy.sputnik.defineStage('baseApp', function() {
	
	// Load in the app
	alchemy.usePath(path.resolve(PATH_ROOT, 'app'), {order: 0});
	
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

	// Add our extra hawkejs helpers
	alchemy.hawkejs.addHelpers(path.join(__dirname, 'init', 'inflections.js'), {server: false, common: false});
	
	// Use hawkejs as our template engine, map it to the .ejs extension
	alchemy.app.engine('ejs', alchemy.hawkejs.__express);
	
	// Add client side suport
	if (settings.config.hawkejsClient) alchemy.hawkejs.enableClientSide(alchemy.app, alchemy.express, alchemy._sourceViewDirs.reverse(), path.resolve(PATH_ROOT, 'public', 'views'));
});

// Define middleware
alchemy.sputnik.defineStage('middleware', function() {
	
	// Express configurations
	alchemy.app.set('view engine', 'ejs');
	
	// Enable gzip/deflate compression
	if (settings.config.compression) alchemy.app.use(alchemy.express.compress());
	
	// Enable json, urlencode & multipart decoding
	if (settings.config.decoding) alchemy.app.use(alchemy.express.bodyParser());
	
	// Enable (signed) cookie support
	if (settings.config.cookies) alchemy.app.use(alchemy.express.cookieParser(settings.config.cookies));
	
	alchemy.app.use(alchemy.express.methodOverride());
	
	// Enable sessions
	if (settings.config.sessions) alchemy.app.use(alchemy.express.cookieSession());
	
	//app.use('/img', express.static(path.join(__dirname, 'public', 'img')));

	alchemy.app.use(lessmw({src    : path.resolve(PATH_ROOT, 'temp', 'less'),
					paths  : [],
					dest   : path.resolve(PATH_ROOT, 'public', 'stylesheets'),
					prefix : '/public/stylesheets'
					}));
	
	// Add Hawkejs' middleware
	alchemy.app.use(alchemy.hawkejs.middleware);
	
});

// Link static files
alchemy.sputnik.defineStage('static', function() {
	pr('Setting static files'.bold.underline.blue)
	alchemy.setStatic();
});

// Load the routes
alchemy.sputnik.defineStage('routes', function() {
	require(path.resolve(PATH_ROOT, 'app', 'config', 'routes'));
});

alchemy.sputnik.defineStage('startServer', function() {
	pr('Launching server!'.bold);
	alchemy.server.listen(settings.config.port, function(){
		log.info('Server listening on ' + settings.config.port);
	});
});

alchemy.sputnik.onBegin(function(stage) {
	log.verbose('Beginning stage ' + stage.name);
});

alchemy.sputnik.onEnd(function(stage) {
	log.verbose('Ending stage ' + stage.name);
});

alchemy.sputnik.after(['datasources', 'static'], function() {
	pr('Launching server after sputnik'.bold.red)
	alchemy.sputnik.launch('startServer');
});

alchemy.sputnik.launch([
	'express',
	'coreApp',
	'plugins',
	'baseApp',
	'datasources',
	'defineDebug',
	'hawkejsSetup',
	'views',
	'stylesheets',
	'middleware',
	'static',
	'routes']);
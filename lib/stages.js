/**
 * Various launch stages 
 */

var path = alchemy.modules.path;
var settings = alchemy._settings;
var http = alchemy.modules.http;
var hawkejs = alchemy.modules.hawkejs;
var express = alchemy.modules.express;
var lessmw = alchemy.modules.lessmw;

// Initialize express-stage
alchemy.sputnik.defineStage('loadExpress', function() {

	var app = express();
	alchemy.app = app;
	alchemy.express = express;
	
	// Create the app
	alchemy._server = http.createServer(app);
	
});

// Get the database settings
var datasources = require(path.resolve(root, 'app', 'config', settings.environment, 'database'));
settings.datasources = datasources;

// Define the core app state
alchemy.sputnik.defineStage('coreApp', function() {

	// Load in the core app folder structure
	alchemy.useTree(path.resolve(__dirname, 'app'));
	
});

// Begin the db connections state
alchemy.sputnik.defineStage('datasources', function() {
	
	// Initialize db connections
	alchemy.addDatasources(settings.datasources);
	
});

// Define the plugin state
alchemy.sputnik.defineStage('plugins', function() {

	// Load in the plugins
	alchemy.usePlugins(path.resolve(root, 'app', 'plugins'));
	
});

// Define the base app state
alchemy.sputnik.defineStage('baseApp', function() {
	
	// Load in the app
	alchemy.useTree(path.resolve(root, 'app'));
	
});

// Begin defining debug state
alchemy.sputnik.defineStage('defineDebug', function() {
	
	// See if we want to enable debugging
	if (settings.config.debug) {
		hawkejs._debug = true;
		alchemy.app.use(express.logger('dev'));
	}
});

// Define hawkejs setup
alchemy.sputnik.defineStage('hawkejsSetup', function() {

	// Add our extra hawkejs helpers
	hawkejs.addHelpers(path.join(__dirname, 'init', 'inflections.js'), {server: false, common: false});
	
	// Use hawkejs as our template engine, map it to the .ejs extension
	alchemy.app.engine('ejs', hawkejs.__express);
	
	// Add client side suport
	if (settings.config.hawkejsClient) hawkejs.enableClientSide(alchemy.app, express, alchemy._sourceViewDirs.reverse(), path.resolve(root, 'public', 'views'));
});

// Define middleware
alchemy.sputnik.defineStage('middleware', function() {
	
	// Express configurations
	alchemy.app.set('view engine', 'ejs');
	
	// Enable gzip/deflate compression
	if (settings.config.compression) alchemy.app.use(express.compress());
	
	// Enable json, urlencode & multipart decoding
	if (settings.config.decoding) alchemy.app.use(express.bodyParser());
	
	// Enable (signed) cookie support
	if (settings.config.cookies) alchemy.app.use(express.cookieParser(settings.config.cookies));
	
	alchemy.app.use(express.methodOverride());
	
	// Enable sessions
	if (settings.config.sessions) alchemy.app.use(express.cookieSession());
	
	//app.use('/img', express.static(path.join(__dirname, 'public', 'img')));

	alchemy.app.use(lessmw({src    : path.resolve(root, 'assets', 'less'),
					paths  : [],
					dest   : path.resolve(root, 'public', 'stylesheets'),
					prefix : '/public/stylesheets'
					}));
	
	alchemy.static('/', path.resolve(root, 'public'), 0);

	// Add Hawkejs' middleware
	alchemy.app.use(hawkejs.middleware);
	
});

// Link static files
alchemy.sputnik.defineStage('static', function() {
	alchemy.setStatic();
});

// Load the routes
alchemy.sputnik.defineStage('routes', function() {
	require(path.resolve(root, 'app', 'config', 'routes'));
});

alchemy.sputnik.defineStage('startServer', function() {
	alchemy._server.listen(settings.config.port, function(){
		log.info('Server listening on ' + settings.config.port);
	});
});

alchemy.sputnik.onBegin(function(stage) {
	log.verbose('Beginning stage ' + stage.name);
});

alchemy.sputnik.onEnd(function(stage) {
	log.verbose('Ending stage ' + stage.name);
});

alchemy.sputnik.after(['coreApp', 'static', 'datasources'], function() {pr('coreApp, static and datasources have finished!')});

alchemy.sputnik.launch([
	'loadExpress',
	'coreApp',
	'plugins',
	'baseApp',
	'datasources',
	'defineDebug',
	'hawkejsSetup',
	'middleware',
	'static',
	'routes',
	'startServer']);
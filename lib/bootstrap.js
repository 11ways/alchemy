/**
 * Define variables, like the global alchemy object
 */
require('./init/variables');

/**
 * Define logging functions
 */
require('./init/logging');

/**
 * Add inflections to the string prototype
 */
require('./init/inflections');

/**
 * Require basic functions
 */
require('./init/functions');

/**
 * Pre-load basic requirements
 */
require('./init/requirements');

/**
 * Set up configuration
 */
require('./init/settings');

/**
 * Set up the Base Class,
 * from which every other class inherits
 */
require('./core/base_class');

/**
 * Require database stuff
 */
require('./core/database');

/**
 * Set up routing functions
 */
require('./core/routing');

/**
 * Set up the triage
 */
var Triage = require('./init/triage');
alchemy.triage = new Triage();

/**
 * Load in all classes
 */
alchemy.usePath(__dirname + '/class');

/**
 * From this point on, asynchronous calls can be made
 */

/**
 * Load the base app
 */
alchemy.useTree('./app');

/**
 * Create a new expirable cache
 */
alchemy.cache = new alchemy.modules.expirable('5 minutes');

// Say we're not connected to a database yet
alchemy._datasourcesConnected = false;
alchemy._associationsCreated = false;

alchemy.on('datasourcesConnected', function() {
	alchemy._datasourcesConnected = true;
	
	// Register all the models in the database, every time a connection is made
	alchemy.registerModels();
});

alchemy.on('associationsCreated', function() {
	alchemy._associationsCreated = true;
});

var path = alchemy.modules.path;
var settings = alchemy._settings;
var http = alchemy.modules.http;
var hawkejs = alchemy.modules.hawkejs;
var express = alchemy.modules.express;
var lessmw = alchemy.modules.lessmw;

// Initialize express
var app = express();
alchemy._app = app;
alchemy.express = express;

// Get the database settings
var datasources = require(path.resolve(root, 'app', 'config', settings.environment, 'database'));
settings.datasources = datasources;

// Create the app
alchemy._server = http.createServer(app);

// Define the core app state
alchemy.triage.defineState('coreApp', function() {

	// Load in the core app folder structure
	alchemy.useTree(path.resolve(__dirname, 'app'));
	
});

// Define the plugin state
alchemy.triage.defineState('plugins', function() {

	// Load in the plugins
	alchemy.usePlugins(path.resolve(root, 'app', 'plugins'));
	
});

// Define the base app state
alchemy.triage.defineState('baseApp', function() {
	
	// Load in the app
	alchemy.useTree(path.resolve(root, 'app'));
	
});


// Begin the db connections state
alchemy.triage.defineSate('dataSource', function() {
	
	// Initialize db connections
	alchemy.addDatasources(settings.datasources);
	
});

// Begin defining debug state
alchemy.triage.defineSate('defineDebug', function() {
	
	// See if we want to enable debugging
	if (settings.config.debug) {
		hawkejs._debug = true;
		app.use(express.logger('dev'));
	}
}

// Add our extra hawkejs helpers
hawkejs.addHelpers(path.join(__dirname, 'init', 'inflections.js'), {server: false, common: false});

// Use hawkejs as our template engine, map it to the .ejs extension
app.engine('ejs', hawkejs.__express);

// Add client side suport
if (settings.config.hawkejsClient) hawkejs.enableClientSide(app, express, alchemy._sourceViewDirs.reverse(), path.resolve(root, 'public', 'views'));
//path.resolve(root, 'app', 'view')

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
					prefix : '/public/stylesheets'
					}));
	
	alchemy.static('/', path.resolve(root, 'public'), 0);

	// Add Hawkejs' middleware
	app.use(hawkejs.middleware);
});

alchemy.setStatic();

pr('Going to load routes');

// Load the routes
require(path.resolve(root, 'app', 'config', 'routes'));

alchemy._server.listen(settings.config.port, function(){
	console.log('Listening on ' + settings.config.port);
});
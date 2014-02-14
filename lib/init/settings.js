var path = alchemy.use('path');

// Prepare the settings object
var settings = alchemy.settings = {};

// Get the local (environment) specific settings
var local = require(path.resolve(PATH_ROOT, 'app', 'config', 'local'));
settings.environment = local.environment;

// Get default settings
var default_settings = require(path.resolve(PATH_ROOT, 'app', 'config', 'default'));
settings.config = default_settings;

// Get the config
var env_config = require(path.resolve(PATH_ROOT, 'app', 'config', settings.environment, 'config'));

// Overwrite default config with environment config and optional local overrides
alchemy.inject(settings.config, env_config, local.override);

// Options passed as arguments get the highest preference
process.argv.filter(function(argument) {

	if (argument.startsWith('--port=')) {

		argument = Number(argument.replace('--port=', ''));

		// If the argument is a number, and it's not a priviled port,
		// override the port setting
		if (argument) {
			log.info('Using port setting from argument: ' + String(argument).bold.blue);
			settings.config.port = argument;
		} else {
			
		}
	}
});

var port = settings.config.port,
    portError = 'Could not use port number ' + String(port).bold.red + ' because ';

// Make sure the port is valid
if (port > 65535) {
	die(portError + 'there is no port higher than 65535. Please use ports between 1023 and 49151.');
} else if (port > 49151) {
	die(portError + 'it\'s an ephemeral port. Please use ports between 1023 and 49151.');
} else if (port < 1024) {
	die(portError + 'it\'s a priviliged port. Please use ports between 1023 and 49151.');
} else if (!port) {
	die(portError + 'it\'s not a valid number.');
}
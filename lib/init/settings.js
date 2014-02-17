var path = alchemy.use('path'),
    default_settings,
    default_path,
    env_config,
    local_path,
    portError,
    env_path,
    settings,
    local,
    port;

// Prepare the settings object
settings = alchemy.settings = {
	config: {
		logTrace: true
	}
};

// Generate the local path
local_path = path.resolve(PATH_ROOT, 'app', 'config', 'local');

// Get the local (environment) specific settings
try {
	local = require(local_path);
	settings.environment = local.environment;
} catch(err) {
	die('Could not find local settings file at "' + local_path + '.js"');
}

// Generate the default path
default_path = path.resolve(PATH_ROOT, 'app', 'config', 'default');

// Get default settings
try {
	default_settings = require(default_path);
	settings.config = default_settings;
} catch(err) {
	die('Could not find default settings file at "' + default_path + '.js"');
}

// Generate the env path
env_path = path.resolve(PATH_ROOT, 'app', 'config', settings.environment, 'config');

// Get the config
try {
	env_config = require(env_path);
} catch(err) {
	die('Could not find environment settings file at "' + env_path + '.js"');
}

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

port = settings.config.port;
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
var path = require('path'),
    default_path,
    env_config,
    local_path,
    portError,
    env_path,
    settings,
    local,
    port,
    pkg;

// Prepare the settings object
settings = alchemy.settings = {
	log_trace: true
};

// Generate the path to the default settings file
default_path = path.resolve(PATH_ROOT, 'app', 'config', 'default');

// Get default settings
try {
	Object.assign(settings, require(default_path));
} catch(err) {
	settings.no_default_file = default_path;
}

// Generate the path to the local settings file
local_path = path.resolve(PATH_ROOT, 'app', 'config', 'local');

// Get the local settings
try {
	local = require(local_path);
} catch(err) {
	local = {};
	settings.no_local_file = local_path;
}

// Default to the 'dev' environment
if (!local.environment) {
	local.environment = 'dev';
}

// See if a specific environment was passed as an argument
process.argv.forEach(function eachArgument(argument) {
	if (argument.startsWith('--env=')) {
		argument = argument.replace('--env=', '');

		if (argument) {
			console.log('Switching to environment', argument);
			local.environment = argument;
		}
	}
});

// Generate the path to the environment settings file
env_path = path.resolve(PATH_ROOT, 'app', 'config', local.environment, 'config');

// Get the config
try {
	env_config = require(env_path);
} catch(err) {
	env_config = {};
	settings.no_env_file = env_path;
}

// Merge all the settings in order: default - environment - local
Object.merge(settings, env_config, local);

if (!settings.name) {
	try {
		pkg = require(path.resolve(PATH_ROOT, 'package.json'));
		settings.name = pkg.name;
	} catch (err) {
		// Ignore
	}
}

if (settings.title == null) {
	if (pkg && pkg.title) {
		// Allow users to set the title in their package file
		settings.title = pkg.title;
	} else if (settings.name) {
		settings.title = settings.name.replace(/-/g, ' ').titleize();
		settings.titleized = true;
	}
}

// Options passed as arguments get the highest preference
process.argv.forEach(function eachArgument(argument) {

	if (argument.startsWith('--port=')) {

		argument = Number(argument.replace('--port=', ''));

		// If the argument is a number, and it's not a priviliged port,
		// override the port setting
		if (argument) {
			console.info('Using port setting from argument: ' + String(argument).bold.blue);
			settings.port = argument;
		}
	}
});

port = settings.port || 3000;
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

// Set the debug value
global.DEBUG = alchemy.settings.debug
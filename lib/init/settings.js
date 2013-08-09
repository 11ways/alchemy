var path = alchemy.use('path');

// Prepare the settings object
var settings = alchemy._settings = {};

// Get the local (environment) specific settings
console.log(PATH_ROOT);
var local = require(path.resolve(PATH_ROOT, 'app', 'config', 'local'));
settings.environment = local.environment;

// Get default settings
var default_settings = require(path.resolve(PATH_ROOT, 'app', 'config', 'default'));
settings.config = default_settings;

// Get the config
var env_config = require(path.resolve(PATH_ROOT, 'app', 'config', settings.environment, 'config'));

// Overwrite default config with environment config
for (var i in env_config) settings.config[i] = env_config[i];
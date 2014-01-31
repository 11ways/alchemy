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
const PLUGINS_STAGE = STAGES.getStage('load_app').getStage('plugins'),
      libpath = require('path'),
      libfs = require('fs'),
      FLAGS = Symbol('flags');

/**
 * The Plugin class:
 * Represents a plugin that can be used by Alchemy
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name     The name of the plugin
 * @param    {string}   path     The path of the plugin
 * @param    {Object}   default_settings
 */
const Plugin = Function.inherits('Alchemy.Base', function Plugin(name, path, default_settings) {

	// The name of the plugin
	this.name = name;

	// The path of the plugin
	this.path = path;

	// The hard-coded default settings
	this.default_settings = default_settings;

	// Flags
	this[FLAGS] = {
		attempted_bootstrap : false,
		preloaded           : false,
		created_settings    : false,
		started             : false,
	};
});

/**
 * Preload the plugin
 * (Bootstrap & settings)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.1
 *
 * @return   {boolean}
 */
Plugin.setMethod(function doPreload() {

	if (this[FLAGS].preloaded) {
		return false;
	}

	// Create settings from the `config/settings.js` file
	// This can fail if the config is invalid
	try {
		this.loadSettingDefinitions();
	} catch (err) {
		this._handleLoadError('settings', err);
		return false;
	}

	// Load the bootstrap file
	// This can fail due to syntax errors or runtime errors
	try {
		this.loadBootstrap();
	} catch (err) {
		this._handleLoadError('bootstrap', err);
		return false;
	}

	this[FLAGS].preloaded = true;

	PLUGINS_STAGE.addPostTask(() => {
		return this.startPlugin();
	});
});

/**
 * Handle a plugin loading error
 * Plugin errors are fatal - the server cannot start with a broken plugin
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.1
 * @version  1.4.1
 *
 * @param    {string}   phase   Which phase failed (settings, bootstrap, start)
 * @param    {Error}    err     The error that occurred
 */
Plugin.setMethod(function _handleLoadError(phase, err) {
	alchemy.handlePluginError(this.name, phase, err);
});

/**
 * Do the rest of the plugin loading
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {boolean}
 */
Plugin.setMethod(async function startPlugin() {

	if (this[FLAGS].started) {
		return false;
	}

	this[FLAGS].started = true;

	await alchemy.useAppPath(this.path, {plugin: this});
});

/**
 * Create the setting definitions
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.3
 *
 * @return   {boolean}
 */
Plugin.setMethod(function loadSettingDefinitions() {

	if (this[FLAGS].created_settings) {
		return false;
	}

	this[FLAGS].created_settings = true;

	let settings_path = libpath.resolve(this.path, 'config', 'settings.js');

	// See if the file exists
	if (!libfs.existsSync(settings_path)) {
		return false;
	}

	// Get/create this plugin's group definition
	let group = this.getSettingsGroup();

	// Register the plugin's setting definitions
	this.useFile(settings_path, {client: false});

	// Rebuild this plugin's sub-group from its real definitions, preserving any
	// values already applied to it (config overrides / an orphan created before
	// the plugin loaded) plus the plugin's hard-coded default_settings. This is
	// the same orphan-fix the general reconciler uses
	// (Setting.GroupValue#rebuildSubGroup) - a single source of truth.
	let parent = alchemy.system_settings.get('plugins');
	parent.rebuildSubGroup(this.name, group, this.default_settings);

	return true;
});

/**
 * Load the bootstrap file
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {boolean}
 */
Plugin.setMethod(function loadBootstrap() {

	if (this[FLAGS].attempted_bootstrap) {
		return false;
	}

	this[FLAGS].attempted_bootstrap = true;

	let bootstrap_path = libpath.resolve(this.path, 'bootstrap.js');

	// See if the file exists
	if (!libfs.existsSync(bootstrap_path)) {
		return false;
	}

	// Require the bootstrap.js file now
	this.useFile(bootstrap_path, {client: false});

	if (this.default_settings) {
		let settings_group = this.getSettingsGroup();
		settings_group.setDefaultValue(this.default_settings);
	}

	return true;
});

/**
 * Use an entire path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   path
 * @param    {Object}   options
 */
Plugin.setMethod(function usePath(path, options) {

	if (!options) {
		options = {};
	}

	options.plugin = this;

	return alchemy.usePath(path, options);
});

/**
 * Require a file of this plugin
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   path
 * @param    {Object}   options
 *
 * @return   {Mixed}
 */
Plugin.setMethod(function useOnce(path, options) {
	return this.useFile(path, options);
});

/**
 * Require a file of this plugin
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   path
 * @param    {Object}   options
 *
 * @return   {Mixed}
 */
Plugin.setMethod(function useFile(path, options) {

	if (!options) {
		options = {};
	}

	options.plugin = this;

	if (!options.arguments) {

		let argument_configuration = {
			values : [
				Blast,
				Blast.Classes,
				Blast.Types,
				Blast.Collection,
				Blast.Bound,
				Blast.Bound.Object,
				Blast.Collection.Function,
				this,
			],
			names : [
				'Blast',
				'Classes',
				'Types',
				'Collection',
				'Bound',
				'Obj',
				'Fn',
				'Plugin',
			],
		};

		options.arguments = argument_configuration;
	}

	if (typeof path == 'string' && path[0] != '/') {
		path = libpath.resolve(this.path, path);
	}

	return alchemy.useOnce(path, options);
});

/**
 * Get this plugin's settings group
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Alchemy.Setting.Group}
 */
Plugin.setMethod(function getSettingsGroup() {

	let group = Classes.Alchemy.Setting.PLUGINS.get(this.name);

	if (!group) {
		group = Classes.Alchemy.Setting.PLUGINS.createGroup(this.name);
	}

	return group;
});

/**
 * Add a route
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Alchemy.Router.Route}
 */
Plugin.setMethod(function addRoute(config) {
	return Router.add(config);
});

/**
 * Custom Janeway representation (right side)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {String}
 */
Plugin.setMethod(Symbol.for('janeway_arg_right'), function janewayInstanceInfo() {
	return this.name;
});

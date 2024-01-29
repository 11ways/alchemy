const libpath = require('path');

/**
 * The "load_core" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const load_core = STAGES.createStage('load_core');

/**
 * The "load_core.init_settings" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const init_settings = load_core.createStage('init_settings', () => {
	/**
	 * Load the setting class
	 */
	requireCorePath('core', 'setting');

	/**
	 * Load the actual settings
	 */
	requireCorePath('scripts', 'create_settings');
});

/**
 * The "load_core.init_alchemy" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const init_alchemy = load_core.createStage('init_alchemy', () => {
	/**
	 * Load the setting class
	 */
	requireCorePath('core', 'alchemy');

	/**
	 * Load the actual settings
	 */
	requireCorePath('scripts', 'init_alchemy');

	/**
	 * Require basic functions
	 */
	requireCorePath('core', 'alchemy_functions');

	/**
	 * Require load functions
	 */
	requireCorePath('core', 'alchemy_load_functions');
});

/**
 * The "load_core.init_languages" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const init_languages = load_core.createStage('init_languages', () => {
	/**
	 * Get all the languages by their locale
	 */
	requireCorePath('scripts', 'create_languages');
});

/**
 * The "load_core.preload_modules" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const preload_modules = load_core.createStage('preload_modules', () => {
	/**
	 * Pre-load basic requirements
	 */
	requireCorePath('scripts', 'preload_modules');
});

/**
 * The "load_core.devwatch" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const devwatch = load_core.createStage('devwatch', () => {
	/**
	 * Set up file change watchers for development
	 */
	requireCorePath('scripts', 'setup_devwatch');
});

/**
 * The "load_core.migration_class" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const migration_class = load_core.createStage('migration_class', () => {
	/**
	 * The migration class
	 */
	requireCorePath('class', 'migration');
});

/**
 * The "load_core.core_classes" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const core_classes = load_core.createStage('core_classes', () => {

	const CLIENT_HAWKEJS_OPTIONS = {

		// Do not load on the server
		server : false,

		// Turn it into a commonjs load
		make_commonjs: true,

		// The arguments to add to the wrapper function
		arguments : 'hawkejs'
	};

	const SERVER_HAWKEJS_OPTIONS = {

		// Also load on the server
		server : true,

		// Turn it into a commonjs load
		make_commonjs: true,

		// The arguments to add to the wrapper function
		arguments : 'hawkejs'
	};

	/**
	 * Require the base class on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    0.3.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('core', 'base'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Require the client_base class on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.0.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('core', 'client_base'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Require the error class
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'error'), SERVER_HAWKEJS_OPTIONS);

	/**
	 * Require the client_alchemy class on the client side
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.0.5
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('core', 'client_alchemy'), SERVER_HAWKEJS_OPTIONS);

	/**
	 * Require the path_evaluator class
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'path_evaluator'), SERVER_HAWKEJS_OPTIONS);

	/**
	 * Require the field_value class
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'field_value'), SERVER_HAWKEJS_OPTIONS);

	/**
	 * Require the path_definition class on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.0.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'path_definition'), CLIENT_HAWKEJS_OPTIONS);
	alchemy.hawkejs.load(resolveCorePath('class', 'path_param_definition'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Require the element class on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.0.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'element'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Require the helper class on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.0.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'helper'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Require the datasource class on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'datasource'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Require the field class on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'field'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Require the schema_client class on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.1.0
	 * @version  1.1.0
	 */
	alchemy.hawkejs.load(resolveCorePath('class', 'schema_client'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Require the setting classes on the client side too
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.4.0
	 * @version  1.4.0
	 */
	alchemy.hawkejs.load(resolveCorePath('core', 'setting'), CLIENT_HAWKEJS_OPTIONS);

	/**
	 * Set up prefixes
	 */
	alchemy.useOnce(resolveCorePath('core', 'prefix'));

	/**
	 * Set up middleware functions
	 */
	alchemy.useOnce(resolveCorePath('core', 'middleware'));

	/**
	 * Load discovery code
	 */
	alchemy.useOnce(resolveCorePath('core', 'discovery'));

	/**
	 * Load inode classes
	 */
	alchemy.useOnce(resolveCorePath('class', 'inode'));
	alchemy.useOnce(resolveCorePath('class', 'inode_file'));
	alchemy.useOnce(resolveCorePath('class', 'inode_dir'));
	alchemy.useOnce(resolveCorePath('class', 'inode_list'));
});

/**
 * The "load_core.main_classes" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const main_classes = load_core.createStage('main_classes', () => {
	// Load in all main classes
	alchemy.usePath(resolveCorePath('class'));
});

/**
 * The "load_core.app_bootstrap" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const app_bootstrap = load_core.createStage('app_bootstrap', () => {
	// Load the base bootstrap file
	try {
		alchemy.useOnce(libpath.resolve(PATH_ROOT, 'app', 'config', 'bootstrap'));
	} catch (err) {
		if (err.message.indexOf('Cannot find') === -1) {
			alchemy.printLog(alchemy.WARNING, 'Could not load app bootstrap file');
			throw err;
		} else {
			alchemy.printLog(alchemy.SEVERE, 'Could not load config bootstrap file', {err: err});
		}
	}
});
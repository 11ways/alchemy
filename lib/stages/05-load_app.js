const libpath = require('path');

/**
 * The "load_app" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const load_app = STAGES.createStage('load_app');

/**
 * The "load_app.core_app" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const core_app = load_app.createStage('core_app', () => {
	alchemy.usePath(libpath.resolve(PATH_CORE, 'app'), {weight: 1});
});

/**
 * The "load_app.plugins" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const plugins = load_app.createStage('plugins', () => {
	// Load in the plugins
	try {
		alchemy.startPlugins();
	} catch (err) {
		// Constitutors sometimes throw errors during this stage
		log.error('Caught error during "plugins" stage:', err);
		throw err;
	}
});

/**
 * The "load_app.main_app" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const main_app = load_app.createStage('main_app', () => {
	// Load in the app
	alchemy.usePath(PATH_APP, {weight: 20, skip: ['routes']});
});
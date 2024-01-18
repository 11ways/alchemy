const libpath = require('path');

/**
 * The "datasource" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const datasource = STAGES.createStage('datasource');

/**
 * The "datasource.connect" stage:
 * Make a connection to all the datasources.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const connect = datasource.createStage('connect', () => {

	// Force Blast to load
	try {
		Blast.doLoaded();
	} catch (err) {
		alchemy.printLog('error', ['Failed to load application:', err.message], {err: err, level: 1});
		return
	}

	let environment = alchemy.getSetting('environment');

	// Require the environment datasources configuration
	try {
		require(libpath.resolve(PATH_ROOT, 'app', 'config', environment, 'database'));
	} catch (err) {

		if (err.code == 'MODULE_NOT_FOUND') {
			if (!alchemy.getSetting('client_mode')) {
				// Only output a warning when not in client mode
				log.warn('Could not find ' + environment + ' database settings');
			}
		} else {
			log.warn('Could not load ' + environment + ' database settings:', err);
		}

		return;
	}

	let tasks = [];

	// Get all available datasources
	Object.each(Datasource.get(), function eachDatasource(datasource, key) {
		tasks.push(datasource.setup());
	});

	return Function.parallel(tasks);
});
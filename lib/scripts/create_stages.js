/**
 * Load all the stages
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
requireCorePathAll('stages');

/**
 * Add the launching event listener
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Stages.Stage}   stage
 */
STAGES.on('launching', function onLaunch(stage) {

	if (typeof alchemy == 'undefined') {
		return;
	}

	if (!alchemy.getSetting('debugging.debug')) {
		return;
	}

	let id = stage.id.after('root.');

	let colored_name = alchemy.colors.fg.getRgb(0, 5, 5) + id + alchemy.colors.reset;

	let args = ['Launching', colored_name, 'stage…'];

	let line = alchemy.printLog(alchemy.INFO, args, {level: 1});

	if (line && line.args) {
		stage.pledge.then(function finished() {
			line.args.push('Done in', stage.ended - stage.started, 'ms');
			line.dissect();
			line.render();
		});
	}
});

/**
 * Start all the stages
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
STAGES.launch([
	'load_core',
]);
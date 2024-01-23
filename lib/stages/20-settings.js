/**
 * The "settings" stage.
 * The settings definitions should already be loaded.
 * The hard-coded settings too.
 * In this stage, we load the settings from the database.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const settings = STAGES.createStage('settings');

// Do not start this stage before the datasources are connected
settings.dependsOn('datasource.connect');

/**
 * "settings.load"
 * Load the settings from the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const load = settings.createStage('load', async () => {

	let records = await Model.get('AlchemySetting').find('all');

	if (!records.length) {
		return;
	}

	for (let record of records) {
		await record.applySetting(false);
	}
});

/**
 * "settings.perform_actions"
 * Do all the setting-associated actions.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const perform_actions = settings.createStage('perform_actions', async () => {
	await alchemy.system_settings.performAllActions();
});

/**
 * "settings.to_object"
 * Convert the `alchemy.settings` property to a simple object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const to_object = settings.createStage('to_object', async () => {
	// Create the settings object
	alchemy.settings = alchemy.system_settings.toObject();
});
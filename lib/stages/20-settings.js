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
 * "settings.reconcile"
 * Rebuild any setting groups that were orphaned by a config-file override
 * landing before the group's definition was registered (app definitions load
 * in `app_bootstrap`, plugins in `load_app.plugins` - both after the config
 * merge in the Alchemy constructor). Runs before `load` so the database values
 * land on the real-definition value nodes, and before `perform_actions` so
 * actions fire exactly once over the reconciled tree. Silent: fires no actions.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.3
 * @version  1.4.3
 *
 * @type     {Alchemy.Stages.Stage}
 */
const reconcile = settings.createStage('reconcile', () => {
	alchemy.system_settings.reconcileOrphanGroups();
});

/**
 * "settings.load"
 * Load the settings from the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.3
 *
 * @type     {Alchemy.Stages.Stage}
 */
const load = settings.createStage('load', async () => {

	let records = await Model.get('System.Setting').find('all');

	if (!records.length) {
		return;
	}

	for (let record of records) {
		await record.applySetting(false);
	}
});

// Orphan reconciliation must finish before DB values are applied, so the
// values land on the real-definition nodes. Creation order already runs
// `reconcile` first; this makes the contract explicit and reorder-proof.
load.dependsOn('settings.reconcile');

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
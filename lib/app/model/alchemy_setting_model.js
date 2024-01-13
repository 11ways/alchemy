/**
 * The Alchemy Setting model:
 * Contains all the system settings of Alchemy.
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const AlchemySetting = Function.inherits('Alchemy.Model.App', 'AlchemySetting');

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
AlchemySetting.constitute(function addTaskFields() {

	this.addField('setting_id', 'Enum', {
		description: 'The setting id',
		values     : Classes.Alchemy.Setting.SYSTEM.createEnumMap(),
	});

	this.addField('configuration', 'Schema', {
		description: 'The actual configuration of the setting',
		schema     : 'setting_id',
	});
});

/**
 * Configure the default chimera fieldsets
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
AlchemySetting.constitute(function chimeraConfig() {

	if (!this.chimera) {
		return;
	}

	// Get the list group
	let list = this.chimera.getActionFields('list');

	list.addField('setting_id');

	// Get the edit group
	let edit = this.chimera.getActionFields('edit');

	edit.addField('setting_id');
	edit.addField('configuration')
});

/**
 * Do something before saving the record
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Document.AlchemyTask}   doc
 */
AlchemySetting.setMethod(function beforeSave(doc) {

});

/**
 * Update the schedules after saving
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   main
 * @param    {Object}   info
 */
AlchemySetting.setMethod(function afterSave(main, info) {

});

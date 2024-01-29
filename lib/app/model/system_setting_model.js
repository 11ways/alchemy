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
const SystemSetting = Function.inherits('Alchemy.Model.System', 'Setting');

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
SystemSetting.constitute(function addTaskFields() {

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
SystemSetting.constitute(function chimeraConfig() {

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
 * Apply the given changes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   changes
 * @param    {Conduit}  permission_context
 */
SystemSetting.setMethod(async function saveChanges(changes, permission_context) {

	if (!changes) {
		return;
	}

	let setting_id,
	    new_value,
	    setting,
	    doc;

	for (setting_id in changes) {
		new_value = changes[setting_id];
		setting = Classes.Alchemy.Setting.SYSTEM.get(setting_id);

		if (!setting) {
			throw new Error('Unknown setting: ' + setting_id);
		}

		// We don't throw an error here:
		// we assume the user should not have seen this setting anyway
		if (!setting.canBeEditedBy(permission_context)) {
			continue;
		}

		doc = await this.findByValues({
			setting_id: setting_id
		});

		if (!doc) {
			doc = this.createDocument({
				setting_id
			});
		}

		doc.configuration = setting.createConfigurationObject(new_value);

		await doc.save();
	}
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
SystemSetting.setMethod(function beforeSave(doc) {
	return doc.applySetting();
});

/**
 * Apply this setting
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {boolean}   do_actions   Should the setting actions be executed
 */
SystemSetting.setDocumentMethod(function applySetting(do_actions = true) {

	if (!this.setting_id) {
		return;
	}

	let setting = Classes.Alchemy.Setting.SYSTEM.get(this.setting_id);

	if (!setting) {
		return;
	}

	let existing_value = alchemy.system_settings.getPath(this.setting_id);

	if (!existing_value) {
		existing_value = setting.generateValue();
	}

	if (do_actions) {
		return existing_value.setValue(this.configuration.value);
	} else {
		return existing_value.setValueSilently(this.configuration.value);
	}
});
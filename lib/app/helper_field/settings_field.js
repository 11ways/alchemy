/**
 * A Settings field lets you add settings to something
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const Settings = Function.inherits('Alchemy.Field.Schema', function Settings(schema, name, options) {

	if (!options?.setting_group) {
		throw new Error('A settings field requires a `setting_group` option with');
	}

	// A custom schema should NOT be passed to this class, this class uses
	// a fixed schema that should not be altered.
	// But because that's exactly what happens when cloning (like preparing
	// the data to be sent to Hawkejs) we have to allow it anyway
	if (!options.schema) {
		let settings_schema = alchemy.createSchema();

		settings_schema.addField('setting_id', 'Enum', {
			description: 'The setting id',
			values     : options.setting_group.createEnumMap(),
		});

		settings_schema.addField('configuration', 'Schema', {
			description: 'The actual configuration of the setting',
			schema     : 'setting_id',
		});
		
		options.schema = settings_schema;
	}

	Settings.super.call(this, schema, name, options);
});

/**
 * Is this schema field always an array?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Boolean}
 */
Settings.setProperty('force_array_contents', true);

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   value
 *
 * @return   {Settings}
 */
Settings.setCastFunction(function cast(value) {

	let result = this.options.setting_group.generateValue();

	if (value) {
		result.setValueSilently(value);
	}

	return result;
});

/**
 * Prepare the value of this field to be stored in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
Settings.setMethod(function _toDatasource(context, value) {

	if (value) {
		value = value.toDatasourceArray();
		context = context.withWorkingValue(value);
	}

	_toDatasource.super.call(this, context, value);
});

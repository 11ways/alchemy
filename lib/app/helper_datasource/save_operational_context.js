/**
 * The Save OperationalContext class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const SaveDocumentToDatasource = Function.inherits('Alchemy.OperationalContext.DatasourceOperationalContext', 'SaveDocumentToDatasource');

/**
 * Set the converted data
 * (The root data passed through all the `toDatasource` methods)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   data
 */
SaveDocumentToDatasource.setContextProperty('converted_data');

/**
 * Set the save options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   options
 */
SaveDocumentToDatasource.setContextProperty('save_options');

/**
 * Get a field-specific context instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Alchemy.OperationalContext.SaveFieldToDatasource|null}
 */
SaveDocumentToDatasource.setMethod(function getFieldContext(field_name) {

	let field = this.getSchema().getField(field_name);

	if (!field) {
		return;
	}

	let context = new SaveFieldToDatasource(this);
	context.setField(field);

	let field_value = this.getHolder()[field_name];
	context.setFieldValue(field_value);

	return context;
});

/**
 * Get a read-to-app context.
 * This is used for converting the saved data back to the app format.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   data   The datasource data
 *
 * @return   {Alchemy.OperationalContext.ReadDocumentFromDatasource|null}
 */
SaveDocumentToDatasource.setMethod(function getReadFromDatasourceContext(data) {

	let context = new Classes.Alchemy.OperationalContext.ReadDocumentFromDatasource();
	context.setRootData(data);
	context.setModel(this.getModel());
	context.setSchema(this.getSchema());
	context.setDatasource(this.getDatasource());

	return context;
});

/**
 * The field-specific SaveOperationalContext class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const SaveFieldToDatasource = Function.inherits('Alchemy.OperationalContext.SaveDocumentToDatasource', 'SaveFieldToDatasource');

/**
 * Set the field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Field}   field
 */
SaveFieldToDatasource.setContextProperty('field');

/**
 * Set the original field value.
 * This might be a value wrapped in an object (for translations)
 * or in an array (for arrayable fields)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   field_value
 */
SaveFieldToDatasource.setContextProperty('field_value');

/**
 * Set the final converted field value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   datasource_value
 */
SaveFieldToDatasource.setContextProperty('datasource_value');

/**
 * The current working field value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   working_value
 */
SaveFieldToDatasource.setContextProperty('working_value', function getWorkingValue(value) {

	if (value === undefined) {
		value = this.getFieldValue();
	}

	return value;
});

/**
 * Get this with the given working value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   value
 *
 * @return   {Alchemy.OperationalContext.SaveFieldToDatasource}
 */
SaveFieldToDatasource.setMethod(function withWorkingValue(value, holder) {

	let context = this.createChild();
	context.setWorkingValue(value);

	if (holder) {
		context.setHolder(holder);
	}

	return context;
});

/**
 * With subdata value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   value
 *
 * @return   {Alchemy.OperationalContext.SaveFieldToDatasource}
 */
SaveFieldToDatasource.setMethod(function withValueOfSubSchema(value, sub_schema) {

	// The value becomes the holder
	let context = this.withWorkingValue(null, value);

	// The sub_schema becomes the schema
	context.setSchema(sub_schema);

	// And the holder also becomes the working data
	context.setWorkingData(value);

	return context;
});
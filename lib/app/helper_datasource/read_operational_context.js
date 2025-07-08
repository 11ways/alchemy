/**
 * The Read OperationalContext class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const ReadDocumentFromDatasource = Function.inherits('Alchemy.OperationalContext.DatasourceOperationalContext', 'ReadDocumentFromDatasource');

/**
 * Set the root data that is being converted
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   data
 */
ReadDocumentFromDatasource.setContextProperty('root_data');

/**
 * Set the criteria instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Criteria}   criteria
 */
ReadDocumentFromDatasource.setContextProperty('criteria');

/**
 * Get a field-specific context instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Alchemy.OperationalContext.ReadFieldFromDatasource|null}
 */
ReadDocumentFromDatasource.setMethod(function getFieldContext(field_name) {

	let field = this.getSchema().getField(field_name);

	if (!field) {
		return;
	}

	let context = new ReadFieldFromDatasource(this);
	context.setField(field);

	let field_value = this.getWorkingData()[field_name];
	context.setFieldValue(field_value);

	return context;
});

/**
 * The field-specific read operational class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const ReadFieldFromDatasource = Function.inherits('Alchemy.OperationalContext.ReadDocumentFromDatasource', 'ReadFieldFromDatasource');

/**
 * Set the field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Field}   field
 */
ReadFieldFromDatasource.setContextProperty('field');

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
ReadFieldFromDatasource.setContextProperty('field_value');

/**
 * Set the custom holder of this value.
 * This is probbaly the root document,
 * but can be a sub document in case of nested schemas
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   datasource_value
 */
ReadFieldFromDatasource.setContextProperty('holder', function getHolder(holder) {

	if (!holder) {
		holder = this.getRootData();
	}

	return holder;
});

/**
 * The current working field value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   working_value
 */
ReadFieldFromDatasource.setContextProperty('working_value', function getWorkingValue(value) {

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
ReadFieldFromDatasource.setMethod(function withWorkingValue(value, holder) {

	let context = new ReadFieldFromDatasource(this);
	context.setWorkingValue(value);

	if (holder) {
		context.setHolder(holder);
	}

	return context;
});

/**
 * With data for a subschema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   value
 *
 * @return   {Alchemy.OperationalContext.SaveFieldToDatasource}
 */
ReadFieldFromDatasource.setMethod(function withValueOfSubSchema(value, sub_schema) {

	// The value becomes the holder
	let context = this.withWorkingValue(null, value);

	// The sub_schema becomes the schema
	context.setSchema(sub_schema);

	// And the holder also becomes the working data
	context.setWorkingData(value);

	return context;
});
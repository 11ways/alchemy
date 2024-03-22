/**
 * The base OperationalContext class for Datasource related operations
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const DatasourceOperationalContext = Function.inherits('Alchemy.OperationalContext', 'DatasourceOperationalContext');

/**
 * Make this an abtract class
 */
DatasourceOperationalContext.makeAbstractClass();

/**
 * Set the datasource this is for
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Datasource}   datasource
 */
DatasourceOperationalContext.setContextProperty('datasource');

/**
 * Set the model of the data that is being saved
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string|Model}   model
 */
DatasourceOperationalContext.setContextProperty('model');

/**
 * Set the original query (if any)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   query
 */
DatasourceOperationalContext.setContextProperty('query');

/**
 * Get the schema.
 * No schema will return false, an invalid schema will throw.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
DatasourceOperationalContext.setContextProperty('schema', function getSchema(schema) {

	if (schema || schema === false) {
		return schema;
	}

	let model = this.getModel();

	if (model) {
		schema = this.getDatasource().getSchema(model);

		if (Object.isPlainObject(schema)) {
			throw new Error('The provided schema was a regular object');
		}

		this.setSchema(schema);
	}

	if (!schema) {
		if (alchemy.settings.debugging.debug) {
			alchemy.distinctProblem('schema-not-found', 'Schema not found: not normalizing data');
		}
	}

	return schema;
});

/**
 * Set the root data that is being saved
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   data
 */
DatasourceOperationalContext.setContextProperty('root_data');

/**
 * Get the query options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   data
 */
DatasourceOperationalContext.setContextProperty('query_options');

/**
 * Get the current active holder.
 * This is probbaly the root document,
 * but can be a sub document in case of nested schemas.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {*}   datasource_value
 */
DatasourceOperationalContext.setContextProperty('holder', function getHolder(holder) {

	if (!holder) {
		holder = this.getRootData();
	}

	return holder;
});

/**
 * Get the current data in the process of being
 * converted to the datasource format
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
DatasourceOperationalContext.setContextProperty('working_data', function getWorkingData(working_data) {

	if (!working_data) {
		working_data = {...this.getRootData()};
	}

	return working_data;
});

/**
 * Is there a valid schema?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
DatasourceOperationalContext.setMethod(function hasValidSchema() {
	return !!this.getSchema();
});
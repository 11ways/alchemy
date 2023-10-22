/**
 * The abstract LocalTemporal Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
const LocalTemporal = Function.inherits('Alchemy.Field', 'LocalTemporal');

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
LocalTemporal.setMethod(function _castCondition(value, field_paths) {

	if (value == null) {
		return value;
	}

	value = this.cast(value);
	value = value.toNumericRepresentation();

	if (typeof value == 'bigint') {
		value = this.datasource.convertBigIntForDatasource(value);
	}

	return value;
});

/**
 * Prepare the value to be stored in the database
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Mixed}        value       The field's own value
 * @param    {Object}       data        The main record
 * @param    {Datasource}   datasource  The datasource instance
 *
 * @return   {Mixed}
 */
LocalTemporal.setMethod(function _toDatasource(value, data, datasource, callback) {

	value = this.cast(value);

	if (value) {
		value = value.toNumericRepresentation();
	}

	if (typeof value == 'bigint') {
		value = this.datasource.convertBigIntForDatasource(value);
	}

	Blast.nextTick(() => callback(null, value));
});

/**
 * Convert from database to app
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Object}   query     The original query
 * @param    {Object}   options   The original query options
 * @param    {Mixed}    value     The field value, as stored in the DB
 * @param    {Function} callback
 */
LocalTemporal.setMethod(function _toApp(query, options, value, callback) {

	if (value && typeof value == 'object') {
		value = this.datasource.castToBigInt(value);
	}

	value = this.cast(value);

	callback(null, value);
});
/**
 * The Decimal Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
const DecimalField = Function.inherits('Alchemy.Field.Number', 'Decimal');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Mixed}   value
 *
 * @return   {Decimal}
 */
DecimalField.setMethod(function cast(value) {

	// Allow null
	if (value == null) {
		return value;
	}

	if (value instanceof Classes.Develry.Decimal) {
		value = value.toImmutable();
	} else {
		value = new Classes.Develry.Decimal(value);
	}

	return value;
});

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
DecimalField.setMethod(function _castCondition(value, field_paths) {

	if (value == null) {
		return value;
	}

	value = this.cast(value);
	value = this.datasource.convertDecimalForDatasource(value);

	return value;
});

/**
 * Prepare the value to be stored in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Mixed}        value       The field's own value
 * @param    {Object}       data        The main record
 * @param    {Datasource}   datasource  The datasource instance
 *
 * @return   {Mixed}
 */
DecimalField.setMethod(function _toDatasource(value, data, datasource, callback) {

	value = this.cast(value);
	value = this.datasource.convertDecimalForDatasource(value);

	Blast.nextTick(() => callback(null, value));
});

/**
 * Convert from database to app
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {Object}   query     The original query
 * @param    {Object}   options   The original query options
 * @param    {Mixed}    value     The field value, as stored in the DB
 * @param    {Function} callback
 */
DecimalField.setMethod(function _toApp(query, options, value, callback) {

	if (value && typeof value == 'object') {
		value = value.toString();
	}

	value = this.cast(value);

	callback(null, value);
});
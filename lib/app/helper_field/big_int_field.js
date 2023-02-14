let mongo;

if (Blast.isNode) {
	mongo = alchemy.use('mongodb');
}

/**
 * The BigInt Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.6
 */
const BigIntField = Function.inherits('Alchemy.Field.Number', 'BigInt');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.6
 */
BigIntField.setDatatype('bigint');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.6
 *
 * @param    {Mixed}   value
 *
 * @return   {BigInt}
 */
BigIntField.setMethod(function cast(value) {

	// Allow null
	if (value == null) {
		return value;
	}

	return BigInt(value);
});

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.6
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
BigIntField.setMethod(function _castCondition(value, field_paths) {

	value = this.cast(value);

	if (mongo) {
		value = mongo.Long.fromBigInt(value);
	}

	return value;
});

/**
 * Convert the value for the given datasource
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.6
 *
 * @param    {Mixed}        value       The field's own value
 * @param    {Object}       data        The main record
 * @param    {Datasource}   datasource  The datasource instance
 *
 * @return   {Mixed}
 */
BigIntField.setMethod(function _toDatasource(value, data, datasource, callback) {

	value = this.cast(value);

	if (mongo) {
		value = mongo.Long.fromBigInt(value);
	}

	callback(null, value);
});

/**
 * Convert from database to app
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.6
 *
 * @param    {Object}   query     The original query
 * @param    {Object}   options   The original query options
 * @param    {Mixed}    value     The field value, as stored in the DB
 * @param    {Function} callback
 */
BigIntField.setMethod(function _toApp(query, options, value, callback) {

	if (mongo && value && value.toBigInt) {
		value = value.toBigInt();
	}

	value = this.cast(value);

	callback(null, value);
});
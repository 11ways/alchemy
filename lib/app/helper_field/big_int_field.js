let mongo;

if (Blast.isNode) {
	mongo = alchemy.use('mongodb');
}

/**
 * The BigInt Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.6
 */
const BigIntField = Function.inherits('Alchemy.Field.Number', 'BigInt');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.6
 */
BigIntField.setDatatype('bigint');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.4.0
 *
 * @param    {Mixed}   value
 *
 * @return   {BigInt}
 */
BigIntField.setCastFunction(function cast(value) {

	// Allow null
	if (value == null) {
		return value;
	}

	return BigInt(value);
});

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.21
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {*}
 */
BigIntField.setMethod(function _castCondition(value, field_paths) {

	value = this.cast(value);
	value = this.datasource.convertBigIntForDatasource(value);

	return value;
});

/**
 * Convert the value for the given datasource
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.3.20
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {BigInt}
 */
BigIntField.setMethod(function _toDatasource(context, value) {

	value = this.cast(value);
	value = this.datasource.convertBigIntForDatasource(value);

	return value;
});

/**
 * Convert from database to app
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.6
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
BigIntField.setMethod(function _toApp(context, value) {

	if (value) {
		value = this.datasource.castToBigInt(value);
	}

	return this.cast(value);
});
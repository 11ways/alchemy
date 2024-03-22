/**
 * The abstract LocalTemporal Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
const LocalTemporal = Function.inherits('Alchemy.Field.Date', 'LocalTemporal');

/**
 * Mark this class as being abstract
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 */
LocalTemporal.makeAbstractClass();

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.3.20
 *
 * @param    {*}       value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {*}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {Develry.LocalDate}
 */
LocalTemporal.setMethod(function _toDatasource(context, value) {

	value = this.cast(value);

	if (value) {
		value = value.toNumericRepresentation();
	}

	if (typeof value == 'bigint') {
		value = this.datasource.convertBigIntForDatasource(value);
	}

	return value;
});

/**
 * Convert from database to app
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.20
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Develry.LocalDate}
 */
LocalTemporal.setMethod(function _toApp(context, value) {

	if (value && typeof value == 'object') {
		if (typeof value.getUTCDate != 'function') {
			value = this.datasource.castToBigInt(value);
		}
	}

	return this.cast(value);
});
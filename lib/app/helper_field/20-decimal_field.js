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
 * @version  1.4.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Decimal}
 */
DecimalField.setCastFunction(function cast(value) {

	if (value == null) {
		return Decimal.ZERO;
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
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {*}
 */
DecimalField.setMethod(function _toDatasource(context, value) {

	value = this.cast(value);
	value = this.datasource.convertDecimalForDatasource(value);

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
 * @return   {Develry.Decimal}
 */
DecimalField.setMethod(function _toApp(context, value) {

	if (value && typeof value == 'object') {
		value = value.toString();
	}

	return this.cast(value);
});
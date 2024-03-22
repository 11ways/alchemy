/**
 * The Mixed Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
const MixedField = Function.inherits('Alchemy.Field', 'Mixed');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
MixedField.setDatatype('object');

/**
 * This field value is self-contained
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
MixedField.setSelfContained(true);

/**
 * Store objects as strings, if wanted
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
MixedField.setMethod(function _toDatasource(context, value) {

	if (value && typeof value == 'object' && !Object.isPlainObject(value)) {
		if (!(value instanceof Date)) {
			value = JSON.toDryObject(value);
		}
	}

	return value;
});

/**
 * Convert from database to app
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
MixedField.setMethod(function _toApp(context, value) {

	if (value && typeof value == 'object' && typeof value.dry == 'string') {
		value = JSON.unDry(value);
	}

	return value;
});
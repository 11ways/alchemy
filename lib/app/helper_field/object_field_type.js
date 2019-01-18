/**
 * The Object Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  1.1.0
 */
var ObjectField = Function.inherits('Alchemy.Field', function Object(schema, name, options) {
	Object.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  1.1.0
 */
ObjectField.setDatatype('object');

/**
 * This field value is self-contained
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
ObjectField.setSelfContained(true);

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Object}
 */
ObjectField.setMethod(function cast(value) {

	if (typeof value == 'string') {
		return JSON.undry(value);
	}

	return value;
});

/**
 * Store objects as strings, if wanted
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {Mixed}        value       The field's own value
 * @param    {Object}       data        The main record
 * @param    {Datasource}   datasource  The datasource instance
 *
 * @return   {Mixed}
 */
ObjectField.setMethod(function _toDatasource(value, data, datasource, callback) {

	if (this.options.store_as_string) {

		if (value && typeof value == 'object') {
			value = JSON.dry(value);
		}

		callback(null, value);
	}

	callback(null, value);
});
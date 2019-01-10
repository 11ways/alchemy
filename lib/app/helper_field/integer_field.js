/**
 * The Integer Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var IntegerField = Function.inherits('Alchemy.Field.Number', function Integer(schema, name, options) {
	Integer.super.call(this, schema, name, options);
});

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Number}
 */
IntegerField.setMethod(function cast(value) {

	// Allow null
	if (value == null) {
		return value;
	}

	return Math.round(value);
});
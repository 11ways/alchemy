/**
 * The Number Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var NumberField = Function.inherits('Alchemy.Field', function Number(schema, name, options) {
	Number.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
NumberField.setDatatype('number');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.1
 *
 * @param    {Mixed}   value
 *
 * @return   {Number}
 */
NumberField.setMethod(function cast(value) {

	// Allow null
	if (value == null) {
		return value;
	}

	return Number(value);
});
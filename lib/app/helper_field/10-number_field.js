/**
 * The Number Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
const NumberField = Function.inherits('Alchemy.Field', 'Number');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
NumberField.setDatatype('number');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {*}   value
 *
 * @return   {number}
 */
NumberField.setMethod(function cast(value) {

	if (value === '') {
		value = null;
	}

	// Allow null
	if (value == null) {
		return value;
	}

	return Number(value);
});
/**
 * The Integer Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const IntegerField = Function.inherits('Alchemy.Field.Number', 'Integer');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {*}   value
 *
 * @return   {number}
 */
IntegerField.setMethod(function cast(value) {

	if (value === '') {
		value = null;
	}

	// Allow null
	if (value == null) {
		return value;
	}

	return Math.round(value);
});
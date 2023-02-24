/**
 * The Boolean Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var BooleanField = Function.inherits('Alchemy.Field', function Boolean(schema, name, options) {
	Boolean.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
BooleanField.setDatatype('boolean');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Boolean}
 */
BooleanField.setMethod(function cast(value) {
	return Boolean(value);
});

/**
 * See if the given vlaue is considered not-empty for this field
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.7
 * @version  1.3.7
 *
 * @param    {Mixed}   value
 *
 * @return   {Boolean}
 */
BooleanField.setMethod(function valueHasContent(value) {

	if (value === undefined) {
		return false;
	}

	return true;
});

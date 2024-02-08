/**
 * The Boolean Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
const BooleanField = Function.inherits('Alchemy.Field', 'Boolean');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
BooleanField.setDatatype('boolean');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {*}   value
 *
 * @return   {boolean}
 */
BooleanField.setCastFunction(function cast(value) {
	return Boolean(value);
});

/**
 * See if the given vlaue is considered not-empty for this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.7
 * @version  1.3.7
 *
 * @param    {Mixed}   value
 *
 * @return   {boolean}
 */
BooleanField.setMethod(function valueHasContent(value) {

	if (value === undefined) {
		return false;
	}

	return true;
});

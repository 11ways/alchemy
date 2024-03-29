/**
 * The RegExp Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
const RegExpField = Function.inherits('Alchemy.Field', 'RegExp');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 */
RegExpField.setDatatype('regexp');

/**
 * This field value is self-contained
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
RegExpField.setSelfContained(true);

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Mixed}   value
 *
 * @return   {string}
 */
RegExpField.setCastFunction(function cast(value) {

	if (!(value instanceof RegExp)) {
		value = RegExp.interpret(value);
	}

	return value;
});
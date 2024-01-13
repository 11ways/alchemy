/**
 * The Not Empty validator:
 * value can not be null, undefined or an empty string ''
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Object}   options
 */
const NotEmpty = Function.inherits('Alchemy.Validator', 'NotEmpty');

/**
 * The message to use inside errors
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {string}
 */
NotEmpty.setProperty('error_message', '{field} must not be empty');

/**
 * The microcopy to use for users
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.1.4
 *
 * @type     {string}
 */
NotEmpty.setProperty('error_microcopy', 'cannot-be-empty');

/**
 * This validator should not pass when there are no values
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {boolean}
 */
NotEmpty.setProperty('error_when_no_values', true);

/**
 * Validate the value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.1.0
 *
 * @param    {FieldValue}   fv   The FieldValue instance
 *
 * @return   {boolean}
 */
NotEmpty.setMethod(function validate(fv) {

	let value = fv.value;

	// Any number or an absolute false is allowed
	if ((typeof value === 'number' && !isNaN(value)) || value === false) {
		return true;
	}

	// Don't allow empty arrays
	if (Array.isArray(value)) {
		return !!value.length;
	}

	// All other falsy values are not allowed
	return !!value;
});

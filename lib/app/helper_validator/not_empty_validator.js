/**
 * The Not Empty validator:
 * value can not be null, undefined or an empty string ''
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Object}   options
 */
var NotEmpty = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Validator', function NotEmpty(options) {
	NotEmpty.super.call(this, options);
});

/**
 * Validate the value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param   {Mixed}     value   The value that is going to be saved to the db
 */
NotEmpty.setMethod(function validate(value) {

	// Any number or an absolute false is allowed
	if (typeof value === 'number' || value === false) {
		return true;
	}

	// Don't allow empty arrays
	if (Array.isArray(value)) {
		return !!value.length;
	}

	// All other falsy values are not allowed
	return !!value;
});

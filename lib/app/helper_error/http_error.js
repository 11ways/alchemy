/**
 * The Http Error class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const HTTP = Function.inherits('Alchemy.Error', function HTTP(status, message) {
	HTTP.super.call(this, message);
	this.status = status;
});

/**
 * Get the properties to serialize
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.7.1
 * @version  0.7.1
 *
 * @type     {Array}
 */
HTTP.setProperty(function properties_to_serialize() {
	return ['status', 'message', 'stack'];
});

/**
 * Return string interpretation of this error
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {string}
 */
HTTP.setMethod(function toString() {
	let result = this.name + ' Error';

	if (this.status) {
		result += ' ' + this.status;
	}

	if (this.message) {
		result += ': ' + this.message;
	}

	return result;
});
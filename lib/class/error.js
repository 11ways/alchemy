/**
 * The Error class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const AlchemyError = Function.inherits('Develry.Error', 'Alchemy.Error', function Error(message) {
	Error.super.call(this, message);
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
AlchemyError.setMethod(function toString() {
	let result = this.name + ' Error';

	if (this.message) {
		result += ': ' + this.message;
	}

	return result;
});

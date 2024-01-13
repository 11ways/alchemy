/**
 * The base model error
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   message
 */
const ModelError = Function.inherits('Alchemy.Error', 'Alchemy.Error.Model', function Model(message) {
	Model.super.call(this, message);
});
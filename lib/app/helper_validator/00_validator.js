/**
 * The Validator error class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Object}   options
 */
var Validator = Function.inherits('Alchemy.Base', 'Alchemy.Validator', function Validator(options) {
	this.options = options || {};
});

/**
 * The error message to use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Validator.setProperty('error_message', '{field} violates the {rule} rule');

/**
 * Revive a dried validator
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Validator}
 */
Validator.setStatic(function unDry(value) {
	return new this(value.options);
});

/**
 * Return an object for json-drying this validator
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Validator.setMethod(function toDry() {
	return {
		value: {
			options : this.options
		}
	};
});

/**
 * Get the invalid message for the given field
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Field}   field
 * @param    {Mixed}   value
 *
 * @return   {String}
 */
Validator.setMethod(function getInvalidFieldMessage(field, value) {

	// @TODO: translation support
	let message = this.error_message.assign({
		field : field.title || field.name,
		value : value,
		rule  : this.name || this.constructor.name
	});

	return message;
});

/**
 * Create a violation for this validator
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Document}   root      The root document instance
 * @param    {Object}     context   The context data object
 * @param    {Schema}     schema    The schema the context belongs to
 * @param    {Field}      field
 * @param    {Mixed}      value
 *
 * @return   {Violation}
 */
Validator.setMethod(function createFieldViolation(root, context, schema, field, value) {

	let message = this.getInvalidFieldMessage(field, value);

	let result = new Classes.Alchemy.Error.Validation.Field(message, field.name, value);

	return result;
});

/**
 * Validate the given document
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Document}   root      The root document instance
 * @param    {Object}     context   The context data object
 * @param    {Schema}     schema    The schema the context belongs to
 *
 * @return   {Mixed}
 */
Validator.setMethod(async function validateDocument(root, context, schema) {

	let violations = [];

	if (this.options.fields && this.options.fields.length) {

		let field_name,
		    passes,
		    field,
		    value;

		for (field_name of this.options.fields) {
			field = schema.getField(field_name);

			value = context[field_name];

			passes = this.validate(value);

			if (passes && passes.then) {
				passes = await passes;
			}

			if (!passes) {
				violations.push(this.createFieldViolation(root, context, schema, field, value));
			}
		}
	}

	if (violations.length) {
		let result = new Classes.Alchemy.Error.Validation.Violations();
		result.add(violations);
		return result;
	}

});
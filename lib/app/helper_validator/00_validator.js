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
Validator.setMethod(function createFieldViolation(field, value) {

	let message = this.getInvalidFieldMessage(field, value);

	let result = new Classes.Alchemy.Error.Validation.Field(message, field.name, value);

	return result;
});

/**
 * Validate a value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Field}    field     The field the value is from
 * @param    {*}        value     The value to test
 *
 * @return   {Promise<Violation|undefined>}
 */
Validator.setMethod(async function validateFieldValue(field, value) {

	let passes = this.validate(value);

	if (passes && passes.then) {
		passes = await passes;
	}

	if (!passes) {
		return this.createFieldViolation(field, value);
	}
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
 * @return   {Promise<Violations|undefined>}
 */
Validator.setMethod(async function validateDocument(root, context, schema) {

	let violations = [];

	if (this.options.fields && this.options.fields.length) {

		let field_name,
		    violation,
		    passes,
		    field,
		    value;

		for (field_name of this.options.fields) {
			field = schema.getField(field_name);

			value = context[field_name];

			violation = await this.validateFieldValue(field, value);

			if (violation) {
				violations.push(violation);
			}
		}
	}

	if (violations.length) {
		let result = new Classes.Alchemy.Error.Validation.Violations();
		result.add(violations);
		return result;
	}

});

/**
 * Does this rule apply to the given field?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String|Field}   field   The field to check
 *
 * @return   {Boolean}
 */
Validator.setMethod(function appliesToField(field) {

	if (!this.options || !this.options.fields || !this.options.fields.length) {
		return false;
	}

	if (typeof field != 'string') {
		field = field.name;
	}

	return this.options.fields.indexOf(field) > -1;
});
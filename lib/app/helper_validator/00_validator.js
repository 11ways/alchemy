/**
 * The Validator error class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.1.0
 *
 * @param    {Object}   options
 */
var Validator = Function.inherits('Alchemy.Base', 'Alchemy.Validator', function Validator(options) {
	this.options = options || {};
});

/**
 * The error message to use
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {string}
 */
Validator.setProperty('error_message', '{field} violates the {rule} rule');

/**
 * Revive a dried validator
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.1
 *
 * @param    {FieldValue}   fv   The FieldValue instance
 *
 * @return   {string}
 */
Validator.setTypedMethod([Types.Alchemy.FieldValue], function getInvalidFieldMessage(fv) {

	let field = fv.field,
	    value = fv.value;

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.4
 *
 * @param    {FieldValue}   fv   The FieldValue instance
 *
 * @return   {Violation}
 */
Validator.setMethod(function createFieldViolation(fv) {

	let message = this.getInvalidFieldMessage(fv);

	let result = new Classes.Alchemy.Error.Validation.Field(message, fv);

	if (this.error_microcopy) {
		result.microcopy = this.error_microcopy;
	}

	return result;
});

/**
 * Validate a value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Field}   field
 * @param    {*}       value
 *
 * @return   {Promise<Violation|undefined>}
 */
Validator.setTypedMethod([Types.Alchemy.Field, Types.Any], function validateFieldValue(field, value) {
	return this.validateFieldValue(field, field.path, value);
});

/**
 * Validate a value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Field}   field
 * @param    {string}  path
 * @param    {*}       value
 *
 * @return   {Promise<Violation|undefined>}
 */
Validator.setTypedMethod([Types.Alchemy.Field, Types.String, Types.Any], function validateFieldValue(field, path, value) {
	let fv = new Classes.Alchemy.FieldValue(field, path, value);
	return this.validateFieldValue(fv);
});

/**
 * Validate a value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.1
 *
 * @param    {FieldValue[]}   field_values   The FieldValue instance(s)
 *
 * @return   {Promise<Violation|undefined>}
 */
Validator.setTypedMethod([Types.Alchemy.FieldValue.array()], async function validateFieldValue(field_values) {

	let violation,
	    passes,
	    result,
	    fv,
	    i;

	for (i = 0; i < field_values.length; i++) {
		fv = field_values[i];

		passes = this.validate(fv);

		if (passes && passes.then) {
			passes = await passes;
		}

		if (!passes) {
			violation = this.createFieldViolation(fv);

			if (!result) {
				result = violation;
			} else {
				if (!(result instanceof Classes.Alchemy.Error.Validation.Violations)) {
					let violations = new Classes.Alchemy.Error.Validation.Violations()
					violations.add(result);
					result = violations;
				}

				result.add(violation);
			}
		}
	}

	return result;
});

/**
 * Validate the given document
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

	if (!this.options.fields || !this.options.fields.length) {
		return;
	}

	let fields_with_value,
	    violations = [],
	    field_name,
	    violation,
	    passes,
	    field;

	for (field_name of this.options.fields) {
		field = schema.getField(field_name);

		fields_with_value = field.getDocumentValues(root);

		if (!fields_with_value?.length) {
			continue;
		}

		violation = await this.validateFieldValue(fields_with_value);

		if (violation) {
			violations.include(violation);
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string|Field}   field   The field to check
 *
 * @return   {boolean}
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
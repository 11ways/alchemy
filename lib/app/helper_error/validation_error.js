/**
 * Parent class of all errors regarding Validation
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const ValidationError = Function.inherits('Alchemy.Error.Model', 'Alchemy.Error.Validation', function Validation(message) {
	Validation.super.call(this, message);
});

/**
 * Parent class of all validation violations
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const Violation = Function.inherits('Alchemy.Error.Validation', function Violation() {});

/**
 * Validation Violations do not need a stack
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Violation.setProperty('capture_stack', false);

/**
 * A grouping of violations
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const Violations = Function.inherits('Alchemy.Error.Validation.Violation', function Violations() {
	this.violations = [];
});

/**
 * Get the amount of violations
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Violations.setProperty(function length() {
	return this.violations.length;
});

/**
 * Set the properties to serialize for this error
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Violations.setProperty('properties_to_serialize', ['violations']);

/**
 * Iterator method
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Violations.setMethod(Symbol.iterator, function* iterate() {

	let i;

	for (i = 0; i < this.violations.length; i++) {
		yield this.violations[i];
	}
});

/**
 * Add more violations
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.7.1
 * @version  0.7.1
 *
 * @param    {Array|Violations|Violation}
 */
Violations.setMethod(function add(violation) {

	if (Array.isArray(violation) || violation instanceof Violations) {
		let list = violation.violations || violation,
		    i;

		for (i = 0; i < list.length; i++) {
			this.add(list[i]);
		}
	} else {
		this.violations.push(violation);
	}

});

/**
 * Return a string representation of all violations
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.7.1
 * @version  0.7.1
 *
 * @return   {String}
 */
Violations.setMethod(function toString() {

	let violation,
	    result = 'Validation Error: ' + this.length + ' violations have been detected:';

	for (violation of this.violations) {
		result += '\n  - ' + violation.message;
	}

	return result;
});

/**
 * Violation of a specific field
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
const FieldError = Function.inherits('Alchemy.Error.Validation.Violation', function Field(message, field_name, value) {
	this.message = message;
	this.field_name = field_name;
	this.value = value;
});

/**
 * Set the properties to serialize for this error
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
FieldError.setProperty('properties_to_serialize', ['message', 'field_name']);
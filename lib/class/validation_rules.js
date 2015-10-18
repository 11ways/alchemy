/**
 * The ValidationRules class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var Rules = Function.inherits(function ValidationRules() {});

/**
 * Register a new rule
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Rules.setMethod(function register(rule_name, rule_fnc, options) {


	if (typeof rule_name == 'function') {
		options = rule_fnc;
		rule_fnc = rule_name;
		rule_name = rule_fnc.name;
	}

	if (rule_fnc && typeof rule_fnc == 'object') {
		options = rule_fnc;
		rule_fnc = null;
	}

	if (!options) {
		options = {};
	}

	if (rule_fnc) {
		options.fnc = rule_fnc;
	}

	this[rule_name] = options;
});

global.ValidationRules = new Rules();

/**
 * The notempty validation rule:
 * value can not be null, undefined or an empty string ''
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {Mixed}   value   The value that is going to be saved to the db
 * @param   {Object}  record
 * @param   {Object}  rule    The specific rule object
 */
ValidationRules.register(function notEmpty(value, record, rule, callback) {

	// Any number or an absolute false is allowed
	if (typeof value === 'number' || value === false) return callback(null, true);

	// All other falsy values are not allowed
	callback(null, !!value);
}, {
	message: 'This field can not be empty'
});

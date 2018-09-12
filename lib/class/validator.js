/**
 * The Validator class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.5
 *
 * @param    {Object}   options
 */
var Validator = Function.inherits('Alchemy.Base', 'Alchemy.Validator', function Validator(options) {
	this.options = options || {};
});
/**
 * The Validator class
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
var Validator = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Validator', function Validator(options) {
	this.options = options || {};
});

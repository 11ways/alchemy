/**
 * Fallback Datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
var Fallback = Function.inherits('Alchemy.Datasource', function Fallback(name, options) {

	console.log('Creating Fallback datasource:', options);

	Fallback.super.call(this, name, options);
});

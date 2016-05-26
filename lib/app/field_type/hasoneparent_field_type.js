/**
 * The HasOneParentFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var HasOneParentFieldType = Function.inherits('ObjectIdFieldType', function HasOneParentFieldType(schema, name, options) {
	HasOneParentFieldType.super.call(this, schema, name, options);

	// @todo: set index stuff
});
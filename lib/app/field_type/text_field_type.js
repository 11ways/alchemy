/**
 * The TextFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var TextFieldType = Function.inherits('StringFieldType', function TextFieldType(schema, name, options) {
	TextFieldType.super.call(this, schema, name, options);
});
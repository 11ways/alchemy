/**
 * The TextFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var TextFieldType = Function.inherits('StringFieldType', function TextFieldType(schema, name, options) {
	TextFieldType.super.call(this, schema, name, options);
});
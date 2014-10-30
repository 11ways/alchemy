/**
 * Schema fields are nested schema's
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var SchemaFieldType = Function.inherits('FieldType', function SchemaFieldType(schema, name, options) {
	SchemaFieldType.super.call(this, schema, name, options);

	this.fieldSchema = options.schema;

	if (!this.fieldSchema.name) {
		this.fieldSchema.setName(name);
	}

	if (!this.fieldSchema.parent) {
		this.fieldSchema.setParent(schema);
	}

	if (!this.fieldSchema.modelName) {
		this.fieldSchema.setModel(schema.modelName);
	}
});
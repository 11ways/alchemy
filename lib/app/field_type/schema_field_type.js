/**
 * Schema fields are nested schema's
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var SchemaFieldType = Function.inherits('FieldType', function SchemaFieldType(schema, name, options) {
	SchemaFieldType.super.call(this, schema, name, options);

	if (options.schema == null || typeof options.schema != 'object') {
		return;
	}

	// Field schema
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

/**
 * Get the subschema of this field
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {String}
 */
SchemaFieldType.setProperty(function root_model() {
	return this.parent_schema.root_model || this.parent_schema.modelName;
});

/**
 * Get the subschema of this field
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Schema}
 */
SchemaFieldType.setMethod(function getSubschema(record) {

	var schema = this.options.schema,
	    external_field_name,
	    temp;

	// If schema is a string,
	// it needs to be extracted from another field's value
	if (typeof schema == 'string') {

		// The value in `schema` is actually the name of the other field
		external_field_name = schema;

		// Get that other field by its name
		field = this.schema.getField(external_field_name);

		// Get the values
		temp = field.getValues();

		if (temp == null) {
			return null;
		}

		temp = temp[field.getRecordValue(record)];

		if (temp != null) {
			schema = temp.schema;

			if (schema == null && typeof temp == 'function') {
				temp = new temp();
				schema = temp.schema || temp.blueprint;

				if (schema != null) {
					schema.setModel(this.schema.modelName);
					schema.setName(this.name);
					schema.setParent(this.schema);
				}
			}
		} else {
			schema = null;
		}
	}

	return schema;
});

/**
 * Cast all the subschema values using their _toDatasource method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}      value        Value of field, an object in this case
 * @param    {Object}      data         The data object containing `value`
 * @param    {Datasource}  datasource   The destination datasource
 *
 * @return   {Object}
 */
SchemaFieldType.setMethod(function _toDatasource(value, data, datasource, callback) {

	var subSchema,
	    record;

	record = {};

	// Recreate a record
	record[this.schema.name] = data;

	subSchema = this.getSubschema(record);

	datasource.toDatasource(subSchema, value, callback);
});

/**
 * Get some more subschema data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Mixed}      value
 * @param    {Function}   callback
 */
SchemaFieldType.setMethod(function _toApp(query, options, value, callback) {

	// Get associated records if the subschema has associations defined
	if (this.fieldSchema && !Object.isEmpty(this.fieldSchema.associations)) {

		var name = this.name + 'FieldModel',
		    Dummy = new Model({name: name}),
		    subOptions = {},
		    item = {};

		item[name] = value;

		// Disable generating Document instances
		// if the original find did the same
		subOptions.document = options.document;

		// @todo: inherit other original find options?

		Dummy.addAssociatedDataToRecord(
			subOptions,
			{associations: this.fieldSchema.associations},
			item,
			function gotAssociatedData(err, result) {

				var key;

				if (err) {
					return callback(err);
				}

				for (key in result) {
					if (key == name) {
						continue;
					}

					value[key] = result[key];
				}

				callback(null, value);
			}
		);

		return;
	}

	callback(null, this.cast(value));
});
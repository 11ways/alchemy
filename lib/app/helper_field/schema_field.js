/**
 * Schema fields are nested schema's
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.3
 */
var SchemaField = Function.inherits('Alchemy.Field', function Schema(schema, name, options) {
	Schema.super.call(this, schema, name, options);

	if (options.schema == null || typeof options.schema != 'object') {
		return;
	}

	// Field schema
	this.field_schema = options.schema;

	if (!this.field_schema.name) {
		this.field_schema.setName(name);
	}

	if (!this.field_schema.parent || schema.root_schema == this.field_schema.parent) {
		this.field_schema.setParent(schema);
	} else {
		// It's possible the given schema already had the correct parent
		// But if that's not the case, throw an error
		if (this.field_schema.parent != schema) {
			throw new Error('Unable to re-use a schema for field "' + name + '", use `schema.clone()`!');
		}
	}

	if (!this.field_schema.model_name) {
		this.field_schema.setModel(schema.model_name);
	}
});

SchemaField.setDeprecatedProperty('fieldSchema', 'field_schema');

/**
 * Schema fields are stored as objects
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
SchemaField.setDatatype('object');

/**
 * Get the subschema of this field
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @return   {String}
 */
SchemaField.setProperty(function root_model() {
	return this.parent_schema.root_model || this.parent_schema.model_name;
});

/**
 * Does this field need to be translated in some way?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.1.4
 *
 * @type     {Boolean}
 */
SchemaField.setProperty(function requires_translating() {

	if (this.is_translatable) {
		return true;
	}

	if (this.field_schema) {
		return !!this.field_schema.hasTranslations;
	}

	return false;
});

/**
 * Get the subschema of this field
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {Object}   record
 * @param    {String}   some_path   Some path to a field in the wanted schema
 *
 * @return   {Schema}
 */
SchemaField.setMethod(function getSubschema(record, some_path) {

	var schema = this.options.schema,
	    external_field_name,
	    property_name,
	    record_value,
	    pieces,
	    field,
	    name,
	    temp;

	// If schema is a string,
	// it needs to be extracted from another field's value
	if (typeof schema == 'string') {

		// When there are 2 pieces, the second piece is the property name
		pieces = schema.split('.');

		// The first piece is the external field name
		external_field_name = pieces[0];

		// The second piece is the property name
		property_name = pieces[1] || 'schema';

		// Get that other field by its name
		field = this.schema.getField(external_field_name);

		if (!field) {
			console.error('Failed to get subschema', external_field_name, 'of', this.schema, some_path);
			return null;
		}

		// Get the values that field can have (probably an enum)
		temp = field.getValues();

		if (temp == null) {
			return null;
		}

		// Now get the actual external value from the record
		record_value = field.getRecordValue(record);

		// I'm not sure if this will help
		if (record_value == null) {
			record_value = field.getRecordValue(record, some_path);
		}

		// Get the correct field value
		temp = temp[record_value];

		if (temp != null) {
			schema = temp[property_name];

			if (schema == null && typeof temp == 'function') {
				temp = new temp();
				schema = temp[property_name] || temp.schema || temp.blueprint;

				if (schema != null) {
					schema.setModel(this.schema.model_name);
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
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {Object}      value        Value of field, an object in this case
 * @param    {Object}      data         The data object containing `value`
 * @param    {Datasource}  datasource   The destination datasource
 *
 * @return   {Object}
 */
SchemaField.setMethod(function _toDatasource(value, data, datasource, callback) {

	var that = this,
	    sub_schema,
	    record,
	    model,
	    temp;

	record = {};

	// Recreate a record
	record[this.schema.name] = data;

	sub_schema = this.getSubschema(record);

	// If the sub schema has been found, return it now
	if (sub_schema) {
		return datasource.toDatasource(sub_schema, value, callback);
	}

	// @WARNING:
	// Doing a model.save with ONLY updates can break subschema behaviour!

	// If it has not been found, and the linked schema is actually a string,
	// it's possible the linked field was not provided
	if (typeof this.options.schema == 'string') {
		model = this.root_model;

		if (model) {
			model = Model.get(model);

			model.find('first', {document: false, fields: [this.options.schema]}, function gotRecord(err, result) {

				if (err) {
					return callback(err);
				}

				if (!result.length) {
					log.warning('Subschema was not found for', that.name, 'in', model.name, 'model');
					return datasource.toDatasource(null, value, callback);
				}

				// Add the newly found data
				temp = Object.assign({}, data);
				record = {};
				record[that.schema.name] = temp;

				Object.assign(record, result[0]);

				// Try getting the schema again
				sub_schema = that.getSubschema(record);

				datasource.toDatasource(sub_schema, value, callback);
			});

			return;
		} else {
			log.warn('Model not found for subschema', this.options.schema);
		}
	}

	log.warning('Model and subschema were not found for', that.name);
	return datasource.toDatasource(null, value, callback);
});

/**
 * Get some more subschema data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Mixed}      value
 * @param    {Function}   callback
 */
SchemaField.setMethod(function _toApp(query, options, value, callback) {

	var that = this,
	    recursive,
	    Dummy,
	    item,
	    name;

	// Don't get schema associated records if recursive is disabled
	recursive = options.recursive;

	if (recursive == null) {
		recursive = 1;
	}

	// Get associated records if the subschema has associations defined
	if (recursive && this.field_schema && !Object.isEmpty(this.field_schema.associations)) {

		name = this.name + 'FieldModel';
		Dummy = alchemy.getModel('Model', false);
		Dummy = new Dummy({name: name});
		item = {};

		item[name] = value;

		let sub_criteria = Dummy.find();

		// Disable generating Document instances
		// if the original find did the same
		sub_criteria.setOption('document', options.document);
		sub_criteria.setOption('original_query', query);
		sub_criteria.setOption('_root_data', options._root_data);
		sub_criteria.setOption('_parent_field', that);
		sub_criteria.setOption('_parent_model', that.schema.model_name);
		sub_criteria.setOption('recursive', recursive);

		sub_criteria.setOption('associations', this.field_schema.associations);

		// @todo: inherit other original find options?

		Dummy.addAssociatedDataToRecord(sub_criteria, item, function gotAssociatedData(err, result) {

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

	// Create new dummy record
	let record = {};

	// Recreate the record
	record[this.schema.name] = value;

	let sub_schema = this.getSubschema(record);

	// If the sub schema has been found, return it now
	if (sub_schema) {
		let tasks = {};

		Object.each(value, function eachField(field_value, field_name) {

			var field = sub_schema.get(field_name);

			if (field != null) {
				tasks[field_name] = function doToDatasource(next) {
					field.toApp({}, {}, field_value, next);
				};
			}
		});

		return Function.parallel(4, tasks, function convertedFields(err, result) {

			if (err) {
				return callback(err);
			}

			callback(null, that.cast(result));
		});
	}

	callback(null, this.cast(value));
});

/**
 * Translate the given value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.1.4
 */
SchemaField.setMethod(function translateRecord(prefixes, record, allow_empty) {

	// Maybe the entire schema is translatable?
	if (this.options.translatable) {
		translateRecord.super.call(this, prefixes, record, allow_empty);
	}

	// Turn it into an array, some already are (is_array fields)
	let subject = Array.cast(record[this.name]),
	    schema_record;

	for (schema_record of subject) {
		if (this.field_schema.hasTranslations && schema_record) {

			let field_name,
			    field;

			for (field_name in this.field_schema.translatableFields) {
				field = this.field_schema.translatableFields[field_name];
				field.translateRecord(prefixes, schema_record, allow_empty);
			}
		}
	}
});

/**
 * Cast the value to a document
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.5
 * @version  1.1.5
 */
SchemaField.setMethod(function cast(value, to_datasource) {
	return value;
});
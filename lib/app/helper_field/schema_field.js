/**
 * Schema fields are nested schema's
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.16
 */
var SchemaField = Function.inherits('Alchemy.Field', function Schema(schema, name, options) {

	if (!options) {
		options = {};
	}

	// If the contents are array-like, the field itself can't be
	if (this.force_array_contents) {
		options.is_array = false;
	}

	Schema.super.call(this, schema, name, options);

	if (options.schema == null || typeof options.schema != 'object') {
		return;
	}

	// Field schema
	this.field_schema = options.schema;

	if (!this.field_schema.name) {
		this.field_schema.setName(name);
	}

	if (schema) {
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
 * Is this schema field always an array?
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 *
 * @return   {Boolean}
 */
SchemaField.setProperty('force_array_contents', false);

/**
 * Get the subschema of this field
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
 * @version  1.3.0
 *
 * @type     {Boolean}
 */
SchemaField.setProperty(function requires_translating() {

	if (this.is_translatable) {
		return true;
	}

	if (this.field_schema) {
		return !!this.field_schema.has_translations;
	}

	return false;
});

/**
 * Get the subschema of this field
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.7
 *
 * @param    {Object}   record      This *should* be the schema context (might not be the root)
 * @param    {String}   some_path   Some path to a field in the wanted schema
 *
 * @return   {Schema}
 */
SchemaField.setMethod(function getSubschema(record, some_path) {

	let schema = this.options.schema;

	// If schema is a string,
	// it needs to be extracted from another field's value
	if (typeof schema == 'string') {

		// When there are 2 pieces, the second piece is the property name
		let pieces = schema.split('.');

		// The first piece is the external field name
		let external_field_name = pieces[0];

		// The second piece is the property name
		let property_name = pieces[1] || 'schema';

		// Get that other field by its name
		let field = this.schema.getField(external_field_name);

		if (!field) {
			console.error('Failed to get subschema', external_field_name, 'of', this.schema, some_path);
			return null;
		}

		// Get the values that field can have (probably an enum)
		let values = field.getValues();

		if (values == null) {
			return null;
		}

		// Now get the actual external value from the record
		let record_value = field.getRecordValue(record);

		// I'm not sure if this will help
		if (record_value == null) {
			record_value = field.getRecordValue(record, some_path);
		}

		// Get the correct field value
		let enum_value = values.get(record_value);

		if (!enum_value) {
			schema = null;
		} else if (enum_value.schema) {
			schema = enum_value.schema;
		} else if (enum_value.value) {
			schema = enum_value.value[property_name] || enum_value.value.schema;
		} else {
			console.log('Could not find', schema, 'in', record, 'enum values:', enum_value, 'of field', field)
		}
	}

	return schema;
});

/**
 * Cast all the subschema values using their _toDatasource method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.16
 *
 * @param    {Object}      value        Value of field, an object in this case
 * @param    {Object}      data         The data object containing `value`
 * @param    {Datasource}  datasource   The destination datasource
 *
 * @return   {Object}
 */
SchemaField.setMethod(function _toDatasource(value, holder, datasource, callback) {

	if (!this.force_array_contents) {
		return this._toDatasourceFromValue(value, holder, datasource, callback);
	}

	value = Array.cast(value);

	let tasks = [];

	for (let entry of value) {
		tasks.push(next => {
			this._toDatasourceFromValue(entry, holder, datasource, next);
		});
	}

	Function.parallel(tasks, callback);
});

/**
 * Cast all the subschema values using their _toDatasource method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.1
 *
 * @param    {Object}      value        Value of field, an object in this case
 * @param    {Object}      data         The data object containing `value`
 * @param    {Datasource}  datasource   The destination datasource
 *
 * @return   {Object}
 */
SchemaField.setMethod(function _toDatasourceFromValue(value, holder, datasource, callback) {

	var that = this,
	    sub_schema,
	    record,
	    model,
	    temp;
	
	if (this.schema.name) {
		record = {
			[this.schema.name] : holder,
		};
	} else {
		record = holder;
	}

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
				temp = Object.assign({}, holder);
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

	log.warning('Model and subschema were not found for', that.path);
	return datasource.toDatasource(null, value, callback);
});

/**
 * Turn datasource data into app data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.16
 *
 * @param    {Mixed}      value
 * @param    {Function}   callback
 */
SchemaField.setMethod(function _toApp(query, options, value, callback) {

	if (!this.force_array_contents) {
		return this._toAppFromValue(query, options, value, callback);
	}

	value = Array.cast(value);

	let tasks = [];

	for (let entry of value) {
		tasks.push(next => {
			this._toAppFromValue(query, options, entry, next);
		});
	}

	Function.parallel(tasks, (err, result) => {

		if (err) {
			return callback(err);
		}

		callback(null, this.cast(result));
	});

});

/**
 * Turn datasource data into app data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.16
 *
 * @param    {Mixed}      value
 * @param    {Function}   callback
 */
SchemaField.setMethod(function _toAppFromValue(query, options, value, callback) {

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

	if (recursive && Blast.isBrowser) {
		// @TODO: this will mostly fail on the browser, so disable it for now.
		// Maybe make it configurable later
		recursive = 0;
	}

	// Get associated records if the subschema has associations defined
	if (recursive && this.field_schema && !Object.isEmpty(this.field_schema.associations)) {

		name = this.name + 'FieldModel';
		Dummy = alchemy.getModel('Model', false);

		Dummy = new Dummy({
			root_model : this.root_model,
			name       : name
		});

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

	let record;

	if (options.parent_value) {
		record = {
			[this.schema.name] : options.parent_value
		};
	} else if (options._root_data) {

		let root_data = options._root_data;

		if (root_data[this.schema.name]) {
			root_data = root_data[this.schema.name];
		}

		record = {
			[this.schema.name] : root_data
		};
	} else {
		record = {
			[this.schema.name] : {
				[this.name] : value,
			}
		};
	}

	let sub_schema = this.getSubschema(record);

	// If the sub schema has been found, return it now
	if (sub_schema) {
		let tasks = {};

		Object.each(value, (field_value, field_name) => {

			let field = sub_schema.get(field_name);

			if (field != null) {

				let sub_options = {
					_root_data: options._root_data,
					parent_field_schema_name: this.name,
					parent_value : value,
				};

				tasks[field_name] = (next) => {
					field.toApp({}, sub_options, field_value, next);
				};
			}
		});

		return Function.parallel(4, tasks, function convertedFields(err, result) {

			if (err) {
				return callback(err);
			}

			callback(null, that.castEntry(result));
		});
	}

	callback(null, this.castEntry(value));
});

/**
 * Translate the given value
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.3.0
 */
SchemaField.setMethod(function translateRecord(prefixes, record, allow_empty) {

	// Maybe the entire schema is translatable?
	if (this.options.translatable) {
		translateRecord.super.call(this, prefixes, record, allow_empty);
	}

	if (!record.$translated_fields) {
		record.$translated_fields = {};
	}

	// Turn it into an array, some already are (is_array fields)
	let subject = Array.cast(record[this.name]),
	    schema_record,
	    count = -1;

	for (schema_record of subject) {
		count++;

		if (this.field_schema.has_translations && schema_record) {

			let field_name,
			    field;

			for (field_name in this.field_schema.translatable_fields) {
				field = this.field_schema.translatable_fields[field_name];
				field.translateRecord(prefixes, schema_record, allow_empty);

				if (schema_record.$translated_fields) {
					for (let key in schema_record.$translated_fields) {
						let path = this.name;

						if (this.is_array) {
							path += '.' + count;
						}

						path += '.' + key;

						record.$translated_fields[path] = schema_record.$translated_fields[key];
					}
				}
			}
		}
	}
});

/**
 * Cast an entry
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 */
SchemaField.setMethod(function castEntry(value, to_datasource) {
	return value;
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
/**
 * Schema fields are nested schema's
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.16
 */
const SchemaField = Function.inherits('Alchemy.Field', function Schema(schema, name, options) {

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
SchemaField.setDatatype('object');

/**
 * Is this schema field always an array?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 *
 * @return   {boolean}
 */
SchemaField.setProperty('force_array_contents', false);

/**
 * Get the subschema of this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @return   {string}
 */
SchemaField.setProperty(function root_model() {
	return this.parent_schema.root_model || this.parent_schema.model_name;
});

/**
 * Does this field need to be translated in some way?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.4
 * @version  1.3.0
 *
 * @type     {boolean}
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
 * Deprecated alias
 * 
 * @deprecated
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 * 
 * @param    {Alchemy.OperationalContext.Schema}   context
 *
 * @return   {Alchemy.Schema|Pledge<Alchemy.Schema>}
 */
SchemaField.setMethod(function getSubschema(context) {
	return this.getSubSchema(context);
});

/**
 * Get the subschema of this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 * 
 * @param    {Alchemy.OperationalContext.Schema}   context
 *
 * @return   {Alchemy.Schema|Pledge<Alchemy.Schema>}
 */
SchemaField.setMethod(function getSubSchema(context) {

	let schema = this.options.schema;

	// If schema is a string,
	// it needs to be extracted from another field's value
	if (typeof schema == 'string') {

		if (context) {
			context = context.createChild();
		} else {
			context = new Classes.Alchemy.OperationalContext.Schema();
			context.setSchema(this.schema);
		}

		context.setSubSchemaPath(schema);
		schema = this.resolveSchemaPath(context);
	}

	return schema;
});

/**
 * Get the subschema of a given schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.4.0
 * 
 * @param    {Alchemy.OperationalContext.Schema}   context
 *
 * @return   {Alchemy.Schema|Pledge<Alchemy.Schema>}
 */
SchemaField.setMethod(function resolveSchemaPath(context) {

	const schema_path = context.getSubSchemaPath();

	if (typeof schema_path != 'string') {
		return schema_path;
	}

	// Get the schema of the current holder
	let context_schema = context.getSchema();

	// Get the current holder
	let holder = context.getHolder();

	// When there are 2 pieces, the second piece is the property name
	let pieces = schema_path.split('.');

	// The first piece is the external field name
	let external_field_name = pieces.shift();

	// The rest of the pieces is the property path
	let property_name = pieces.join('.') || 'schema';

	// Get that other field by its name
	let field = context_schema.getField(external_field_name);

	// Possible association
	let association;

	if (!field) {
		association = context_schema.getAssociation(external_field_name);
	} else if (field.is_foreign_key) {
		association = field.getAssociation();
	}

	if (association) {
		let new_context = context.createChild();
		new_context.setValuePropertyName(property_name);
		new_context.setAssociation(association);
		return this.getSubSchemaFromAssociation(new_context);
	}

	if (!field) {
		console.error('Failed to get subschema', external_field_name, 'of', context_schema, context);
		return null;
	}

	// Get the values that field can have (probably an enum)
	let values = field.getValues();

	if (values == null) {
		return null;
	}

	// Now get the actual external value from the record
	let record_value = field.getRecordValue(holder);

	// I'm not sure if this will help
	if (record_value == null) {
		record_value = field.getRecordValue(holder, external_field_name);
	}

	// If there is no value, return false
	if (!record_value) {
		return false;
	}

	let schema;

	// Get the correct field value
	let enum_value = values.get(record_value);

	if (!enum_value) {
		schema = false;
	} else if (enum_value[property_name]) {
		schema = enum_value[property_name];
	} else if (enum_value.schema) {
		schema = enum_value.schema;
	} else if (enum_value.value) {

		if (enum_value.value.via_model) {

			let sub_context = context.createChild();
			sub_context.setRemoteModelName(enum_value.value.via_model);
			sub_context.setRemoteForeignKey(enum_value.value.foreign_key);
			sub_context.setLocalValue(enum_value.value.pk || record_value);
			sub_context.setValuePropertyName(property_name);

			// The value is actually referring to a specific record
			return this.getSubSchemaFromModel(sub_context);
		}

		schema = enum_value.value[property_name] || enum_value.value.schema;
	} else {
		console.warn('Failed to find schema path', JSON.stringify(schema_path), 'in holder', holder);
		console.warn(' »»', 'Enum values:', enum_value);
		console.warn(' »»', 'Of field:', field);
		console.warn(' »»', 'Field value:', record_value);
		console.warn(' »»', 'Property name:', property_name);
	}

	return schema;
});

/**
 * Get the subschema via an association
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 * 
 * @param    {Alchemy.OperationalContext.Schema}   context
 *
 * @return   {Pledge<Schema>|Schema}
 */
SchemaField.setMethod(function getSubSchemaFromAssociation(context) {

	let holder = context.getHolder(),
	    association = context.getAssociation();

	let local_value = holder[association.options.local_key];

	if (!local_value) {
		return false;
	}

	context.setLocalValue(local_value);
	context.setRemoteModelName(association.model_name);
	context.setRemoteForeignKey(association.options.foreign_key);

	return this.getSubSchemaFromModel(context);
});

/**
 * Get the subschema via an association
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 * 
 * @param    {Alchemy.OperationalContext.Schema}   context
 *
 * @return   {Pledge<Schema>|Schema}
 */
SchemaField.setMethod(function getSubSchemaFromModel(context) {

	const model_name = context.getRemoteModelName();
	const model = alchemy.getModel(model_name);

	if (!model) {
		return false;
	}

	let remote_context = context.createChild();
	remote_context.setExternalField(this);
	remote_context.setOurFieldName(context.getRemoteForeignKey() || '_id');
	remote_context.setOurFieldValue(context.getLocalValue());
	remote_context.setSubSchemaPath(context.getValuePropertyName());

	let remote_request = model.resolveRemoteSchemaRequest(remote_context);

	let pledge = Pledge.Swift.waterfall(remote_request, result => {

		if (!result) {
			return null;
		}

		// If it already is a schema, return that
		if (Classes.Alchemy.Client.Schema.isSchema(result)) {
			return result;
		}

		let found_schema = this.resolveSchemaPath(model.schema, result, path, path);

		return found_schema;
	});

	return pledge;
});

/**
 * Cast all the subschema values using their _toDatasource method
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
SchemaField.setMethod(function _toDatasource(context, value) {

	if (!this.force_array_contents) {
		return this._toDatasourceFromValue(context, value);
	}

	if (!Array.isArray(value)) {
		value = Array.cast(value);
		context.setWorkingValue(value);
	}

	// @TODO: What about the holder?
	let tasks = value.map(entry => this._toDatasourceFromValue(context.withWorkingValue(entry), entry));

	return Pledge.Swift.parallel(tasks);
});

/**
 * Cast all the subschema values using their _toDatasource method
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {Object} value
 *
 * @return   {Pledge<*>|*}
 */
SchemaField.setMethod(function _toDatasourceFromValue(context, value) {

	let schema_context = new Classes.Alchemy.OperationalContext.Schema(context);
	schema_context.setSchema(this.schema);

	return Pledge.Swift.waterfall(
		this.getSubSchema(schema_context),
		sub_schema => context.withValueOfSubSchema(value, sub_schema),
		new_context => this._toDatasourceFromValueWithSubSchema(new_context, value),
	);
});

/**
 * Cast all the subschema values using their _toDatasource method
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.SaveFieldToDatasource}   context
 * @param    {Object} value
 *
 * @return   {Pledge<*>|*}
 */
SchemaField.setMethod(function _toDatasourceFromValueWithSubSchema(context, value) {

	let sub_schema = context.getSchema(),
	    datasource = context.getDatasource();

	// If the sub schema has been found, return it now
	if (sub_schema) {
		let result = datasource.toDatasource(context);
		return result;
	}

	if (sub_schema === false) {
		return null;
	}

	// @WARNING:
	// Doing a model.save with ONLY updates can break subschema behaviour!

	// If it has not been found, and the linked schema is actually a string,
	// it's possible the linked field was not provided
	if (typeof this.options.schema == 'string') {
		let model = this.root_model;

		if (model) {
			model = Model.get(model);

			let pledge = new Pledge.Swift();

			model.find('first', {document: false, fields: [this.options.schema]}, function gotRecord(err, result) {

				if (err) {
					return pledge.reject(err);
				}

				if (!result.length) {
					log.warning('Subschema was not found for', that.name, 'in', model.name, 'model');
					return pledge.resolve(datasource.toDatasource(context));
				}

				let holder = context.getHolder();

				// Add the newly found data
				let temp = Object.assign({}, holder);

				let record = {};
				record[that.schema.name] = temp;

				Object.assign(record, result[0]);

				// Try getting the schema again
				sub_schema = that.getSubSchema(record);

				Pledge.Swift.done(sub_schema, (err, sub_schema) => {

					if (err) {
						return pledge.reject(err);
					}

					context.setSchema(sub_schema);

					pledge.resolve(datasource.toDatasource(context));
				});
			});

			return pledge;
		} else {
			log.warn('Model not found for subschema', this.options.schema);
		}
	}

	log.warning('Model and subschema were not found for', that.path);
	return Pledge.Swift.done(datasource.toDatasource(context), callback);
});

/**
 * Turn datasource data into app data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
SchemaField.setMethod(function _toApp(context, value) {

	if (!this.force_array_contents) {
		return this._toAppFromValue(context, value);
	}

	value = Array.cast(value);

	let tasks = value.map(entry => this._toAppFromValue(context.withWorkingValue(entry), entry));

	let result = Pledge.Swift.waterfall(
		Pledge.Swift.parallel(tasks),
		result => this.cast(result)
	);

	return result;
});

/**
 * Turn datasource data into app data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
SchemaField.setMethod(function _toAppFromValue(context, value) {

	let schema_context = new Classes.Alchemy.OperationalContext.Schema(context);
	schema_context.setSchema(this.schema);

	let result = Pledge.Swift.waterfall(
		this.getSubSchema(schema_context),
		sub_schema => context.withValueOfSubSchema(value, sub_schema),
		new_context => this._toAppFromValueWithSubSchema(new_context, value)
	);

	return result;
});

/**
 * Turn datasource data into app data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.ReadFieldFromDatasource}   context
 * @param    {*} value
 *
 * @return   {Pledge<*>|*}
 */
SchemaField.setMethod(function _toAppFromValueWithSubSchema(context, value) {

	let sub_schema = context.getSchema();

	// Explicit false means there is no schema at the moment,
	// and the value can be ignored
	if (sub_schema === false) {
		return null;
	}

	const datasource = context.getDatasource();

	let that = this,
	    Dummy,
	    item,
	    name;

	let options = context.getQueryOptions() || {};

	// Don't get schema associated records if recursive is disabled
	let get_associations_recursive_level = options.recursive;

	if (get_associations_recursive_level == null) {
		if (this.options?.recursive != null) {
			get_associations_recursive_level = this.options.recursive;
		} else {
			get_associations_recursive_level = 1;
		}
	}

	if (get_associations_recursive_level && Blast.isBrowser) {
		// @TODO: this will mostly fail on the browser, so disable it for now.
		// Maybe make it configurable later
		get_associations_recursive_level = 0;
	}

	// If the sub schema has been found, return it now
	if (sub_schema) {

		value = Swift.map(value, (field_value, field_name) => {

			let field_context = context.getFieldContext(field_name);

			if (field_context) {
				return datasource.valueToApp(field_context);
			}
		});

	} else {
		console.warn('Failed to find sub schema for', this.name, 'in', record);
	}

	return Swift.waterfall(
		value,
		value => {
			// Get associated records if the subschema has associations defined
			if (get_associations_recursive_level && this.field_schema && !Object.isEmpty(this.field_schema.associations)) {

				name = this.name + 'FieldModel';
				Dummy = alchemy.getModel('Model', false);

				Dummy = new Dummy({
					root_model : this.root_model,
					name       : name
				});

				item = {};

				item[name] = value;

				let sub_criteria = Dummy.find();

				let criteria = null;

				if (context.getCriteria) {
					criteria = context.getCriteria();
				}

				// Disable generating Document instances
				// if the original find did the same
				sub_criteria.setOption('document', options.document);
				sub_criteria.setOption('original_query', criteria);
				sub_criteria.setOption('_root_data', options._root_data);
				sub_criteria.setOption('_parent_field', that);
				sub_criteria.setOption('_parent_model', that.schema.model_name);
				sub_criteria.setOption('recursive', get_associations_recursive_level);

				sub_criteria.setOption('associations', this.field_schema.associations);

				// @todo: inherit other original find options?

				let pledge = new Pledge.Swift();

				Dummy.addAssociatedDataToRecord(sub_criteria, item, function gotAssociatedData(err, result) {

					if (err) {
						return pledge.reject(err);
					}

					let key;

					for (key in result) {
						if (key == name) {
							continue;
						}

						value[key] = result[key];
					}

					pledge.resolve(value);
				});

				return pledge;
			}

			return this.castEntry(value);
		}
	);
});

/**
 * Translate the given value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 */
SchemaField.setMethod(function castEntry(value, to_datasource) {
	return value;
});

/**
 * Cast the value to a document
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.5
 * @version  1.1.5
 */
SchemaField.setCastFunction(function cast(value, to_datasource) {
	return value;
});
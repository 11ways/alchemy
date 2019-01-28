/**
 * The Schema class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Schema}   parent
 */
var Schema = Function.inherits(['Deck', 'Alchemy.Client.Base'], 'Alchemy.Client', function Schema(parent) {

	Blast.Classes.Deck.call(this);
	Schema.super.call(this);

	this.init();
});

/**
 * Revive a dried schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Field}
 */
Schema.setStatic(function unDry(value) {

	var result = new this(),
	    field,
	    i;

	result.associations = value.associations;
	result.name = value.name;
	result.options = value.options;

	result.setModel(value.model_name);

	for (i = 0; i < value.fields.length; i++) {
		field = value.fields[i];
		result.addField(field.name, field.class_name, field.options);
	}

	return result;
});

Schema.setDeprecatedProperty('modelName',     'model_name');
Schema.setDeprecatedProperty('modelClass',    'model_class');
Schema.setDeprecatedProperty('modelInstance', 'model_instance');

/**
 * Set a reference to itself
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Schema.setProperty(function schema() {
	return this;
});

/**
 * Dry the object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Objext}
 */
Schema.setMethod(function toDry() {

	var value = {
		name         : this.name,
		associations : this.associations,
		fields       : []
	};

	if (this.parent) {
		value.parent = this.parent;
	}

	if (this.model_name) {
		value.model_name = this.model_name;

		if (this.namespace) {
			value.model_ns = this.namespace;
		}
	}

	value.options = this.options;

	// Get the sorted fields
	let fields = this.getSorted(false),
	    field,
	    i;

	for (i = 0; i < fields.length; i++) {
		field = fields[i];

		value.fields.push({
			name       : field.name,
			options    : field.options,
			class_name : field.constructor.name,
			namespace  : field.constructor.namespace
		});
	}

	return {value: value};
});

/**
 * Initialize some values
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Schema.setMethod(function init() {
	this.associations = {};

	// All index groups
	this.indexes = {};

	// All fields belonging to an index group
	this.indexFields = {};

	// All translatable fields
	this.translatableFields = {};

	// Amount of translatable fields
	this.hasTranslations = 0;

	// Amount of alternate indexes
	this.hasAlternates = 0;

	// Enum values
	this.enumValues = {};

	// Attached behaviours
	this.behaviours = {};

	// Extra options
	this.options = {};

	// Validation rules
	this.validations = new Deck();

	// Behaviour count
	this.hasBehaviours = 0;
});

/**
 * Set the name of this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 */
Schema.setMethod(function setName(name) {
	this.name = name;
});

/**
 * Set the parent schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Schema}   schema
 */
Schema.setMethod(function setParent(schema) {
	this.parent = schema;
});

/**
 * Set the model this schema can use
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {String|Function|Object}   model
 */
Schema.setMethod(function setModel(model) {

	var constructor,
	    model_name,
	    namespace,
	    pieces,
	    path;

	if (!model) {
		return;
	}

	if (typeof model == 'string') {
		path = model;
	} else {
		path = model.name;

		// See if this passed model is a constructor
		if (model.staticChain) {
			constructor = model;
			namespace = model.namespace;
		}
	}

	if (!constructor) {
		if (!path) {
			throw new Error('Illegal model name given: "' + path + '"');
		}

		constructor = alchemy.getModel(path, false);
	}

	model_name = constructor.name;
	namespace = constructor.namespace;

	this.model_name = model_name;
	this.model_class = constructor;
	this.namespace = namespace;

	if (typeof model == 'object') {
		this.model_instance = model;
	}

	if (this.model_class) {
		this.emit('has_model_class');
	}
});

/**
 * Simplify the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Schema}
 */
Schema.setMethod(function toHawkejs(wm) {

	var result = new Schema(),
	    fields,
	    field,
	    assoc,
	    clone,
	    key,
	    i;

	wm.set(this, result);

	// Get the sorted fields
	fields = this.getSorted(false);

	// Set the model
	if (this.name) {
		result.setName(this.name);
	}

	// Set the parent
	if (this.parent) {
		result.setParent(JSON.clone([this.parent], 'toHawkejs', wm)[0]);
	}

	if (this.model_name) {
		result.setModel(this.model_name);
	}

	if (!result.associations) {
		result.associations = {};
	}

	for (i = 0; i < fields.length; i++) {
		field = fields[i];

		if (field.is_private) {
			continue;
		}

		clone = JSON.clone([field], 'toHawkejs', wm)[0];

		result.set(field.name, clone);
	}

	for (key in this.associations) {
		assoc = this.associations[key];

		if (assoc.options.is_private) {
			continue;
		}

		result.associations[key] = JSON.clone(assoc, 'toHawkejs', wm);
	}

	return result;
});

/**
 * Add a field to this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {String}   name
 * @param    {String}   type
 * @param    {Object}   options
 *
 * @return   {FieldType}
 */
Schema.setMethod(function addField(name, type, options) {

	var FieldClass,
	    field;

	switch (name) {
		case 'available':
			throw new Error('The field name "' + name + '" is not allowed');
			break;
	}

	if (options == null) {
		options = {};
	}

	if (typeof type != 'string') {
		// Allow adding a schema as a type
		if (type instanceof Blast.Classes.Alchemy.Schema) {
			options.schema = type;
			type = 'Schema';
		}
	}

	field = Blast.Classes.Alchemy.Field.Field.getMember(type);

	if (typeof field != 'function') {
		throw new Error('Unable to find "' + type + '" field class');
	}

	field = new field(this, name, options);

	if (options && options.translatable) {
		this.hasTranslations++;
		this.translatableFields[name] = field;
	}

	this.set(name, field);

	if (options.rules) {
		let rules = Array.cast(options.rules),
		    i;

		for (i = 0; i < rules.length; i++) {
			this.addRule(name, rules[i]);
		}
	}

	return field;
});

/**
 * Get the path to this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {String}   extra            Extra to append to the path (like field name)
 * @param    {Boolean}  with_top_schema  Add top schema name, defaults to true
 */
Schema.setMethod(function getPath(extra, with_top_schema) {

	var path;

	if (with_top_schema == null) {
		with_top_schema = true;
	}

	if (this.parent && this.parent.getPath) {
		path = this.parent.getPath(null, with_top_schema);

		if (path) {
			path += '.';
		}

		path += this.name;

	} else if (this.name && with_top_schema) {
		path = this.name;
	} else {
		path = '';
	}

	if (extra) {

		if (path) {
			path += '.' + extra;
		} else {
			path = extra;
		}
	}

	return path;
});

/**
 * Get a field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {String}   name
 *
 * @return   {FieldType}
 */
Schema.setMethod(function getField(name) {

	var context,
	    pieces,
	    result,
	    i;

	if (name instanceof Blast.Classes.Alchemy.Field.Field) {
		return name;
	}

	// Allow getting a nested field by a path
	if (name.indexOf('.') > -1) {
		pieces = name.split('.');
		result = this;

		// Iterate over all the pieces
		for (i = 0; i < pieces.length; i++) {
			result = result.get(pieces[i]);

			if (!result) {
				return;
			}

			if (typeof result.getSubschema == 'function') {
				result = result.getSubschema();

				if (!result) {
					return;
				}
			}
		}

		return result;
	} else {
		context = this;
	}

	return context.get(name);
});

/**
 * Get all field names
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @return   {String}
 */
Schema.setMethod(function getFieldNames() {
	return Object.keys(this.dict);
});

/**
 * Add an index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {String|FieldType}   _field
 * @param    {Object}             options
 *
 * @return   {FieldType}
 */
Schema.setMethod(function addIndex(_field, _options) {

	var that = this,
	    datasource,
	    options,
	    order,
	    field,
	    path;

	// `Schema` is the `Client.Schema` class in this scope
	if (Blast.isNode && this.constructor == Schema) {
		return;
	}

	field = this.getField(_field);

	if (!field) {
		throw new Error('Could not find field "' + _field + '"');
	}

	if (typeof _options === 'string') {
		options = {};
		options[_options] = true;
	} else {
		options = _options;
	}

	// Set the default options
	options = Object.assign({}, this.indexOptions, options);

	if (options.name == null) {
		options.name = field.name;

		if (options.unique) {
			options.name += '_uq';
		}
	}

	if (typeof options.order == 'number') {
		if (options.order == 'asc') {
			options.order = 1;
		} else {
			options.order = -1;
		}
	}

	if (this.indexes[options.name] == null) {
		// Create the index group if it doesn't exist yet.
		// The first time it's called will define the group options.
		this.indexes[options.name] = {
			fields: {},
			options: options
		};
	}

	// Even if an index is unique,
	// it needs the 'alternate' property in order to be used
	// as an alternate method of updating without _id
	if (options.alternate) {
		this.hasAlternates++;
	}

	that.getDatasource().done(function gotDs(err, datasource) {

		if (err) {
			throw err;
		}

		path = field.getPath(false);

		if (options.db_property) {
			path += '.' + options.db_property;
		}

		// Store the field order in the index groups
		that.indexes[options.name].fields[path] = options.order;
		that.indexFields[path] = options;

		datasource.ensureIndex(that.model_class, that.indexes[options.name], function ensuredIndex(err, result) {

			if (err) {
				alchemy.printLog('error', ['Error ensuring index', options.name], {err: err});
			}
		});
	});
});

/**
 * Process the given object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Object|Document}
 */
Schema.setMethod(function process(data, options) {

	var fields,
	    result,
	    field,
	    key,
	    i;

	if (options == null) {
		options = {};
	}

	if (options.update == null) {
		options.update = false;
	}

	if (!data) {
		data = {};
	} else {
		// Get the main object, in case it's a document
		data = data.$main || data;
	}

	fields = this.getSorted(false);

	result = {};

	if (this.options.allow_extraneous_fields) {
		Object.assign(result, data);
	}

	for (i = 0; i < fields.length; i++) {
		field = fields[i];

		if (Object.hasProperty(data, field.name)) {
			result[field.name] = field.getValue(data[field.name]);
		} else if (field.has_default && !options.update) {
			result[field.name] = field.getDefault();
		}
	}

	// @todo: improve allowFields support
	if (options.allowFields) {
		for (key in data) {

			// Skip fields we've already done,
			// which is everything in the blueprint
			if (!this.get(key)) {
				result[key] = data[key];
			}
		}
	}

	return result;
});

/**
 * Get the datasource for this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Pledge}
 */
Schema.setMethod(function getDatasource() {

	if (Blast.isNode) {
		return Pledge.reject();
	}

	let that = this;

	return Function.parallel(function waitForModelClass(next) {
		that.afterOnce('has_model_class', function hasModelClass() {
			next();
		});
	}, function done(err, result) {

		if (err) {
			return;
		}

		// @TODO: allow different datasources on the client?
		return that.model_class.prototype.datasource;
	});

	return pledge;
}, false);
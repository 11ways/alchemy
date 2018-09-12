/**
 * The Schema class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 *
 * @param    {Schema}   parent   Optional parent schema
 */
var Schema = Function.inherits(['Deck', 'Alchemy.Base'], function Schema(parent) {

	Classes.Deck.call(this);
	Schema.super.call(this);

	// Default index options
	this.indexOptions = {
		unique: false,
		alternate: false, // Alternates can act like primary keys
		order: 1 // Ascending
	};

	// The parent class this schema belongs to
	if (parent != null) {

		if (parent.model === true) {
			this.setParent(parent.blueprint);
			this.setModel(parent);
		} else {
			this.setParent(parent);
		}
	}

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

	// Validation rules
	this.validations = new Deck();

	// Behaviour count
	this.hasBehaviours = 0;
});

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
 * @version  0.4.0
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

		constructor = Model.get(path, false);
	}

	model_name = constructor.name;
	namespace = constructor.namespace;

	this.modelName = model_name;
	this.modelClass = constructor;
	this.namespace = namespace;

	if (typeof model == 'object') {
		this.modelInstance = model;
	}

	if (this.modelClass) {
		this.emit('has_model_class');
	}
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
 * Add a rule to this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.5
 *
 * @param    {String}   main_field
 * @param    {String}   rule_name
 * @param    {Object}   options
 */
Schema.setMethod(function addRule(main_field, rule_name, options) {

	var constructor,
	    instance,
	    rule_fnc;

	if (typeof main_field == 'function') {
		rule_fnc = main_field;
		main_field = null;
	} else if (rule_name && typeof rule_name == 'object') {
		options = rule_name;
		rule_name = null;
	} else if (typeof rule_name == 'function') {
		rule_fnc = rule_name;
		rule_name = null;
	}

	if (!options || typeof options != 'object') {
		options = {};
	}

	if (rule_fnc) {
		throw new Error('Implement function validator');
		options.fnc = rule_fnc;
	}

	// Store the main field
	if (main_field) {
		options.main_field = main_field;
	}

	if (rule_name) {
		constructor = alchemy.getValidatorClass(rule_name);

		if (!constructor) {
			throw new Error('Unable to find Validator "' + rule_name + '"');
		}

		instance = new constructor(options);
	}

	this.validations.push(options);
});

/**
 * Add a behaviour to this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.3
 *
 * @param    {String}   behaviour_name
 * @param    {Object}   options
 */
Schema.setMethod(function addBehaviour(behaviour_name, options) {

	var constructor = Behaviour.getClass(behaviour_name),
	    property_name;

	if (!constructor) {
		throw new Error('Could not find Behaviour "' + behaviour_name + '"');
	}

	this.hasBehaviours++;

	if (!options) {
		options = {};
	}

	// See under which name to store this behaviour
	// This way, we can add the same behaviour multiple times
	if (options.name) {
		property_name = options.name;
	} else {
		property_name = constructor.name;
	}

	// Get the class constructor
	constructor = Behaviour.getClass(behaviour_name);

	// Store it in the schema
	this.behaviours[property_name] = {
		constructor: constructor,
		options: options
	};

	// See if this behaviour listens to attachments
	if (typeof constructor.attached == 'function') {
		constructor.attached(this, options);
	}
});

/**
 * Add a field to this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.5
 *
 * @param    {String}   name
 * @param    {String}   type
 * @param    {Object}   options
 *
 * @return   {FieldType}
 */
Schema.setMethod(function addField(name, type, options) {

	var FieldClass,
	    className,
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
		if (type instanceof Classes.Alchemy.Schema) {
			options.schema = type;
			type = 'Schema';
		}
	}

	className = type + 'FieldType';

	if (!Classes.Alchemy[className]) {
		className = 'FieldType';
	}

	field = new Classes.Alchemy[className](this, name, options);

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
 * Get a field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
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

	if (name instanceof FieldType) {
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
		}

		return result;
	} else {
		context = this;
	}

	return context.get(name);
});

/**
 * Get all indexes to check for the given record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.3.0
 *
 * @param    {Object}   data
 * @param    {String}   hasType   Get indexes with this type only
 *
 * @return   {Object}
 */
Schema.setMethod(function getRecordIndexes(data, hasType) {

	var fieldName,
	    indexName,
	    result;

	result = {};

	for (fieldName in data) {
		if (this.indexFields[fieldName] != null) {
			indexName = this.indexFields[fieldName].name;

			// Skip non alternates
			if (hasType && !this.indexes[indexName].options[hasType]) {
				continue;
			}

			result[indexName] = this.indexes[indexName];
		}
	}

	return result;
});

/**
 * Convenience method for iterating over indexes of a given record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   data
 */
Schema.setMethod(function eachRecordIndex(data, fnc) {
	Object.each(this.getRecordIndexes(data), fnc);
});

/**
 * Convenience method for iterating over alternate indexes of a given record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   data
 */
Schema.setMethod(function eachAlternateIndex(data, fnc) {
	Object.each(this.getRecordIndexes(data, 'alternate'), fnc);
});

/**
 * Add an index
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
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
	    field = this.getField(_field),
	    path;

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

	this.afterOnce('has_model_class', function hasModelClass() {

		path = field.getPath(false);

		// Store the field order in the index groups
		that.indexes[options.name].fields[path] = options.order;
		that.indexFields[path] = options;

		datasource = Datasource.get(that.modelClass.prototype.dbConfig);

		if (!datasource) {
			throw new Error('Could not get datasource "' + that.modelClass.prototype.dbConfig + '"');
		}

		datasource.ensureIndex(that.modelClass, that.indexes[options.name], function ensuredIndex(err, result) {

			if (err) {
				alchemy.printLog('error', ['Error ensuring index', options.name], {err: err});
			}
		});
	});
});

/**
 * Conform association arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   locality       internal or external
 * @param    {String}   _alias
 * @param    {String}   _modelname
 * @param    {Object}   _options
 */
Schema.setMethod(function getAssociationArguments(locality, _alias, _modelname, _options) {

	var modelName = _modelname,
	    options = _options,
	    alias = _alias;

	if (Object.isObject(modelName)) {
		options = modelName;
		modelName = undefined;
	} else if (!Object.isObject(options)) {
		options = {};
	}

	if (typeof modelName === 'undefined') {
		modelName = alias;
	}

	if (locality == 'internal') {

		if (!options.localKey) {
			options.localKey = alias.foreign_key();
		}

		if (!options.foreignKey) {
			options.foreignKey = '_id';
		}
	} else {

		if (!options.localKey) {
			options.localKey = '_id';
		}

		if (!options.foreignKey) {
			options.foreignKey = this.name.foreign_key();
		}
	}

	return {alias: alias, modelName: modelName, options: options}
});

/**
 * Add an association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {String}   alias
 * @param    {String}   modelname
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Schema.setMethod(function addAssociation(type, alias, modelName, options) {

	var constructor,
	    client_doc,
	    doc_class,
	    className,
	    locality,
	    singular,
	    path,
	    args;

	if (this.name === alias) {
		throw new Error('Can\'t add  association with the same name as current model');
	}

	// Determine the locality
	switch (type) {
		case 'HasOneParent':
		case 'HasAndBelongsToMany':
		case 'BelongsTo':
			locality = 'internal';
			break;

		case 'HasMany':
		case 'HasOneChild':
			locality = 'external';
			break;

		default:
			throw new TypeError('Association type "' + type + '" does not exist');
	}

	// Determine if it's a single record to be found
	switch (type) {
		case 'HasOneParent':
		case 'HasOneChild':
		case 'BelongsTo':
		case 'HasOne':
			singular = true;
			break;

		default:
			singular = false;
	}

	args = this.getAssociationArguments(locality, alias, modelName, options);
	args.type = type;

	alias = args.alias;
	modelName = args.modelName;
	options = args.options;
	options.singular = singular;
	className = this.modelName;

	if (this.namespace) {
		path = this.namespace + '.' + className;
	} else {
		path = className;
	}

	if (className) {
		// Get the model constructor
		constructor = Model.get(path, false);
	}

	if (constructor) {
		doc_class = Classes.Alchemy.Document.Document.getDocumentClass(constructor);
		client_doc = doc_class.getClientDocumentClass();
	}

	if (locality == 'internal') {
		this.addField(options.localKey, type, args);

		if (constructor) {
			doc_class.setFieldGetter(options.localKey);
		}

		if (client_doc && !options.is_private) {
			client_doc.setFieldGetter(options.localKey, null, null, false);
		}
	}

	this.associations[alias] = args;

	if (constructor) {
		doc_class.setAliasGetter(alias);

		if (client_doc && !options.is_private) {
			client_doc.setAliasGetter(alias);
		}
	}

	return args;
});

/**
 * Add enum values.
 * Modifications to the `values` object will have no effect later.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Object}   values
 */
Schema.setMethod(function addEnumValues(name, values) {

	if (this.enumValues[name] == null) {
		this.enumValues[name] = {};
	}

	Object.assign(this.enumValues[name], values);
});

/**
 * Set (overwrite) enum values.
 * The given `values` object will be used by reference.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name
 * @param    {Object}   values
 */
Schema.setMethod(function setEnumValues(name, values) {
	this.enumValues[name] = values;
});

/**
 * Add a belongsTo association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   alias
 * @param    {String}   modelname
 * @param    {Object}   options
 */
Schema.setMethod(function belongsTo(alias, modelName, options) {
	this.addAssociation('BelongsTo', alias, modelName, options);
});

/**
 * Add a hasOneParent association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   alias
 * @param    {String}   modelname
 * @param    {Object}   options
 */
Schema.setMethod(function hasOneParent(alias, modelName, options) {
	this.addAssociation('HasOneParent', alias, modelName, options);
});

/**
 * Add a HABTM association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   alias
 * @param    {String}   modelname
 * @param    {Object}   options
 */
Schema.setMethod(function hasAndBelongsToMany(alias, modelName, options) {
	this.addAssociation('HasAndBelongsToMany', alias, modelName, options);
});

/**
 * Add a hasMany association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   alias
 * @param    {String}   modelname
 * @param    {Object}   options
 */
Schema.setMethod(function hasMany(alias, modelName, options) {
	this.addAssociation('HasMany', alias, modelName, options);
});

/**
 * Add a hasOneChild association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   alias
 * @param    {String}   modelname
 * @param    {Object}   options
 */
Schema.setMethod(function hasOneChild(alias, modelName, options) {
	this.addAssociation('HasOneChild', alias, modelName, options);
});

/**
 * Validate the given object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Schema.setMethod(function validate(data, options, callback) {

	var that  = this,
	    rules = this.validations.getSorted(false),
	    error_count = 0,
	    invalid = [],
	    tasks;

	console.log('Validating', data);

	tasks = rules.map(function eachRule(rule) {
		return function checkRule(next) {

			var value;

			if (rule.update === false && options.update) {
				return next();
			}

			if (rule.create === false && options.create) {
				return next();
			}

			value = Object.path(data, rule.main_field)

			// Execute the rule function
			rule.fnc.call(that, value, data, rule, function ruleResponse(err, rule_value) {

				var result,
				    key;

				if (!err && rule_value) {
					return next(null);
				}

				result = {};

				for (key in rule) {
					if (key == 'fnc') continue;

					result[key] = rule[key];
				}

				error_count++;

				if (err) {
					result.error = err;
				}

				result.input = value;

				invalid.push(result);

				next(null);
			});
		};
	});

	Function.parallel(tasks, function done(err, results) {

		var pass_err,
		    i;

		if (err) {
			pass_err = err;
		} else if (error_count) {
			pass_err = new Error('Validation failed');
		}

		if (pass_err) {
			pass_err.invalid = invalid;
		} else {
			pass_err = null;
		}

		callback(pass_err, results);
	});
});

/**
 * Process the given object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.3
 */
Schema.setMethod(function process(data, options) {

	var fields,
	    result,
	    field,
	    i;

	if (options == null) {
		options = {};
	}

	if (options.update == null) {
		options.update = false;
	}

	fields = this.getSorted(false);
	result = {};

	for (i = 0; i < fields.length; i++) {
		field = fields[i];

		if (Object.hasProperty(data, field.name)) {
			result[field.name] = field.getValue(data[field.name]);
		} else if (field.hasDefault && !options.update) {
			result[field.name] = field.getDefault();
		}
	}

	// @todo: improve allowFields support
	if (options.allowFields) {
		for (let key in data) {

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
 * Get the config for the client side
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.0.0
 */
Schema.setMethod(function getClientConfig() {

	var result_fields,
	    associations,
	    association,
	    result,
	    fields,
	    entry,
	    field,
	    key,
	    i;

	// Get the sorted fields
	fields = this.getSorted(false);

	// Prepare the result objects
	result_fields = {};
	associations = {};

	// Iterate over the fields
	for (i = 0; i < fields.length; i++) {
		field = fields[i];

		if (field.is_private) {
			continue;
		}

		entry = {
			name            : field.name,
			title           : field.constructor.title,
			type_name       : field.constructor.type_name
		};

		let options = JSON.clone(field.options, 'getClientConfig');

		result_fields[field.name] = Object.assign(entry, options);
	}

	// Iterate over the associations
	for (key in this.associations) {
		association = this.associations[key];

		if (association.options.is_private) {
			continue;
		}

		associations[key] = association;
	}

	result = {
		fields       : result_fields,
		associations : associations
	};

	return result;
});
/**
 * The Schema class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Schema}   parent   Optional parent schema
 */
var Schema = Deck.extend(function Schema(parent) {

	Deck.call(this);

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

	// Behaviour count
	this.hasBehaviours = 0;
});

/**
 * Set a reference to itself
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Schema.setProperty(function schema() {
	return this;
});

/**
 * Set the name of this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String|Function|Object}   model
 */
Schema.setMethod(function setModel(model) {

	var modelName;

	if (typeof model == 'string') {
		modelName = model;
	} else {
		modelName = model.name;
	}

	modelName = modelName.beforeLast('Model') || modelName;

	if (!modelName) {
		throw new Error('Illegal model name given: "' + modelName + '"');
	}

	this.modelName = modelName;
	this.modelClass = alchemy.classes[modelName + 'Model'];

	if (typeof model == 'object') {
		this.modelInstance = model;
	}
});

/**
 * Get the path to this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   extra
 */
Schema.setMethod(function getPath(extra) {

	var path;

	if (this.parent) {
		path = this.parent.getPath() + '.' + this.name;
	} else if (this.name) {
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
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {String}
 */
Schema.setMethod(function getFieldNames() {
	return Object.keys(this.dict);
});


/**
 * Add a behaviour to this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   behaviour_name
 * @param    {Object}   options
 */
Schema.setMethod(function addBehaviour(behaviour_name, options) {

	var constructor = Behaviour.getClass(behaviour_name);

	if (!constructor) {
		throw new Error('Could not find Behaviour "' + behaviour_name + '"');
	}

	this.hasBehaviours++;

	if (!options) {
		options = {};
	}

	// Get the class constructor
	constructor = Behaviour.getClass(behaviour_name);

	// Store it in the schema
	this.behaviours[constructor.name] = {
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
 * @since    1.0.0
 * @version  1.0.0
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

	className = type + 'FieldType';

	if (!alchemy.classes[className]) {
		className = 'FieldType';
	}

	field = new alchemy.classes[className](this, name, options);

	if (options && options.translatable) {
		this.hasTranslations++;
		this.translatableFields[name] = field;
	}

	this.set(name, field);

	return field;
});

/**
 * Get a field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 *
 * @return   {FieldType}
 */
Schema.setMethod(function getField(name) {

	var context;

	if (name instanceof FieldType) {
		return name;
	}

	if (name.indexOf('.') > -1) {
		log.todo('Handle path notations');
	} else {
		context = this;
	}

	return context.get(name);
});

/**
 * Get all indexes to check for the given record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
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
			if (hasType && !this.indexes[indexName][hasType]) {
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
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String|FieldType}   _field
 * @param    {Object}             options
 *
 * @return   {FieldType}
 */
Schema.setMethod(function addIndex(_field, _options) {

	var options,
	    order,
	    field = this.getField(_field);

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

	// Store the field order in the index groups
	this.indexes[options.name].fields[field.name] = options.order;
	this.indexFields[field.name] = options;

	if (options.alternate) {
		this.hasAlternates++;
	}

	if (this.modelClass) {
		Datasource.get(this.modelClass.prototype.dbConfig).ensureIndex(this.modelClass, this.indexes[options.name], function ensuredIndex(err, result) {
			if (err) {
				log.error('Error ensuring index ' + options.name, {err: err});
			}
		});
	}
});

/**
 * Conform association arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   alias
 * @param    {String}   modelname
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Schema.setMethod(function addAssociation(type, alias, modelName, options) {

	var className,
	    locality,
	    singular;

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
	className = this.modelName + 'Model';

	if (locality == 'internal') {
		this.addField(options.localKey, type, args);

		if (alchemy.classes[className]) {
			alchemy.classes.Document.getDocumentClass(alchemy.classes[className]).setFieldGetter(options.localKey);
		}
	}

	this.associations[alias] = args;

	if (alchemy.classes[className]) {
		alchemy.classes.Document.getDocumentClass(alchemy.classes[className]).setAliasGetter(alias);
	}

	return args;
});

/**
 * Add enum values.
 * Modifications to the `values` object will have no effect later.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   alias
 * @param    {String}   modelname
 * @param    {Object}   options
 */
Schema.setMethod(function hasOneChild(alias, modelName, options) {
	this.addAssociation('HasOneChild', alias, modelName, options);
});

/**
 * Process the given object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
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
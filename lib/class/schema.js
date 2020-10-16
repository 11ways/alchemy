/**
 * The Schema class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
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
			this.setParent(parent.schema);
			this.setModel(parent);
		} else {
			this.setParent(parent);
		}
	}

	this.init();
});

/**
 * Revive a dried schema
 *
 * @TODO: Make Client.Schema & Schema use the same implementation
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {Object}   value
 *
 * @return   {Schema}
 */
Schema.setStatic(function unDry(value) {

	var result = new this(),
	    field,
	    i;

	result.associations = value.associations;
	result.name = value.name;
	result.options = value.options;
	result.rules = value.rules;

	result.setModel(value.model_name);

	for (i = 0; i < value.fields.length; i++) {
		field = value.fields[i];
		result.addField(field.name, field.class_name, field.options);
	}

	return result;
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
 * Get the datasource for this schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Pledge}
 */
Schema.setMethod(function getDatasource() {

	var that = this;

	return Function.parallel(function waitForModelClass(next) {
		that.afterOnce('has_model_class', function hasModelClass() {
			next();
		});
	}, function waitForDatasources(next) {

		alchemy.sputnik.after('datasources', function afterDs() {

			var datasource = Datasource.get(that.model_class.prototype.dbConfig);

			if (!datasource) {
				console.log('Failed to get', that.model_class.prototype.dbConfig, 'datasource?');
				return next(new Error('Could not get datasource "' + that.model_class.prototype.dbConfig + '"'));
			}

			next(null, datasource);
		});

	}, function done(err, result) {

		if (err) {
			return;
		}

		return result[1];
	});

	return pledge;
});

/**
 * Conform association arguments
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {String}   locality       internal or external
 * @param    {String}   _alias
 * @param    {String}   _modelname
 * @param    {Object}   _options
 */
Schema.setMethod(function getAssociationArguments(locality, alias, modelName, options) {

	if (Object.isObject(modelName)) {
		options = modelName;
		modelName = undefined;
	} else if (!Object.isObject(options)) {
		options = {};
	}

	if (typeof modelName === 'undefined') {
		modelName = alias;
	}

	if (options.localKey && typeof options.localKey == 'object') {
		throw new Error('Local key for ' + alias + ' association can not be an object');
	}

	if (options.foreignKey && typeof options.foreignKey == 'object') {
		throw new Error('Foreign key for ' + alias + ' association can not be an object');
	}

	if (locality == 'internal') {

		if (!options.localKey) {
			options.localKey = alias.foreign_key();
		}

		if (!options.foreignKey) {
			let model = this.getModel(modelName);
			options.foreignKey = model.primary_key || '_id';
		}
	} else {

		if (!options.localKey) {
			let model = this.getModel(modelName);
			options.localKey = model.primary_key || '_id';
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
 * @version  1.1.0
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
	className = this.model_name;

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

	// If the key is part of this model, make sure the field is added
	if (locality == 'internal') {

		if (!this.getField(options.localKey)) {
			this.addField(options.localKey, type, args);

			if (constructor) {
				doc_class.setFieldGetter(options.localKey);
			}

			if (client_doc && !options.is_private) {
				client_doc.setFieldGetter(options.localKey, null, null, false);
			}
		}

		// Also add an index on this new field
		this.addIndex(options.localKey, {by_convenience: true});
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
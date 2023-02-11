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
 * Add a relation creator method
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.4
 * @version  1.3.4
 *
 * @param    {String}   relation_type
 */
Schema.setStatic(function addRelationCreator(relation_type, relation_config) {

	let method_name = relation_type[0].toLowerCase() + relation_type.slice(1);

	this.setMethod(method_name, function _addAssociation(alias, model_name, options) {
		this.addAssociation(relation_type, relation_config, alias, model_name, options);
	});
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
 * @version  1.3.0
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

	this.has_behaviours++;

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
 * @version  1.3.0
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
		if (this.index_fields[fieldName] != null) {
			indexName = this.index_fields[fieldName].name;

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
 * @version  1.2.0
 *
 * @return   {Pledge}
 */
Schema.setMethod(function getDatasource() {

	var that = this;

	return Function.series(function waitForModelClass(next) {
		that.afterOnce('has_model_class', next);
	}, function waitForDatasources(next) {

		alchemy.sputnik.after('datasources', function afterDs() {

			let datasource;

			if (that.model_class) {
				datasource = Datasource.get(that.model_class.prototype.dbConfig);

				if (!datasource) {
					console.log('Failed to get', that.model_class.prototype.dbConfig, 'datasource?');
					return next(new Error('Could not get datasource "' + that.model_class.prototype.dbConfig + '"'));
				}
			} else {
				return next(new Error('Unable to get datasource for this sub-schema'));
			}		

			next(null, datasource);
		});

	}, function done(err, result) {

		if (err) {
			return;
		}

		return result[1];
	});
});

/**
 * Add an association
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.4
 *
 * @param    {String}   alias
 * @param    {Object}   relation_config
 * @param    {String}   modelname
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Schema.setMethod(function addAssociation(type, relation_config, alias, modelName, options) {

	if (this.name === alias) {
		throw new Error('Can\'t add  association with the same name as current model');
	}

	let is_internal = relation_config.internal === true,
	    is_singular = relation_config.singular === true;

	let constructor,
	    client_doc,
	    doc_class,
	    className,
	    locality,
	    singular,
	    path;

	let args = this.getAssociationArguments(is_internal, alias, modelName, options);
	args.type = type;

	alias = args.alias;
	modelName = args.modelName;
	options = args.options;
	options.singular = is_singular;
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
	if (is_internal) {

		if (!this.getField(options.localKey)) {
			let field_options = Object.assign({}, args);

			if (options && options.field_options) {
				Object.assign(field_options, options.field_options);
				field_options.field_options = undefined;
			}

			this.addField(options.localKey, type, field_options);

			if (constructor) {
				doc_class.setFieldGetter(options.localKey);
			}

			// Also set is_private fields on the server-side client_doc!
			if (client_doc) {
				client_doc.setFieldGetter(options.localKey, null, null, false);
			}
		}

		// Also add an index on this new field
		this.addIndex(options.localKey, {by_convenience: true});
	}

	this.associations[alias] = args;

	if (constructor) {
		doc_class.setAliasGetter(alias);

		// Also set is_private fields on the server-side client_doc!
		if (client_doc) {
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
 * @version  1.3.0
 *
 * @param    {String}   name
 * @param    {Object}   values
 */
Schema.setMethod(function addEnumValues(name, values) {

	if (this.enum_values[name] == null) {
		this.enum_values[name] = {};
	}

	Object.assign(this.enum_values[name], values);
});

/**
 * Set (overwrite) enum values.
 * The given `values` object will be used by reference.
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {String}   name
 * @param    {Object}   values
 */
Schema.setMethod(function setEnumValues(name, values) {
	this.enum_values[name] = values;
});

/**
 * Clone
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Object}
 */
Schema.setMethod(function dryClone(wm, custom_method) {

	if (!custom_method) {
		custom_method = 'toShallowClone';
	}

	let cloned = JSON.clone(this.toDry(), custom_method, wm);

	cloned = this.constructor.unDry(cloned.value);

	return cloned;
});

/**
 * Clone using JSON-Dry
 * (Needed anyway because Deck also has a clone method)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Object}
 */
Schema.setMethod(function clone() {
	return this.dryClone(new WeakMap(), 'toShallowClone');
});
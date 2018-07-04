var nameCache   = {},
    mongo       = alchemy.use('mongodb'),
    all_prefixes = alchemy.shared('Routing.prefixes'),
    createdModel;

/**
 * The Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.3.0
 */
var Model = Function.inherits('Alchemy.Base', 'Alchemy.Model', function Model(options) {

	if (typeof options !== 'undefined') {
		if (typeof options.table !== 'undefined') this.table = options.table;
		if (typeof options.dbConfig !== 'undefined') this.dbConfig = options.dbConfig;
		if (typeof options.name !== 'undefined') this.name = options.name;
		if (typeof options.alias !== 'undefined') this.alias = options.alias;
	}

	// Initialize behaviours
	if (this.schema.hasBehaviours) {
		this.initBehaviours();
	}
});

/**
 * Set the modelName property after class creation
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Model.constitute(function setModelName() {
	this.model_name = this.name;
	this.setProperty('model_name', this.model_name);
	this.table = this.model_name.tableize();
});

/**
 * This is a model constructor
 *
 * @type {Boolean}
 */
Model.setStaticProperty('model', true);

/**
 * The cache duration static getter/setter
 *
 * @property cacheDuration
 * @type {String}
 */
Model.setStaticProperty('cacheDuration', function getCacheDuration() {

	if (this._cacheDuration == null) {
		this._cacheDuration = alchemy.settings.model_query_cache_duration;
	}

	return this._cacheDuration;
}, function setCacheDuration(duration) {
	this._cacheDuration = duration;

	// @todo: reset cache
});

/**
 * Get the cache object
 *
 * @property cache
 */
Model.prepareStaticProperty('cache', function getCache() {

	if (this.cacheDuration) {
		return alchemy.getCache(this.name, this.cacheDuration);
	}

	return false;
});

/**
 * Get the document class constructor
 *
 * @type   {Alchemy.Document}
 */
Model.prepareStaticProperty('Document', function getDocumentClass() {
	return Classes.Alchemy.Document.Document.getDocumentClass(this);
});

/**
 * Get the client document class constructor
 *
 * @type   {Hawkejs.Document}
 */
Model.prepareStaticProperty('ClientDocument', function getClientDocumentClass() {
	return this.Document.getClientDocumentClass();
});

/**
 * Set the static per-model schema
 *
 * @type   {Schema}
 */
Model.staticCompose('schema', function createSchema(doNext) {

	var that   = this,
	    model  = this.compositorParent,
	    schema = new Classes.Alchemy.Schema();

	// The base Model does not have a schema
	if (model.name == 'Model') {
		return false;
	} else {

		// Link the schema to this model
		schema.setModel(model);

		// Set the schema name
		schema.setName(model.name);

		// Set default model fields immediately after this function ends
		// This has to be scheduled next, because addField would call createSchema
		// again, resulting in an infinite loop
		doNext(function addToSchema() {
			model.addField('_id', 'ObjectId', {default: alchemy.ObjectId});
			model.addField('created', 'Datetime', {default: Date.create});
			model.addField('updated', 'Datetime', {default: Date.create});
		});
	}

	return schema;
}, ['addEnumValues', 'setEnumValues', 'belongsTo', 'hasOneParent', 'hasAndBelongsToMany', 'hasMany', 'hasOneChild', 'addIndex', 'addRule']);

Model.setDeprecatedProperty('modelName', 'model_name');
Model.setDeprecatedProperty('blueprint', 'schema');

/**
 * The default database config to use
 *
 * @type {String}
 */
Model.setProperty('dbConfig', 'default');

/**
 * The default field to use as display
 *
 * @type {String}
 */
Model.setProperty('displayField', 'title');

/**
 * Translate is on by default
 *
 * @type {Boolean}
 */
Model.setProperty('translate', true);

/**
 * Object where behaviours are stored
 *
 * @type {Object}
 */
Model.prepareProperty('behaviours', Object);

/**
 * The model name
 *
 * @type {String}
 */
Model.setProperty('name', function name() {
	return this._name || this.constructor.model_name;
}, function setName(name) {
	this._name = name;
});

/**
 * Table name to use in the database.
 * False if no table should be used.
 *
 * @type {String}
 */
Model.setProperty(function table() {
	return this.constructor.table;
});

/**
 * Associations
 *
 * @type {Object}
 */
Model.setProperty(function associations() {
	return this.schema.associations;
});

/**
 * Instance access to static cache
 *
 * @type {Expirable}
 */
Model.prepareProperty('cache', function cache() {
	return this.constructor.cache;
});

/**
 * Instance access to static schema
 *
 * @type   {Schema}
 */
Model.setProperty(function schema() {
	return this.constructor.schema;
});

/**
 * This is a wrapper class
 */
Model.makeAbstractClass();

/**
 * This wrapper class starts a new group
 */
Model.startNewGroup();

/**
 * The connection
 *
 * @type {Object}
 */
Model.prepareProperty('datasource', function datasource() {
	if (this.table) return Datasource.get(this.dbConfig);
});

/**
 * The default sort options
 *
 * @type {Object}
 */
Model.prepareProperty('sort', function sort() {
	return {created: 1};
});

/**
 * Check a url value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   value    The value in the url
 * @param    {String}   name     The name of the url parameter
 * @param    {Conduit}  conduit  The optional conduit
 *
 * @return   {Pledge}
 */
Model.setStatic(function checkPathValue(value, name, conduit) {

	var field_name,
	    instance,
	    options,
	    pledge;

	// Id values have to be object ids
	if ((name == 'id' || name == '_id') && !value.isObjectId()) {
		return;
	}

	if (name == 'id') {
		field_name = '_id';
	} else {
		field_name = name;
	}

	if (conduit) {
		instance = conduit.getModel(this);
	} else {
		instance = new this;
	}

	options = {
		conditions : {}
	};

	options.conditions[field_name] = value;

	pledge = instance.find('first', options);

	console.log('Checking', value, name, pledge, 'of', instance, field_name)

	return pledge;
});

/**
 * Add a field to this model's schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @return   {Alchemy.Field}
 */
Model.setStatic(function addField(name, type, options) {

	var field;

	// Add it to the schema
	field = this.schema.addField(name, type, options);

	// Add it to the Document class
	this.Document.setFieldGetter(name);

	// Add the field to the client document too, if it's not private
	if (!field.is_private) {
		// False means it should not be set on the server implementation
		// (because that's where it's coming from)
		this.ClientDocument.setFieldGetter(name, null, null, false);
	}

	return field;
});


/**
 * Add a behaviour to this model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setStatic(function addBehaviour(behaviour_name, options) {
	return this.schema.addBehaviour(behaviour_name, options);
});

/**
 * Add an association to this model's schema
 * and set it on the Document as a getter
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setStatic(function addAssociation(type, alias, model_name, options) {
	var data = this.schema.addAssociation(type, alias, model_name, options);
	this.Document.setAliasGetter(data.alias);

	// Add the alias to the client document too, if it's not private
	if (!options || !options.is_private) {
		// False means it should not be set on the server implementation
		// (because that's where it's coming from)
		this.ClientDocument.setAliasGetter(name);
	}
});

/**
 * Set a method on the document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setStatic(function setDocumentMethod(name, fnc) {

	if (typeof name == 'function') {
		fnc = name;
		name = fnc.name;
	}

	return this.Document.setMethod(name, fnc);
});

/**
 * Set a property on the document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setStatic(function setDocumentProperty(name, fnc) {
	return this.Document.setProperty.apply(this.Document, arguments);
});

/**
 * Get a field
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @return   {FieldType}
 */
Model.setStatic(function getField(name) {

	var fieldPath,
	    alias,
	    model,
	    split;

	if (name.indexOf('.') > -1) {
		split = name.split('.');

		alias = name[0];

		if (this.schema.associations[alias] == null) {
			model = this;
			fieldPath = name;
		} else {
			model = Model.get(this.schema.associations[alias].modelName).constructor;
			split.shift();
			fieldPath = split.join('.');
		}
	} else {
		model = this;
		fieldPath = name;
	}

	return model.schema.get(fieldPath);
});

/**
 * Get the model's public configuration
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setStatic(function getClientConfig() {

	var result = this.schema.getClientConfig();

	result.name = this.model_name;

	return result;
});

/**
 * Initialize behaviours
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @return   {Document}
 */
Model.setMethod(function initBehaviours() {

	var behaviour,
	    key;

	this.behaviours = {};

	for (key in this.schema.behaviours) {
		behaviour = this.schema.behaviours[key];

		this.behaviours[key] = new behaviour.constructor(this, behaviour.options);
	}

});

/**
 * Enable a behaviour on-the-fly
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 */
Model.setMethod(function addBehaviour(behaviourname, options) {

	var instance;

	if (!options) {
		options = {};
	}

	instance = Behaviour.get(behaviourname, this, options);
	this.behaviours[behaviourname] = instance;

	return instance;
});

/**
 * Enable translations
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setMethod(function enableTranslations() {
	this.translate = true;
});

/**
 * Disable translations
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setMethod(function disableTranslations() {
	this.translate = false;
});

/**
 * Aggregate
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {Array}    pipeline
 * @param    {Function} callback
 */
Model.setMethod(function aggregate(pipeline, callback) {

	this.datasource.collection(this.table, function gotCollection(err, collection) {

		if (err) {
			return callback(err);
		}

		collection.aggregate(pipeline, callback);
	});
});

/**
 * Translate the given records
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.3
 *
 * @param    {Array}    items
 * @param    {Object}   options   Optional options object
 * @param    {Function} callback
 */
Model.setMethod(function translateItems(items, options, callback) {

	var collection,
	    fieldName,
	    prefixes,
	    conduit,
	    prefix,
	    record,
	    alias,
	    found,
	    key,
	    i,
	    j;

	// No items to translate
	if (!items.length) {
		return callback();
	}

	// No fields in this schema are translatable
	if (!this.schema.hasTranslations) {
		return callback();
	}

	// Do nothing if there are no translatable fields
	// or translate is disabled
	if (!this.translate || (!this.conduit && !options.locale)) {
		return callback();
	}

	// Get the alias we need to translate
	alias = options.forAlias || this.name;

	// Get the (optional) attached conduit
	conduit = this.conduit;

	// Possible prefixes
	prefix = [];

	// Prefixes set in the options get precedence
	if (options.locale && options.locale !== true) {
		prefix.include(options.locale);
	}

	// Append the visited prefix after that (if there is one)
	if (conduit && conduit.prefix) {
		prefix.include(conduit.prefix);
	}

	// Append all the allowed locales after that
	if (conduit && conduit.locales) {
		prefix.include(conduit.locales);
	}

	// Add all available prefixes last
	for (key in all_prefixes) {
		prefix.push(key);
	}

	// The fallback prefix
	prefix.push('__');

	// @DEPRECATED: empty keys should no longer be allowed
	prefix.push('');

	for (i = 0; i < items.length; i++) {
		collection = Array.cast(items[i][alias]);

		// Clone the prefixes
		prefixes = prefix.slice(0);

		// If one of the query conditions searched through a translatable field,
		// the prefix found should get preference
		if (options.use_found_prefix && items.item_prefixes && items.item_prefixes[i]) {
			prefixes.unshift(items.item_prefixes[i]);
		}

		for (j = 0; j < collection.length; j++) {
			record = collection[j];

			for (fieldName in this.schema.translatableFields) {
				found = alchemy.pickTranslation(prefixes, record[fieldName], options.allow_empty);

				// Use the final result, if we found something or not
				record[fieldName] = found.result;
				record['_prefix_' + fieldName] = found.prefix;
			}
		}
	}

	callback();
});


/**
 * Query the database by a single id
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {String}   type      The type of find (first, all)
 * @param    {Object}   options   Optional options object
 * @param    {Function} callback
 */
Model.setMethod(function findById(id, options, callback) {

	var that = this;

	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	options = Object.assign({}, options);
	options.conditions = {_id: id};

	this.find('first', options, function gotByIdResult(err, result) {

		if (err) {
			return callback(err);
		}

		callback(null, result);
	});
});

/**
 * Create the given record if the id does not exist in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {Array}    list      A list of all the records that need to be in the db
 * @param    {Function} callback
 */
Model.setMethod(function ensureIds(list, callback) {

	var that = this,
	    tasks = [];

	list = Array.cast(list);

	list.forEach(function eachEntry(entry, index) {
		tasks.push(function checkEntry(next) {

			var id;

			id = entry._id;

			if (!id && entry[that.name]) {
				id = entry[that.name]._id;
			}

			if (!id) {
				return next(new Error('Invalid entry given'));
			}

			that.findById(id, function gotItem(err, result) {

				if (err) {
					return next(err);
				}

				if (result) {
					return next();
				}

				that.save(entry, {create: true, document: false}, next);
			});
		});
	});

	Function.parallel(tasks, callback);
});

/**
 * Save (mixed) data to the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 */
Model.setMethod(function save(_data, _options, _callback) {

	var that     = this,
	    callback = _callback,
	    options  = _options,
	    results,
	    data,
	    iter;

	// Normalize the arguments
	if (typeof options == 'function') {
		callback = options;
	}

	if (options == null || typeof options !== 'object') {
		options = {};
	}

	if (typeof callback !== 'function') {
		callback = Function.dummy;
	}

	// Turn the given data into an array
	data = Array.cast(_data);

	// Get an iterator
	iter = new Iterator(data);

	// Saved results go here
	results = [];

	// Save every given item
	Function.while(function test() {
		return iter.hasNext();
	}, function saveData(next) {

		var recordset = iter.next().value,
		    temp;

		// Skip invalid items
		if (!recordset) {
			return next();
		}

		// Ensure the proper structure
		if (typeof recordset[that.name] === 'undefined') {
			temp = recordset;
			recordset = {};
			recordset[that.name] = temp;
		}

		// Save the data
		that.saveRecord(recordset, options, function saved(err, result) {

			if (err != null) {
				return next(err);
			}

			results.push(result);
			next(null);
		});
	}, function savedAll(err) {

		if (options.document !== false) {
			results = that.createDocumentList(results);
		}

		callback(err, results);
	});
});

/**
 * Save one record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.3
 */
Model.setMethod(function saveRecord(_data, _options, _callback) {

	var that = this,
	    saved_record,
	    callback = _callback,
	    options  = _options,
	    creating,
	    results,
	    main,
	    data,
	    iter;

	// Normalize the arguments
	if (typeof options == 'function') {
		callback = options;
	}

	if (typeof options !== 'object') {
		options = {};
	}

	if (typeof callback !== 'function') {
		callback = Function.thrower;
	}

	if (Array.isArray(_data)) {
		data = _data[0];
	} else {
		data = _data;
	}

	main = data[this.name];

	Function.series(function doAudit(next) {
		// Look through unique indexes if no _id is present
		that.auditRecord(main, options, function afterAudit(err, data) {

			if (err) {
				return next(err);
			}

			// Is a new record being created?
			creating = options.create || data._id == null;
			next();
		});
	}, function doBeforeSave(next) {

		if (typeof that.beforeSave == 'function') {
			that.beforeSave(data, options, next);
		} else {
			next();
		}

	}, function emitSavingEvent(next) {
		that.emit('saving', data, options, creating, function afterSavingEvent(err, stopped) {
			return next(err);
		});
	}, function doDatabase(next) {

		if (options.debug) {
			console.log('Saving data', data, 'Creating?', creating);
		}

		function gotRecord(err, result) {
			if (err) {
				return next(err);
			}

			saved_record = result;
			next();
		}

		if (creating) {
			that.createRecord(main, options, gotRecord);
		} else {
			that.updateRecord(main, options, gotRecord);
		}
	}, function doAssociated(next) {

		var tasks = [],
		    assoc,
		    entry,
		    key;

		Object.each(data, function eachEntry(entry, key) {

			// Skip our own record
			if (key == that.name) {
				return;
			}

			// Get the association configuration
			assoc = that.schema.associations[key];

			// If the association doesn't exist, do nothing
			if (!assoc) {
				return;
			}

			// Add the saved _id
			entry[assoc.options.foreignKey] = saved_record[assoc.options.localKey];

			// Add the task
			tasks.push(function doSave(next) {
				var a_model = that.getModel(assoc.modelName);
				a_model.save(entry, next);
			});
		});

		Function.parallel(tasks, next);
	}, function done(err) {

		if (err) {
			return callback(err);
		}

		return callback(null, saved_record);
	});
});

/**
 * Look for the record id by checking the indexes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {Object}     data       The record data to check
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function auditRecord(data, options, callback) {

	var that = this,
	    results,
	    schema,
	    tasks;

	schema = this.schema;

	if (data._id == null && options.audit !== false) {
		tasks = {};
		results = {};

		if (options.debug) {
			console.log('Pre-save audit record', data);
		}

		schema.eachAlternateIndex(data, function iterIndex(index, indexName) {

			if (options.debug) {
				console.log('Checking alternate index', indexName);
			}

			tasks[indexName] = function auditIndex(next) {
				var query = {},
				    fieldName;

				for (fieldName in index.fields) {
					if (data[fieldName] != null) {
						query[fieldName] = data[fieldName];

						// @todo: should run through the FieldType instance
						if (String(query[fieldName]).isObjectId()) {
							query[fieldName] = alchemy.castObjectId(query[fieldName]);
						}
					}
				}

				that.datasource.read(that, query, {}, function gotRecordInfo(err, records) {

					if (err != null) {
						return next(err);
					}

					if (records[0] != null) {
						results[indexName] = records[0];
					}

					next();
				});

			};
		});

		Function.parallel(tasks, function doneAudit(err) {

			var indexName,
			    record,
			    count,
			    ids;

			if (err != null) {
				return callback(err);
			}

			if (!Object.isEmpty(results)) {

				count = 0;
				ids = {};

				for (indexName in results) {
					record = results[indexName];

					// First make sure this index is allowed during the audit
					// If it's not, this means it should be considered a duplicate
					if (options.allowedIndexes != null && !Object.hasValue(options.allowedIndexes, indexName)) {
						if (callback) callback(new Error('Duplicate index found other than _id: ' + indexName), null);
						return;
					}

					// Add the id a first time
					if (ids[record._id] == null) {
						count++;
						ids[record._id] = true;
					}
				}

				// If more than 1 ids are found, we can't update the item
				// because we don't know which record is the actual owner
				if (count > 1) {
					if (callback) callback(new Error('Multiple unique records found'));
					return;
				}

				// Use the last found record to get the id
				data._id = record._id;
			}

			if (options.debug) {
				console.log('Audit done, found _id:', data._id);
			}

			callback(null, data);
		});

		return;
	}

	setImmediate(function skippedAudit() {
		callback(null, data);
	});
});

/**
 * Create a record in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}     data       The record data to check
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function createRecord(data, options, callback) {

	var that = this;

	// Normalize the data, set default values, ...
	data = this.compose(data, options);

	Function.series(function validate(next) {

		if (options.validate === false) {
			return next();
		}

		that.schema.validate(data, options, next);
	}, function done(err) {

		if (err) {
			return callback(err);
		}

		that.datasource.create(that, data, options, function afterCreate(err, result) {

			if (err != null) {
				return callback(err);
			}

			that.emit('saved', result, options, true, function afterSavedEvent() {
				callback(null, result);
			});
		});
	})
});

/**
 * Update a record in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}     data       The record data to check
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function updateRecord(data, options, callback) {

	var that = this;

	// Normalize the data, but no default values should be set (skip non present items)
	data = this.compose(data, Object.assign({update: true}, options));

	this.datasource.update(this, data, options, function afterUpdate(err, result) {

		if (err != null) {
			return callback(err);
		}

		that.emit('saved', result, options, false, function afterSavedEvent() {
			callback(null, result);
		});
	});
});

/**
 * Get a field instance from the schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   name   The name of the field
 *
 * @return   {FieldType}
 */
Model.setMethod(function getField(name) {
	return this.schema.getField(name);
});

/**
 * Get the title to display for this record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.1.0
 *
 * @param    {Object}        item       The record item of this model
 * @param    {String|Array}  fallbacks  Extra fallbacks to use
 * 
 * @return   {String}        The display title to use
 */
Model.setMethod(function getDisplayTitle(item, fallbacks) {

	var fields,
	    field,
	    main,
	    val,
	    i;

	if (!item) {
		return 'Undefined item';
	}

	if (item[this.modelName]) {
		main = item[this.modelName];
	} else {
		main = item;
	}

	if (!main) {
		return 'Undefined item';
	}

	fields = Array.cast(this.displayField);

	if (fallbacks) {
		fields = fields.concat(fallbacks);
	}

	for (i = 0; i < fields.length; i++) {
		val = main[fields[i]];

		if (Object.isObject(val)) {
			field = this.getField(fields[i]);

			if (field && field.isTranslatable) {
				val = alchemy.pickTranslation(this.conduit, val).result;
			}
		}

		if (val && typeof val == 'string') {
			return val;
		}
	}

	return main._id || '';
});

/**
 * Clear the cache of this and all associated models
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {Boolean}   associated   Also nuke associated models
 * @param    {Object}    seen         Keep track of already nuked models
 */
Model.setMethod(function nukeCache(associated, seen) {

	var assoc_model,
	    model_name,
	    alias;

	// Nuke associated caches by default
	if (typeof associated == 'undefined') {
		associated = true;
	}

	// Create the seen object
	if (typeof seen == 'undefined') {
		seen = {};
	}

	// If the cache exists and we haven't nuked it yet, do it now
	if (this.cache && !seen[this.name]) {
		this.cache.reset();
	}

	// Indicate we've seen this model
	seen[this.name] = true;

	// Return if we don't need to nuke associated models
	if (!associated) {
		return;
	}

	for (alias in this.associations) {
		model_name = this.associations[alias].modelName;

		if (!seen[model_name]) {
			assoc_model = this.getModel(model_name);
			assoc_model.nukeCache(true, seen);
		}
	}
});

/**
 * Create a new document
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.2.0
 *
 * @param    {Object}   data   Field values
 *
 * @return   {Object}
 */
Model.setMethod(function compose(data, options) {
	return this.schema.process(data, options);
});

/**
 * Delete the given record id
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.1.0
 *
 * @param   {String}     id        The object id
 * @param   {Function}   callback
 *
 * @return  {undefined}
 */
Model.setMethod(function remove(id, callback) {

	var that = this,
	    id   = alchemy.castObjectId(id);

	if (!id) {
		return callback(new Error('Invalid ObjectId given!'));
	}
	
	this.datasource.remove(this, {_id: id}, {}, function afterRemove(err, result) {

		if (err != null) {
			return callback(err);
		}

		that.emit('removed', result, {}, false, function afterRemovedEvent() {
			callback(null, result);
		});
	});
});

/**
 * Get all the records and perform the given task on them
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {Object}    options    Find options
 * @param    {Function}  task       Task to perform on each record
 * @param    {Function}  callback   Function to call when done
 */
Model.setMethod(function eachRecord(options, task, callback) {

	var that = this,
	    available = null,
	    last_id = null,
	    pledge = new Classes.Pledge(),
	    index = 0;

	if (typeof options == 'function') {
		callback = task;
		task = options;
		options = {};
	} else if (!options) {
		options = {};
	}

	if (!callback) {
		callback = Function.thrower;
	}

	// Apply default limit of 50 records per fetch
	options = Object.assign({}, {limit: 50}, options);

	// Always sort by _id ascending
	options.sort = {_id: 1};

	// Make sure there is a conditions object
	if (!options.conditions) {
		options.conditions = {};
	}

	this.find('all', options, function gotRecords(err, result) {

		var tasks = [];

		if (!result.length) {
			pledge.reportProgress(100);
			pledge.resolve();
			return callback(null);
		}

		if (available == null) {
			available = result.available;
			options.available = false;
		} else {
			result.available = available;
		}

		result.forEach(function eachRecord(record) {

			var record_index = index++;

			last_id = record._id;

			tasks.push(function doSave(next) {
				pledge.reportProgress(((record_index - 1) / available) * 100);
				task.call(that, record, record_index, next);
			});
		});

		Function.parallel(8, tasks, function done(err) {

			if (err) {
				pledge.reject();
				return callback(err);
			}

			let next_options = Object.assign({}, options);

			// Get records with a bigger _id than the last found
			next_options.conditions._id = {$gt: last_id};

			that.find('all', next_options, gotRecords);
		});
	});

	return pledge;
});

/**
 * Read from the datasource
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}    conditions
 * @param    {Object}    options
 * @param    {Function}  callback
 */
Model.setMethod(function readDatasource(conditions, options, callback) {
	this.datasource.read(this, conditions, options, callback);
});

/**
 * Strip out private fields
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Array}     records
 */
Model.setMethod(function removePrivateFields(records) {

	var has_private_fields,
	    fields = this.schema.getSorted(false),
	    record,
	    field,
	    i,
	    j;

	records = Array.cast(records);

	for (i = 0; i < records.length; i++) {
		record = records[i];

		for (j = 0; j < fields.length; j++) {
			field = fields[j];

			if (field.is_private) {
				has_private_fields = true;
				delete record[field.name];
			}
		}

		// If there are no private fields, break loop
		if (!has_private_fields) {
			break;
		}
	}

	return records;
});

/**
 * Get a model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}     name
 * @param   {Boolean}    init
 *
 * @return  {Model}
 */
Model.get = function get(name, init, options) {

	var constructor,
	    namespace,
	    pieces,
	    path,
	    obj;

	if (typeof name == 'function') {
		name = name.name;
	}

	if (!name) {
		throw new TypeError('Model name should be a non-empty string');
	}

	if (init && typeof init == 'object') {
		options = init;
		init = true;
	}

	if (nameCache[name]) {
		if (init === false) {
			return nameCache[name];
		} else {
			return new nameCache[name];
		}
	}

	pieces = name.split('.');

	if (pieces.length > 1) {
		// The first part is the namespace
		namespace = pieces.shift();

		// The rest should be the path
		path = pieces.join('.');

		obj = Classes[namespace];

		if (!obj) {
			if (init === false) {
				return null;
			}

			throw new TypeError('Namespace "' + namespace + '" could not be found');
		}
	} else {
		path = name;
		obj = Classes.Alchemy.Model;
	}

	constructor = Object.path(obj, path) || obj[String(path).modelName()];

	if (constructor == null) {
		if (init === false) {
			return null;
		}

		throw new Error('Could not find model "' + name + '"');
	}

	// Store this name in the cache,
	// so we don't have to perform the expensive #modelName() method again
	nameCache[name] = constructor;

	if (init === false) {
		return constructor;
	} else {
		return new constructor;
	}
};

/**
 * Make the base Model class a global
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @type   {Object}
 */
global.Model = Model;

/**
 * Expose the model configuration to the client
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
alchemy.hawkejs.on({type: 'viewrender', status: 'begin', client: false}, function onBegin(viewRender) {

	var model_info,
	    models = Model.getAllChildren(),
	    i;

	model_info = {};

	for (i = 0; i < models.length; i++) {
		model_info[models[i].model_name] = models[i].getClientConfig();
	}

	viewRender.expose('model_info', model_info);
});
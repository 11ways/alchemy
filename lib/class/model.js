var nameCache   = {},
    mongo       = alchemy.use('mongodb'),
    all_prefixes = alchemy.shared('Routing.prefixes'),
    fs           = alchemy.use('fs'),
    createdModel;

/**
 * The Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 */
var Model = Function.inherits('Alchemy.Base', 'Alchemy.Model', function Model(options) {
	this.init(options);
});

/**
 * Set the modelName property after class creation
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Model.constitute(function setModelName() {
	this.model_name = this.name;
	this.setProperty('model_name', this.model_name);

	if (!this.table) {
		this.table = this.model_name.tableize();
	}
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.3
 *
 * @property cache_duration
 * @type     {String}
 */
Model.setStaticProperty(function cache_duration() {

	if (this._cache_duration == null) {
		this._cache_duration = alchemy.settings.model_query_cache_duration;
	}

	return this._cache_duration;
}, function setCacheDuration(duration) {
	this._cache_duration = duration;

	// @todo: reset cache
});

/**
 * Get the cache object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.3
 *
 * @property cache
 * @type     {Object}
 */
Model.setStaticProperty(function cache() {

	if (this.cache_duration) {

		if (this._cache) {
			return this._cache;
		}

		this._cache = alchemy.getCache(this.name, this.cache_duration);
		return this._cache;
	}

	return false;
}, function setCache(value) {
	return this._cache = value;
});


/**
 * Is this an abstract model?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type   {Boolean}
 */
Model.setStaticProperty(function is_abstract() {

	// Do simple is_abstract_class check
	if (this.is_abstract_class != null) {
		return !!this.is_abstract_class;
	}

	// If we need to load an external schema, it's also not abstract
	if (this.prototype.load_external_schema) {
		return false;
	}

	// See if this model has other fields than the default ones
	let field_count = this.schema.array.length;

	if (this.schema.has('_id')) {
		field_count--;
	}

	if (this.schema.has('created')) {
		field_count--;
	}

	if (this.schema.has('updated')) {
		field_count--;
	}

	return field_count < 1;
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
 * @version  1.1.0
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

		if (model.prototype.add_basic_fields !== false) {

			// Set default model fields immediately after this function ends
			// This has to be scheduled next, because addField would call createSchema
			// again, resulting in an infinite loop
			doNext(function addSchemaBasics() {
				model.addField('_id', 'ObjectId', {default: Field.createPathEvaluator('alchemy.ObjectId')});
				model.addField('created', 'Datetime', {default: Field.createPathEvaluator('Date.create')});
				model.addField('updated', 'Datetime', {default: Field.createPathEvaluator('Date.create')});
			});
		}
	}

	return schema;
}, [
	'addEnumValues',
	'setEnumValues',
	'belongsTo',
	'hasOneParent',
	'hasAndBelongsToMany',
	'hasMany',
	'hasOneChild',
	'addIndex',
	'addRule',
]);

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
 * Set the name of the primary key field
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Model.setProperty('primary_key', '_id');

/**
 * Should we load the schema from the database?
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Model.setProperty('load_external_schema', false);

/**
 * Object where behaviours are stored
 *
 * @type {Object}
 */
Model.prepareProperty('behaviours', Object);

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
 * Is this an abstract model?
 *
 * @type   {Boolean}
 */
Model.setProperty(function is_abstract() {
	return this.constructor.is_abstract;
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
 * @version  1.1.0
 *
 * @param    {String}   value       The value in the url
 * @param    {String}   name        The name of the url parameter
 * @param    {String}   field_name  The name of the field to check
 * @param    {Conduit}  conduit     The optional conduit
 *
 * @return   {Pledge}
 */
Model.setStatic(function checkPathValue(value, name, field_name, conduit) {

	var instance,
	    pledge,
	    crit;

	if (!field_name) {
		if (name == 'id') {
			field_name = this.prototype.primary_key;
		} else {
			field_name = name;
		}
	}

	if (conduit) {
		instance = conduit.getModel(this);
	} else {
		instance = new this;
	}

	// Create new criteria instance
	crit = instance.find();

	// Look for the wanted field
	crit.where(field_name).equals(value);

	pledge = instance.find('first', crit);

	return pledge;
});

/**
 * Add a field to this model's schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.2.4
 *
 * @return   {Alchemy.Field}
 */
Model.setStatic(function addField(name, type, options) {

	var field,
	    is_new;

	is_new = !this.schema.has(name);

	// Add it to the schema
	field = this.schema.addField(name, type, options);

	if (is_new) {
		// Add it to the Document class
		this.Document.setFieldGetter(name);

		// False means it should not be set on the server implementation
		// (because that's where it's coming from)
		// Yes, this also sets private fields on the server-side client document.
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
 * @version  1.2.4
 */
Model.setStatic(function addAssociation(type, alias, model_name, options) {
	var data = this.schema.addAssociation(type, alias, model_name, options);
	this.Document.setAliasGetter(data.alias);

	// False means it should not be set on the server implementation
	// (because that's where it's coming from)
	// Yes, this also sets private fields on the server-side client document.
	this.ClientDocument.setAliasGetter(name);
});

/**
 * Set a method on the document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.6
 */
Model.setStatic(function setDocumentMethod(name, fnc) {

	var that = this;

	if (typeof name == 'function') {
		fnc = name;
		name = fnc.name;
	}

	Blast.loaded(function whenLoaded() {
		that.Document.setMethod(name, fnc);
	});
});

/**
 * Set a property on the document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.6
 */
Model.setStatic(function setDocumentProperty(name, fnc) {

	var that = this,
	    args = arguments;

	Blast.loaded(function whenLoaded() {
		that.Document.setProperty.apply(that.Document, args);
	});
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
 * (This is used to create the client-side Model instances)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
Model.setStatic(function getClientConfig() {

	var result = {
		name        : this.model_name,
		schema      : this.schema,
		primary_key : this.prototype.primary_key
	};

	if (this.super.name != 'Model') {
		result.parent = this.super.name;
	}

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
 * Get a behaviour instance
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @param    {String}   name
 *
 * @return   {Behaviour}
 */
Model.setMethod(function getBehaviour(name) {

	name = name.camelize();

	if (!name.endsWith('Behaviour')) {
		name += 'Behaviour';
	}

	return this.behaviours[name];
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
 * @version  1.1.4
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
	    item,
	    key,
	    i,
	    j;

	if (options && options instanceof Classes.Alchemy.Criteria.Criteria) {
		options = options.options;
	}

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

	// If prefixes are given as an option, only use those
	if (options.prefixes) {
		prefix = options.prefixes;
	} else {
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
	}

	for (i = 0; i < items.length; i++) {
		item = items[i];

		if (!options.ungrouped_items) {
			item = item[alias];
		}

		collection = Array.cast(item);

		// Clone the prefixes
		prefixes = prefix.slice(0);

		// If one of the query conditions searched through a translatable field,
		// the prefix found should get preference
		if (options.use_found_prefix && items.item_prefixes && items.item_prefixes[i]) {
			prefixes.unshift(items.item_prefixes[i]);
		}

		let field;

		for (j = 0; j < collection.length; j++) {
			record = collection[j];

			for (fieldName in this.schema.translatableFields) {
				field = this.schema.translatableFields[fieldName];
				field.translateRecord(prefixes, record, options.allow_empty);
			}
		}
	}

	callback();
});

/**
 * Create the given record if the id does not exist in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {Array}    list      A list of all the records that need to be in the db
 * @param    {Function} callback
 */
Model.setMethod(function ensureIds(list, callback) {

	var that = this;

	list = Array.cast(list);

	return Function.forEach.parallel(list, function checkEntry(entry, key, next) {
		var id;

		id = entry[that.primary_key];

		if (!id && entry[that.name]) {
			id = entry[that.name][that.primary_key];
		}

		if (!id) {
			return next(new Classes.Alchemy.Error.Model('`Model#ensureIds()` can\'t ensure an entry without an _id'));
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
	}, callback);
});

/**
 * Save one record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.2.0
 *
 * @param    {Document}   document
 * @param    {Object}     options
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
Model.setMethod(function saveRecord(document, options, callback) {

	var that = this,
	    saved_record,
	    creating,
	    results,
	    pledge,
	    main,
	    iter;

	if (!document) {
		pledge = Pledge.reject(new Error('Unable to save record: given document is undefined'));
		pledge.done(callback);
		return pledge;
	}

	// Normalize the arguments
	if (typeof options == 'function') {
		callback = options;
	}

	if (typeof options !== 'object') {
		options = {};
	}

	pledge = Function.series(function doAudit(next) {

		if (Object.isPlainObject(document)) {
			return next(new Error('Model#saveRecord() expects a Document, not a plain object'));
		}

		// Look through unique indexes if no _id is present
		that.auditRecord(document, options, function afterAudit(err, doc) {

			if (err) {
				return next(err);
			}

			// Is a new record being created?
			creating = options.create || doc[that.primary_key] == null;
			next();
		});
	}, function doBeforeSave(next) {

		if (typeof that.beforeSave == 'function') {
			let promise = that.beforeSave(document, options, next);

			if (promise) {
				Pledge.done(promise, next);
			} else if (that.beforeSave.length < 3) {
				// If the method accepts no `next` callback, call it now
				next();
			}
		} else {
			next();
		}

	}, function emitSavingEvent(next) {
		that.emit('saving', document, options, creating, function afterSavingEvent(err, stopped) {
			return next(err);
		});
	}, function doDatabase(next) {

		if (options.debug) {
			console.log('Saving document', document, 'Creating?', creating);
		}

		function gotRecord(err, result) {
			if (err) {
				return next(err);
			}

			saved_record = result;
			next();
		}

		if (creating) {
			that.createRecord(document, options, gotRecord);
		} else {
			that.updateRecord(document, options, gotRecord);
		}
	}, function doAssociated(next) {

		var tasks = [],
		    assoc,
		    entry,
		    key;

		Object.each(document.$record, function eachEntry(entry, key) {

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
			//@TODO: this throws an error sometimes.
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
			return;
		}

		return saved_record;
	});

	pledge.handleCallback(callback);

	return pledge;
});

/**
 * Look for the record id by checking the indexes
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.1.0
 *
 * @param    {Document}   document
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function auditRecord(document, options, callback) {

	var that = this,
	    results,
	    schema,
	    tasks;

	if (!document) {
		return callback(new Error('No record was given to audit'));
	}

	schema = this.schema;

	if (schema && document[this.primary_key] == null && options.audit !== false) {
		tasks = {};
		results = {};

		if (options.debug) {
			console.log('Pre-save audit record', document);
		}

		schema.eachAlternateIndex(document, function iterIndex(index, indexName) {

			if (options.debug) {
				console.log('Checking alternate index', indexName);
			}

			tasks[indexName] = function auditIndex(next) {
				var query = {},
				    fieldName;

				for (fieldName in index.fields) {
					if (document[fieldName] != null) {
						query[fieldName] = document[fieldName];

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
					if (ids[record[that.primary_key]] == null) {
						count++;
						ids[record[that.primary_key]] = true;
					}
				}

				// If more than 1 ids are found, we can't update the item
				// because we don't know which record is the actual owner
				if (count > 1) {
					if (callback) callback(new Error('Multiple unique records found'));
					return;
				}

				// Use the last found record to get the id
				document[that.primary_key] = record[that.primary_key];
			}

			if (options.debug) {
				console.log('Audit done, found pk:', document[that.primary_key]);
			}

			callback(null, document);
		});

		return;
	}

	setImmediate(function skippedAudit() {
		callback(null, document);
	});
});

/**
 * Turn a record into something the database will understand
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.4
 *
 * @param    {Document}   record
 * @param    {Object}     options
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
Model.setMethod(function convertRecordToDatasourceFormat(record, options, callback) {

	var that = this,
	    pledge,
	    data;

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	if (!options) {
		options = {};
	}

	data = record[this.name] || record;

	// Normalize the data
	data = this.compose(data, options);

	pledge = this.datasource.toDatasource(this, data);

	pledge.handleCallback(callback);

	return pledge;
});

/**
 * Process an object of datasource format
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @param    {Object}     ds_data
 * @param    {Object}     options
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
Model.setMethod(function processDatasourceFormat(ds_data, options, callback) {

	var that = this,
	    pledge,
	    data;

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	if (!options) {
		options = {};
	}

	pledge = this.datasource.toApp(this.schema, {}, options, ds_data);

	pledge.handleCallback(callback);

	return pledge;
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

	return main[this.primary_key] || '';
});

/**
 * Clear the cache of this and all associated models
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.6
 *
 * @param    {Boolean}   associated   Also nuke associated models
 * @param    {Branch}    parent
 */
Model.setMethod(function nukeCache(associated, parent) {

	let model_name,
	    branch,
	    alias;

	// Nuke associated caches by default
	if (typeof associated == 'undefined') {
		associated = true;
	}

	// Create the parent branch object
	if (!parent) {
		branch = parent = new Classes.Branch.Data(this.name);
	}

	if (branch || !parent.root.seen(this.name)) {

		if (!branch) {
			branch = parent.append(this.name);
		}

		if (this.cache) {
			this.cache.reset();
		}

		// Also nuke the cache of the client model, if it exists
		if (Classes.Alchemy.Client.Model[this.constructor.name] && Classes.Alchemy.Client.Model[this.constructor.name].cache) {
			Classes.Alchemy.Client.Model[this.constructor.name].cache.reset();
		}
	}

	// Return if we don't need to nuke associated models
	if (!associated) {
		return;
	}

	for (alias in this.associations) {
		model_name = this.associations[alias].modelName;

		if (!parent.root.seen(model_name)) {
			let assoc_model = this.getModel(model_name);
			assoc_model.nukeCache(true, branch);
		}
	}
});

/**
 * Delete the given record id
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.7
 *
 * @param   {String}     id        The object id
 * @param   {Function}   callback
 *
 * @return  {Pledge}
 */
Model.setMethod(function remove(id, callback) {

	var that = this,
	    pledge = new Pledge(),
	    id;

	pledge.handleCallback(callback);

	if (!id) {
		pledge.reject(new Error('Invalid id given!'));
		return pledge;
	}

	if (this.datasource.supports('objectid')) {
		id = alchemy.castObjectId(id);
	} else {
		id = String(id);
	}

	let query = {};
	query[this.primary_key] = id;

	this.datasource.remove(this, query, {}, function afterRemove(err, result) {

		if (err != null) {
			return pledge.reject(err);
		}

		that.emit('removed', result, {}, false, function afterRemovedEvent() {
			pledge.resolve(result);
		});
	});

	return pledge;
});

/**
 * Get all the records and perform the given task on them
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.5.0
 * @version  1.2.0
 *
 * @param    {Object}    options    Find options
 * @param    {Function}  task       Task to perform on each record
 * @param    {Function}  callback   Function to call when done
 */
Model.setMethod(function eachRecord(options, task, callback) {

	var that = this,
	    parallel_limit,
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

	// Get amount of tasks to do in parallel
	parallel_limit = options.parallel_limit || 8;

	// Sort by _id ascending
	if (!options.sort) {
		options.sort = {};
		options.sort[this.primary_key] = 1;
	}

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

			last_id = record[that.model_name][that.primary_key];

			tasks.push(function doSave(next) {
				pledge.reportProgress(((record_index - 1) / available) * 100);
				task.call(that, record, record_index, next);
			});
		});

		Function.parallel(parallel_limit, tasks, function done(err) {

			if (err) {
				pledge.reject(err);
				return callback(err);
			}

			let next_options = Object.assign({}, options);

			// Get records with a bigger _id than the last found
			next_options.conditions[that.primary_key] = {$gt: last_id};

			that.find('all', next_options, gotRecords);
		});
	});

	return pledge;
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
 * Create an export stream
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Stream}   output
 * @param    {Object}   options
 *
 * @return   {Pledge}
 */
Model.setMethod(function exportToStream(output, options) {

	if (!alchemy.isStream(output)) {
		if (!options) {
			options = output;
			output = null;
		}

		output = options.output;
	}

	if (!output) {
		return Pledge.reject(new Error('No target output stream has been given'));
	}

	if (!options) {
		options = {};
	}

	// Only allow 1 task to run at a time
	options.parallel_limit = 1;

	let that = this,
	    name_buf = Buffer.from(this.model_name),
	    head_buf;

	// 0x01 is a model
	head_buf = Buffer.concat([Buffer.from([0x01, name_buf.length]), name_buf]);

	output.write(head_buf);

	return this.eachRecord(options, function eachRecord(record, index, next) {
		record.exportToStream(output).done(next);
	}, function done(err) {

	});
});

/**
 * Import from a stream
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Stream}   input
 * @param    {Object}   options
 *
 * @return   {Pledge}
 */
Model.setMethod(function importFromStream(input, options) {

	if (!alchemy.isStream(input)) {
		if (!options) {
			options = input;
			input = null;
		}

		input = options.input;
	}

	if (!input) {
		return Pledge.reject(new Error('No source input stream has been given'));
	}

	let that = this,
	    current_type = null,
	    extra_stream,
	    pledge = new Pledge(),
	    stopped,
	    paused,
	    buffer,
	    value,
	    seen = 0,
	    left,
	    size,
	    doc;

	input.on('data', function onData(data) {

		if (stopped) {
			return;
		}

		if (buffer) {
			buffer = Buffer.concat([buffer, data]);
		} else {
			buffer = data;
		}

		handleBuffer();
	});

	function handleBuffer() {

		if (paused) {
			return;
		}

		if (!current_type && buffer.length < 2) {
			return;
		}

		if (!current_type) {
			current_type = buffer.readUInt8(0);

			if (current_type == 0x01) {
				size = buffer.readUInt8(1);
				buffer = buffer.slice(2);
			} else if (current_type == 0x02 && buffer.length >= 5) {
				size = buffer.readUInt32BE(1);
				buffer = buffer.slice(5);
			} else if (current_type == 0xFF) {
				size = buffer.readUInt32BE(1);
				buffer = buffer.slice(5);
				seen = 0;

				if (!doc) {
					stopped = true;
					pledge.reject(new Error('Found extra import data, but no active document'));
				} else {
					extra_stream = new require('stream').PassThrough();
					doc.extraImportFromStream(extra_stream);
				}
			} else {
				// Not enough data? Wait
				current_type = null;
				return;
			}
		}

		handleRest();
	}

	function handleRest() {

		if (current_type == 0xFF) {
			left = size - seen;
			value = buffer.slice(0, left);

			seen += value.length;

			if (value.length == buffer.length) {
				buffer = null;
			} else if (value.length < buffer.length) {
				buffer = buffer.slice(left);
			}

			extra_stream.write(value);

			if (value.length == left) {
				extra_stream.end();
				current_type = null;

				if (buffer) {
					handleBuffer();
				}
			}

			return;
		}

		if (buffer.length >= size) {
			value = buffer.slice(0, size);
			buffer = buffer.slice(size);
		} else {
			// Wait for next call
			return;
		}

		if (current_type == 0x01) {
			value = value.toString();

			if (value == that.model_name) {
				// Found name!
				current_type = null;
				size = 0;
			} else {
				stopped = true;
				return pledge.reject(new Error('Model names do not match'));
			}
		} else if (current_type == 0x02) {
			doc = that.createDocument();
			input.pause();
			paused = true;

			doc.importFromBuffer(value).done(function done(err, result) {

				if (err) {
					stopped = true;
					return pledge.reject(err);
				}

				current_type = null;
				paused = false;
				input.resume();

				handleBuffer();
			});

			return;
		}

		if (buffer && buffer.length) {
			handleBuffer();
		}
	}

	return pledge;
});

/**
 * Get a model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
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

	if (!options) {
		options = {};
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
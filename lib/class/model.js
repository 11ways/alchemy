var expirable   = alchemy.use('expirable'),
    nameCache   = {},
    mongo       = alchemy.use('mongodb'),
    bson        = alchemy.use('bson').BSONPure.BSON,
    all_prefixes = alchemy.shared('Routing.prefixes'),
    createdModel;

/**
 * The Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 */
var Model = Function.inherits('Informer', function Model(options) {

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
 * @version  0.2.0
 */
Model.constitute(function setModelName() {
	this.modelName = this.name.beforeLast('Model');
	this.table = this.modelName.tableize();
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
 * @type {Expirable}
 */
Model.prepareStaticProperty('cache', function getCache() {

	if (this.cacheDuration) {
		return new expirable(this.cacheDuration);
	}

	return false;
});

/**
 * Get the document class constructor
 *
 * @property Document
 * @type {Function}
 */
Model.prepareStaticProperty('Document', function getDocumentClass() {
	return alchemy.classes.Document.getDocumentClass(this);
});

/**
 * Set the static per-model blueprint
 *
 * @type   {Schema}
 */
Model.staticCompose('schema', function createSchema(doNext) {

	var that   = this,
	    model  = this.compositorParent,
	    schema = new alchemy.classes.Schema();

	// The base Model does not have a schema
	if (model.name == 'Model') {
		return false;
	} else {

		// Link the schema to this model
		schema.setModel(model);

		// Set the schema name
		schema.setName(model.name.beforeLast('Model'));

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

/**
 * Deprecated blueprint property
 *
 * @type {Schema}
 */
Model.setStaticProperty('blueprint', function getSchemaAsBlueprint() {
	return this.schema;
});

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
	return this._name || this.constructor.modelName;
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
 * Instance access to static cache
 *
 * @type {Expirable}
 */
Model.prepareProperty('cache', function cache() {
	return this.constructor.cache;
});

/**
 * Instance access to static schema as `blueprint`
 *
 * @type   {Schema}
 */
Model.setProperty(function blueprint() {
	return this.constructor.schema;
});

/**
 * Instance access to static blueprint
 *
 * @type   {Schema}
 */
Model.setProperty(function schema() {
	return this.constructor.schema;
});

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
 * Add a field to this model's schema/blueprint
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setStatic(function addField(name, type, options) {

	var result;

	// Add it to the blueprint
	result = this.schema.addField(name, type, options);

	// Add it to the Document class
	this.Document.setFieldGetter(name);

	return result;
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
Model.setStatic(function addAssociation(type, alias, modelName, options) {
	var data = this.schema.addAssociation(type, alias, modelName, options);
	this.Document.setAliasGetter(data.alias);
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

		if (this.blueprint.associations[alias] == null) {
			model = this;
			fieldPath = name;
		} else {
			model = Model.get(this.blueprint.associations[alias].modelName).constructor;
			split.shift();
			fieldPath = split.join('.');
		}
	} else {
		model = this;
		fieldPath = name;
	}

	return model.blueprint.get(fieldPath);
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
 * Create a new document.
 * If data is given, the document is populated
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}    data     Optional data
 *
 * @return   {Document}
 */
Model.setMethod(function createDocument(data) {

	var doc = new this.constructor.Document(data, {model: this});

	return doc;
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
 * Return a model instance for the given alias
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {String}   alias
 *
 * @return   {Model}
 */
Model.setMethod(function getAliasModel(alias) {

	var config,
	    result;

	if (alias == this.name) {
		return this;
	}

	if (this.schema) {
		config = this.schema.associations[alias];
	}

	if (config) {
		result = this.getModel(config.modelName);
	} else {
		result = this.getModel(alias);
	}

	return result;
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 *
 * @param    {String}   type      The type of find (first, all)
 * @param    {Object}   options   Optional options object
 * @param    {Function} callback
 */
Model.setMethod(function find(type, options, callback) {

	var that = this,
	    queryItems,
	    query,
	    error,
	    Type;

	if (!this.table) {
		error = new Error('Model ' + this.name + ' does not use a table, find ignored');
	}

	if (callback == null) {
		if (typeof options == 'function') {
			callback = options;
			options = false;
		} else if (error == null) {
			// Allow multiple errors?
			error = new Error('Tried to do a find without a callback');
		}
	}

	if (typeof type !== 'string' && error == null) {
		error = new TypeError('Find type should be a string');
	}

	if (error != null) {
		setImmediate(function callbackError() {
			callback(error);
		});

		return;
	}

	// Normalize the find options
	options = this.getFindOptions(options);

	// Save the type
	options.findType = type;

	// Get the camelized type
	Type = type.camelize();

	Function.series(function doBeforeType(next) {
		if (typeof that['beforeFind' + Type] == 'function') {
			that['beforeFind' + Type](options, next);
		} else {
			next();
		}
	}, function doBeforeEvent(next) {
		that.emit('finding', options, next);
	}, function doQuery(next) {

		query = new DbQuery(that, options);

		query.execute(function executedQuery(err, items) {

			if (err != null) {
				return next(err);
			}

			options.query = query;
			queryItems = items;

			next();
		});
	}, function emitQueried(next) {
		that.emit('queried', options, queryItems, next);
	}, function doTranslations(next) {
		that.translateItems(queryItems, options, next);
	}, function doAssociated(next) {

		var tasks;

		if ((query.recursive <= 0 && !options.contain) || options.contain === true) {
			return next();
		}

		tasks = new Array(queryItems.length);

		queryItems.forEach(function(record, index) {
			tasks[index] = function getAssociatedData(nextAssoc) {
				that.addAssociatedDataToRecord(options, query, record, nextAssoc);
			};
		});

		// Add the associated data, 8 records at a time
		Function.parallel(8, tasks, next);
	}, function emitAssociated(next) {
		that.emit('associated', options, queryItems, next);
	}, function doAfterType(next) {
		if (typeof that['afterFind' + Type] == 'function') {
			that['afterFind' + Type](options, queryItems, function doneAfterFind(err, replace) {

				if (replace) {
					queryItems = replace;
				}

				next(err);
			});
		} else {
			next();
		}
	}, function doAfterEvent(next) {

		that.emit('found', options, queryItems, function afterFound(err) {

			if (err) {
				return next(err);
			}

			if (options.document !== false) {
				queryItems = new that.constructor.Document(queryItems, {model: that});
				that.emit('foundDocuments', options, queryItems, next);
			} else {
				next();
			}
		});
	}, function done(err) {

		if (err != null) {
			return callback(err);
		}

		callback(null, queryItems)
	});
});

/**
 * Translate the given records
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
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

	// Do nothing if there are no translatable fields or
	// no items are given or translate is disabled
	if (!this.schema.hasTranslations
		|| !items.length
		|| !this.translate
		|| (!this.conduit && !options.locale)
		) {
		return callback();
	}

	// Get the alias we need to translate
	alias = options.forAlias || this.name;

	// Get the (optional) attached conduit
	conduit = this.conduit;

	// Possible prefixes
	prefix = [];

	// Prefixes set in the options get precedence
	if (options.locale !== true) {
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

	for (i = 0; i < items.length; i++) {
		collection = Array.cast(items[i][alias]);

		// Clone the prefixes
		prefixes = prefix.slice(0);

		// If one of the query conditions searched through a translatable field,
		// the prefix found should get preference
		if (items.item_prefixes && items.item_prefixes[i]) {
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
 * Add associated data to a single record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.2.0
 *
 * @param    {Object}    options
 * @param    {DbQuery}   query
 * @param    {Object}    item
 * @param    {Function}  callback
 */
Model.setMethod(function addAssociatedDataToRecord(options, query, item, callback) {

	var associations = query.associations,
	    aliases      = {},
	    that         = this,
	    data         = item[this.name];

	if (!data) {
		return callback(new Error('Required data not found for model "' + this.name + '"'));
	}

	// If create references is not disabled, create the assoc cache
	if (options.create_references !== false && !options.assoc_cache) {
		options.assoc_cache = {};
	}

	Object.each(associations, function eachAssoc(association, alias) {

		if (options.initModel == alias || options.fromAlias == alias) {
			return;
		}

		aliases[alias] = function aliasRecordTask(nextAlias) {

			var assocModel,
			    assocOpts  = {},
			    condition  = {},
			    assocKey,
			    localKey,
			    key;

			assocModel = that.getAliasModel(alias);

			assocKey = association.options.foreignKey;
			localKey = association.options.localKey;

			if (Array.isArray(data[localKey])) {
				condition[assocKey] = data[localKey].map(function(value) {
					return alchemy.castObjectId(value) || 'impossible';
				});
			} else {
				condition[assocKey] = alchemy.castObjectId(data[localKey]) || 'impossible';
			}

			if (options.create_references !== false) {
				key = JSON.dry(condition);

				if (options.assoc_cache[key]) {
					return nextAlias(null, options.assoc_cache[key]);
				}
			}

			// Take over the locale option
			assocOpts.locale = options.locale;

			// The debug object, if there is one
			assocOpts._debugObject = options._debugObject;

			// Don't get the available count
			assocOpts.available = false;

			// If fields have been provided, add them
			if (query.fields && query.fields[alias]) {
				assocOpts.fields = query.fields[alias];
			}

			// Sort the results
			if (query.sort && query.sort[alias]) {
				assocOpts.sort = query.sort[alias];
			}

			if (query.contain === true) {
				assocOpts.contain = true;
			} else if (query.contain && query.contain[alias]) {
				assocOpts.contain = query.contain[alias];
			} else {
				assocOpts.contain = false;

				if (Number.isSafeInteger(query.recursive)) {
					assocOpts.recursive = query.recursive - 1;
				} else {
					// Disable recursiveness for the next level
					assocOpts.recursive = 0;
				}
			}

			assocOpts.conditions = condition;

			// Add the model name from where we're adding associated data
			assocOpts.initModel = options.initModel || that.name;
			assocOpts.initRecord = options.initRecord || item;

			assocOpts.fromAlias = options.forAlias;
			assocOpts.fromModel = options.forModel;

			assocOpts.forAlias = alias;
			assocOpts.forModel = assocModel.name;

			// Honor the original document option
			assocOpts.document = options.document;

			if (options.debug) {
				assocOpts.debug = true;
				console.log(assocModel.name, Object.assign({}, assocOpts));
			}

			assocModel.find('all', assocOpts, function foundAliasItems(err, assocItems) {

				var result,
				    a_item,
				    temp,
				    i;

				if (options.debug) {
					console.log(assocModel.name, err, JSON.clone(assocItems));
				}

				if (err != null) {
					return nextAlias(err);
				}

				result = assocItems;

				// This code puts the associated data under the parent's alias object,
				// but that breaks Document alias getters, so disable for now
				// result = [];
				// for (i = 0; i < assocItems.length; i++) {
				// 	a_item = assocItems[i];

				// 	// Get the associated model's main resultset
				// 	temp = a_item[assocModel.name];

				// 	// Remove the main resultset from the original item
				// 	delete a_item[assocModel.name];

				// 	// Inject it back into the item
				// 	a_item = Object.assign(temp, a_item);

				// 	// Add it to the resultset
				// 	result.push(a_item);
				// }

				if (association.options.singular) {
					result = result[0];
				}

				if (options.document !== false) {
					temp = {
						model: assocModel,
						singular: association.options.singular,
						associated: true
					};

					result = new assocModel.constructor.Document(result, temp);
				}

				if (options.debug) {
					console.log('Finished assoc from', assocModel.name, 'for', that.name, result);
				}

				if (key) {
					options.assoc_cache[key] = result;
				}

				nextAlias(null, result);
			});
		};
	});

	Function.parallel(alchemy.settings.model_assoc_parallel_limit || 4, aliases, function(err, list) {

		if (err != null) {
			console.log('ERROR: ' + err, err);
			return callback(err);
		}

		// Add the associated data to the item
		Object.assign(item, list);

		callback(null, item);
	});
});

/**
 * The 'first' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 */
Model.setMethod(function beforeFindFirst(query, callback) {
	query.limit = 1;
	callback();
});

/**
 * The 'list' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 */
Model.setMethod(function beforeFindList(query, callback) {

	if (!query.fields) {
		query.fields = ['_id'];
	}

	// Don't turn this into a document
	query.document = false;

	callback();
});

/**
 * The 'dict' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
 */
Model.setMethod(function beforeFindDict(query, callback) {

	if (!query.fields) {
		query.fields = ['_id'];
	}

	// Don't turn this into a document
	query.document = false;

	callback();
});

/**
 * The 'select2' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setMethod(function beforeFindSelect2(query, callback) {

	if (!query.fields) {
		query.fields = ['_id', 'name'];
	}

	// Don't turn this into a document
	query.document = false;

	callback();
});

/**
 * The 'list' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setMethod(function afterFindList(options, records, callback) {

	var results = [],
	    record,
	    temp,
	    key,
	    val,
	    i,
	    j;

	for (i = 0; i < records.length; i++) {
		record = records[i];

		// The first field is always the key, mostly this is _id
		key = record[this.name][options.fields[0]];

		if (options.fields.length == 1) {
			results.push(key);
			continue;
		}

		temp = {};

		for (j = 0; j < options.fields.length; j++) {
			temp[options.fields[j]] = record[this.name][options.fields[j]];
		}

		results.push(temp);
	}

	results.available = records.available;

	callback(null, results);
});

/**
 * The 'dict' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setMethod(function afterFindDict(options, records, callback) {

	var results = {},
	    record,
	    temp,
	    key,
	    val,
	    i,
	    j;

	for (i = 0; i < records.length; i++) {
		record = records[i];

		// The first field is always the key, mostly this is _id
		key = record[this.name][options.fields[0]];

		if (options.fields.length == 1) {
			results[key] = key;
			continue;
		} else if (options.fields.length == 2) {
			results[key] = record[this.name][options.fields[1]];
			continue;
		}

		temp = {};

		for (j = 1; j < options.fields.length; j++) {
			temp[options.fields[j]] = record[this.name][options.fields[j]];
		}

		results[key] = temp;
	}

	callback(null, results);
});

/**
 * The 'select2' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Model.setMethod(function afterFindSelect2(options, records, callback) {

	var results = [],
	    record,
	    data,
	    temp,
	    i;

	for (i = 0; i < records.length; i++) {
		record = records[i][this.name];

		temp = {
			id: ''+record[options.fields[0]],
			text: record.title || record.name
		};

		results.push(temp);
	}

	data = {results: results};

	// Set pagination info if the limit is set
	if (options.limit) {
		data.pagination = {
			more: ((options.page || 1) * options.limit) < records.available
		};
	}

	callback(null, data);
});

/**
 * Create the given record if the id does not exist in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
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

				if (result.length) {
					return next();
				}

				pr(entry)

				that.save(entry, function saved(err, result) {

					if (err) {
						return next(err);
					}

					pr(err)
					pr(result)

					return next();
				});
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
 * @version  0.2.0
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

	if (typeof options !== 'object') {
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
			results = new that.constructor.Document(results);
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
 * @version  0.2.0
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

	schema = this.blueprint;

	if (data._id == null && options.audit !== false) {
		tasks = {};
		results = {};

		schema.eachAlternateIndex(data, function iterIndex(index, indexName) {

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
 * Get a field instance from the blueprint schema
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
	return this.blueprint.getField(name);
});

/**
 * Get default find options
 *
 * @deprecated
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Model.setMethod(function getFindOptions(options) {

	var defOptions = {
		conditions: {},
		recursive: 1,
		fields: [],
		sort: false,
		order: 1,
		limit: 0,
		page: false,
		offset: false,
		available: true, // Get the available count
		callbacks: true // Other possible values are false, 'before', 'after
	};

	return Object.assign({}, defOptions, options);
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
 * @version  0.2.0
 *
 * @param    {Boolean}   associated   Also nuke associated models
 * @param    {Object}    seen         Keep track of already nuked models
 */
Model.setMethod(function nukeCache(associated, seen) {

	var modelName, assocModel;

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
		this.cache.destroy();
	}

	// Indicate we've seen this model
	seen[this.name] = true;

	// Return if we don't need to nuke associated models
	if (!associated) {
		return;
	}

	for (modelName in this.associations) {

		if (!seen[modelName]) {
			assocModel = this.getModel(modelName);
			assocModel.nukeCache(true, seen);
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
 * Get a model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.2.0
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

		obj = alchemy.classes[namespace];

		if (!obj) {
			if (init === false) {
				return null;
			}

			throw new TypeError('Namespace "' + namespace + '" could not be found');
		}
	} else {
		path = name;
		obj = alchemy.classes;
	}

	constructor = Object.path(obj, path + 'Model') || Object.path(obj, path) || obj[String(path).modelName() + 'Model'];

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

alchemy.classes.Model = Model;
global.Model = Model;

return;

/**
 * The Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.1.0
 */
var Model = global.Model = alchemy.create(function Model() {


	/**
	 * The save error handler
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Boolean}   err       If there was an error or not
	 * @param    {Object}    result    The result object or error array
	 * @param    {Object}    input     The input data
	 * @param    {Function}  callback  The function to call back
	 */
	this.saveErrorHandler = function saveErrorHandler(err, result, input, callback) {

		var validationType,
		    recordErrors,
		    fieldName,
		    blueprint,
		    errors,
		    obj;

		// If there is an error, and the render object is available, 
		// show validation errors
		if (err && this.render) {

			obj = {};

			if (result.length && result[0]['err']) {
				err = result[0]['err'];

				errors = {};
				obj.__error__ = {};
				obj.__error__[this.modelName] = errors;
				obj.__current__ = input[0];

				if (err.errors) {
					recordErrors = err.errors;

					for (fieldName in recordErrors) {

						validationType = recordErrors[fieldName].type;

						if (this.blueprint[fieldName]) blueprint = this.blueprint[fieldName];
						
						// Non-mongoose validation is always "user defined",
						// the actual name is inside the message
						if (validationType === 'user defined') {
							validationType = recordErrors[fieldName].message;
						}

						if (blueprint.rules && blueprint.rules[validationType]) {
							errors[fieldName] = {
								type: validationType,
								value: recordErrors[fieldName].value,
								message: blueprint.rules[validationType].message
							};
						} else {
							errors[fieldName] = {message: 'Something went wrong: ' + err.message};
						}
					}
				} else {
					
					errors.err = err;
				}
			} else {
				obj.error = 'Something went wrong!';
			}
			
			// Do not call the callback, but send a customized response with validation errors
			this.render(obj);
		} else {
			callback(err, result);
		}
	};


	/**
	 * What to do after a preliminary save:
	 * The data for the own model is done, now the associated ones
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}    tasks_err     Has async encountered an error?
	 * @param    {Array}     results       The results array
	 *                       - err         Individual result error
	 *                       - item        The primary saved data (this model)
	 *                       - associated  The associated data we need to save
	 * @param    {Function}  callback
	 */
	this._saveAssociatedData = function _saveAssociatedData (tasks_err, results, callback) {

		log.verbose('Going to save associated data for model ' + this.modelName.underline);
		
		var err = null,
		    par = {},
		    mainResult,
		    modelName,
		    recordnr,
		    records,
		    _model,
		    extraQ,
		    record,
		    parent,
		    alias,
		    assoc,
		    i;

		// Now it's time to save the associated data!
		for (i in results) {

			// If the result has an error, skip it
			if (results[i].err) {
				if (!Array.isArray(err)) {
					err = [];
				}
				err.push(results[i].err);
				continue;
			}
			
			parent = results[i]['item'];

			for (alias in results[i].associated) {
				
				log.verbose('Getting alias association "' + alias + '"');
				assoc = this.aliasAssociations[alias];

				if (!assoc) {
					log.error('Tried to get alias association "' + alias.bold.underline + '" which does not exist in model ' + this.modelName);
					return callback(true, false);
				}

				modelName = assoc.modelName;
				records = results[i].associated[alias];
				
				// If records isn't an array (but only 1 object) turn it into one
				if (!Array.isArray(records)) records = [records];

				// Add the correct foreign key to every record
				for (recordnr in records) {
					
					record = records[recordnr];
					
					if (assoc.type == 'hasOneChild') {
						record[assoc.foreignKey] = parent._id;
					} else if (assoc.type == 'hasMany') {
						// @todo: when this is missing, hasmany items get saved without foreignkey!
						record[assoc.foreignKey] = parent._id;
					} else {
						log.error('Association type "' + assoc.type + '" has not been implemented yet');
					}
				}
				
				_model = this.getModel(modelName);

				// Create a new closure
				extraQ = (function (_model, records) {
					
					return function extraQSaveFunction (qcb) {
						
						_model.save(records, function extraQCallback (err, results) {
							
							var returnObject = false;
							
							if (results.length > 0) {
								
								returnObject = [];
								
								for (var i in results) {
									returnObject.push(results[i].item);
								}
							}
							
							qcb(err, returnObject);
						});
						
					}
				})(_model, records);
				
				par[modelName] = extraQ;
			}
		}
		
		mainResult = {};
		mainResult[this.modelName] = {};
		
		if (results[0] && results[0].item) {
			mainResult[this.modelName] = results[0].item;
		}
		
		// If there are no other functions to execute, call the callback
		if (Object.isEmpty(par)) {
			if (callback) {callback(err, results);}
		}	else {
			
			Function.parallel(par, function (err, extra_results) {
				Object.assign(mainResult, extra_results);
				if (callback) callback(err, mainResult);
			});
			
		}
	}


	/**
	 * The notempty validation rule:
	 * value can not be null, undefined or an empty string ''
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Mixed}   value   The value that is going to be saved to the db
	 * @param   {Object}  rule    The specific rule object
	 *
	 * @return  {Boolean}
	 */
	this.notemptyRule = function notemptyRule(value, rule) {
		// Any number or an absolute false is allowed
		if (typeof value === 'number' || value === false) return true;

		// All other falsy values are not allowed
		return !!value;
	};

	/**
	 * The enum validation rule:
	 * the value has to be inside the 'values' array property of the rule
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Mixed}   value   The value that is going to be saved to the db
	 * @param   {Object}  rule    The specific rule object
	 *
	 * @return  {Boolean}
	 */
	this.enumRule = function enumRule(value, rule) {

		// Allow undefined values
		if (typeof value === 'undefined') {
			return true;
		}
		
		return rule.values.indexOf(value) > -1;
	};

	/**
	 * The alphaNumeric validation rule:
	 * the value has to be a string containing alphanumeric characters
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Mixed}   value   The value that is going to be saved to the db
	 * @param   {Object}  rule    The specific rule object
	 *
	 * @return  {Boolean}
	 */
	this.alphaNumericRule = function alphaNumericRule(value, rule) {
		return /^[a-z0-9]+$/i.test(value);
	};

	/**
	 * The between validation rule:
	 * the length (not value) of the value has to be between a certain length
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {Mixed}   value   The value that is going to be saved to the db
	 * @param   {Object}  rule    The specific rule object
	 *
	 * @return  {Boolean}
	 */
	this.betweenRule = function alphaNumericRule(value, rule) {

		// Numbers will be treated as strings
		if (typeof value === 'number') value += '';

		// Make sure the value is something, a string by default
		if (!value) value = '';

		return (value.length >= rule.min && value.length <= rule.max);
	};

});
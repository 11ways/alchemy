var expirable   = alchemy.use('expirable'),
    mongo       = alchemy.use('mongodb'),
    async       = alchemy.use('async'),
    bson        = alchemy.use('bson').BSONPure.BSON,
    hash        = alchemy.use('murmurhash3').murmur128HexSync,
    createdModel;

/**
 * The Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 */
var Model = Function.inherits('Informer', function Model(options) {

	if (typeof options !== 'undefined') {
		if (typeof options.table !== 'undefined') this.table = options.table;
		if (typeof options.dbConfig !== 'undefined') this.dbConfig = options.dbConfig;
		if (typeof options.name !== 'undefined') this.name = options.name;
		if (typeof options.alias !== 'undefined') this.alias = options.alias;
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
 * @property cacheDuration
 * @type {String}
 */
Model.setStaticProperty('cacheDuration', function getCacheDuration() {

	if (this._cacheDuration == null) {
		this._cacheDuration = '60 minutes';
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
	return new expirable(this.cacheDuration);
});

/**
 * Set the static per-model blueprint
 *
 * @type   {Schema}
 */
Model.staticCompose('blueprint', function createBlueprint() {

	var schema = new alchemy.classes.Schema();

	// Link the schema to this model
	schema.setModel(this.compositorParent);

	// Set the schema name
	schema.setName(this.compositorParent.name.beforeLast('Model'));

	// Set default model fields
	schema.addField('_id', 'ObjectId', {default: alchemy.ObjectId});
	schema.addField('created', 'Datetime', {default: Date.create});
	schema.addField('updated', 'Datetime', {default: Date.create});

	return schema;
}, ['addField', 'addEnumValues', 'setEnumValues', 'belongsTo', 'hasOneParent', 'hasAndBelongsToMany', 'hasMany', 'hasOneChild', 'addIndex']);

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
Model.prepareProperty('name', function name() {
	return this.constructor.name.beforeLast('Model');
});

/**
 * Table name to use in the database.
 * False if no table should be used.
 *
 * @type {String}
 */
Model.prepareProperty('table', function table() {
	if (this.name) {
		// If no specific table name is set, tableize the model's name
		return this.name.tableize();
	} else {
		return null;
	}
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
 * Instance access to static blueprint
 *
 * @type   {Schema}
 */
Model.prepareProperty('blueprint', function blueprint() {
	return this.constructor.blueprint;
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
 * Get a field
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * Enable a behaviour
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
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
 * Return a model instance for the given alias
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   alias
 *
 * @return   {Model}
 */
Model.setMethod(function getAliasModel(alias) {

	var config;

	if (alias == this.name) {
		return this;
	}

	config = this.blueprint.associations[alias];

	if (config) {
		return Model.get(config.modelName);
	} else {
		return Model.get(alias);
	}
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
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
	options = Object.assign({}, this.findOptions, options);

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

		Function.parallel(tasks, next);
	}, function doAfterType(next) {
		if (typeof that['afterFind' + Type] == 'function') {
			that['afterFind' + Type](options, queryItems, next);
		} else {
			next();
		}
	}, function doAfterEvent(next) {
		that.emit('found', options, queryItems, next);
	}, function done(err) {

		if (err != null) {
			return callback(err);
		}

		callback(null, queryItems)
	});
});

/**
 * Query the database by a single id
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   type      The type of find (first, all)
 * @param    {Object}   options   Optional options object
 * @param    {Function} callback
 */
Model.setMethod(function findById(id, options, callback) {

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

		callback(null, result[0]);
	});
});

/**
 * Add associated data to a single record
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  1.0.0
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

	Object.each(associations, function eachAssoc(association, alias) {

		if (options.initModel == alias || options.fromAlias == alias) {
			return;
		}

		aliases[alias] = function aliasRecordTask(nextAlias) {

			var assocModel = that.getAliasModel(alias),
			    assocOpts  = {},
			    condition  = {},
			    assocKey,
			    localKey;

			assocKey = association.options.foreignKey;
			localKey = association.options.localKey;

			if (Array.isArray(data[localKey])) {
				condition[assocKey] = data[localKey].map(function(value) {
					return alchemy.castObjectId(value) || 'impossible';
				});
			} else {
				condition[assocKey] = alchemy.castObjectId(data[localKey]) || 'impossible';
			}

			// Take over the locale option
			assocOpts.locale = options.locale;

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

			assocOpts.recursive = 0;

			if (query.contain === true) {
				assocOpts.contain = true;
			} else if (query.contain && query.contain[alias]) {
				assocOpts.contain = query.contain[alias];
			} else {
				assocOpts.contain = false;
				assocOpts.recursive = query.recursive - 1;
			}

			assocOpts.conditions = condition;

			// Add the model name from where we're adding associated data
			assocOpts.initModel = options.initModel || that.name;
			assocOpts.initRecord = options.initRecord || item;

			assocOpts.fromAlias = options.forAlias;
			assocOpts.fromModel = options.forModel;

			assocOpts.forAlias = alias;
			assocOpts.forModel = assocModel.name;

			assocModel.find('all', assocOpts, function foundAliasItems(err, assocItems) {

				var result,
				    item,
				    temp,
				    i;

				if (err != null) {
					return nextAlias(err);
				}

				result = [];

				for (i = 0; i < assocItems.length; i++) {
					item = assocItems[i];

					// Get the associated model's main resultset
					temp = item[assocModel.name];

					// Remove the main resultset from the original item
					delete item[assocModel.name];

					// Inject it back into the item
					item = Object.assign(temp, item);

					// Add it to the resultset
					result.push(item);
				}

				if (association.options.singular) {
					result = result[0];
				}

				nextAlias(null, result);
			});
		};
	});

	Function.parallel(aliases, function(err, list) {

		if (err != null) {
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Model.setMethod(function beforeFindFirst(query, callback) {
	query.limit = 1;
	callback();
});

/**
 * Save (mixed) data to the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
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

		// Skip invalud items
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
		callback(err, results);
	});
});

/**
 * Save one record
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Model.setMethod(function saveRecord(_data, _options, _callback) {

	var that     = this,
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
		callback = Function.dummy;
	}

	if (Array.isArray(_data)) {
		data = _data[0];
	} else {
		data = _data;
	}

	main = data[this.name];

	// Look through unique indexes if no _id is present
	this.auditRecord(main, options, function afterAudit(err, data) {

		if (err != null) {
			return callback(err);
		}

		// Is a new record being created?
		creating = options.create || data._id == null;

		that.emit('saving', data, options, creating, function afterSavingEvent(err, stopped) {

			if (err != null) {
				if (callback != null) {
					return callback(err);
				} else {
					throw err;
				}
			}

			if (creating) {
				that.createRecord(data, options, callback);
			} else {
				that.updateRecord(data, options, callback);
			}
		});
	});
});

/**
 * Look for the record id by checking the indexes
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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

	schema = this.blueprint;

	if (data._id == null && options.audit !== false) {
		tasks = {};
		results = {};

		schema.eachRecordIndex(data, function iterIndex(index, indexName) {

			tasks[indexName] = function auditIndex(next) {
				var query = {},
				    fieldName;

				for (fieldName in index.fields) {
					if (data[fieldName] != null) {
						query[fieldName] = data[fieldName];
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}     data       The record data to check
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function createRecord(data, options, callback) {

	var that = this;

	// Normalize the data, set default values, ...
	data = this.compose(data, options);

	this.datasource.create(this, data, options, function afterCreate(err, result) {

		if (err != null) {
			return callback(err);
		}

		that.emit('saved', result, options, true, function afterSavedEvent() {
			callback(null, result);
		});
	});
});

/**
 * Update a record in the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name   The name of the field
 *
 * @return   {FieldType}
 */
Model.setMethod(function getField(name) {
	return this.blueprint.getField(name);
});

/**
 * Add a belongsTo association
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setMethod(function belongsTo(alias, modelName, options) {
	return this.blueprint.belongsTo(alias, modelName, options);
});

/**
 * Add a belongsTo association
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
				val = alchemy.pickTranslation(this.conduit, val);
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
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
			assocModel = Model.get(modelName);
			assocModel.nukeCache(true, seen);
		}
	}
});

/**
 * Create a new document
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {Object}   data   Field values
 *
 * @return   {Object}
 */
Model.setMethod(function compose(data, options) {
	return this.blueprint.process(data, options);
});

/**
 * Delete the given record id
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}     modelName
 *
 * @return  {Model}
 */
Model.setMethod(function getModel(modelName) {
	return Model.get(modelName);
});

Model.get = function get(name) {

	var constructor;

	if (!name) {
		throw new TypeError('Model name should be a valid string');
	}

	constructor = alchemy.classes[name.modelName() + 'Model'];

	if (constructor == null) {
		throw new Error('Could not find model "' + name.modelName() + '"');
	}

	return new constructor;
};

alchemy.classes.Model = Model;
global.Model = Model;

return;

/**
 * The Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 */
var Model = global.Model = alchemy.create(function Model() {


	/**
	 * The save error handler
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
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
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
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

/**
 * Return a model instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   modelName       The singular name of the model
 */
var _get = function get(modelName, autoCreate) {

	if (typeof modelName === 'undefined') {
		log.error('Tried to get model by providing undefined name!')
		return false;
	}

	// Make sure the modelName is singular & camelcases
	modelName = modelName.singularize().camelize();
	
	var returnModel;
	
	// Get the modelname without the "Model" postfix
	// @todo: this messes up Admin models if enabled
	//modelName = modelName.modelName(false);
	
	// Get the modelName WITH the "Model" postfix
	var fullName = modelName.modelName(true);

	// See if there is an instance for this class first
	if (alchemy.instances.models[modelName]) {
		return alchemy.instances.models[modelName];
	}

	// If there is no set class for this model, create one
	if (typeof alchemy.classes[fullName] === 'undefined') {
		
		if (typeof autoCreate === 'undefined') autoCreate = true;
		
		if (autoCreate) {
			log.verbose('Model "' + modelName + '" is undefined, creating new AppModel instance');
			returnModel = new alchemy.classes.AppModel({name: modelName});

			// Register this instance
			alchemy.instances.models[modelName] = returnModel;
		} else {
			return false;
		}
		
	} else {
		
		if (typeof alchemy.instances.models[modelName] === 'undefined') {
			alchemy.instances.models[modelName] = new alchemy.classes[fullName]();
		}

		returnModel = alchemy.instances.models[modelName];
	}
	
	return returnModel;
};

Model.get = _get;

// Store the original extend method
Model._extend = Model.extend;

/**
 * Get an augmented model
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
BaseClass.prototype.getModel = function getModel(modelName, autoCreate, options) {

	// Get the model instance
	var instance = Model.get(modelName, autoCreate),
	    keys, key, nr;

	if (typeof autoCreate == 'object') {
		options = autoCreate;
		autoCreate = undefined;
	}

	if (typeof options != 'object') {
		options = {};
	}

	if (typeof options.skip != 'object') {
		options.skip = {};
	}

	// If something is augmented in the current instance context,
	// also implement it in this new instance
	if (this.__augment__) {

		// Get the OWN properties of this augmentation
		keys = Object.getOwnPropertyNames(this);

		// Add all these own properties to the __augment__ object
		for (nr = 0; nr < keys.length; nr++) {

			key = keys[nr];

			// Skip keys which should not be inherited further
			if (this.__augmentNoInherit[key] || options.skip[key]) {
				continue;
			}

			this.__augment__[key] = this[key];
		}

		instance = alchemy.augment(instance, this.__augment__);
	}

	// Return the possibly-augmented instance
	return instance;
};

/**
 * Extend the base model
 * Uses the app model by default, unless it doesn't exist
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}    name     The name of the class to extend from
 * @param   {Object}    options  Extra options
 *                      .base    Extend from Model, not AppModel
 *                               False by default
 * @param   {Function}  fnc      The extension
 *
 * @returns {Function}
 */
Model.extend = function extend(name, options, fnc) {

	var ResultClass, instance;

	if (typeof name != 'string') {
		fnc = options;
		options = name;
	}
	
	if (typeof fnc == 'undefined') {
		fnc = options;
		options = {};
	}

	if (typeof options.base == 'undefined') options.base = false;

	if (this.name === 'Model') {
		if (options.base || typeof alchemy.classes.AppModel == 'undefined') {
			ResultClass = alchemy.classes.Model._extend(name, options, fnc);
		} else {
			ResultClass = alchemy.classes.AppModel._extend(name, options, fnc);
		}
	} else {
		ResultClass = this._extend(name, options, fnc);
	}

	// Store the class
	alchemy.models[ResultClass.prototype.modelName] = ResultClass;

	return ResultClass;
};

/**
 * Get the associations map of the given object, if it exists
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Model.getAssociationsMap = function getAssociationsMap(obj) {

	var alias,
	    map = {};

	if (obj.aliasAssociations) {
		// The model has no alias, but uses its own modelname
		map[obj.modelName] = obj.modelName;

		// Go over every association
		for (alias in obj.aliasAssociations) {
			map[alias] = obj.aliasAssociations[alias].modelName;
		}
	}

	return map;
};

/**
 * Determine of an object is a model instance
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Model.isModel = function isModel(obj) {

	if (obj instanceof Model) {
		return true;
	}

	return false;
};

/**
 * After a model has been created,
 * do certain actions (like ensuring the index)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Class}   modelClass
 */
createdModel = function createdModel(modelClass) {
	alchemy.after('datasourcesConnected', function() {
		var model = Model.get(modelClass.name);
		model.ensureIndex();
	});
};

/**
 * Make basic field information about a model available
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Resource.register('modelInfo', function(data, callback) {

	// Get the model, if it exists
	var model = Model.get(data.name),
		result;

	if (model) {
		result = model.safeBlueprint;
	}

	callback(result);
});
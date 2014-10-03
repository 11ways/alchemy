var expirable   = alchemy.use('expirable'),
    mongo       = alchemy.use('mongodb'),
    async       = alchemy.use('async'),
    bson        = alchemy.use('bson').BSONPure.BSON,
    hash        = alchemy.use('murmurhash3').murmur128HexSync,
    connections = alchemy.shared('Db.connections'),
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
var Model = Informer.extend(function Model(options) {

	// The blueprint scheme
	this.blueprint = new alchemy.classes.Schema();

	// Set default model fields
	this.addField('_id', 'ObjectId', {default: alchemy.ObjectId});
	this.addField('created', 'Date', {default: Date.create});
	this.addField('updated', 'Date', {default: Date.create});

	if (typeof options !== 'undefined') {
		if (typeof options.table !== 'undefined') this.table = options.table;
		if (typeof options.dbConfig !== 'undefined') this.dbConfig = options.dbConfig;
		if (typeof options.name !== 'undefined') this.name = options.name;
		if (typeof options.alias !== 'undefined') this.alias = options.alias;
	}

	// Get the static cache
	this.cache = this.constructor.cache;
});

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
 * Object where behaviour options are stored
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
 * The connection
 *
 * @type {Object}
 */
Model.prepareProperty('connection', function connection() {
	if (this.table) return connections[this.dbConfig];
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
 * Enable a behaviour
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Model.setMethod(function addBehaviour(behaviourname, options) {

	if (!options) {
		options = {};
	}

	this.behaviours[behaviourname] = Behaviour.get(behaviourname, this, options);
});

/**
 * Return the collection for this model
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {Function}   callback
 */
Model.setMethod(function getCollection(callback) {
	this.connection.collection(this.useTable, callback);
});

/**
 * Perform the given method on the collection
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {String}   method   The method to perform on the collection
 */
Model.setMethod(function withCollection(method) {

	var that = this,
	    args,
	    i;

	if (!this.useTable) {
		throw new Error('Model ' + this.name + ' does not use a collection');
	}

	args = new Array(arguments.length-1);

	// Convert the arguments to an array, without the method name
	for (i = 0; i < args.length; i++) {
		args[i] = arguments[i+1];
	}

	// Get the collection object
	this.getCollection(function gotCollection(err, collection) {
		collection[method].apply(collection, args);
	});
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
		that.saveOne(recordset, options, function saved(err, result) {
			next(err);
		});
	}, function savedAll(err) {
		callback(err);
	});
});

/**
 * Save one record
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Model.setMethod(function saveOne(_data, _options, _callback) {

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

	if (Array.isArray(_data)) {
		data = _data[0];
	} else {
		data = _data;
	}

	pr(data, true)
});

/**
 * Add a field to the blueprint schema
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setMethod(function addField(name, type, options) {
	return this.blueprint.addField(name, type, options);
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
 * Query the collection directly
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Object}     selector   Conditions for the find
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function queryCollection(selector, options, callback) {

	var thisModel = this,
	    serialized,
	    cacheResult,
	    result,
	    cursor;

	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	// Serialize the query conditions to a string, using JSON-dry
	serialized = 'query-' + hash(alchemy.stringify({selector: selector, options: options}));

	// Look in the cache for this result
	if (this.cache) {
		cacheResult = this.cache.get(serialized, true);
	}

	if (cacheResult) {

		// Decode the BSON result
		result = thisModel.decodeBson(cacheResult.items);

		// Return the result
		callback(cacheResult.err, result, cacheResult.available);

	} else {

		// Get the collection object
		thisModel.connection.collection(thisModel.useTable, function(err, collection) {

			var modOptions = Object.assign({}, options),
			    tasks = {};

			// Always return BSON objects
			modOptions.raw = true;

			// Create the cursor
			cursor = collection.find(selector, modOptions);

			if (options.available !== false) {
				// Get the amount of available items
				tasks.available = function(next) {

					cursor.count(false, function(err, available) {
						next(err, available)
					});
				};
			}

			// Get the items themselves
			tasks.items = function(next) {
				// Get all the BSON items
				cursor.toArray(function(err, items) {
					next(err, items);
				});
			};

			Function.parallel(tasks, function(err, result) {

				if (thisModel.cache) {
					thisModel.cache.set(serialized, {err: err, items: result.items, available: result.available});
				}

				callback(err, thisModel.decodeBson(result.items), result.available);
			});
		});
	}
});

/**
 * Decode a BSON object or array of objects
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Array|Object}   content   The BSON object or array of objects
 */
Model.setMethod(function decodeBson(content) {

	var result,
	    i;

	if (!content) {
		return;
	}

	// If the content is an array, decode the bson objects inside
	if (Array.isArray(content)) {

		// Create the result array
		result = [];

		for (i = 0; i < content.length; i++) {
			result.push(bson.deserialize(content[i]));
		}
	} else {
		result = bson.deserialize(content);
	}

	return result;
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
 * @version  0.0.1
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
	if (this.cache && !seen[this.modelName]) {
		this.cache.destroy();
	}

	// Indicate we've seen this model
	seen[this.modelName] = true;

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
Model.setMethod(function compose(data) {
	return this.blueprint.process(data);
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

	var thisModel = this,
	    id        = alchemy.castObjectId(id);

	if (!id) {
		return callback(new Error('Invalid ObjectId given!'));
	}

	this.getCollection(function(err, collection) {

		if (err) {
			return callback(err);
		}

		collection.findAndRemove({_id: id}, function(err, result){
			thisModel.nukeCache();
			callback(err, result);
		});
	});
});

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
	 * Compile an association
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}     name            The name of the association type
	 * @param    {Object}     associations    The associations to compile
	 *
	 * @return   {undefined}  Does not return anything, directly stores in this.associations
	 */
	this._compileAssociation = function _compileAssociation(name, associations, defaults, overrides) {
		
		if (!defaults) defaults = {};
		
		var i, modelName, assoc, foreignKey, settings;
		
		for (i in associations) {
			
			assoc = associations[i];
			
			if (assoc.modelName) modelName = assoc.modelName
			else modelName = i;

			// If the association is to the same model, the alias should not be
			// the same modelname. It causes breakage.
			// @todo: should be changed in the blueprint, too
			if (i == this.modelName) {
				i = 'Self-' + this.modelName;
			}
			
			// Define the foreignkey
			if (assoc.foreignKey) {
				foreignKey = assoc.foreignKey;
			} else {
				if (defaults.foreignKey) {
					foreignKey = defaults.foreignKey;
				} else {
					foreignKey = modelName.foreign_key();
				}
			}
			
			if (!this.associations[modelName]) {
				this.associations[modelName] = [];
			}

			settings = {type: name, foreignKey: foreignKey, modelName: modelName, alias: i, fnc: 'find', options: assoc};
			if (overrides) Object.assign(settings, overrides);

			// Store it in the associations under the model name
			this.associations[modelName].push(settings);

			// Store it in the foreignKeys object
			this.foreignKeys[foreignKey] = settings;

			// Store it under its alias
			this.aliasAssociations[i] = settings;
		}
	};

	/**
	 * Return a map of model aliasses and associations for this model,
	 * including this model itself
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.getAssociationsMap = function getAssociationsMap() {
		return Model.getAssociationsMap(this);
	};




	/**
	 * Query the database
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @returns  {boolean}   If the request has been made succesfully or not
	 */
	this.find = function find(type, options, callback) {

		if (!this.useTable) {
			callback(alchemy.createError('Model ' + this.modelName + ' does not use a table, find ignored!'));
			return false;
		}
		
		if (typeof callback == 'undefined') {
			if (typeof options == 'function') {
				callback = options;
				options = false;
			} else {
				log.warn('Tried to do a find without a callback. Find aborted');
				return false;
			}
		}
		
		var thisModel = this;
		
		// Move the options to another variable
		var overrideOptions = options;
		
		// Create a copy of the default options
		options = Object.assign({}, this.findOptions);
		
		if (typeof overrideOptions == 'object') Object.assign(options, overrideOptions);
		if (typeof type != 'string') type = 'first';

		// Fire the find type method's with the before status
		this['_find' + type.camelize()](function before_findTypeNext (modified_options) {

			if (typeof modified_options == 'object') options = modified_options;

			// Fire the beforeFind callback
			thisModel.beforeFind(function beforeFindNext (status) {

				var result;
				
				if (status === false) {
					
					// Prepare an empty array
					result = [];

					// Set the available to 0
					result.available = 0;
					
					return callback(null, result);
				} else if (typeof status == 'object') options = status;

				// Create a query object
				var query = new DbQuery(thisModel, options);

				query.execute(function(err, items) {

					var payload = {};
					
					payload.type = type;
					payload.options = options;
					payload.query = query;

					if (items) {
						payload.available = items.available;
					}

					thisModel.addAssociatedData(payload, items, function(err, items) {
						// Do the afterFind
						thisModel._fireAfterFind.call(thisModel, payload, err, items, callback);
					});
				});

			}, options); // Model beforeFind callback
		
		}, 'before', options, null); // _findMethod - before
		
		return true;
	};
	
	/**
	 * After the items have been found in the database,
	 * fire the model's AfterFind callback
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}    err
	 * @param    {Object}    items
	 *
	 */
	this._fireAfterFind = function _fireAfterFind (payload, err, records, findCallback) {
		
		var foundAlias  = {},
		    thisModel   = this,
		    items       = [],
		    tasks       = [],
		    tableName,
		    modelName,
		    record,
		    alias,
		    item,
		    cur,
		    nr,
		    m,
		    i;

		items = Array.cast(records);
		items.available = payload.available;

		// Add the primary afterFind
		tasks.push(function primaryAfterFind (primaryCallback) {
			thisModel.afterFind(function (override) {
				if (typeof override == 'undefined') override = items;
				primaryCallback(null, override);
			}, err, items, true, thisModel.modelName, payload);
		});

		// Execute the AfterFind functions of the other models in a waterfall manner
		// and execute the _afterFindNext afterwards
		async.waterfall(tasks, function afterFindsFinished (asyncErr, items) {

			var errors;

			if (err) {
				if (Array.isArray(err)) {
					errors = err;
				} else {
					errors = [err];
				}

				if (asyncErr) {
					errors = errors.concat(asyncErr);
				}
			}

			thisModel._afterFindNext(payload, errors, items, findCallback);
		});
	};

	/**
	 * Add associated data to an array of records
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}    payload
	 * @param    {Array}     records
	 * @param    {Function}  callback
	 */
	this.addAssociatedData = function addAssociatedData(payload, records, callback) {

		var that  = this,
		    tasks;

		// Don't add associated data if recursive is set to 0
		if ((payload.query.recursive <= 0 && !payload.options.contain) || payload.options.contain === true) {
			return callback(null, records);
		}

		tasks = [];

		records = Array.cast(records);

		records.forEach(function(record, index) {
			tasks[index] = function(next) {
				that.addAssociatedDataToRecord(payload, record, next);
			};
		});

		Function.parallel(tasks, function(err) {
			callback(err, records);
		});
	};

	/**
	 * Add associated data to a single record
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}    payload
	 * @param    {Object}    item
	 * @param    {Function}  callback
	 */
	this.addAssociatedDataToRecord = function addAssociatedDataToRecord(payload, item, callback) {

		var query        = payload.query,
		    associations = query.associations,
		    aliases      = {},
		    that         = this,
		    data         = item[this.modelName];

		Object.each(associations, function(association, alias) {

			aliases[alias] = function(nextAlias) {
				
				var assocModel = that.getModel(association.modelName),
				    assocOpts  = {},
				    condition  = {},
				    assocKey,
				    localKey;

				switch (association.type) {

					case 'hasOneParent':
					case 'hasAndBelongsToMany':
					case 'belongsTo':
						assocKey = '_id';
						localKey = association.foreignKey;
						break;

					case 'hasMany':
					case 'hasOneChild':
						assocKey = association.foreignKey;
						localKey = '_id';
						break;

					default:
						log.error('Still need to implement ' + association.type);
				}

				if (Array.isArray(data[localKey])) {
					condition[assocKey] = data[localKey].map(function(value) {
						return alchemy.castObjectId(value) || 'impossible';
					});
				} else {
					condition[assocKey] = alchemy.castObjectId(data[localKey]) || 'impossible';
				}

				// Take over the locale option
				assocOpts.locale = payload.options.locale;

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

				assocModel.find('all', assocOpts, function(err, assocItems) {

					var result = [],
					    item,
					    temp,
					    i;

					for (i = 0; i < assocItems.length; i++) {
						item = assocItems[i];

						// Get the associated model's main resultset
						temp = item[assocModel.modelName];

						// Remove the main resultset from the original item
						delete item[assocModel.modelName];

						// Inject it back into the item
						item = Object.assign(temp, item);

						// Add it to the resultset
						result.push(item);
					}

					switch (association.type) {
						case 'hasOneParent':
						case 'hasOneChild':
						case 'belongsTo':
						case 'hasOne':
							result = result[0];
							break;
					}

					nextAlias(err, result);
				});
			};
		});

		Function.parallel(aliases, function(err, list) {
			
			// Add the associated data to the item
			Object.assign(item, list);

			callback(err, item);
		});
	};
	
	/**
	 * The function to execute after the after find
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}    payload    Collection of options
	 *                       - options  The blueprint for the query
	 *                       - query    The compiled options
	 *                       - type     The find type
	 * @param    {Object}    err
	 * @param    {Object}    items
	 *
	 */
	this._afterFindNext = function _afterFindNext (payload, overrideErr, overrideResults, callback) {
			
		var results, resultErr;
		
		if (typeof overrideResults == 'undefined' && typeof overrideErr != 'undefined') {
			overrideResults = overrideErr;
			overrideErr = undefined;
		}
		
		if (typeof overrideResults == 'object') {
			results = overrideResults;
		} else {
			results = items;
		}
		
		if (typeof overrideErr != 'undefined') resultErr = overrideErr;
		else resultErr = null;
		
		// We only fire the after_findtype now, so every afterfind callback always
		// gets an array, even if it's only 1 object
		this['_find' + payload.type.camelize()](function after_findTypeNext (modified_items) {
			// Finally pass the results to the callback
			callback(resultErr, modified_items);
		}, 'after', payload.options, results);
		
	}


	/**
	 * The 'one' or 'first' find method
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}      next     The next callback function
	 * @param    {String}        status   Is this `before` or `after` the find?
	 * @param    {Object}        query    The user defined query
	 * @param    {Object}        result   The results (if status is `after`)
	 */
	this._findOne = this._findFirst = function _findOne (next, status, query, result) {
		
		// Make sure we use Mongo's 'findOne' function
		if (status == 'before') {
			
			query._mongoFnc = 'findOne';
			query.limit = 1;
			
			// Forward the query
			next(query);
		} else {
			// Forward the result
			next(result);
		}
	};
	
	/**
	 * The 'many' or 'all' find method
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}      next     The next callback function
	 * @param    {String}        status   Is this `before` or `after` the find?
	 * @param    {Object}        query    The user defined query
	 * @param    {array}         results  The results (if status is `after`)
	 */
	this._findMany = this._findAll= function _findMany (next, status, query, results) {
		
		// Make sure we use Mongo's 'find' function
		if (status == 'before') {
			query._mongoFnc = 'find';
			next(query);
		} else if (status == 'after') {
			next(results);
		}
	}
	
	/**
	 * Function that runs before every find operation
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}   next     The callback method, pass false to stop
	 * @param    {Object}     options  The query options after merge with default
	 */
	this.beforeFind = function beforeFind(next, options) {
		this._launchBehaviours('beforeFind', next, options);
	};
	
	/**
	 * Function that runs to get linked records
	 * Runs after the _find{Type} function (with `after` as status)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}     next     The callback method, pass false to stop
	 * @param    {Object}       options  The query options after merge with default
	 * @param    {array|object} results  The results object or array
	 */
	this._crossModels = function _crossModels (next, err, results, options) {
		
		var goingToJoin = false;
		
		for (var aliasName in this.hasMany) {
			
			goingToJoin = true;
			
			var join = this.hasMany[aliasName];
			
			var joinModel = _get(join.modelName);
			
			var joinQuery = {};
			joinQuery[join.foreignKey] = results._id;

			joinModel.find(joinQuery, function joinResult (err, items) {
				
				results[aliasName] = items;
				
				next(err, results);
			});
			
			
		}
		
		// If no joins are going to be made, continue
		if (!goingToJoin) next(err, results);
	};
	
	/**
	 * Function that runs after every find operation,
	 * with the result items passed
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}   next     The callback method, pass false to stop
	 */
	this.afterFind = function afterFind(next, err, results, primary, alias, payload) {
		this._launchBehaviours('afterFind', next, err, results, primary, alias, payload);
	};

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
	 * Catch recordset preparations
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.prepareSave = function prepareSave(recordset) {
		return recordset;
	};
	
	/**
	 * Prepare to save a recordset, part of the 'save()' function
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Array}   tasks       Array to store the functions in
	 * @param    {Object}  recordset   One group of data that needs to be saved
	 *                                 This is the main model + associations
	 * @param    {Object}  options     
	 *
	 * @returns  {Array}   The modified tasks is returned
	 */
	this._prepareRecordsetSave = function _prepareRecordsetSave (tasks, recordset, options) {
		
		var thisModel = this,
			temp,      // Temporary storage
			saveFnc;   // The function to be added to the tasks
		
		// If there is no property with the name of the model, we assume
		// there is only 1 record to save for this model only
		if (typeof recordset[this.modelName] == 'undefined') {
			temp = recordset;
			recordset = {};
			recordset[this.modelName] = temp;
		}

		recordset = thisModel.prepareSave(recordset);

		// Make sure tasks is an array
		if (!Array.isArray(tasks)) tasks = [];
		
		saveFnc = function saveFunction(next_task) {
			
			// Save the record for this model only ...
			thisModel.saveOne(recordset[thisModel.modelName], options, function saveFunctionCallback(err, item) {
				
				// Now remove the saved item from the recordset
				var associated = {};

				for (var name in recordset) {
					if (name !== thisModel.modelName) {
						associated[name] = recordset[name];
					}
				}
				
				// Pass the result, and the associated items to save, to the callback
				next_task(null, {err: err, item: item, associated: associated});
			});
		}
		
		// Add the function to the tasks collection array
		tasks.push(saveFnc);
		
		return tasks;
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
	 * Save one record for this model
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.1.0
	 *
	 * @param    {Object|Array}  data          The data to save
	 * @param    {Object}        options
	 *           {Boolean}       .callbacks    Enable callbacks (true)
	 *           {Boolean}       .audit        Honour & update unique index (true)
	 *           {Boolean|Array} .fieldList    Only allow fields from scheme (true)
	 *                                         or fields defined in array
	 */
	this.saveOne = function saveOne(data, options, callback) {
		
		var thisModel = this,
		    controlIndexes,
		    fieldSave,
		    fieldList,
		    fieldName,
		    parAudit,
		    temp,
		    i;

		if (typeof options === 'function') {
			callback = options;
		}

		if (!options || typeof options !== 'object') {
			options = {};
		}
		
		// If an array still gets in here, take the first element
		if (Array.isArray(data)) data = data[0];
		
		// If it's still wrapper inside its own modelName, unwrap it
		if (typeof data[this.modelName] !== 'undefined') data = data[this.modelName];
		
		// If callbacks is undefined, it's true
		if (typeof options.callbacks === 'undefined') options.callbacks = true;
		
		// If checking for unique is undefined, it's true
		// Warning: checking for _id is always done by mongo!
		if (typeof options.audit === 'undefined') options.audit = true;
		
		// See if a fieldlist is supplied
		if (typeof options.fieldList === 'boolean') {
			if (options.fieldList) {
				fieldList = Object.keys(this.blueprint);
			}
		} else if (typeof options.fieldList === 'object') {
			if (Array.isArray(options.fieldList)) {
				fieldList = {};

				for (i = 0; i < options.fieldList.length; i++) {
					fieldList[options.fieldList[i]] = true;
				}
			} else {
				fieldList = options.fieldList;
			}
		}

		// If fieldlist is truthy, remove any other values
		if (options.fieldList) {

			if (Array.isArray(fieldList)) {
				temp = fieldList;
				fieldList = {};

				for (i = 0; i < temp.length; i++) {
					fieldList[temp[i]] = true;
				}
			}

			// Now remove any item in data that is not in the fieldList
			for (fieldName in data) {
				if (!fieldList[fieldName]) {
					delete data[fieldName];
				}
			}
		}

		// Prepare the record to be saved to the database
		this.prepareRecord(data, options, function(err, data) {

			if (err) {
				return callback(err);
			}

			if (options.callbacks) {

				thisModel.beforeSave(function afterBeforeSave (record, over_options) {

					// Stop if an error has been returned
					if (record instanceof Error) {
						return callback(record, null);
					}

					if (typeof record != 'undefined') data = record;
					if (typeof over_options != 'undefined') options = over_options;
					
					// If record is false, call the callback with error
					if (record === false) {
						callback(alchemy.createError('beforeSave denied'));
					} else {

						thisModel.saveToCollection(data, function beforeAfterSave (err, item) {
							thisModel.afterSave(function afterAfterSave () {
								
								// Finally call the user provided callback
								if (callback) callback(err, item);
								
							}, item, err, options);
						});
					}
					
				}, data, options);
				
			} else {
				thisModel.saveToCollection(data, callback);
			}
		});
	};

	/**
	 * Save the given data in the collection.
	 * Fields that are not given will not be removed from the existing record
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}     data       The record data to prepare
	 * @param    {Function}   callback
	 */
	this.saveToCollection = function saveToCollection(data, callback) {

		var that = this;

		// Get the collection object
		this.getCollection(function(err, collection) {

			var onInsert,
			    update,
			    unset,
			    flat,
			    doc,
			    key,
			    _id;

			if (err) {
				return callback(err);
			}

			// Get the _id or create one
			_id = data._id;

			// Clone the data object
			doc = Object.assign({}, data);

			// Remove the _id field, because it's not allowed to be modified using $set
			delete doc._id;

			// Flatten the object
			// @todo: arrays with undefined values don't seem to work yet
			flat = Object.flatten(doc);

			// The fields defined in this item will be unset
			unset = {};

			// The fields in this item will be set to the given value on insert only
			onInsert = {};

			// If there is an updated date, us that one so the times are the same
			if (!flat.created) {

				// Make sure there is no created key
				delete flat.created;

				if (flat.updated) {
					onInsert.created = flat.updated;
				} else {
					onInsert.created = new Date();
				}
			}

			for (key in flat) {
				// Undefined or null means we want to delete the value.
				// We can't set null, because that could interfere with dot notation updates
				if (typeof flat[key] === 'undefined' || flat[key] === null) {

					// Add the key to the unset object
					unset[key] = '';

					// Remove it from the flat object
					delete flat[key];
				}
			}

			// Create the update object
			update = {
				$set: flat
			};

			if (!Object.isEmpty(onInsert)) {
				update.$setOnInsert = onInsert;
			}

			if (!Object.isEmpty(unset)) {
				update.$unset = unset;
			}

			collection.update({_id: data._id}, update, {upsert: true}, function(err, result) {
				
				if (err) {
					return callback(err);
				}

				// Nuke the model's cache after every save
				that.nukeCache();

				callback(null, data);
			});
		});
	};

	/**
	 * Prepare the record for complete saving
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}     data       The record data to prepare
	 * @param    {Object}     options
	 * @param    {Function}   callback
	 */
	this.prepareRecord = function prepareRecord(data, options, callback) {

		var that = this;

		// Look for an id first
		this.auditRecord(data, options, function afterAudit(err, record) {

			var tasks = {};

			if (err) {
				return callback(err);
			}

			if (!record._id) {
				record = that.compose(record);
			} else {
				tasks.fetch = function(next) {

					var id = alchemy.castObjectId(record._id);

					if (!id) {
						return next(alchemy.createError('Illegal ObjectId given'));
					}

					that.queryCollection({_id: id}, function(err, item) {

						if (item.length) {
							item = item[0];

							Object.assign(item, record);
						} else {
							item = record;
						}

						next(null, item);
					});
				};
			}

			Function.parallel(tasks, function(err, result) {

				var dataToSave;

				if (err) {
					return callback(err);
				}

				if (result && result.fetch) {
					dataToSave = result.fetch;
				} else {
					dataToSave = record;
				}

				// Set the updated field if it's in the scheme
				if (that.scheme.updated) {
					dataToSave.updated = new Date();
				}

				callback(null, dataToSave);
			});
		});
	};

	/**
	 * Look for the record id by checking the indexes
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Object}     data       The record data to check
	 * @param    {Object}     options
	 * @param    {Function}   callback
	 */
	this.auditRecord = function auditRecord(data, options, callback) {

		var thisModel = this,
		    controlIndexes,
		    fieldName,
		    tasks;
		
		// Try to get the data _id by looking through other indexes
		if (typeof data._id === 'undefined' && options.audit) {
			
			tasks = {};
			controlIndexes = {};
			
			// Get all the indexes we need to check
			for (fieldName in data) {
				if (typeof this._indexFields[fieldName] !== 'undefined') {
					if (this._indexFields[fieldName].unique) {
						controlIndexes[this._indexFields[fieldName].name] = this._indexes[this._indexFields[fieldName].name];
					}
				}
			}

			// Prepare functions per index we need to check
			Object.each(controlIndexes, function(index, indexName) {

				tasks[indexName] = function auditIndex(async_callback) {
					
					var query = {},
					    fieldName;
					
					for (fieldName in index.fields) {
						if (typeof data[fieldName] !== 'undefined') {
							query[fieldName] = data[fieldName];
						}
					}

					thisModel.queryCollection(query, {fields: ['_id'], limit: 1}, function(err, item) {
						async_callback(err, item[0]);
					});
				};
			});

			Function.parallel(tasks, function(err, indexResults) {

				var countResult,
				    indexName,
				    idCache,
				    record,
				    i;

				// Remove all falsy values
				for (indexName in indexResults) {
					if (!indexResults[indexName]) delete indexResults[indexName];
				}
				
				// If items have been found we should add the id to the data
				if (!Object.isEmpty(indexResults)) {
					
					countResult = 0;
					idCache = {};

					for (indexName in indexResults) {
						
						record = indexResults[indexName];

						// First make sure this index is allowed during the audit
						// If it's not, this means it should be considered a duplicate
						if (options.allowedIndexes && !Object.hasValue(options.allowedIndexes, indexName)) {
							if (callback) callback(alchemy.createError('Duplicate index found other than _id: ' + indexName), null);
							return false;
						}
						
						// If this is the first time we see this id ...
						if (typeof idCache[record._id] == 'undefined') {
							countResult++;
							idCache[record._id] = true;
						}
					}
					
					// If more than 1 ids are found we can't update the item
					if (countResult > 1) {
						if (callback) callback(alchemy.createError('Multiple unique records found!'), null);
						return false;
					}

					// If we continue, the record id we need to update will still be in here
					data._id = record._id;
				}

				callback(null, data);
			});
		} else {
			callback(null, data);
		}
	};
	
	/**
	 * Called before the model saves a record,
	 * but after it has applied the strictFields
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that will be saved
	 * @param    {Object}    options
	 *
	 * @return void
	 */
	this.beforeSave = function beforeSave(next, record, options) {
		this._launchBehaviours('beforeSave', next, record, options);
	};
	
	/**
	 * Called after the model saves a record.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that has been saved
	 * @param    {Object}    errors
	 *
	 * @return void
	 */
	this.afterSave = function afterSave(next, record, errors, options) {
		this._launchBehaviours('afterSave', next, record, errors, options);
	};

	/**
	 * Called before a record is removed.
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Function}  next    The callback to call when we're done
	 * @param    {Object}    record  The data that is going to be removed
	 *
	 * @return   {undefined}
	 */
	this.beforeRemove = function beforeRemove(next, record) {
		this._launchBehaviours('beforeRemove', next, record);
	};

	/**
	 * Launch methods of all this model's behaviours
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {String}     methodName  The method's name to run
	 * @param   {Function}   next        The next function to run
	 *
	 * @return  {undefined}
	 */
	this._launchBehaviours = function _launchBehaviours(methodName, next) {

		if (!this.behaviours) {
			next();
			return;
		}
		
		var waterfallResult,
			behaviourName,
			thisScope = this,
			series    = [],
			todo      = 0,
			done      = 0,
			args;

		// Prepare the arguments to apply
		args = Array.prototype.slice.call(arguments, 0);
		
		// Remove the 2 given parameters
		args.splice(0, 2);

		Object.each(this._behaviours, function(behaviour, behaviourName) {
			
			series.push(function(task_callback) {
				// If the result is already false, don't do the other behaviours
				if (waterfallResult === false) {
					task_callback();
				} else {
					thisScope._launchBehaviourMethod(behaviourName, methodName, function(result) {

						// Turn the result into a waterfall kind of thing
						if (typeof waterfallResult === 'undefined') {
							waterfallResult = result;
						} else if (typeof result !== 'undefined') {
							waterfallResult = waterfallResult && result;
						}

						task_callback();
					}, args);
				}
			});
		});
		
		if (series.length) {
			Function.series(series, function tasks_done(err, results) {next(waterfallResult);});
		} else {
			next();
		}
	};

	/**
	 * Launch method of a specific behaviour
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param   {String}     behaviourName  The behaviour name
	 * @param   {String}     methodName     The method's name to run
	 * @param   {Function}   next           The next function to run
	 * @param   {Array}      args           Arguments to pass to the behaviours
	 *
	 * @return  {undefined}
	 */
	this._launchBehaviourMethod = function _launchBehaviourMethod(behaviourName, methodName, callback, args) {

		var clonedArgs, augmented;

		if (this._behaviours[behaviourName][methodName]) {
			
			// Clone the passed args
			var clonedArgs = args.slice(0);

			// Push the callback on top
			clonedArgs.unshift(callback);

			// Augment the behaviour instance
			augmented = alchemy.augment(this._behaviours[behaviourName], {});

			augmented.model = this;

			augmented[methodName].apply(augmented, clonedArgs);
		} else {
			callback();
		}
	};

	

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
var model_info;

if (Blast.isBrowser) {
	Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, view) {

		var ModelClass,
		    model_name,
		    config,
		    key;

		model_info = view.exposeToScene.model_info;

		for (model_name in model_info) {
			config = model_info[model_name];
			ModelClass = Model.getClass(model_name);
		}
	});
}

/**
 * The Model class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   options
 */
var Model = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Model', function Model(options) {

	var that = this;

	this.options = options || {};

	if (Blast.isNode) {
		return;
	}

	// Only create the client side db when a model is created
	if (!this.datasource) {
		this.constructor.createClientCache();
	}

	if (this.datasource.hasBeenSeen('has_records_store')) {
		this.emit('ready');
	} else {
		this.datasource.once('has_records_store', function makeReady() {
			that.emit('ready');
		});
	}
});

/**
 * Is the given action enabled on the server?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.6
 * @version  1.0.6
 *
 * @param    {String}    action
 *
 * @return   {Boolean}
 */
Model.setStatic(function hasServerAction(action) {

	var route_name = this.name + '#' + action,
	    config;

	if (typeof hawkejs == 'undefined') {
		throw new Error('Model#hasServerAction(action) tried to get Scene helper, but hawkejs is not yet available');
	}

	config = hawkejs.scene.helpers.Router.routeConfig(route_name);

	return !!config;
});

/**
 * The datasource
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setProperty(function datasource() {
	return this.constructor._client_cache;
});

/**
 * The conduit
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 */
Model.setProperty(function conduit() {

	var result;

	if (this._conduit) {
		return this._conduit;
	}

	if (this.hawkejs_view) {
		result = this.hawkejs_view.server_var('conduit');

		if (result) {
			return result;
		}
	}

	return null;
}, function setConduit(conduit) {
	this._conduit = conduit;

	if (conduit) {
		this.hawkejs_view = conduit.view_render;
	}
});

/**
 * Get the document class constructor
 *
 * @type   {Hawkejs.Document}
 */
Model.prepareStaticProperty('Document', function getDocumentClass() {
	return Blast.Classes.Alchemy.Client.Document.Document.getDocumentClass(this);
});

/**
 * Create client model class for specific model name
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {String}   model_name
 */
Model.setStatic(function getClass(model_name) {

	var model_constructor,
	    parent_path,
	    class_name,
	    class_path,
	    ModelClass,
	    config,
	    key;

	// Construct the name of the class
	class_name = model_name;

	// Construct the path to this class
	class_path = 'Alchemy.Client.Model.' + class_name;

	// Get the class
	ModelClass = Object.path(Blast.Classes, class_path);

	if (ModelClass == null) {
		model_constructor = Function.create(class_name, function ModelConstructor(record, options) {
			ModelConstructor.wrapper.super.call(this, record, options);
		});

		// @TODO: inherit from parents
		parent_path = 'Alchemy.Client.Model';

		if (Blast.isBrowser && window._initHawkejs && _initHawkejs[2] && _initHawkejs[2].exposeToScene) {
			config = _initHawkejs[2].exposeToScene.model_info;

			if (config) {
				config = config[model_name];
			}
		} else if (Blast.isNode) {
			config = alchemy.getModel(model_name, false);

			if (config && config.super) {
				config = {
					parent : config.super.name
				};
			}
		}

		if (config && config.parent) {
			getClass(config.parent);
			parent_path += '.' + config.parent;
		}

		ModelClass = Function.inherits(parent_path, model_constructor);

		ModelClass.setProperty('$model_name', model_name);

		if (Blast.isBrowser) {
			typeof ModelClass.Document;
		}
	}

	return ModelClass;
});

/**
 * Set a method on the hawkejs document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 */
Model.setStatic(function setDocumentMethod(name, fnc, on_server) {

	var that = this;

	if (typeof name == 'function') {
		on_server = fnc;
		fnc = name;
		name = fnc.name;
	}

	Blast.loaded(function whenLoaded() {
		that.Document.setMethod(name, fnc, on_server);
	});
});

/**
 * Set a property on the hawkejs document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 */
Model.setStatic(function setDocumentProperty(key, getter, setter, on_server) {

	var that = this,
	    args = arguments;

	Blast.loaded(function whenLoaded() {
		that.Document.setProperty.apply(that.Document, args);
	});
});

/**
 * Create the client-side cache
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setStatic(function createClientCache() {

	var model_name,
	    db;

	if (!Blast.isBrowser || this._client_cache) {
		return;
	}

	model_name = this.prototype.$model_name;

	db = new Blast.Classes.Alchemy.IndexedDb(model_name);

	// See if the records store exists or not
	db.hasStore('records', function hasStore(err, has_store) {

		if (err) {
			throw err;
		}

		if (has_store) {
			db.emit('has_records_store');
			return;
		}

		db.modifyObjectStore('records', function gotStore(err, store) {

			if (err) {
				throw err;
			}

			db.emit('has_records_store');
		});
	});

	this._client_cache = db;
});

/**
 * The name property
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setProperty(function name() {
	return this.constructor.name;
}, false);

/**
 * Get default find options
 *
 * @deprecated
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Model.setMethod(function getFindOptions(options) {

	var def_options = {
		conditions       : {},
		recursive        : 1,
		fields           : [],
		sort             : null,
		order            : 1,
		limit            : 0,
		page             : false,
		offset           : false,

		// Return a document by default
		document         : true,

		// Consider empty strings as valid translations
		allow_empty      : false,

		// Get the available count
		available        : true,

		// When a search result is found in a certain translated prefix,
		// prefer that prefix for the entire record
		use_found_prefix : false,

		// Other possible values are false, 'before', 'after
		callbacks        : true
	};

	return Object.assign({}, def_options, options);
});

/**
 * Return a model instance for the given alias
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
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
 * @version  1.0.3
 *
 * @param    {String}   type      The type of find (first, all)
 * @param    {Object}   options   Optional options object
 * @param    {Function} callback
 */
Model.setMethod(function find(type, options, callback) {

	var that = this,
	    records,
	    pledge,
	    query,
	    error,
	    Type;

	if (callback == null) {
		if (typeof options == 'function') {
			callback = options;
			options = false;
		}
	}

	if (typeof type !== 'string') {
		error = new TypeError('Find type should be a string');
	}

	if (error != null) {
		pledge = new Blast.Classes.Pledge();
		pledge.handleCallback(callback);
		pledge.reject(error);
		return pledge;
	}

	// Normalize the find options
	options = this.getFindOptions(options);

	// Save the type
	options.findType = type;

	// Get the camelized type
	Type = type.camelize();

	pledge = Function.series(false, function doBeforeType(next) {
		that.callOrNext('beforeFind' + Type, [options], next);
	}, function doBeforeEvent(next) {
		that.emit('finding', options, next);
	}, function doQuery(next) {

		query = new Blast.Classes.Alchemy.DbQuery(that, options);

		query.execute(function executedQuery(err, items) {

			if (err != null) {
				return next(err);
			}

			options.query = query;
			records = items;

			next();
		});
	}, function emitQueried(next) {
		that.emit('queried', options, records, next);
	}, function doTranslations(next) {

		if (!that.translateItems) {
			return next();
		}

		that.translateItems(records, options, next);
	}, function doAssociated(next) {

		var tasks;

		if ((query.recursive <= 0 && !options.contain) || options.contain === true) {
			return next();
		}

		tasks = new Array(records.length);

		records.forEach(function(record, index) {
			tasks[index] = function getAssociatedData(nextAssoc) {
				that.addAssociatedDataToRecord(options, query, record, nextAssoc);
			};
		});

		// Add the associated data, 8 records at a time
		Function.parallel(8, tasks, next);
	}, function emitAssociated(next) {
		that.emit('associated', options, records, next);
	}, function doAfterType(next) {

		that.callOrNext('afterFind' + Type, [options, records], function doneAfterFind(err, replace) {

			if (replace) {
				records = replace;
			}

			next(err);
		});

	}, function doAfterEvent(next) {

		that.emit('found', options, records, function afterFound(err) {

			if (err) {
				return next(err);
			}

			if (options.document !== false) {
				records = that.createDocumentList(records, {query_options: options, model: that});
				that.emit('foundDocuments', options, records, next);
			} else {
				next();
			}
		});
	}, function done(err) {

		if (err != null) {

			if (callback) {
				callback(err);
			}

			return;
		}

		// It document is enabled, but the list is disabled,
		// return only the first entry
		if (options.document && options.document_list == false) {
			records = records[0] || null;
		}

		if (callback) {
			callback(null, records);
		}

		return records;
	});

	return pledge;
});

/**
 * Query the database by a single id
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.4
 *
 * @param    {String|ObjectId}   id        The object id as string or object
 * @param    {Object}            options   Optional options object
 * @param    {Function}          callback
 *
 * @return   {Pledge}
 */
Model.setMethod(function findById(id, options, callback) {

	var that = this;

	if (!alchemy.isObjectId(id)) {
		let pledge = Pledge.reject(new Error('Invalid id given'));
		pledge.handleCallback(callback);
		return pledge;
	}

	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	options = Object.assign({}, options);
	options.conditions = {_id: id};

	return this.find('first', options, callback);
});

/**
 * The 'first' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.0
 */
Model.setMethod(function beforeFindFirst(query, callback) {
	query.limit = 1;
	query.document_list = false;
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
 * The 'count' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 */
Model.setMethod(function beforeFindCount(query, callback) {

	if (!query.fields) {
		query.fields = ['_id'];
	}

	// Don't turn this into a document
	query.document = false;

	// Limit to 1 object being returned
	query.limit = 1;

	// Get the available count
	query.available = true;

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

	if (records == null || typeof records != 'object') {
		return callback(new Error('Records argument should be an array'));
	}

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
 * The 'count' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Model.setMethod(function afterFindCount(options, records, callback) {
	callback(null, records.available || 0);
});

/**
 * Add associated data to a single record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
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
	    data         = item[this.name],
	    pledge;

	if (!data) {
		pledge = Pledge.reject(new Error('Required data not found for model "' + this.name + '"'));
		pledge.handleCallback(callback);
		return pledge;
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

			// @TODO: For deadlock reasons we don't get self-referencing links!
			// (Implemented in Schema fields, BelongsTo and such could still pose problems!)
			if (assocModel.name == options._parent_model) {
				return nextAlias();
			}

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

				if (association.options.singular) {
					result = result[0];
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

	pledge = Function.parallel(alchemy.settings.model_assoc_parallel_limit || 4, aliases, function gotAssociatedList(err, list) {

		if (err != null) {
			console.log('ERROR: ' + err, err);
			return;
		}

		// Add the associated data to the item
		Object.assign(item, list);

		return item;
	});

	pledge.handleCallback(callback);

	return pledge;
});

/**
 * Save (mixed) data to the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.5
 *
 * @return    {Pledge}
 */
Model.setMethod(function save(data, _options, _callback) {

	var that     = this,
	    callback = _callback,
	    options  = _options,
	    results,
	    pledge,
	    iter;

	// Normalize the arguments
	if (typeof options == 'function') {
		callback = options;
	}

	if (options == null || typeof options !== 'object') {
		options = {};
	}

	// Create the pledge
	pledge = new Pledge();

	// Turn the given data into a document list
	data = this.createDocumentList(data);

	// Tell the pledge how many parts there are
	pledge.addProgressPart(data.length + 1);

	// Make it handle the callback, if any
	pledge.handleCallback(callback);

	// Get an iterator
	iter = new Iterator(data.toArray());

	// Saved results go here
	results = [];

	// Save every given item
	Function.while(function test() {
		return iter.hasNext();
	}, function saveData(next) {

		var document = iter.next().value,
		    temp;

		// Skip invalid items
		if (!document) {
			pledge.reportProgressPart(1);
			return next();
		}

		// Save the data
		that.saveRecord(document, options, function saved(err, result) {

			pledge.reportProgressPart(1);

			if (err != null) {
				return next(err);
			}

			if (!result) {
				return next(new Error('Model#saveRecord response value is empty'));
			}

			results.push(result);
			next(null);
		});
	}, function savedAll(err) {

		if (err) {
			return pledge.reject(err);
		}

		if (options.document !== false) {
			results = that.createDocumentList(results);
		}

		pledge.resolve(results);
	});

	return pledge;
});

/**
 * Create a new document.
 * If data is given, the document is populated
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.5
 *
 * @param    {Object}    data     Optional data
 * @param    {Object}    options
 *
 * @return   {Document}
 */
Model.setMethod(function createDocument(data, options) {

	var doc;

	if (!options) {
		options = {};
	}

	if (data && this.constructor.Document.isDocument(data)) {
		data = data.$main;
	}

	options.model = this;

	doc = new this.constructor.Document(data, options);

	return doc;
});

/**
 * Create a document list
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.5
 *
 * @param    {Array}     records
 * @param    {Object}    options
 *
 * @return   {DocumentList}
 */
Model.setMethod(function createDocumentList(records, options) {

	var documents,
	    i;

	// Make sure we have an array of records
	records = Array.cast(records);

	// Create new target array
	documents = Array(records.length)

	for (i = 0; i < records.length; i++) {
		documents[i] = this.createDocument(records[i]);
	}

	documents.available = records.available;

	if (Blast.Classes.Alchemy.DocumentList) {
		documents = new Blast.Classes.Alchemy.DocumentList(documents, options);
	} else {
		documents = new Blast.Classes.Alchemy.Client.DocumentList(documents, options);
	}

	return documents;
});

/**
 * Insert record on the client side
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setAfterMethod('ready', function _create(object, callback) {

	if (!object._id) {
		object._id = Blast.createObjectId();
	}

	// Store record in the client-side indexeddb
	this.datasource.put('records', object, callback);
});

/**
 * Is the given action enabled on the server?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.6
 * @version  1.0.6
 *
 * @param    {String}    action
 *
 * @return   {Boolean}
 */
Model.setMethod(function hasServerAction(action) {
	return this.constructor.hasServerAction(action);
});

/**
 * Client-side model info
 *
 * @type {Object}
 */
Model.setProperty(function model_info() {

	var data;

	if (Blast.isBrowser) {
		if (!hawkejs.scene.exposed.model_info[this.constructor.name]) {
			hawkejs.scene.exposed.model_info[this.constructor.name] = {};
		}

		data = hawkejs.scene.exposed.model_info[this.constructor.name];
	} else {
		data = Blast.Classes.Alchemy.Model[this.constructor.name].getClientConfig();
	}

	if (!data.associations) {
		data.associations = {};
	}

	if (!data.fields) {
		data.fields = {};
	}

	return data;
}, false);

/**
 * Schema
 *
 * @type {Object}
 */
Model.setProperty(function schema() {
	return this.model_info.fields;
}, false);

/**
 * Associations
 *
 * @type {Object}
 */
Model.setProperty(function associations() {
	return this.model_info.associations;
}, false);

/**
 * Get a field instance from the schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name   The name of the field
 *
 * @return   {Object}
 */
Model.setMethod(function getField(name) {
	return this.model_info.fields[name];
}, false);

// Make this class easily available
Hawkejs.Model = Model;

/**
 * Read from the datasource via a controller
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {String}    action
 * @param    {Object}    data
 * @param    {Function}  callback
 */
Model.setMethod(async function doServerCommand(action, data, callback) {

	var that = this,
	    route_name,
	    conduit,
	    view;

	if (Blast.isNode && !this.hawkejs_view) {
		return callback(new Error('This model has no hawkejs view attached'));
	}

	route_name = this.getClassPathAfter('Model') + '#' + action;

	if (Blast.isNode) {
		view = this.hawkejs_view;
	} else {
		view = this.hawkejs_view || hawkejs.scene.generalView;
	}

	if (!view.helpers.Router.routeConfig(route_name)) {
		return callback(new Error('There is no ' + route_name + ' route, which is needed to query the database'));
	}

	if (Blast.isNode) {
		conduit = view.server_var('conduit');

		if (!conduit) {
			return callback(new Error('Could not find conduit, can not read datasource'));
		}

		conduit.loopback({
			name   : route_name,
			params : data
		}, function gotResult(err, result) {

			if (err) {
				return callback(err);
			}

			callback(null, result.items, result.available);
		});

		return;
	}

	// @TODO: make alchemy load faster or something!
	while (typeof alchemy == 'undefined') {
		await Pledge.after(100, null);
	}

	alchemy.fetch(route_name, {post: data, headers: {'content-type': 'application/json-dry'}}, function gotResult(err, result) {

		if (err) {
			return callback(err);
		}

		if (result.items) {
			callback(null, result.items, result.available);
		} else {
			callback(null, result.saved_record);
		}
	});
}, false);

/**
 * Read from the datasource via a controller
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.4
 *
 * @param    {Object}    conditions
 * @param    {Object}    options
 * @param    {Function}  callback
 */
Model.decorateMethod(Blast.Decorators.memoize({max_age: 10000, ignore_callbacks: true, static: true, cache_key: 'cache'}), async function readDatasource(conditions, options, callback) {

	var that = this,
	    data = {
		conditions : conditions,
		options    : options
	};

	return this.doServerCommand('readDatasource', data, function done(err, items, available) {

		if (err) {
			if (err.status == 502 || err.status == 408) {
				return that.datasource.read('records', conditions, options, callback);
			}

			return callback(err);
		}

		callback(null, items, available);
	});
}, false);

/**
 * Save the record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.7
 *
 * @param    {Object}    data
 * @param    {Object}    options
 * @param    {Function}  callback
 */
Model.setMethod(async function saveRecord(data, options, callback) {

	var dried;

	// @TODO: fix records being passed in here
	if (data.$record) {
		data = data.$main;
	}

	data = JSON.clone(data, 'toServerSaveRecord');

	// @TODO: fix options being jsonified
	data = {
		data       : data,
		//options    : options
	};

	// @TODO: sending dried data to the server?
	dried = JSON.dry(data);

	// Clear the model's cache
	if (this.constructor.cache) {
		this.constructor.cache.reset();
	}

	return this.doServerCommand('saveRecord', dried, callback);
}, false);

/**
 * Get records that need to be saved to the server
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.6
 * @version  1.0.6
 */
Model.setMethod(async function getRecordsToBeSavedRemotely() {

	var that = this,
	    pledge = new Pledge;

	this.datasource.read('records', null, {use_index: 'needs_remote_save'}, function gotRecords(err, records) {

		if (err) {
			return pledge.reject(err);
		}

		let result = [],
		    data,
		    i;

		for (i = 0; i < records.length; i++) {
			result[i] = that.createDocument(records[i]);
		}

		result = new Blast.Classes.Alchemy.Client.DocumentList(result);

		pledge.resolve(result);
	});

	return pledge;
}, false);
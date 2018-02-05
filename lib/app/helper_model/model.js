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
 * @version  1.0.0
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
		model_constructor = Function.create(class_name, function med(record, options) {
			med.wrapper.super.call(this, record, options);
		});

		// @TODO: inherit from parents
		parent_path = 'Alchemy.Client.Model';

		ModelClass = Function.inherits(parent_path, model_constructor);

		ModelClass.setProperty('$model_name', model_name);
	}

	return ModelClass;
});

/**
 * Set a method on the hawkejs document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setStatic(function setDocumentMethod(name, fnc, on_server) {

	if (typeof name == 'function') {
		on_server = fnc;
		fnc = name;
		name = fnc.name;
	}

	return this.Document.setMethod(name, fnc, on_server);
});

/**
 * Set a property on the hawkejs document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Model.setStatic(function setDocumentProperty(key, getter, setter, on_server) {
	return this.Document.setProperty.apply(this.Document, arguments);
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

	console.log('Created client cache for', this.name, db);

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
 * @version  1.0.0
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

	pledge = Function.series(function doBeforeType(next) {
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

		that.callOrNext('afterFind' + Type, [options], function doneAfterFind(err, replace) {

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
				records = that.createDocumentList(records, {query_options: options});
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

				if (options.document !== false) {
					temp = {
						associated: true
					};

					result = assocModel.createDocument(result, temp);
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
 * Create a new document.
 * If data is given, the document is populated
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {Object}    data     Optional data
 * @param    {Object}    options
 *
 * @return   {Document}
 */
Model.setMethod(function createDocument(data, options) {

	if (!options) {
		options = {};
	}

	options.model = this;

	var doc = new this.constructor.Document(data, options);

	return doc;
});

/**
 * Create a document list
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Array}     records
 * @param    {Object}    options
 *
 * @return   {DocumentList}
 */
Model.setMethod(function createDocumentList(records, options) {

	var documents = Array(records.length),
	    i;

	for (i = 0; i < records.length; i++) {
		documents[i] = this.createDocument(records[i]);
	}

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

	this.datasource.put('records', object, callback);
});

// Make this class easily available
Hawkejs.Model = Model;

if (Blast.isNode) {
	return;
}

/**
 * Client-side model info
 *
 * @type {Object}
 */
Model.setProperty(function model_info() {

	if (!hawkejs.scene.exposed.model_info[this.constructor.name]) {
		hawkejs.scene.exposed.model_info[this.constructor.name] = {};
	}

	data = hawkejs.scene.exposed.model_info[this.constructor.name];

	if (!data.associations) {
		data.associations = {};
	}

	if (!data.fields) {
		data.fields = {};
	}

	return data;
});

/**
 * Schema
 *
 * @type {Object}
 */
Model.setProperty(function schema() {
	return this.model_info.fields;
});

/**
 * Associations
 *
 * @type {Object}
 */
Model.setProperty(function associations() {
	return this.model_info.associations;
});

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
});

/**
 * Read from the datasource
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}    conditions
 * @param    {Object}    options
 * @param    {Function}  callback
 */
Model.setMethod(function readDatasource(conditions, options, callback) {

	var that = this,
	    route_name,
	    data;

	route_name = this.constructor.name + '#readDatasource';

	data = {
		conditions: conditions,
		options: options
	};

	alchemy.fetch(route_name, {post: data}, function gotResult(err, result) {

		if (err) {
			return callback(err);
		}

		callback(null, result.items, result.available);
	});
});
var fallback_datasource,
    model_info,
    TABLE = Symbol('table');

if (Blast.isBrowser) {
	Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, view) {

		var ModelClass,
		    model_name,
		    config,
		    key;

		model_info = hawkejs.scene.exposed.model_info;

		for (model_name in model_info) {
			config = model_info[model_name];
			ModelClass = Model.getClass(model_name);
			config.schema.setModel(model_name);
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
 * @version  1.1.0
 *
 * @param    {Object}   options
 */
var Model = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Model', function Model(options) {
	this.init(options);
});

/**
 * Set the modelName property after class creation
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Model.constitute(function setModelName() {
	this.model_name = this.name;
	this.setProperty('model_name', this.model_name);
	this.table = this.model_name.tableize();
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
 * Table name to use in the database.
 * False if no table should be used.
 *
 * @type {String}
 */
Model.setProperty(function table() {

	if (this[TABLE]) {
		return this[TABLE];
	}

	return this.constructor.table;
}, function setTable(table) {
	return this[TABLE] = table;
});

/**
 * The datasource
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.7
 *
 * @type     {Datasource}
 */
Model.setProperty(function datasource() {

	if (Blast.isNode) {
		// We use the "remote" type datasource, which will make loopback
		// requests on the server side
		return Datasource.get({name: 'loopback', type: 'remote'});
	}

	if (!fallback_datasource) {
		fallback_datasource = new Blast.Classes.Alchemy.Datasource.Fallback('default', {
			upper: {
				type: 'indexed_db',
				name: 'local'
			},
			lower: {
				type: 'remote',
				name: 'remote'
			}
		});

		fallback_datasource.connect();
	}

	return fallback_datasource;
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
		this.hawkejs_view = conduit.renderer;
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
 * @version  1.1.3
 *
 * @param    {String}   model_name
 * @param    {Boolean}  allow_create
 */
Model.setStatic(function getClass(model_name, allow_create ) {

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

	if (allow_create == null) {
		allow_create = true;
	}

	if (ModelClass == null && allow_create) {
		model_constructor = Function.create(class_name, function ModelConstructor(record, options) {
			ModelConstructor.wrapper.super.call(this, record, options);
		});

		// @TODO: inherit from parents
		parent_path = 'Alchemy.Client.Model';

		if (Blast.isBrowser && window._hawkejs_static_expose) {
			let exposed = window._hawkejs_static_expose;

			config = exposed.model_info;

			if (config) {
				config = config[model_name];
			}
		} else if (Blast.isNode) {
			config = alchemy.getModel(model_name, false);

			if (config && config.super) {
				config = {
					parent      : config.super.name,
					primary_key : config.prototype.primary_key
				};
			}
		}

		if (config && config.parent) {
			getClass(config.parent);
			parent_path += '.' + config.parent;
		}

		ModelClass = Function.inherits(parent_path, model_constructor);

		ModelClass.setProperty('$model_name', model_name);

		if (config && config.primary_key) {
			ModelClass.setProperty('primary_key', config.primary_key);
		}

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
 * @version  1.1.2
 */
Model.setStatic(function setDocumentMethod(name, fnc, on_server) {

	var that = this;

	if (typeof name == 'function') {
		on_server = fnc;
		fnc = name;
		name = fnc.name;
	}

	if (Blast.isNode) {
		alchemy.sputnik.after('plugins', whenLoaded);
	} else {
		Blast.loaded(whenLoaded);
	}

	function whenLoaded() {
		that.Document.setMethod(name, fnc, on_server);
	}
});

/**
 * Set a property on the hawkejs document class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.2
 */
Model.setStatic(function setDocumentProperty(key, getter, setter, on_server) {

	var that = this,
	    args = arguments;

	if (Blast.isNode) {
		alchemy.sputnik.after('plugins', whenLoaded);
	} else {
		Blast.loaded(whenLoaded);
	}

	function whenLoaded() {
		that.Document.setProperty.apply(that.Document, args);
	};
});

/**
 * The schema
 *
 * @type {Schema}
 */
Model.setStaticProperty(function schema() {
	if (this.prototype.model_info) {
		return this.prototype.model_info.schema;
	}
});

/**
 * The model name
 *
 * @type {String}
 */
Model.setProperty(function name() {
	return this._name || this.constructor.model_name;
}, function setName(name) {
	this._name = name;
});

/**
 * Initialize the model
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   options
 */
Model.setMethod(function init(options) {

	if (!options) {
		options = {};
	} else {
		if (options.table)    this.table    = options.table;
		if (options.dbConfig) this.dbConfig = options.dbConfig;
		if (options.name)     this.name     = options.name;
		if (options.alias)    this.alias    = options.alias;
	}

	this.options = options;

	if (!Blast.isNode) {
		return;
	}

	// Initialize behaviours
	if (this.schema && this.schema.hasBehaviours && this.initBehaviours) {
		this.initBehaviours();
	}
});

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
 * Return association configuration
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {String}   alias
 *
 * @return   {Object}
 */
Model.setMethod(function getAssociation(alias) {

	if (!this.schema || !this.schema.associations) {
		throw new Error('Unable to find ' + this.constructor.name + ' schema associations');
	}

	let config;

	// @TODO: Test nested association getting
	if (alias && alias.indexOf('.') > -1) {
		let pieces = alias.split('.'),
		    context = this,
		    piece,
		    temp;

		for (piece of pieces) {
			temp = context.getAssociation(piece);

			if (!temp) {
				break;
			}

			context = this.getModel(temp.modelName);
		}

		// The config s the last association gotten
		config = temp;
	} else {
		config = this.schema.associations[alias];
	}

	if (!config) {
		throw new Error('Unable to find ' + JSON.stringify(alias) + ' association in ' + this.constructor.name + ' model');
	}

	return config;
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
 * @version  1.1.3
 *
 * @param    {String}     type       The type of find (first, all)
 * @param    {Criteria}   criteria   The criteria object
 * @param    {Function}   callback
 *
 * @returns  {Pledge|Criteria}
 */
Model.setMethod(function find(type, criteria, callback) {

	if (arguments.length == 0) {
		criteria = new Blast.Classes.Alchemy.Criteria();
		criteria.model = this;
		return criteria;
	}

	let skip_type,
	    pledge,
	    error;

	if (!this.datasource) {
		pledge = new Blast.Classes.Pledge();
		pledge.done(callback);
		pledge.reject(new Classes.Alchemy.Error.Model('Unable to perform ' + this.constructor.name + '#find(), no datasource is available'));
		return pledge;
	}

	if (Blast.Classes.Alchemy.Criteria.Criteria.isCriteria(type)) {
		callback = criteria;
		criteria = type;
		type = null;
		skip_type = true;
	}

	if (callback == null) {
		if (typeof criteria == 'function') {
			callback = criteria;
			criteria = false;
		}
	}

	if (!skip_type && typeof type !== 'string') {
		error = new TypeError('Find type should be a string');
	}

	if (!Blast.Classes.Alchemy.Criteria.Criteria.isCriteria(criteria)) {
		try {
			let options = criteria;
			criteria = new Blast.Classes.Alchemy.Criteria();
			criteria.applyOldOptions(options);
		} catch (err) {
			error = err;
		}
	}

	if (error != null) {
		pledge = new Blast.Classes.Pledge();
		pledge.done(callback);
		pledge.reject(error);
		return pledge;
	}

	let that = this,
	    available,
	    records,
	    query,
	    Type;

	// The criteria instance has to know about the model
	criteria.model = this;

	if (!skip_type) {
		// Save the type
		criteria.setOption('find_type', type);

		// Get the camelized type
		Type = type.camelize();
	}

	// See if a sort has been given
	if (criteria.options.sort == null && this.sort) {
		criteria.setOption('sort', this.sort);
	}

	pledge = Function.series(false, function doBeforeType(next) {
		if (Type) {
			that.callOrNext('beforeFind' + Type, [criteria], next);
		} else {
			next();
		}
	}, function doBeforeEvent(next) {
		that.issueEvent('finding', [criteria], next);
	}, function doQuery(next) {

		that.datasource.read(that, criteria, function done(err, result) {

			if (err) {
				return next(err);
			}

			records = result.items;
			available = result.available;
			records.available = available;

			next();
		});
	}, function emitQueried(next) {
		that.issueEvent('queried', [criteria, records], next);
	}, function doTranslations(next) {

		if (!that.translateItems) {
			return next();
		}

		that.translateItems(records, criteria, next);
	}, function doAssociated(next) {

		if (criteria.recursive_level <= 0 && !criteria.getAssociationsToSelect()) {
			return next();
		}

		let tasks = [],
		    i;

		for (i = 0; i < records.length; i++) {
			let record = records[i];

			tasks.push(function getAssociatedData(nextAssoc) {
				that.addAssociatedDataToRecord(criteria, record, nextAssoc);
			});
		}

		// Add the associated data, 8 records at a time
		Function.parallel(8, tasks, next);
	}, function emitAssociated(next) {
		that.issueEvent('associated', [criteria, records], next);
	}, function doAfterType(next) {

		if (!Type) {
			return next();
		}

		that.callOrNext('afterFind' + Type, [criteria, records], function doneAfterFind(err, replace) {

			if (!err && replace != null) {
				records = replace;
			}

			next(err);
		});

	}, function doAfterEvent(next) {

		that.issueEvent('found', [criteria, records], function afterFound(err) {

			if (err) {
				return next(err);
			}

			if (criteria.options.document !== false) {
				records = that.createDocumentList(records, criteria);
				records.available = available;
				that.issueEvent('foundDocuments', [criteria, records], next);
			} else {
				next();
			}
		});
	}, function done(err) {

		var i;

		if (err != null) {

			if (callback) {
				callback(err);
			}

			return;
		}

		if (Blast.isBrowser && criteria.options.document !== false) {
			for (i = 0; i < records.length; i++) {
				records[i].checkAndInformDatasource();
			}
		}

		// It document is enabled, but the list is disabled,
		// return only the first entry
		if (criteria.options.document && criteria.options.document_list == false) {
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
 * @version  1.1.0
 *
 * @param    {String|ObjectId}   id        The object id as string or object
 * @param    {Object}            options   Optional options object
 * @param    {Function}          callback
 *
 * @return   {Pledge}
 */
Model.setMethod(function findById(id, options, callback) {
	return this.findByPk(id, options, callback);
});

/**
 * Query the database by a single id
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {String|ObjectId}   pk        The primary key value
 * @param    {Object}            options   Optional options object
 * @param    {Function}          callback
 *
 * @return   {Pledge}
 */
Model.setMethod(function findByPk(pk, options, callback) {

	if (pk === '' || pk == null) {
		let pledge = Pledge.reject(new Error('Invalid pk given'));
		pledge.done(callback);
		return pledge;
	}

	let criteria = new Blast.Classes.Alchemy.Criteria();

	criteria.where(this.primary_key).equals(pk);

	if (typeof options == 'function') {
		callback = options;
	} else {
		criteria.applyOldOptions(options);
	}

	return this.find('first', criteria, callback);
});

/**
 * Query the database by key-val attributes, return the first result
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}    values       The values to look for
 * @param    {Object}    options      Optional options object
 *
 * @return   {Pledge}
 */
Model.setMethod(function findByValues(values, options) {

	var criteria = new Blast.Classes.Alchemy.Criteria(),
	    key;

	if (options) {
		criteria.applyOldOptions(options);
	}

	for (key in values) {
		criteria.where(key).equals(values[key]);
	}

	return this.find('first', criteria);
});

/**
 * Query the database by key-val attributes, return all results
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}    values       The values to look for
 * @param    {Object}    options      Optional options object
 *
 * @return   {Pledge}
 */
Model.setMethod(function findAllByValues(values, options) {

	var criteria = new Blast.Classes.Alchemy.Criteria(),
	    key;

	if (options) {
		criteria.applyOldOptions(options);
	}

	for (key in values) {
		criteria.where(key).equals(values[key]);
	}

	return this.find('all', criteria);
});

/**
 * The 'first' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 * @param    {Function}   callback
 */
Model.setMethod(function beforeFindFirst(criteria, callback) {

	// Only return 1 item
	criteria.limit(1);

	// Disable returning a document list
	criteria.setOption('document_list', false);

	callback();
});

/**
 * The 'list' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 * @param    {Function}   callback
 */
Model.setMethod(function beforeFindList(criteria, callback) {

	var fields = criteria.getFieldsToSelect();

	if (!fields.length) {
		criteria.select('_id');
	}

	// Don't turn this into a document
	criteria.setOption('document', false);

	callback();
});

/**
 * The 'dict' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 * @param    {Function}   callback
 */
Model.setMethod(function beforeFindDict(criteria, callback) {
	this.beforeFindList(criteria, callback);
});

/**
 * The 'count' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 * @param    {Function}   callback
 */
Model.setMethod(function beforeFindCount(criteria, callback) {

	// Explicitly get the available count
	criteria.setOption('available', true);

	// Limit to 1 object being returned
	criteria.limit(1);

	this.beforeFindList(criteria, callback);
});

/**
 * The 'list' find method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 * @param    {Array}      records
 * @param    {Function}   callback
 */
Model.setMethod(function afterFindList(criteria, records, callback) {

	var results = [],
	    record,
	    fields,
	    temp,
	    key,
	    val,
	    i,
	    j;

	if (records == null || typeof records != 'object') {
		return callback(new Error('Records argument should be an array'));
	}

	fields = criteria.options.select.fields;

	for (i = 0; i < records.length; i++) {
		record = records[i];

		// The first field is always the key, mostly this is _id
		key = record[this.name][fields[0]];

		if (fields.length == 1) {
			results.push(key);
			continue;
		}

		temp = {};

		for (j = 0; j < fields.length; j++) {
			temp[fields[j]] = record[this.name][fields[j]];
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
 * @version  1.1.5
 *
 * @param    {Criteria}  criteria
 * @param    {Object}    item
 * @param    {Function}  callback
 */
Model.setMethod(function addAssociatedDataToRecord(criteria, item, callback) {

	var associations,
	    aliases      = {},
	    options      = criteria.options,
	    that         = this,
	    data         = item[this.name],
	    pledge;

	if (!data) {
		pledge = Pledge.reject(new Error('Required data not found for model "' + this.name + '"'));
		pledge.done(callback);
		return pledge;
	}

	// If create references is not disabled, create the assoc cache
	if (options.create_references !== false && !options.assoc_cache) {
		options.assoc_cache = {};
	}

	associations = criteria.options.associations || this.schema.associations;

	Object.each(associations, function eachAssoc(association, alias) {

		if (criteria.model.name == alias || options.from_alias == alias) {
			return;
		}

		// If the item is already available, skip it
		// @TODO: what about deeper relations?
		if (item[alias]) {
			if (criteria.options.document !== false) {
				if (association.options.singular) {
					if (Object.isPlainObject(item[alias])) {
						let assoc_crit = criteria.getCriteriaForAssociation(alias, item);

						if (!(item[alias] instanceof assoc_crit.model.constructor.Document)) {
							item[alias] = assoc_crit.model.createDocument(item[alias]);
						}
					}
				} else if (Array.isArray(item[alias])) {
					let assoc_crit = criteria.getCriteriaForAssociation(alias, item);
					item[alias] = assoc_crit.model.createDocumentList(item[alias]);
				}
			}

			return;
		}

		if (!criteria.shouldQueryAssociation(alias)) {
			return;
		}

		// Some datasources need to resolve certain associations themselves
		if (association.options.defer_to_datasource) {
			aliases[alias] = async function deferedAliasRecordTask(nextAlias) {

				let pk = data[that.primary_key];

				if (!pk) {
					return nextAlias();
				}

				let result = await that.datasource.getAssociationForPk(that, pk, alias);

				if (!result) {
					return nextAlias(null);
				}

				let assoc_model = that.getModel(association.modelName);

				if (Array.isArray(result)) {
					result = assoc_model.createDocumentList(result);
				} else {
					result = assoc_model.createDocument(result);
				}

				return nextAlias(null, result);
			};

			return;
		}

		let assoc_crit = criteria.getCriteriaForAssociation(alias, item);

		if (!assoc_crit) {
			return;
		}

		// SchemaFields use a dummy Model name, so get the root_model in that case
		let root_model = (that.options && that.options.root_model) || that.name;

		// Make sure references to the same model don't cause a deadlock
		// (Can happen when a model refers to itself)
		if (association.modelName == root_model && criteria.options._root_data) {
			let assoc_key = assoc_crit.options.assoc_key,
			    assoc_value = assoc_crit.options.assoc_value,
			    root = criteria.options._root_data[root_model];

			if (root && root[assoc_key] && Object.alike(root[assoc_key], assoc_value)) {

				aliases[alias] = nextAlias => {
					nextAlias(null, root[assoc_key]);
				};

				return;
			}
		}

		aliases[alias] = function aliasRecordTask(nextAlias) {

			var key;

			if (options.create_references !== false) {
				key = alchemy.checksum(assoc_crit);

				if (key != null && options.assoc_cache[key]) {
					return nextAlias(null, options.assoc_cache[key]);
				}
			}

			assoc_crit.model.find('all', assoc_crit, function foundAliasItems(err, assocItems) {

				var result,
				    a_item,
				    temp,
				    i;

				if (options.debug) {
					console.log(assoc_crit.model.name, err, JSON.clone(assocItems));
				}

				if (err != null) {
					return nextAlias(err);
				}

				result = assocItems;

				if (association.options.singular) {
					result = result[0];
				}

				if (options.debug) {
					console.log('Finished assoc from', assoc_crit.model.name, 'for', that.name, result);
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
 * @version  1.0.7
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
	pledge.done(callback);

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

		// Let the user now if it's a new record
		if (options.create == null) {
			options.create = document.is_new_record;
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
 * @version  1.1.0
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
		data = {
			[data.$model_alias] : data.$main,
		};
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

	if (Classes.Alchemy.DocumentList) {
		documents = new Classes.Alchemy.DocumentList(documents, options);
	} else {
		documents = new Classes.Alchemy.Client.DocumentList(documents, options);
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

	let name = this.constructor.name,
	    data;

	if (Blast.isBrowser) {

		// Scene is not ready yet...
		if (!hawkejs.scene) {
			return {};
		}

		if (!hawkejs.scene.exposed.model_info[name]) {
			hawkejs.scene.exposed.model_info[name] = {};
		}

		data = hawkejs.scene.exposed.model_info[name];
	} else {

		let MainClass = Blast.Classes.Alchemy.Model[name];

		if (!MainClass) {
			throw new Error('Unable to find main class for "' + name + '", unable to get client config!');
		}

		data = MainClass.getClientConfig();
	}

	return data;
}, false);

/**
 * Schema
 *
 * @type {Object}
 */
Model.setProperty(function schema() {
	return this.model_info.schema;
}, false);

/**
 * Associations
 *
 * @type {Object}
 */
Model.setProperty(function associations() {
	return this.schema.associations;
}, false);

/**
 * Get a field instance from the schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.0
 *
 * @param    {string}   path   The path to the field
 *
 * @return   {Object}
 */
Model.setMethod(function getField(path) {

	if (path.indexOf('.') > -1) {
		let config = new Classes.Alchemy.Criteria.FieldConfig(path);

		// If part of the path is an association, look for that now
		if (config.association) {
			let association = this.getAssociation(config.association);
			let model = this.getModel(association.modelName);
			return model.getField(config.local_path);
		}

		// If not, just use the local_path
		path = config.local_path;
	}

	return this.schema.getField(path);
});

// Make this class easily available
Hawkejs.Model = Model;

/**
 * Save one record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.1.1
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

		creating = options.create || document.$pk == null;
		next();

		return;

		// Look through unique indexes if no _id is present
		that.auditRecord(document, options, function afterAudit(err, doc) {

			if (err) {
				return next(err);
			}

			// Is a new record being created?
			creating = options.create || doc.$pk == null;
			next();
		});
	}, function doBeforeSave(next) {
		// @TODO: make "beforeSave" only use promises
		that.callOrNext('beforeSave', [document, options], next);
	}, function emitSavingEvent(next) {
		// @TODO: Should this be able to stop the saving without throwing an error?
		that.issueEvent('saving', [document, options, creating], next);
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

	pledge.done(callback);

	return pledge;
});

/**
 * Prepare some data by passing it through the schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.1.0
 *
 * @param    {Object}   data   Field values
 *
 * @return   {Object}
 */
Model.setMethod(function compose(data, options) {

	if (!this.schema || !this.schema.process) {
		return data;
	}

	return this.schema.process(data, options);
});

/**
 * Create a record in the database
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.1
 *
 * @param    {Object}     data       The record data to check
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function createRecord(data, options, callback) {

	const that = this;

	// Normalize & clone the data, set default values, ...
	data = this.compose(data, options);

	Function.series(function validate(next) {

		if (options.validate === false || !that.schema) {
			return next();
		}

		Pledge.done(that.schema.validate(that.createDocument(data)), next);
	}, function done(err) {

		if (err) {
			return callback(err);
		}

		that.datasource.create(that, data, options, function afterCreate(err, result) {

			if (err != null) {
				return callback(err);
			}

			that.issueEvent('saved', [result, options, true], function afterSavedEvent() {
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
 * @version  1.1.1
 *
 * @param    {Object}     data       The record data to check
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function updateRecord(data, options, callback) {

	const that = this;

	// Normalize the data, but no default values should be set (skip non present items)
	data = this.compose(data, Object.assign({update: true}, options));

	Function.series(function validate(next) {

		if (options.validate === false || !that.schema) {
			return next();
		}

		Pledge.done(that.schema.validate(that.createDocument(data)), next);

	}, function done(err) {

		if (err) {
			return callback(err);
		}

		that.datasource.update(that, data, options, function afterUpdate(err, result) {

			if (err != null) {
				return callback(err);
			}

			that.issueEvent('saved', [result, options, false], function afterSavedEvent() {
				callback(null, result);
			});
		});
	});
});

/**
 * Get records that need to be saved to the server
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.6
 * @version  1.1.0
 */
Model.setMethod(async function getRecordsToBeSavedRemotely() {

	var that = this,
	    pledge = new Pledge;

	if (!this.datasource.getRecordsToSync) {
		pledge.resolve([]);
		return pledge;
	}

	this.datasource.getRecordsToSync(this).done(function gotRecords(err, records) {

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
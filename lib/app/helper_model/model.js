const CriteriaNS = Function.getNamespace('Alchemy.Criteria');

let class_cache = new Map(),
    fallback_datasource,
    TABLE = Symbol('table');

if (Blast.isBrowser) {
	Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, view) {

		let config;

		for (config of hawkejs.scene.exposed.model_info) {
			// First get or create the client-side Model class,
			// then set some extra configuration coming from the server-side
			Model.getClass(config.model_name).setModelConfig(config);
		}
	});
}

/**
 * The Model class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {Object}   options
 */
const Model = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Model', function Model(options) {
	this.init(options);
});

/**
 * Set the modelName property after class creation
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 */
Model.postInherit(function setModelName() {

	let base_name = this.name;
	let model_name = base_name;
	let table_prefix = this.table_prefix;
	let namespace = this.namespace;

	if (namespace.startsWith('Alchemy.Model.') || namespace == 'Alchemy.Model') {
		namespace = namespace.slice(14);
	} else if (namespace.startsWith('Alchemy.Client.Model.') || namespace == 'Alchemy.Client.Model') {
		namespace = namespace.slice(21);
	}

	this.setStatic('model_namespace', namespace, false);

	let ns = namespace.replaceAll('.', '_');
	
	if (!table_prefix && ns) {
		table_prefix = ns.tableize();
	}

	if (ns) {
		model_name = ns + '_' + model_name;
	}

	// The simple name of the model
	this.model_name = model_name;
	this.setProperty('model_name', model_name);

	let table_name = base_name.tableize();

	if (table_prefix) {
		table_name = table_prefix + '_' + table_name;
	}

	this.table = table_name;
});

/**
 * Map these events to methods
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.5
 * @version  1.3.22
 */
Model.mapEventToMethod({
	saving         : 'beforeSave',
	saved          : 'afterSave',
	finding        : 'beforeFind',
	queried        : 'afterQuery',
	associated     : 'afterAssociated',

	// Was 'afterFind' in behaviours
	found          : 'afterData',
	foundDocuments : 'afterFind',
	removed        : 'afterRemove',
	to_datasource  : 'beforeToDatasource',
	removing       : 'beforeRemove',

	// New
	beforeFind         : 'beforeFind',
	afterData          : 'afterData',
	afterFind          : 'afterFind',
	afterQuery         : 'afterQuery',
	beforeSave         : 'beforeSave',
	beforeToDatasource : 'beforeToDatasource',
	afterAssociated    : 'afterAssociated',
	afterSave          : 'afterSave',
	beforeRemove       : 'beforeRemove',
	afterRemove        : 'afterRemove',
	beforeNormalize    : 'beforeNormalize',
	beforeValidate     : 'beforeValidate',
});

/**
 * Is the given action enabled on the server?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.6
 * @version  1.0.6
 *
 * @param    {string}    action
 *
 * @return   {boolean}
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
 * Set the Model configuration
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Object}    config
 */
Model.setStatic(function setModelConfig(config) {

	let model_name = this.model_name;

	config.schema.setModel(model_name);

	if (!this.prototype.hasOwnProperty('primary_key')) {
		this.setProperty('primary_key', config.primary_key);
	}

	if (!this.prototype.hasOwnProperty('display_field')) {
		this.setProperty('display_field', config.display_field);
	}
});

/**
 * Table name to use in the database.
 * False if no table should be used.
 *
 * @type     {string}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Does this model have translatable fields?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @type     {boolean}
 */
Model.setProperty(function has_translatable_fields() {
	return this.schema.has_translatable_fields;
});

/**
 * The conduit
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @type     {Hawkejs.Document}
 */
Model.prepareStaticProperty('Document', function getDocumentClass() {
	return Blast.Classes.Alchemy.Client.Document.Document.getDocumentClass(this);
});

/**
 * Create client model class for specific model name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.4.0
 *
 * @param    {string}   model_name
 * @param    {boolean}  allow_create
 * @param    {string}   parent
 */
Model.setStatic(function getClass(model_name, allow_create, parent) {

	let cache_key = model_name;

	if (class_cache.has(cache_key)) {
		return class_cache.get(cache_key);
	}

	// Get the model path as an array
	let model_path = Blast.parseClassPath(model_name);

	// Ensure it is the correct model_name
	model_name = model_path.join('_');

	// Construct the name of the class
	let class_name = model_path.last();

	// The root path
	const root_path = 'Alchemy.Client.Model';

	// Construct the expected path to this class
	let class_path = root_path + '.' + model_path.join('.');

	// Get the class
	let ModelClass = Object.path(Blast.Classes, class_path);

	if (allow_create == null) {
		allow_create = true;
	}

	if (ModelClass == null && allow_create) {

		let namespace = root_path,
		    config;

		if (model_path.length > 1) {
			namespace += '.' + model_path.slice(0, -1).join('.');
		}

		let model_constructor = Function.create(class_name, function ModelConstructor(record, options) {
			ModelConstructor.super.call(this, record, options);
		});

		if (Blast.isBrowser) {

			if (parent) {
				let parent_model_path = Blast.parseClassPath(parent);
				parent = root_path + '.' + parent_model_path.join('.');
			} else {
				parent = root_path;
			}

		} else if (Blast.isNode) {
			let server_class = alchemy.getModel(model_name, false);

			parent = getClass(server_class.super.model_name);

			config = {
				primary_key   : server_class.prototype.primary_key,
				display_field : server_class.prototype.display_field,
			};
		}

		ModelClass = Function.inherits(parent, namespace, model_constructor);

		ModelClass.setProperty('$model_name', model_name);

		if (config) {
			if (config.primary_key) {
				ModelClass.setProperty('primary_key', config.primary_key);
			}

			if (config.display_field) {
				ModelClass.setProperty('display_field', config.display_field);
			}
		}

		if (Blast.isBrowser) {
			typeof ModelClass.Document;
		}
	}

	class_cache.set(cache_key, ModelClass);

	return ModelClass;
});

/**
 * Set a method on the hawkejs document class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.4.0
 */
Model.setStatic(function setDocumentMethod(name, fnc, on_server) {

	var that = this;

	if (typeof name == 'function') {
		on_server = fnc;
		fnc = name;
		name = fnc.name;
	}

	if (Blast.isNode) {
		STAGES.afterStages('load_app.plugins', whenLoaded);
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.4.0
 */
Model.setStatic(function setDocumentProperty(key, getter, setter, on_server) {

	var that = this,
	    args = arguments;

	if (Blast.isNode) {
		STAGES.afterStages('load_app.plugins', whenLoaded);
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
 * @type     {Schema}
 */
Model.setStaticProperty(function schema() {
	if (this.prototype.model_info) {
		return this.prototype.model_info.schema;
	}
});

/**
 * The model name
 *
 * @type     {string}
 */
Model.setProperty(function name() {
	return this._name || this.constructor.model_name;
}, function setName(name) {
	this._name = name;
});

/**
 * Initialize the model
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.0
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
	if (this.schema && this.schema.has_behaviours && this.initBehaviours) {
		this.initBehaviours();
	}
});

/**
 * Get default find options
 *
 * @deprecated
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {Object}   options
 *
 * @return   {Object}
 */
Model.setMethod(function getFindOptions(options) {
	alchemy.distinctProblem('deprecated-getFindOptions', 'model.getFindOptions() is deprecated, use Criteria instead');

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
 * Get the title to display for this record
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.3.14
 *
 * @param    {Object}        item       The record item of this model
 * @param    {string|Array}  fallbacks  Extra fallbacks to use
 * 
 * @return   {string}        The display title to use
 */
Model.setMethod(function getDisplayTitleOrNull(item, fallbacks) {

	if (!item) {
		return null;
	}

	let main;

	if (item[this.modelName]) {
		main = item[this.modelName];
	} else {
		main = item;
	}

	if (!main) {
		return 'Undefined item';
	}

	let field,
	    val,
	    i;

	let fields = Array.cast(this.display_field);

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

	return null;
});

/**
 * Get the title to display for this record
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.3.16
 *
 * @param    {Object}        item       The record item of this model
 * @param    {string|Array}  fallbacks  Extra fallbacks to use
 * 
 * @return   {string}        The display title to use
 */
Model.setMethod(function getDisplayTitle(item, fallbacks) {

	if (!item) {
		return 'Undefined item';
	}

	let result = this.getDisplayTitleOrNull(item, fallbacks);

	if (result == null) {
		result = item[this.primary_key] || '';

		if (result && typeof result != 'string') {
			result = '' + result;
		}
	}

	return result;
});

/**
 * Return association configuration
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.0
 *
 * @param    {string}   alias
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {string}   alias
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

	// @TODO: associated fields with an alias name inside a nested schema
	// somehow breaks! Should be looked in to?
	// Workaround: set `recursive: 0` on the root schema field
	// console.log('Alias:', alias, 'config:', config, this.schema);

	if (config) {
		result = this.getModel(config.modelName);
	} else {
		result = this.getModel(alias);
	}

	return result;
});

/**
 * Find one record
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string|Object|Criteria}     conditions
 *
 * @return   {Pledge|Criteria}
 */
Model.setMethod(function findOne(conditions, options) {
	conditions = CriteriaNS.Model.cast(conditions, options, this);
	return this.find('first', conditions);
});

/**
 * Find all records
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string|Object|Criteria}     conditions
 *
 * @return   {Pledge|Criteria}
 */
Model.setMethod(function findAll(conditions, options) {
	conditions = CriteriaNS.Model.cast(conditions, options, this);
	return this.find('all', conditions);
});

/**
 * Issue a data event
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}     event_name
 * @param    {Array}      args
 *
 * @return   {Pledge|null}
 */
Model.setMethod(function issueDataEvent(event_name, args, next) {

	let tasks = [];

	if (this.behaviours) {

		let method_name;

		if (this.constructor.event_to_method_map) {
			method_name = this.constructor.event_to_method_map.get(event_name);
		}

		if (!method_name) {
			method_name = 'on' + event_name.camelize();
		}

		for (let key in this.behaviours) {
			let behaviour = this.behaviours[key];

			if (typeof behaviour[method_name] == 'function') {
				tasks.push(() => behaviour[method_name](...args));
			}
		}
	}

	if (!tasks.length) {
		let pledge = new Swift();
		this.issueEvent(event_name, args, pledge.getResolverFunction());

		if (next) {
			pledge.done(next);
		}

		return pledge;
	}

	tasks.push(() => {
		let pledge = new Swift();
		this.issueEvent(event_name, args, pledge.getResolverFunction());
		return pledge;
	});

	let result = Swift.waterfall(...tasks);

	if (next) {
		Swift.done(result, next);
	}

	return result;
});

/**
 * Query the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 *
 * @param    {string}     type       The type of find (first, all)
 * @param    {Criteria}   criteria   The criteria object
 * @param    {Function}   callback
 *
 * @return   {Pledge|Criteria}
 */
Model.setMethod(function find(type, criteria, callback) {

	if (arguments.length == 0) {
		return new Classes.Alchemy.Criteria.Model(this);
	}

	let skip_type,
	    pledge,
	    error;

	if (!this.datasource) {
		pledge = new Pledge();
		pledge.done(callback);
		pledge.reject(new Classes.Alchemy.Error.Model('Unable to perform ' + this.constructor.name + '#find(), no datasource is available'));
		return pledge;
	}

	if (Classes.Alchemy.Criteria.Criteria.isCriteria(type)) {
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

	try {
		criteria = Classes.Alchemy.Criteria.Model.cast(criteria, this);
	} catch (err) {
		error = err;
	}

	if (error != null) {
		pledge = new Pledge();
		pledge.done(callback);
		pledge.reject(error);
		return pledge;
	}

	// Clone the criteria to prevent mutations affecting the original
	criteria = criteria.clone();

	if (this.conduit) {
		criteria.conduit = this.conduit;
	}

	if (!criteria.options.locale && this.conduit) {
		criteria.setOption('locale', this.conduit.active_prefix);
	}

	let that = this,
	    available,
	    records,
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
		that.issueDataEvent('beforeFind', [criteria], next);
	}, function doQuery(next) {

		let context = new Classes.Alchemy.OperationalContext.ReadDocumentFromDatasource();
		context.setDatasource(that.datasource);
		context.setModel(that);
		context.setCriteria(criteria);

		Pledge.Swift.done(that.datasource.read(context), (err, result) => {

			if (err) {
				return next(err);
			}

			records = result.items;
			available = result.available;
			records.available = available;

			next();
		});
	}, function emitQueried(next) {
		that.issueDataEvent('afterQuery', [criteria, records], next);
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
		that.issueDataEvent('afterAssociated', [criteria, records], next);
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

		that.issueDataEvent('afterData', [criteria, records], function afterFound(err) {

			if (err) {
				return next(err);
			}

			if (criteria.options.document !== false) {
				records = that.createDocumentList(records, criteria);
				records.available = available;
				that.issueDataEvent('afterFind', [criteria, records], next);
			} else {
				next();
			}
		});
	}, function recomputeAfterFind(next) {

		if (!that.schema.has_recompute_after_find || criteria.options.document === false) {
			return next();
		}

		let tasks = [];

		for (let document of records) {
			tasks.push((next) => {
				let promise = document.recomputeValues();

				if (!promise) {
					return next();
				}

				Pledge.done(promise, next);
			});
		}

		Function.parallel(8, tasks, next);
	}, function done(err) {

		if (err != null) {

			if (callback) {
				callback(err);
			}

			return;
		}

		if (Blast.isBrowser && criteria.options.document !== false) {
			let i;

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {string|ObjectId}   id        The object id as string or object
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.4.0
 *
 * @param    {string|ObjectId}   pk        The primary key value
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

	let criteria = new Classes.Alchemy.Criteria.Model(this);

	criteria.where(this.primary_key).equals(pk);

	if (typeof options == 'function') {
		callback = options;
	} else {
		criteria.applyOldOptions(options);
	}

	return this.find('first', criteria, callback);
});

/**
 * Return the context for resolving a remote schema request.
 * The only thing we probably need to do is return a document.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.OperationalContext.Schema}   context
 *
 * @return   {Alchemy.Document|Object|Schema}
 */
Model.setMethod(async function resolveRemoteSchemaRequest(context) {

	let our_field_value = context.getOurFieldValue(),
	    our_field_name = context.getOurFieldName();

	let doc = await this.findByValues({
		[our_field_name]: our_field_value,
	});

	if (!doc) {
		return null;
	}

	const external_field = context.getExternalField();

	context = context.createChild();
	context.setHolder(doc);
	context.setSchema(this.schema);

	let found_schema = external_field.resolveSchemaPath(context);

	return found_schema;
});

/**
 * Query the database by key-val attributes, return the first result
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Object}    values       The values to look for
 * @param    {Object}    options      Optional options object
 *
 * @return   {Pledge}
 */
Model.setMethod(function findByValues(values, options) {

	var criteria = new Classes.Alchemy.Criteria.Model(this),
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.4.0
 *
 * @param    {Object}    values       The values to look for
 * @param    {Object}    options      Optional options object
 *
 * @return   {Pledge}
 */
Model.setMethod(function findAllByValues(values, options) {

	var criteria = new Classes.Alchemy.Criteria.Model(this),
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Model.setMethod(function afterFindCount(options, records, callback) {
	callback(null, records.available || 0);
});

/**
 * Add associated data to a single record
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  1.4.1
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

						// assoc_crit can be undefined for self-referencing without recursive depth
						if (assoc_crit && !(item[alias] instanceof assoc_crit.model.constructor.Document)) {
							item[alias] = assoc_crit.model.createDocument(item[alias]);
						}
					}
				} else if (Array.isArray(item[alias])) {
					let assoc_crit = criteria.getCriteriaForAssociation(alias, item);
					if (assoc_crit) {
						item[alias] = assoc_crit.model.createDocumentList(item[alias]);
					}
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

			let pledge,
			    key;

			if (options.create_references !== false) {
				key = alchemy.checksum(assoc_crit);

				if (key != null) {
					if (options.assoc_cache[key]) {
						Pledge.done(options.assoc_cache[key], nextAlias);
						return;
					} else {
						pledge = new Pledge();
						options.assoc_cache[key] = pledge;
					}
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

					if (pledge) {
						pledge.reject(err);
					}

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

					if (pledge) {
						pledge.resolve(result);
					}
				}

				nextAlias(null, result);
			});
		};
	});

	pledge = Function.parallel(alchemy.settings.data_management.model_assoc_parallel_limit || 4, aliases, function gotAssociatedList(err, list) {

		if (err != null) {
			throw err;
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.0.7
 *
 * @return   {Pledge}
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

		var document = iter.next().value;

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {Object}    data     Optional data
 * @param    {Object}    options
 *
 * @return   {Document}
 */
Model.setMethod(function createDocument(data, options) {

	let original_record;

	if (!options) {
		options = {};
	}

	if (data && this.constructor.Document.isDocument(data)) {
		original_record = data.$attributes.original_record;

		data = {
			[data.$model_alias] : data.$main,
		};
	}

	options.model = this;

	let doc = new this.constructor.Document(data, options);

	if (original_record) {
		doc.$attributes.original_record = original_record;
	}

	return doc;
});

/**
 * Create a document list
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.5
 *
 * @param    {Array}     records
 * @param    {Object}    options
 *
 * @return   {DocumentList}
 */
Model.setMethod(function createDocumentList(records, options) {

	// Make sure we have an array of records
	records = Array.cast(records);

	// Create new target array
	let documents = Array(records.length);

	for (let i = 0; i < records.length; i++) {
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.6
 * @version  1.0.6
 *
 * @param    {string}    action
 *
 * @return   {boolean}
 */
Model.setMethod(function hasServerAction(action) {
	return this.constructor.hasServerAction(action);
});

/**
 * Client-side model info
 *
 * @type     {Object}
 */
Model.setProperty(function model_info() {

	let class_name = this.constructor.name,
	    model_name = this.constructor.model_name,
	    data;

	if (Blast.isBrowser) {

		// Scene is not ready yet...
		if (!hawkejs.scene) {
			return {};
		}

		let config;

		for (config of hawkejs.scene.exposed.model_info) {
			if (config.model_name === model_name) {
				data = config;
				break;
			}
		}
	} else {

		let MainClass = Blast.Classes.Alchemy.Model.Model.get(model_name, false);

		if (!MainClass) {
			throw new Error('Unable to find main class for "' + model_name + '", unable to get client config!');
		}

		data = MainClass.getClientConfig();
	}

	return data;
}, false);

/**
 * Schema
 *
 * @type     {Object}
 */
Model.setProperty(function schema() {
	return this.model_info.schema;
}, false);

/**
 * Associations
 *
 * @type     {Object}
 */
Model.setProperty(function associations() {
	return this.schema.associations;
}, false);

/**
 * Get a field instance from the schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.3.20
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
	}, function doBeforeNormalize(next) {
		// @TODO: make "beforeSave" only use promises
		that.issueDataEvent('beforeNormalize', [document, options], next);
	}, function emitSavingEvent(next) {
		// @TODO: Should this be able to stop the saving without throwing an error?
		that.issueDataEvent('beforeSave', [document, options, creating], next);
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
			throw err;
		}

		return saved_record;
	});

	pledge.done(callback);

	return pledge;
});

/**
 * Prepare some data by passing it through the schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Document}   document
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function createRecord(document, options, callback) {

	const that = this;

	// Normalize & clone the data, set default values, ...
	let data = this.compose(document, options);

	document = createDocumentForSaving(this, document, data);

	Function.series(function recompute(next) {
		let result = document.recomputeValues();

		if (result) {
			result.done(next);
		} else {
			next();
		}
	}, function doBeforeValidate(next) {
		that.issueDataEvent('beforeValidate', [document, options], next);
	}, function validate(next) {

		if (options.validate === false || !that.schema) {
			return next();
		}

		Pledge.done(that.schema.validate(document), next);
	}, function doBeforeSave(next) {
		that.issueDataEvent('beforeSave', [document, options], next);
	}, function done(err) {

		if (err) {
			return callback(err);
		}

		if (!that.datasource) {
			return callback(new Error('Model "' + that.model_name + '" has no datasource'));
		}

		let context = new Classes.Alchemy.OperationalContext.SaveDocumentToDatasource();
		context.setDatasource(that.datasource);
		context.setModel(that);
		context.setRootData(data);
		context.setSaveOptions(options);

		let create_promise;

		try {
			create_promise = that.datasource.create(context);
		} catch (err) {
			return callback(err);
		}

		Pledge.Swift.done(create_promise, function afterCreate(err, result) {

			if (err != null) {
				return callback(err);
			}

			that.issueDataEvent('afterSave', [result, options, true], function afterSavedEvent() {
				callback(null, result);
			});
		});
	})
});

/**
 * Create a document used for saving
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @param    {Model}             model
 * @param    {Document|Object}   original_input
 * @param    {Object}            data
 */
function createDocumentForSaving(model, original_input, data) {

	// Turn it into a new document
	let document = model.createDocument(data);

	if (original_input?.$attributes.original_record) {
		document.$attributes.original_record = original_input.$attributes.original_record;
	}

	return document;
}

/**
 * Update a record in the database
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {Document}   document
 * @param    {Object}     options
 * @param    {Function}   callback
 */
Model.setMethod(function updateRecord(document, options, callback) {

	const that = this;

	// Normalize the data, but no default values should be set (skip non present items)
	let data = this.compose(document, Object.assign({update: true}, options));

	// Turn it into a new document
	document = createDocumentForSaving(this, document, data);

	Function.series(function recompute(next) {
		let result = document.recomputeValues();

		if (result) {
			result.done(next);
		} else {
			next();
		}
	}, function doBeforeValidate(next) {
		that.issueDataEvent('beforeValidate', [document, options], next);
	}, function validate(next) {

		if (options.validate === false || !that.schema) {
			return next();
		}

		Pledge.done(that.schema.validate(document), next);

	}, function doBeforeSave(next) {
		that.issueDataEvent('beforeSave', [document, options], next);
	}, function done(err) {

		if (err) {
			return callback(err);
		}

		if (!that.datasource) {
			return callback(new Error('Model "' + that.model_name + '" has no datasource'));
		}

		let context = new Classes.Alchemy.OperationalContext.SaveDocumentToDatasource();
		context.setDatasource(that.datasource);
		context.setModel(that);
		context.setRootData(data);
		context.setSaveOptions(options);

		let update_result;
		
		try {
			update_result = that.datasource.update(context);
		} catch (err) {
			return callback(err);
		}

		Swift.done(update_result, function afterUpdate(err, result) {

			if (err != null) {
				return callback(err);
			}

			that.issueDataEvent('afterSave', [result, options, false], function afterSavedEvent(err) {

				if (err) {
					return callback(err);
				}

				callback(null, result);
			});
		});
	});
});

/**
 * Get records that need to be saved to the server
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
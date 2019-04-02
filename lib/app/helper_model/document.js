var model_info,
    cache_stores_in_progress,
    did_check = Symbol('did_check');

if (Blast.isBrowser) {
	cache_stores_in_progress = new Map();

	Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, renderer) {

		var model_name,
		    DocClass,
		    config,
		    key;

		model_info = hawkejs.scene.exposed.model_info;

		for (model_name in model_info) {
			config = model_info[model_name];
			DocClass = Document.getDocumentClass(model_name);

			for (key in config.schema.dict) {
				DocClass.setFieldGetter(key);
			}

			for (key in config.schema.associations) {
				DocClass.setAliasGetter(key);
			}
		}
	});
}

/**
 * The Document class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {Object}   record   A record containing the main & related data
 * @param    {Object}   options
 */
var Document = Function.inherits('Alchemy.Client.Base', 'Alchemy.Client.Document', function Document(record, options) {
	this.setDataRecord(record, options);
});

/**
 * Set a property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}     key        Name of the property
 * @param    {Function}   getter     Optional getter function
 * @param    {Function}   setter     Optional setter function
 * @param    {Boolean}    on_server  Also set on the server implementation
 */
Document.setStatic(function setProperty(key, getter, setter, on_server) {

	if (typeof key == 'function') {
		on_server = setter;
		setter = getter;
		getter = key;
		key = getter.name;
	}

	if (typeof setter == 'boolean') {
		on_server = setter;
		setter = null;
	}

	if (Blast.isNode && on_server !== false) {
		var property_name = key,
		    DocClass;

		if (this.name == 'Document') {
			DocClass = Classes.Alchemy.Document.Document;
		} else {
			DocClass = Classes.Alchemy.Document.Document.getDocumentClass(this.prototype.$model_name);
		}

		if (!DocClass) {
			log.warn('Could not find server implementation for', this.$model_name || this);
		} else if (!DocClass.prototype.hasOwnProperty(property_name)) {
			// Only add it to the server's Document if it doesn't have this property
			Blast.Collection.Function.setProperty(DocClass, key, getter, setter);
		}
	}

	return Blast.Collection.Function.setProperty(this, key, getter, setter);
});

/**
 * Set a method
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}     key        Name of the property
 * @param    {Function}   method     The method to set
 * @param    {Boolean}    on_server  Also set on the server implementation
 */
Document.setStatic(function setMethod(key, method, on_server) {

	if (typeof key == 'function') {
		on_server = method;
		method = key;
		key = method.name;
	}

	if (Blast.isNode && on_server !== false) {

		var property_name,
		    DocClass;

		if (this.name == 'Document') {
			DocClass = Classes.Alchemy.Document.Document;
		} else {
			DocClass = Classes.Alchemy.Document.Document.getDocumentClass(this.prototype.$model_name);
		}

		property_name = key;

		if (!DocClass) {
			log.warn('Could not find server implementation for', this.prototype.$model_name || this);
		} else if (!DocClass.prototype.hasOwnProperty(property_name)) {
			// Only add it to the server's Document if it doesn't have this property
			Blast.Collection.Function.setMethod(DocClass, key, method);
		}
	}

	return Blast.Collection.Function.setMethod(this, key, method);
});

/**
 * Set a getter for this field
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.4
 *
 * @param    {String}     name     Name of the property
 * @param    {Function}   getter   Optional getter function
 * @param    {Function}   setter   Optional setter function
 * @param    {Boolean}    on_server  Also set on the server implementation
 */
Document.setStatic(function setFieldGetter(name, getter, setter, on_server) {

	if (typeof getter != 'function') {
		getter = function getFieldValue() {
			return this.$main[name];
		};

		setter = function setFieldValue(value) {

			if (this.$main[name] !== value) {
				this.markChangedField(name, value);
			}

			this.$main[name] = value;
		};
	}

	this.setProperty(name, getter, setter, on_server);
});

/**
 * Set the getter for an alias
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
Document.setStatic(function setAliasGetter(name) {

	var descriptor;

	if (!name) {
		throw new Error('No name given to set on document class ' + JSON.stringify(this.name));
	}

	// Get the descriptor
	descriptor = Object.getOwnPropertyDescriptor(this.prototype, name);

	// Don't overwrite an already set property
	if (descriptor) {
		return;
	}

	this.setProperty(name, function getAliasObject() {
		return this.$record && this.$record[name];
	}, function setAliasObject(value) {
		this.$record[name] = value;
	}, false);
});

/**
 * Find class for JSON-Dry
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.6
 * @version  1.1.0
 *
 * @param    {String}   class_name
 */
Document.setStatic(function getClassForUndry(class_name) {
	return this.getDocumentClass(class_name);
});

/**
 * Create document class for specific model
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @param    {Object|String}   model
 */
Document.setStatic(function getDocumentClass(model) {

	var doc_constructor,
	    document_name,
	    parent_path,
	    model_name,
	    DocClass,
	    doc_path,
	    config,
	    key;

	if (!model) {
		throw new Error('Can not get Hawkejs.Document class for non-existing model');
	}

	if (typeof model == 'function') {
		model_name = model.name;
	} else if (typeof model == 'string') {
		model_name = model;
	} else {
		model_name = model.model_name;
	}

	// Construct the name of the document class
	document_name = model_name;

	// Construct the path to this class
	doc_path = 'Alchemy.Client.Document.' + document_name;

	// Get the class
	DocClass = Object.path(Blast.Classes, doc_path);

	if (DocClass == null) {
		doc_constructor = Function.create(document_name, function DocumentConstructor(record, options) {
			DocumentConstructor.wrapper.super.call(this, record, options);
		});

		if (Blast.isBrowser && window._initHawkejs && _initHawkejs[2]) {
			let exposed;

			if (_initHawkejs[2].value) {
				exposed = _initHawkejs[2].value.expose_to_scene;
			} else {
				exposed = _initHawkejs[2].expose_to_scene || {};
			}

			config = exposed.model_info;

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

		parent_path = 'Alchemy.Client.Document';

		if (config && config.parent) {
			// Make sure the parent class exists
			getDocumentClass(config.parent);

			parent_path += '.' + config.parent;
		}

		DocClass = Function.inherits(parent_path, doc_constructor);

		DocClass.setProperty('$model_name', model_name, null, false);

		// Set the getter for this document alias itself
		DocClass.setAliasGetter(model_name);

		// Set a reference to the Model class
		DocClass.Model = Blast.Classes.Hawkejs.Model.getClass(model_name);
	}

	return DocClass;
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {Object}           obj
 * @param    {Boolean|String}   cloned
 *
 * @return   {Document}
 */
Document.setStatic(function unDry(obj, cloned) {

	var store_in_cache = true,
	    DocClass,
	    result;

	// Get the document class
	DocClass = this.getDocumentClass(obj.$model_name);

	// Create a new instance, without constructing it yet
	result = Object.create(DocClass.prototype);

	// Restore the attributes object if there is one
	if (obj.$attributes) {
		result.$_attributes = obj.$attributes;
	}

	// Don't consider using 'toHawkejs' as being a clone
	if (cloned == 'toHawkejs') {
		cloned = false;
	}

	// Indicate it's a clone
	if (cloned) {
		result.$is_cloned = true;
	}

	// Why does the model still get added sometimes?
	// It's removed in the toDry method!
	if (obj.$options && obj.$options.model) {
		obj.$options.model = null;
	}

	DocClass.call(result, obj.$record, obj.$options);

	if (cloned || Blast.isNode || obj[Blast.Classes.IndexedDb.from_cache_symbol]) {
		store_in_cache = false;
	} else if (result.$main.updated && window.sessionStorage && window.sessionStorage[result.$main._id] == Number(result.$main.updated)) {
		store_in_cache = false;
	}

	// Cache in browser, but only if it's not from the cache
	if (store_in_cache) {

		if (window.sessionStorage && result.$main.updated) {
			window.sessionStorage[result.$main._id] = Number(result.$main.updated);
		}

		if (!window.hawkejs || !window.hawkejs.scene) {
			Blast.requestIdleCallback(function tryStore(task_data) {
				if (DocClass.Model && DocClass.Model.hasServerAction('readDatasource')) {
					// Only store in cache when we can query the server
					result.informDatasource();
				}
			});
		} else if (DocClass.Model.hasServerAction('readDatasource')) {
			Blast.requestIdleCallback(function tryStore(task_data) {
				result.informDatasource();
			});
		}
	}

	return result;
});

/**
 * Is the given argument a Document?
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Object}     obj
 *
 * @return   {Boolean}
 */
Document.setStatic(function isDocument(obj) {

	if (!obj || typeof obj != 'object') {
		return false;
	}

	// See if it's a client-side document
	if (obj instanceof Document) {
		return true;
	}

	if (Blast.Classes.Alchemy.Document && Blast.Classes.Alchemy.Document.Document) {
		return obj instanceof Blast.Classes.Alchemy.Document.Document;
	}

	return false;
});

/**
 * Get the model instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setProperty(function $model() {

	if (!this.$options.model) {
		this.$options.model = this.getModel(this.$model_name);
	}

	return this.$options.model;
});

/**
 * Get the primary key value
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Document.setProperty(function $pk() {

	var model = this.$model,
	    key;

	if (model) {
		key = model.primary_key;
	}

	if (!key) {
		key = '_id';
	}

	return this[key];
});

/**
 * Get the attributes object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 */
Document.setProperty(function $attributes() {

	if (!this.$_attributes) {
		this.$_attributes = {};
	}

	return this.$_attributes;
});

/**
 * Get the $model_alias name
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {String}
 */
Document.setProperty(function $model_alias() {

	var name = this.$model_name;

	if (name == 'Model' && this.$model) {
		name = this.$model.name || name;
	}

	return name;
});

/**
 * Get the $main data
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {Object}
 */
Document.setProperty(function $main() {

	let name = this.$model_alias;

	if (!this.$record) {
		this.$record = {};
	}

	if (!this.$record[name]) {
		this.$record[name] = {};
	}

	return this.$record[name];

}, function setMain(data) {

	if (!this.$record) {
		this.$record = {};
	}

	this.$record[this.$model_alias] = data;
});

/**
 * Is this a new & unsaved record?
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.6
 * @version  1.0.7
 *
 * @param    {Boolean}
 */
Document.setProperty(function is_new_record() {

	if (!this._id) {
		return true;
	}

	if (this.$attributes.creating) {
		return true;
	}

	return false;
});

/**
 * Compare to another object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @param    {Object}   other
 *
 * @return   {Boolean}
 */
Document.setMethod(Blast.alikeSymbol, function alike(other, seen) {

	if (!(other instanceof this.constructor)) {
		return false;
	}

	if (!Object.alike(this.$main, other.$main, seen)) {
		return false;
	}

	return Object.alike(this.$_attributes, other.$_attributes, seen);
});

/**
 * Return an object for json-drying this document
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.6
 *
 * @return   {Object}
 */
Document.setMethod(function toDry() {
	return {
		value: {
			$options    : this.getCleanOptions(),
			$record     : this.$record,
			$model_name : this.$model_name,
			$attributes : this.$_attributes
		},
		namespace : this.constructor.namespace,
		dry_class : this.constructor.name
	};
}, false);

/**
 * Actually initialize this instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.4
 * @version  1.1.0
 *
 * @param    {Object}   record
 * @param    {Object}   options
 */
Document.setMethod(function setDataRecord(record, options) {

	var name,
	    item,
	    i;

	// Set the options object first
	this.$options = options || {};

	// Get the name to use of the model
	// (this is no longer $model_name, since a Model instance can use a custom name)
	name = this.$model_alias;

	// If no record was given, create an empty one
	if (!record) {
		record = {};
		record[name] = {};
	}

	// If an object was given without being encapsuled,
	// do so now
	if (!record[name] && !Object.isEmpty(record)) {
		record = {
			[name] : record
		};
	}

	// The original record
	this.$record = record;

	if (Blast.isNode && this.constructor.namespace.indexOf('Alchemy.Document') == -1) {
		let key;

		for (key in this.$main) {
			if (!(this.$model.schema.has(key))) {
				delete this.$main[key];
			}
		}
	}

	// If this has object fields we need to clone the document already
	if (Blast.isBrowser && this.hasObjectFields() && !this.$is_cloned) {
		this.storeCurrentDataAsOriginalRecord();
	}

	// Initialize the document
	if (typeof this.init == 'function') {
		this.init();
	}
});

/**
 * Get the clean options
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Object}
 */
Document.setMethod(function getCleanOptions() {

	var options = Object.assign({}, this.$options);

	if (options.model) {
		options.model = null;
	}

	return options;
});

/**
 * Save the updates to the record
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.7
 *
 * @param    {Object}    data
 * @param    {Function}  callback
 *
 * @return   {Pledge}
 */
Document.setMethod(function save(data, options, callback) {

	var that = this,
	    sub_pledge,
	    pledge = new Pledge(),
	    main = this.$main,
	    set_remote_saved,
	    use_data;

	if (typeof data === 'function') {
		callback = data;
		options = null;
		data = null;
	} else if (typeof options == 'function') {
		callback = options;
		options = null;
	} else if (typeof callback != 'function') {
		callback = Function.thrower;
	}

	function updateDoc(err, save_result) {

		if (err) {
			return pledge.reject(err);
		}

		if (that.$attributes.creating) {
			that.$attributes.creating = false;
		}

		save_result = save_result[0];

		// `saveResult` is actually the `toDatasource` value
		// We can't assign that again, because it's sometimes normalized!
		// @TODO: make save & update return non-normalized data
		//Object.assign(main, saveResult[0][that.modelName]);

		// While we're waiting for past me to finish the todo above,
		// we really need an _id value
		main._id = alchemy.castObjectId(save_result[that.$model_alias]._id);

		// Unset the changed-status
		that.$attributes.original_record = undefined;
		that.$attributes.changed = false;

		if (that.hasObjectFields()) {
			that.storeCurrentDataAsOriginalRecord();
		}

		pledge.resolve(that);
	}

	if (data && data != main) {
		let key;

		// _id should never be updated
		if (data && data._id && data != main) {
			delete data._id;
		}

		for (key in data) {
			if (main[key] !== data[key]) {
				this.$attributes.changed = true;
				main[key] = data[key];
			}
		}

		data._id = main._id;
		use_data = true;
	}

	if (Blast.isBrowser) {

		// If no objectid exists, create one now
		if (!this._id) {
			this._id = Blast.createObjectId();
			this.$attributes.creating = true;

			if (!options) {
				options = {};
			}

			options.create = true;
		}
	}

	if (use_data) {
		sub_pledge = this.$model.save(data, options, updateDoc);
	} else {
		sub_pledge = this.$model.save(main, options, updateDoc);
	}

	pledge.done(callback);

	return pledge;
});

/**
 * Check and do a datasource inform
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   options
 * @param    {Function} callback
 */
Document.setMethod(function checkAndInformDatasource(options, callback) {

	var that = this,
	    pledge = new Pledge,
	    store_in_cache = true;

	pledge.done(callback);

	if (this[did_check]) {
		pledge.resolve();
		return pledge;
	}

	this[did_check] = true;

	if (this.$main.updated && window.sessionStorage && window.sessionStorage[this.$main._id] == Number(this.$main.updated)) {
		store_in_cache = false;
	}

	// Cache in browser, but only if it's not from the cache
	if (store_in_cache) {
		let DocClass = this.constructor;

		if (window.sessionStorage && this.$main.updated) {
			window.sessionStorage[this.$main._id] = Number(this.$main.updated);
		}

		if (!window.hawkejs || !window.hawkejs.scene) {
			Blast.requestIdleCallback(function tryStore(task_data) {
				if (DocClass.Model && DocClass.Model.hasServerAction('readDatasource')) {
					// Only store in cache when we can query the server
					pledge.resolve(that.informDatasource());
				}
			});
		} else if (DocClass.Model.hasServerAction('readDatasource')) {
			Blast.requestIdleCallback(function tryStore(task_data) {
				pledge.resolve(that.informDatasource());
			});
		}
	}

	return pledge;
});

/**
 * Inform the datasource of this document
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {Object}   options
 * @param    {Function} callback
 */
Document.setMethod(function informDatasource(options, callback) {

	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	if (!callback) {
		callback = Function.thrower;
	}

	if (!options) {
		options = {};
	}

	// Only do this on datasources that have a cache
	if (!this._id || !this.$model.datasource.has_offline_cache) {
		Blast.nextTick(callback);
		return false;
	}

	let is_save = options.local_save || options.remote_save;

	if (cache_stores_in_progress.has(this._id) && !is_save) {
		Blast.nextTick(callback);
		return false;
	}

	let that = this;

	cache_stores_in_progress.set(this._id, true);

	return Function.series(async function getLocalVersion(next) {

		if (is_save) {
			return next();
		}

		let local;

		try {
			local = await that.getLocalVersionIfNewer();
		} catch (err) {
			console.log(err);
			return next();
		}

		return next(null, local);

	}, function saveIfNoLocal(next, local) {

		if (local) {
			return next();
		}

		// We set "create" to false, so an update is forced.
		// This is kind of wrong, because it could still be made required to
		// be created on this cache datasource. But the idb_datasource uses "put", so...
		let options = {
			create: false
		};

		that.$model.datasource.storeInUpperDatasource(that.$model, that.$main, options).done(next);

	}, function done(err, results) {

		cache_stores_in_progress.delete(that._id);

		if (err) {
			return callback(err);
		}

		callback.apply(null, results.last());
	});
});

/**
 * Store the current data as the original record
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 */
Document.setMethod(function storeCurrentDataAsOriginalRecord() {
	this.$attributes.original_record = JSON.clone(this.$main);
});

/**
 * Mark the given field as changed
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 */
Document.setMethod(function markChangedField(name, value) {

	// Copy the original record if not done so yet
	if (!this.$attributes.original_record) {
		this.storeCurrentDataAsOriginalRecord();
	}

	this.$attributes.changed = true;
});

/**
 * Does this document need saving?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @return   {Boolean}
 */
Document.setMethod(function needsToBeSaved() {

	if (!this._id) {
		return true;
	}

	if (this.hasChanged()) {
		return true;
	}

	return false;
});

/**
 * Does this document have object fields?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @return   {Boolean}
 */
Document.setMethod(function hasObjectFields() {
	// @TODO: implement schema checks
	return true;
});

/**
 * Does this document have a value for the given field?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {String}   name   The field name
 *
 * @return   {Boolean}
 */
Document.setMethod(function hasFieldValue(name) {
	return Object.hasProperty(this.$main, name);
});

/**
 * Has this document changed since it was created?
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @param    {String}   name   The optional field name
 *
 * @return   {Boolean}
 */
Document.setMethod(function hasChanged(name) {

	// If no setter ever fired, assume nothing changed
	// @TODO: what about array contents?
	if (!this.$attributes.changed && !this.hasObjectFields()) {
		return false;
	}

	// When we have nothing to compare to, assume false
	if (!this.$attributes.original_record) {
		return false;
	}

	// If we only want to check a single field, do a strict compare
	if (name) {
		return this.$attributes.original_record[name] !== this[name];
	}

	let key;

	for (key in this.$attributes.original_record) {
		if (!Object.alike(this.$attributes.original_record[key], this[key])) {
			return true;
		}
	}

	for (key in this.$main) {
		if (!Object.alike(this.$main[key], this.$attributes.original_record[key])) {
			return true;
		}
	}

	// We can mark the attribute as false again
	this.$attributes.changed = false;

	return false;
});

/**
 * Reset this document to the initial values
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @param    {Array}   fields   An optional array of fields to reset
 */
Document.setMethod(function resetFields(fields) {

	// If there was no original record, clone the current one
	if (!this.$attributes.original_record) {
		this.$main = JSON.clone(this.$main);
		return;
	}

	if (fields && fields.length) {

		let field,
		    i;

		// Clone the $main record
		this.$main = JSON.clone(this.$main);

		// Iterate over the given fields and get the originel value
		for (i = 0; i < fields.length; i++) {
			field = fields[i];

			this.$main[field] = JSON.clone(this.$attributes.original_record[field]);
		}
	} else {
		this.$main = JSON.clone(this.$attributes.original_record);
	}
});

/**
 * Get validation info
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @return   {Pledge}
 */
Document.setMethod(function checkValidation() {

	var that = this,
	    pledge = new Pledge();

	


	return pledge;
});

// Don't load next methods on the server
if (Blast.isNode) {
	return;
}

/**
 * Get the local version of this document, if it exists
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.6
 * @version  1.0.6
 *
 * @return   {Pledge}
 */
Document.setMethod(function getLocalVersion() {

	var that = this,
	    conditions,
	    options = {};

	return Pledge.resolve();

	conditions = {
		_id: this._id
	};

	let pledge = new Pledge();

	this.$model.datasource.read('records', conditions, options, function done(err, result) {

		if (err) {
			return pledge.reject(err);
		}

		if (result.length) {
			result = that.$model.createDocument(result[0]);
		}

		pledge.resolve(result);
	});

	return pledge;
});

/**
 * Get the local version of this document, if it exists
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.6
 * @version  1.0.6
 *
 * @return   {Pledge}
 */
Document.setMethod(function getLocalVersionIfNewer() {

	var that = this;

	return Function.series(this.getLocalVersion(), function gotLocal(next, local) {

		if (local && local.$main && local.$main._$local_save_time > that.updated) {
			return next(null, local);
		}

		next();
	}, function done(err, result) {

		if (!err) {
			let doc = result[1] || null;

			if (doc) {
				// @TODO: sometimes this already happens earlier?
				doc.save();
			}

			return doc;
		}
	});
});
var model_info;

if (Blast.isBrowser) {
	Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, view) {

		var model_name,
		    DocClass,
		    config,
		    key;

		model_info = view.exposeToScene.model_info;

		for (model_name in model_info) {
			config = model_info[model_name];
			DocClass = Document.getDocumentClass(model_name);

			for (key in config.fields) {
				DocClass.setFieldGetter(key);
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
 * @version  1.0.0
 *
 * @param    {Object}   record   A record containing the main & related data
 * @param    {Object}   options
 */
var Document = Function.inherits(['Alchemy.Client.Base', 'Array'], 'Alchemy.Client.Document', function Document(record, options) {

	var item,
	    i;

	if (!record) {
		record = {};
		record[this.$model_name] = {};
	}

	this.$options = options || {};

	// The original record
	this.$record = record;

	// The main data
	this.$main = record[this.$model_name];

	// Initialize the document
	if (this.init) this.init();
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
 * @version  1.0.0
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
 * Create document class for specific model
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
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
		doc_constructor = Function.create(document_name, function med(record, options) {
			med.wrapper.super.call(this, record, options);
		});

		// @TODO: inherit from parents
		parent_path = 'Alchemy.Client.Document';

		DocClass = Function.inherits(parent_path, doc_constructor);

		DocClass.setProperty('$model_name', model_name, null, false);

		// Set the getter for this document alias itself
		DocClass.setAliasGetter(model_name);
	}

	return DocClass;
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Hawkejs.publicDocumentt}
 */
Document.setStatic(function unDry(obj) {

	var DocClass,
	    result;

	DocClass = this.getDocumentClass(obj.$model_name);

	// Create a new I18n instance (without calling the constructor)
	result = new DocClass(obj.$record, obj.$options);

	// Cache in browser
	if (Blast.isBrowser) {
		result.storeInCache();
	}

	return result;
});

/**
 * Return an object for json-drying this document
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Object}
 */
Document.setMethod(function toDry() {

	return {
		value: {
			$options    : this.getCleanOptions(),
			$record     : this.$record,
			$model_name : this.$model_name
		},
		namespace : 'Alchemy.Client.Document',
		dry_class : 'Document'
	};
}, false);

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
 * Store this document in the cache
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function storeInCache(callback) {

	var data;

	// Only do this on the browser
	if (!Blast.isBrowser) {
		return false;
	}

	if (!callback) {
		callback = Function.thrower;
	}

	// Create a dried object out of the data
	data = JSON.toDryObject(this.$main);

	// Add time it was cached
	data.$cache_time = Date.now();

	this.$model._create(data, callback);
});
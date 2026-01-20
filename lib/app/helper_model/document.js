let class_cache = new Map(),
    cache_stores_in_progress,
    did_check = Symbol('did_check');

if (Blast.isBrowser) {
	cache_stores_in_progress = new Map();

	Blast.once('hawkejs_init', function gotScene(hawkejs, variables, settings, renderer) {

		let DocClass,
		    config,
		    field,
		    key;
		
		for (config of hawkejs.scene.exposed.model_info) {
			DocClass = Document.getDocumentClass(config.model_name);

			for (key in config.schema.dict) {
				field = config.schema.dict[key]?.value;

				if (field instanceof Classes.Alchemy.Field.AssociationAlias) {
					DocClass.setAliasGetter(key);
				} else {
					DocClass.setFieldGetter(key);
				}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {string}     key        Name of the property
 * @param    {Function}   getter     Optional getter function
 * @param    {Function}   setter     Optional setter function
 * @param    {boolean}    on_server  Also set on the server implementation
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {string}     key        Name of the property
 * @param    {Function}   method     The method to set
 * @param    {boolean}    on_server  Also set on the server implementation
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
 * Set a getter for this computed field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @param    {string}     name       Name of the property
 * @param    {boolean}    on_server  Also set on the server implementation
 */
Document.setStatic(function setComputedFieldGetter(name, on_server) {
	this.setProperty(name, function getComputedFieldValue() {
		this.recomputeFieldIfNecessary(name);
		return this.$main[name];
	}, function setComputedFieldValue(value) {

		const field = this.$model.schema.getField(name);

		if (field?.options?.allow_manual_set) {
			return this.$main[name] = value;
		}

		console.error('Can not set computed field "' + name + '" to', value);
	}, on_server);
});

/**
 * Set a getter for this field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.4
 *
 * @param    {string}     name     Name of the property
 * @param    {Function}   getter   Optional getter function
 * @param    {Function}   setter   Optional setter function
 * @param    {boolean}    on_server  Also set on the server implementation
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {string}   name
 */
Document.setStatic(function setAliasGetter(name) {

	if (!name) {
		throw new Error('No name given to set on document class ' + JSON.stringify(this.name));
	}

	// Get the descriptor
	let descriptor = Object.getOwnPropertyDescriptor(this.prototype, name);

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.6
 * @version  1.1.0
 *
 * @param    {string}   class_name
 */
Document.setStatic(function getClassForUndry(class_name) {
	return this.getDocumentClass(class_name);
});

/**
 * Create document class for specific model
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.4.0
 *
 * @param    {Function|Object|string}   model_param
 */
Document.setStatic(function getDocumentClass(model_param) {

	if (!model_param) {
		throw new Error('Can not get Hawkejs.Document class for non-existing model');
	}

	let model = typeof model_param == 'function' ? model_param : alchemy.getModel(model_param, false);

	if (!model) {
		throw new Error('There is no model named "' + model_param + '"');
	}

	if (model.is_namespace) {
		return;
	}

	let model_name = model.model_name;

	if (class_cache.has(model_name)) {
		return class_cache.get(model_name);
	}

	// Construct the name of the document class constructor
	let document_name = model.name;

	// Construct the path to this class
	let target_ns = 'Alchemy.Client.Document';
	let doc_path = target_ns;

	if (model.model_namespace) {
		doc_path += '.' + model.model_namespace;
		target_ns += '.' + model.model_namespace;
	}

	doc_path += '.' + document_name;

	// Get the class
	let DocClass = Object.path(Blast.Classes, doc_path);

	if (DocClass == null) {
		let doc_constructor = Function.create(document_name, function DocumentConstructor(record, options) {
			DocumentConstructor.super.call(this, record, options);
		});

		let parent,
		    config;

		if (Blast.isBrowser) {

			let model = Blast.Classes.Alchemy.Client.Model.Model.getClass(model_name);

			if (model && model.super) {
				parent = model.super.model_name;
			}
		} else if (Blast.isNode) {
			config = alchemy.getModel(model_name, false);

			if (config && config.super) {
				config = {
					parent : config.super.model_name
				};
			}
		}

		let parent_path = 'Alchemy.Client.Document';

		if (config && config.parent) {
			parent = config.parent;
		}

		if (parent && parent != 'Model') {
			// Make sure the parent class exists
			let parent_constructor = getDocumentClass(parent);
			parent_path = parent_constructor.namespace + '.' + parent_constructor.name;
		}

		DocClass = Function.inherits(parent_path, target_ns, doc_constructor);

		DocClass.setProperty('$model_name', model_name, null, false);

		// Set the getter for this document alias itself
		DocClass.setAliasGetter(model_name);

		// Set a reference to the Model class
		DocClass.Model = Blast.Classes.Hawkejs.Model.getClass(model_name);
	}

	class_cache.set(document_name, DocClass);

	return DocClass;
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.2.5
 *
 * @param    {Object}           obj
 * @param    {boolean|string}   cloned
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

	if (obj.$hold) {
		result.$_hold = obj.$hold;
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

	if (Blast.isBrowser && obj.$options?.private_fields) {
		let model = alchemy.getModel(obj.$model_name),
		    field;
		
		for (field of obj.$options.private_fields) {

			// @TODO: don't let documents undry before schema is ready?
			if (!model.schema) {
				continue;
			}

			if (model.schema.has(field.name)) {
				continue;
			}

			model.schema.addField(field.name, field.constructor.type_name, field.options);
			model.constructor.Document.setFieldGetter(field.name);
		}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {Object}     obj
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.3
 */
Document.setProperty(function $model() {

	if (!this.$options.model) {
		this.$options.model = this.getModel(this.$model_name, true, {strict_name: true});
	}

	return this.$options.model;
});

/**
 * Get the primary key value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Set some properties to null
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Document.setProperty('$_attributes', null);
Document.setProperty('$_hold', null);
Document.setProperty('$record', null);

/**
 * Internal document-specific data is stored in the $attributes object.
 * This will be used when comparing 2 documents.
 * You normally don't need to access this.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Extra values that will also be sent to the client.
 * These values won't be used when comparing 2 documents
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Document.setProperty(function $hold() {

	if (!this.$_hold) {
		this.$_hold = {};
	}

	return this.$_hold;
});

/**
 * Get the $model_alias name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @type     {string}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.6
 * @version  1.1.0
 *
 * @param    {boolean}
 */
Document.setProperty(function is_new_record() {

	if (!this.$pk) {
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @param    {Object}   other
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @return   {Object}
 */
Document.setMethod(function toDry() {
	return {
		value: {
			$options    : this.getCleanOptions(),
			$record     : this.$record,
			$model_name : this.$model_name,
			$attributes : this.$_attributes,
			$hold       : this.$_hold
		},
		namespace : this.constructor.namespace,
		dry_class : this.constructor.name
	};
}, false);

/**
 * Get the displaytitle of this document, or null
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.13
 * @version  1.3.14
 *
 * @return   {string}
 */
Document.setMethod(function getDisplayTitleOrNull() {

	if (this.$model) {
		return this.$model.getDisplayTitleOrNull(this);
	}

	return null;
});

/**
 * Get the displaytitle of this document
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.13
 * @version  1.3.14
 *
 * @return   {string}
 */
Document.setMethod(function getDisplayTitle() {

	if (this.$model) {
		return this.$model.getDisplayTitle(this);
	}

	return '';
});

/**
 * Actually initialize this instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.4
 * @version  1.3.0
 *
 * @param    {Object}   record
 * @param    {Object}   options
 */
Document.setMethod(function setDataRecord(record, options) {


	// Set the options object first
	this.$options = options || {};

	// Get the name to use of the model
	// (this is no longer $model_name, since a Model instance can use a custom name)
	let name = this.$model_alias;

	// If no record was given, create an empty one
	if (!record) {
		record = {
			[name] : {}
		};
	}

	// If an object was given without being encapsuled,
	// do so now
	if (!record[name]) {
		record = {
			[name] : record
		};
	}

	if (record[name] && !Object.isPlainObject(record[name])) {
		throw new Error('Unable to set "' + name + '" data record, given data is not an object');
	}

	// The original record
	this.$record = record;

	// @TODO: Find a cleaner way of setting these values
	if (record[name].$translated_fields) {
		this.$hold.translated_fields = record[name].$translated_fields;
	}

	if (Blast.isNode && this.constructor.namespace.indexOf('Alchemy.Document') == -1) {
		let delete_field,
		    field,
		    key;

		for (key in this.$main) {
			field = this.$model.schema.get(key);

			if (!field) {
				delete_field = true;
			} else if (field.is_private) {
				delete_field = true;

				if (options.keep_private_fields) {
					delete_field = false;
				}
			} else {
				delete_field = false;
			}

			if (delete_field) {
				delete this.$main[key];
			}
		}

		if (options?.keep_private_fields) {
			let fields = this.$model.schema.getPrivateFields();

			if (fields?.length) {
				options.private_fields = JSON.clone(fields, 'toHawkejs');
			}
		}
	}

	// If this has object fields we need to clone the document already
	if (this.hasObjectFields() && !this.$is_cloned) {
		this.storeCurrentDataAsOriginalRecord();
	}

	// Initialize the document
	if (typeof this.init == 'function') {
		this.init();
	}
});

/**
 * Get the translated document for the given prefix with only the given field
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {string}   field_name
 * @param    {string}   prefix
 */
Document.setMethod(async function getTranslatedDocumentOfPrefix(field_name, prefix) {

	const model = this.$model;

	let crit = model.find();
	crit.setOption('locale', prefix);
	crit.select(field_name);
	crit.where(model.primary_key, this.$pk);

	let doc = await model.find('first', crit);

	return doc;
});

/**
 * Get the translated value of a certain field.
 * If this document has already been translated, a new instance will be queried
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.10
 *
 * @param    {string}   prefix
 */
Document.setMethod(async function getTranslatedValueOfField(field_name, prefix) {
	let doc = await this.getTranslatedDocumentOfPrefix(field_name, prefix);
	return doc?.[field_name];
});

/**
 * Get the translated value of a certain field.
 * If this document has already been translated, a new instance will be queried
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {string}   prefix
 */
Document.setMethod(async function getTranslatedValueOfFieldForRoute(field_name, prefix) {
	let doc = await this.getTranslatedDocumentOfPrefix(field_name, prefix);
	return doc?.[field_name];
});

/**
 * Refresh the values
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Document.setMethod(async function refreshValues() {

	let new_doc = await this.$model.findByPk(this.$pk);

	if (new_doc) {
		this.$record = new_doc.$record;
		this.storeCurrentDataAsOriginalRecord();
	}

});

/**
 * Set the values
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   values
 */
Document.setMethod(function setValues(values) {

	var key;

	for (key in values) {
		this.$main[key] = values[key];
	}

});

/**
 * Recompute the given field if required
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @param    {string|Alchemy.Field}   name
 * @param    {boolean}                force
 *
 * @return   {Pledge|undefined}
 */
Document.setMethod(function recomputeFieldIfNecessary(name, force = false) {

	const field = this.$model.schema.getField(name),
	      original = this.$main[name];

	if (!field) {
		return original;
	}

	let options = field.options;

	if (!options.compute_method) {
		return original;
	}

	let required_field_count = options.required_fields?.length || 0,
	    optional_field_count = options.optional_fields?.length || 0;

	if (!force && original == null) {
		// If the value is null, it hasn't been computed yet
		// and we need to compute it
		force = true;
	}

	if (!force) {
		let has_changed = false;

		if (required_field_count) {
			for (let required_field of options.required_fields) {
				if (this.hasChanged(required_field)) {
					has_changed = true;
					break;
				}
			}
		}

		if (!has_changed && optional_field_count) {
			for (let optional_field of options.optional_fields) {
				if (this.hasChanged(optional_field)) {
					has_changed = true;
					break;
				}
			}
		}

		if (!has_changed) {
			return original;
		}
	}

	// Make sure the required fields are set
	if (required_field_count) {
		let has_value = true;

		for (let required_field of options.required_fields) {
			if (this[required_field] == null) {
				has_value = false;
				break;
			}
		}

		if (!has_value) {
			// If not all required field values are set,
			// the result will also be undefined
			return this._setComputedFieldValue(name, undefined);
		}
	}

	let compute_method = options.compute_method;

	if (typeof compute_method == 'string') {
		let fnc = this[compute_method];

		if (typeof fnc == 'function') {
			compute_method = fnc;
		} else {
			// Handle special cases in the browser
			compute_method = alchemy.getCustomHandler('recompute_field');
		}
	}

	if (!compute_method) {
		return original;
	}

	let result = compute_method.call(this, this, field);

	return this._setComputedFieldValue(name, result);
});

/**
 * Set a computed field to a specific value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.4.0
 *
 * @param    {string|Alchemy.Field}   name
 * @param    {*}                      value
 *
 * @return   {Pledge|undefined}
 */
Document.setMethod(function _setComputedFieldValue(name, value) {

	const field = this.$model.schema.getField(name);

	if (value == null && field?.options?.allow_manual_set) {
		return this.$main[name];
	}

	if (Pledge.isThenable(value)) {
		value = value.then(value => this.$main[name] = value);
	} else {
		this.$main[name] = value;
	}

	return value;
});

/**
 * Recompute values of computed fields.
 * This might be async. If it is, a pledge will be returned.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.4.0
 *
 * @return   {Pledge|undefined}
 */
Document.setMethod(function recomputeValues() {

	const schema = this.$model.schema;

	if (!schema.has_computed_fields) {
		return;
	}

	let promises = [];

	for (let key in schema.computed_fields) {
		let field = schema.computed_fields[key];
		let options = field.options;

		// Make sure the required fields are set
		if (options.required_fields?.length) {
			let has_value = true;

			for (let required_field of options.required_fields) {
				if (this[required_field] == null) {
					has_value = false;
					break;
				}
			}

			if (!has_value) {
				// If not all required field values are set,
				// the result will also be undefined
				this._setComputedFieldValue(key, undefined);
				continue;
			}
		}

		let compute_method = options.compute_method;

		if (typeof compute_method == 'string') {
			let fnc = this[compute_method];
	
			if (typeof fnc == 'function') {
				compute_method = fnc;
			} else {
				// Handle special cases in the browser
				compute_method = alchemy.getCustomHandler('recompute_field');
			}
		}
	
		if (!compute_method) {
			continue;
		}

		let result = compute_method.call(this, this, field);
		result = this._setComputedFieldValue(key, result);

		if (Pledge.isThenable(result)) {
			promises.push(result);
		}
	}

	if (promises.length) {
		return Pledge.all(promises);
	}
});

/**
 * Get the clean options
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {Object}    data
 * @param    {Function}  callback
 *
 * @return   {Pledge}
 */
Document.setMethod(function save(data, options, callback) {

	var that = this,
	    sub_pledge,
	    pk_name,
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
	}

	if (this.$model) {
		pk_name = this.$model.primary_key;
	}

	pledge.done(callback);

	if (!pk_name) {
		pledge.reject(new Error('Unable to find primary key name'));
		return pledge;
	}

	function updateDoc(err, save_result) {

		if (err) {
			return pledge.reject(err);
		}

		if (that.$attributes.creating) {
			that.$attributes.creating = false;
		}

		save_result = save_result[0];

		// Use the saved data from now on
		that.$main = save_result.$main;

		// Unset the changed-status
		that.$attributes.original_record = undefined;
		that.markUnchanged();

		if (that.hasObjectFields()) {
			that.storeCurrentDataAsOriginalRecord();
		}

		pledge.resolve(that);
	}

	if (data && data != main) {
		let key;

		// _id should never be updated
		if (data && data[pk_name] && data != main) {
			delete data[pk_name];
		}

		for (key in data) {
			if (main[key] !== data[key]) {
				this.markChangedField(key, data[key]);
				main[key] = data[key];
			}
		}

		data[pk_name] = main[pk_name];
		use_data = true;
	}

	if (Blast.isBrowser) {

		// If no objectid exists, create one now
		if (!this[pk_name]) {
			this[pk_name] = Blast.createObjectId();
			this.$attributes.creating = true;

			if (!options) {
				options = {};
			}

			options.create = true;
		}
	}

	sub_pledge = this.$model.save(this, options, updateDoc);

	return pledge;
});

/**
 * Check and do a datasource inform
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
			local = await that.getLocalVersion();
		} catch (err) {
			console.log(err);
			return next();
		}

		return next(null, local);

	}, function saveIfNoLocal(next, local) {

		if (local) {
			if (local.$main && local.$main._$local_save_time > that.updated) {
				return next();
			}
		}

		// We set "create" to false, so an update is forced.
		// This is kind of wrong, because it could still be made required to
		// be created on this cache datasource. But the idb_datasource uses "put", so...
		let options = {
			create: false
		};

		if (local && local._$needs_remote_save) {
			options.local_save = true;
		}

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.4
 * @version  1.3.1
 */
Document.setMethod(function storeCurrentDataAsOriginalRecord() {
	try {
		this.$attributes.original_record = JSON.clone(this.$main);
	} catch (err) {
		alchemy.distinctProblem('store_current_data_error', err.message, {error: err});
	}
});

/**
 * Mark the given field as changed
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.4
 * @version  1.1.0
 *
 * @param    {string}   field_name   The name of the field that changed
 * @param    {Mixed}    value        The new value of the field
 */
Document.setMethod(function markChangedField(field_name, value) {

	// Copy the original record if not done so yet
	if (!this.$attributes.original_record) {
		this.storeCurrentDataAsOriginalRecord();
	}

	this.$attributes.changed = true;
	this.$attributes.changed_time = Date.now();
	this.$attributes.validated = false;
	this.$attributes.validated_time = null;
});

/**
 * Mark the document as being unchanged
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Document.setMethod(function markUnchanged() {
	this.$attributes.changed = false;
});

/**
 * Does this document need saving?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @return   {boolean}
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.4
 * @version  1.0.4
 *
 * @return   {boolean}
 */
Document.setMethod(function hasObjectFields() {
	// @TODO: implement schema checks
	return true;
});

/**
 * Does this document have a value for the given field?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {string}   name   The field name
 *
 * @return   {boolean}
 */
Document.setMethod(function hasFieldValue(name) {
	return Object.hasProperty(this.$main, name);
});

/**
 * Has this document changed since it was created?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.4
 * @version  1.3.0
 *
 * @param    {string}   name   The optional field name
 *
 * @return   {boolean}
 */
Document.setMethod(function hasChanged(name) {

	// If no setter ever fired and there are no object/array fields, assume nothing changed.
	// For documents with object/array fields, hasObjectFields() returns true,
	// so we fall through to the Object.alike() deep comparison below.
	if (!this.$attributes.changed && !this.hasObjectFields()) {
		return false;
	}

	// When we have nothing to compare to, assume false
	if (!this.$attributes.original_record) {
		return false;
	}

	let result;

	// If we only want to check a single field
	if (name) {
		let current_value,
		    old_value;
		
		if (name.includes('.')) {
			current_value = Object.path(this, name);
			old_value = Object.path(this.$attributes.original_record, name);
		} else {
			current_value = this[name];
			old_value = this.$attributes.original_record[name];
		}

		result = !Object.alike(old_value, current_value);
	} else {

		let key;

		for (key in this.$attributes.original_record) {
			if (!Object.alike(this.$attributes.original_record[key], this[key])) {
				// @TODO: some special fields always end up being different
				result = true;
				break;
			}
		}

		if (!result) {
			for (key in this.$main) {
				if (!Object.alike(this.$main[key], this.$attributes.original_record[key])) {
					result = true;
					break;
				}
			}
		}
	}

	if (result) {
		this.markChangedField();
		return true;
	}

	if (!name) {
		// We can mark the attribute as false again
		this.markUnchanged();
	}

	return false;
});

/**
 * Has this document beel validated?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {boolean}
 */
Document.setMethod(function hasValidated() {
	return this.$attributes.validated;
});

/**
 * Reset this document to the initial values
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Keep these fields, and remove the others
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Document.setMethod(function keepFields(fields) {

	let field_name;

	for (field_name in this.$main) {
		if (fields.indexOf(field_name) == -1) {
			this.$main[field_name] = null;
		}
	}
});

/**
 * Get a list of possible validation violations
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Promise}
 */
Document.setMethod(function getViolations() {
	if (!this.$model || !this.$model.schema) {
		throw new Error('No schema found, unable to validate document');
	}

	return this.$model.schema.getViolations(this);
});

/**
 * Validate the document, throws an error if it fails
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.1.0
 *
 * @return   {Promise}
 */
Document.setMethod(async function validate() {

	let violations = await this.getViolations();

	if (violations) {
		throw violations;
	}

	return true;
});

// Don't load next methods on the server
if (Blast.isNode) {
	return;
}

/**
 * Get the local version of this document, if it exists
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.6
 * @version  1.4.0
 *
 * @return   {Pledge}
 */
Document.setMethod(function getLocalVersion() {

	const that = this;

	let crit = this.$model.find();
	crit.where('_id').equals(this._id);
	crit.setOption('only_local', true);

	let pledge = new Pledge();

	let context = new Classes.Alchemy.OperationalContext.ReadDocumentFromDatasource();
	context.setDatasource(this.$model.datasource);
	context.setModel(this.$model);
	context.setCriteria(crit);

	Pledge.Swift.done(this.$model.datasource.read(context), function done(err, result) {

		if (err) {
			return pledge.reject(err);
		}

		if (result.items && result.items.length) {
			result = that.$model.createDocument(result.items[0]);
		} else {
			result = null;
		}

		pledge.resolve(result);
	});

	return pledge;
});

/**
 * Get the local version of this document, if it exists
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
/**
 * The Document class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {Object}   record   A record containing the main & related data
 * @param    {Object}   options
 */
var Document = Function.inherits('Alchemy.Base', function Document(record, options) {

	var item,
	    i;

	// If no record was given, create an empty one
	if (!record) {
		record = {};
		record[this.$model_name] = {};
	}

	// If an object was given without being encapsuled,
	// do so now
	if (!record[this.$model_name]) {
		record = {
			[this.$model_name] : record
		};
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
 * Create document class for specific model
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {Model|String}   model_param
 */
Document.setStatic(function getDocumentClass(model_param) {

	var doc_constructor,
	    document_name,
	    parent_path,
	    model_name,
	    namespace,
	    doc_path,
	    DocClass,
	    model,
	    alias;

	if (typeof model_param == 'function') {
		model = model_param;
	} else {
		model = Model.get(model_param, false);
	}

	if (!model) {
		throw new Error('There is no model named "' + model_param + '"');
	}

	// Unfortunately we need the model_name right now,
	// though sometimes it's set in the future.
	// This happens when we need to do a setDocumentMethod
	if (model.prototype.name) {
		model_name = model.prototype.name;
	} else {
		model_name = model.name.beforeLast('Model');
	}

	// Make sure we got a model name
	if (!model_name) {
		throw new Error('Tried to get nameless document class');
	}

	// Get the namespace
	namespace = model.constructor.namespace;

	// Get the name of the document class
	document_name = model.name + 'Document';

	if (namespace) {
		doc_path = namespace + '.' + document_name;
	} else {
		doc_path = document_name;
	}

	// Get the document class
	DocClass = Object.path(Classes.Alchemy, doc_path);

	if (DocClass == null) {

		// Create the document constructor function
		doc_constructor = Function.create(document_name, function med(data, options) {
			med.wrapper.super.call(this, data, options);
		});

		if (!model.super || model.super.name == 'Model') {
			parent_path = 'Alchemy.Document';
		} else {
			parent_path = model.super.Document.prototype.path_to_class;
		}

		if (namespace) {
			DocClass = Function.inherits(parent_path, namespace, doc_constructor);
		} else {
			DocClass = Function.inherits(parent_path, doc_constructor);
		}

		// Set the getter for this document alias itself
		DocClass.setAliasGetter(model_name);

		// Set the model name
		DocClass.setProperty('$model_name', model_name);

		// Set the path to this document
		DocClass.setProperty('path_to_class', 'Alchemy.' + doc_path);

		// Set association getters
		for (alias in model.blueprint.associations) {
			DocClass.setAliasGetter(alias);
		}
	}

	return DocClass;
});

/**
 * Get the client-side document class
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   model_name
 */
Document.setStatic(function getClientDocumentClass(model_name) {

	if (!model_name) {
		model_name = this.prototype.$model_name;
	}

	return Classes.Hawkejs.Document.getDocumentClass(model_name);
});

/**
 * Set the getter for this field
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}     name     Name of the property
 * @param    {Function}   getter   Optional getter function
 * @param    {Function}   setter   Optional setter function
 */
Document.setStatic(function setFieldGetter(name, getter, setter) {

	if (typeof getter != 'function') {
		getter = function getFieldValue() {
			return this.$main[name];
		};

		setter = function setFieldValue(value) {
			if (!this.$main) {
				console.log('No $main in', this);
			}
			this.$main[name] = value;
		};
	} else {
		this.setProperty('hasCustomField', true);

		if (!this.$custom_fields) {
			this.setStatic('$custom_fields', {});
		}

		// Store the custom fields getter for JSON stuff
		this.$custom_fields[name] = name;
	}

	this.setProperty(name, getter, setter);
});

/**
 * Set the getter for an alias
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
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
	});
});

/**
 * Get the model instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Document.setProperty(function $model() {

	if (!this.$options.model) {
		this.$options.model = this.getModel(this.$model_name);
	}

	return this.$options.model;
});

/**
 * Get the conduit instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.3
 * @version  1.0.0
 */
Document.setProperty(function conduit() {
	if (this.$conduit) {
		return this.$conduit;
	}

	if (this.$model) {
		return this.$model.conduit;
	}
}, function setConduit(conduit) {
	this.$conduit = conduit;
});

/**
 * Clone this document
 * @todo: more speed, custom properties, singularized?
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Document.setMethod(function clone() {
	return this.dryClone();
});

/**
 * Clone this document for JSON-dry
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Document}
 */
Document.setMethod(function dryClone(wm) {

	var record,
	    result;

	// Clone the records using JSON-dry
	record = JSON.clone(this.$record, wm);

	// Create a new document
	result = new this.constructor(record, JSON.clone(this.$options, wm));

	return result;
});

/**
 * Simplify the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Object}
 */
Document.setMethod(function toHawkejs(wm) {

	var DocClass,
	    record,
	    result;

	// Clone the record first
	record = JSON.clone(this.$record, wm);

	// Get the client-side Document class
	DocClass = this.constructor.getClientDocumentClass();

	// And create a Hawkejs Document
	result = new DocClass(record);

	return result;
});

/**
 * Return the basic record for JSON
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Document.setMethod(function toJSON() {

	var that = this,
	    records = this._records,
	    result,
	    temp,
	    i;

	return this.$record;

	// Custom fields can be very time consuming
	if (this.hasCustomField) {
		// Clone the base records
		// @todo: get faster method
		records = JSON.clone(records);

		// Iterate over each document
		this.forEach(function eachDocument(document, index) {

			var key;

			for (key in that.constructor.$custom_fields) {
				records[index][that.$model_name][key] = document[key];
			}
		});
	}

	// If it's not singular and it hasn't been made singular,
	// use the entire array
	if (!this._options.singular && !this._madeSingular) {
		result = records;
	} else {
		// If it hasn't been made singular, return the first value
		if (!this._madeSingular) {
			result = records[0];
		} else {
			// Return the iterator index value
			result = records[this._iterNextIndex];
		}
	}

	if (this._options.associated) {

		if (this._options.singular || this._madeSingular) {
			result = result[this.$model_name];
		} else if (result) {
			temp = result;
			result = new Array(temp.length);

			for (i = 0; i < temp.length; i++) {
				result[i] = temp[i][this.$model_name];
			}
		}
	}

	return result;
});

/**
 * Return the array to util.inspect
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
Document.setMethod(function inspect(depth) {
	return this.toJSON();
});

/**
 * Get a record field property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}   alias   Optional alias
 * @param    {String}   field
 *
 * @return   {Mixed}
 */
Document.setMethod(function get(alias, field) {

	if (field == null) {
		field = alias;
		alias = this.$model_name;
	}

	if (this.$record && this.$record[alias]) {
		return this.$record[alias][field];
	}
});

/**
 * Set an alias object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}   alias
 * @param    {Object}   obj
 *
 * @return   {Mixed}
 */
Document.setMethod(function setAlias(alias, obj) {

	this.$record[alias] = obj;

	// Make sure a getter is set for this alias
	if (!Object.getOwnPropertyDescriptor(this, alias)) {
		Object.defineProperty(this, alias, {
			get: function getManualAlias() {
				return this.$record[alias];
			}
		});
	}
});

/**
 * Alias for save
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Object}    data
 * @param    {Function}  callback
 */
Document.setMethod(function update(data, callback) {
	this.save(data, callback);
});

/**
 * Save the updates to the record
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 *
 * @param    {Object}    data
 * @param    {Function}  callback
 */
Document.setMethod(function save(data, options, callback) {

	var that = this,
	    main = this.$main;

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

	function updateDoc(err, saveResult) {

		if (err) {
			return callback(err, []);
		}

		// `saveResult` is actually the `toDatasource` value
		// We can't assign that again, because it's sometimes normalized!
		// @TODO: make save & update return non-normalized data
		//Object.assign(main, saveResult[0][that.modelName]);

		// While we're waiting for past me to finish the todo above,
		// we really need an _id value
		main._id = alchemy.castObjectId(saveResult[that.$model_name]._id);

		return callback(null, that);
	}

	if (data) {

		// _id should never be updated
		if (data && data._id && data != main) {
			delete data._id;
		}

		Object.assign(main, data);

		data._id = main._id;

		this.model.save(data, options, updateDoc);
	} else {
		this.model.save(main, options, updateDoc);
	}

	// @todo: updates to the object directly
});

/**
 * Remove this document
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.4.1
 * @version  0.4.1
 *
 * @param    {Function}  callback
 */
Document.setMethod(function remove(callback) {

	if (!callback) {
		callback = Function.thrower;
	}

	if (!this._id) {
		return callback(new Error('No record to remove'));
	}

	this.model.remove(this._id, callback);
});

/**
 * Add associated data to this record
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Document.setMethod(function addAssociatedData(callback) {

	var that  = this,
	    model = this.$model;

	model.addAssociatedDataToRecord({}, {
		associations: model.blueprint.associations
	}, this.$record, callback);
});

/**
 * Get the display field value
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Object}   options
 *
 * @return   {String}
 */
Document.setMethod(function getDisplayFieldValue(options) {

	var display_field,
	    result,
	    i;

	if (!options) {
		options = {};
	}

	display_field = Array.cast(this.$model.displayField);

	// If there are fields we prefer, check those first
	if (options.prefer) {
		display_field = Array.cast(options.prefer).concat(display_field);
	}

	for (i = 0; i < display_field.length; i++) {
		result = this[display_field[i]];

		if (result) {
			result = alchemy.pickTranslation(undefined, result).result;

			if (result) {
				return result;
			}
		}
	}

	// If nothing was found, return the _id value
	return String(this._id);
});
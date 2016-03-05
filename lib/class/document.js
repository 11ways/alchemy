/**
 * The Document class
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
var Document = Function.inherits(['Iterator', 'Array', 'Informer'], function Document(record, options) {

	var item,
	    i;

	if (!record) {
		item = {};
		item[this.modelName] = {};
		record = [item];
	}

	if (!Array.isArray(record)) {
		record = Array.cast(record);
		this.length = record.length;
		this.available = record.length;
		this._arrayOrigin = false;
	} else {
		this.length = record.length;
		this.available = record.available || this.length;
		this._arrayOrigin = true;
	}

	this._options = options || {};

	this._model = this._options.model;

	// The array of records
	this._records = record;

	// Set the iterator subject
	this._iterSubject = record;

	for (i = 0; i < record.length; i++) {

		if (!record[i][this.modelName]) {
			item = {};
			item[this.modelName] = record[i];
			record[i] = item;
		}

		// Make it available under this index number
		this[i] = record[i];
	}
});

/**
 * Create document class for specific model
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Model|String}   model_param
 */
Document.setStatic(function getDocumentClass(model_param) {

	var doc_constructor,
	    document_name,
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
	DocClass = Object.path(alchemy.classes, doc_path);

	if (DocClass == null) {

		// Create the document constructor function
		doc_constructor = Function.create(document_name, function med(data, options) {
			med.wrapper.super.call(this, data, options);
		});

		if (namespace) {
			DocClass = Function.inherits('Document', namespace, doc_constructor);
		} else {
			DocClass = Function.inherits('Document', doc_constructor);
		}

		// Set the getter for this document alias itself
		DocClass.setAliasGetter(model_name);

		// Set the model name
		DocClass.setProperty('modelName', model_name);

		// Set association getters
		for (alias in model.blueprint.associations) {
			console.log('Setting alias', alias);
			DocClass.setAliasGetter(alias);
		}
	}

	return DocClass;
});

/**
 * Set the getter for this field
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}     name     Name of the property
 * @param    {Function}   getter   Optional getter function
 * @param    {Function}   setter   Optional setter function
 */
Document.setStatic(function setFieldGetter(name, getter, setter) {

	// Don't overwrite an already set property
	if (this.prototype[name] != null) {
		return;
	}

	if (typeof getter != 'function') {
		getter = function getFieldValue() {

			if (!this.length) {
				return;
			}

			return this._records[this._iterNextIndex][this.modelName][name];
		};

		setter = function setFieldValue(value) {
			this._records[this._iterNextIndex][this.modelName][name] = value;
		};
	} else {
		this.setProperty('hasCustomField', true);

		if (!this._custom_fields) {
			this.setStatic('_custom_fields', {});
		}

		// Store the custom fields getter for JSON stuff
		this._custom_fields[name] = name;
	}

	this.setProperty(name, getter, setter);
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
		return this._records[this._iterNextIndex] && this._records[this._iterNextIndex][name];
	});
});

/**
 * Get the model instance
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setProperty(function model() {

	if (!this._model) {
		this._model = this.getModel(this.modelName);
	}

	return this._model;
});

/**
 * Clone this document
 * @todo: more speed, custom properties, singularized?
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function clone() {
	return this.dryClone();
});

/**
 * Clone this document for JSON-dry
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Document}
 */
Document.setMethod(function dryClone(wm) {

	var records,
	    result;

	// Clone the records using JSON-dry
	records = JSON.clone(this._records, wm);

	// Create a new document
	result = new this.constructor(records, JSON.clone(this._options, wm));

	return result;
});

/**
 * Return the basic record for JSON
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function toJSON() {

	var that = this,
	    records = this._records,
	    result,
	    temp,
	    i;

	// Custom fields can be very time consuming
	if (this.hasCustomField) {
		// Clone the base records
		// @todo: get faster method
		records = JSON.clone(records);

		// Iterate over each document
		this.forEach(function eachDocument(document, index) {

			var key;

			for (key in that.constructor._custom_fields) {
				records[index][that.modelName][key] = document[key];
			}
		});
	}

	if (this._arrayOrigin && !this._options.singular && !this._madeSingular) {
		result = records;
	} else {
		if (!this._madeSingular) {
			result = records[0];
		} else {
			result = records[this._iterNextIndex];
		}
	}

	if (this._options.associated) {

		if (this._options.singular || this._madeSingular) {
			result = result[this.modelName];
		} else if (result) {
			temp = result;
			result = new Array(temp.length);

			for (i = 0; i < temp.length; i++) {
				result[i] = temp[i][this.modelName];
			}
		}
	}

	return result;
});

/**
 * Return the array to util.inspect
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function inspect(depth) {
	return this.toJSON();
});

/**
 * Get a record field property
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
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
		alias = this.modelName;
	}

	if (this._records[this._iterNextIndex] && this._records[this._iterNextIndex][alias]) {
		return this._records[this._iterNextIndex][alias][field];
	}
});

/**
 * Set an alias object
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   alias
 * @param    {Object}   obj
 *
 * @return   {Mixed}
 */
Document.setMethod(function setAlias(alias, obj) {

	this._records[this._iterNextIndex][alias] = obj;

	// Make sure a getter is set for this alias
	if (!Object.getOwnPropertyDescriptor(this, alias)) {
		Object.defineProperty(this, alias, {
			get: function getManualAlias() {
				return this._records[this._iterNextIndex][alias];
			}
		});
	}
});

/**
 * Alias for save
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}    data
 * @param    {Function}  callback
 */
Document.setMethod(function save(data, callback) {

	var that = this,
	    main = this._records[this._iterNextIndex][this.modelName];

	if (typeof data === 'function') {
		callback = data;
		data = null;
	} else if (typeof callback != 'function') {
		callback = Function.thrower;
	}

	function updateDoc(err, saveResult) {

		if (err) {
			return callback(err, []);
		}

		Object.assign(main, saveResult[0][that.modelName]);

		return callback(null, that);
	}

	if (data) {

		// _id should never be updated
		if (data && data._id) {
			delete data._id;
		}

		Object.assign(main, data);

		data._id = main._id;

		this.model.save(data, updateDoc);
	} else {
		this.model.save(main, updateDoc);
	}

	// @todo: updates to the object directly
});

/**
 * Get current document
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Object}
 */
Document.setMethod(function current() {
	return this._records[this._iterNextIndex] || {};
});

/**
 * Iterate over the entries
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function forEach(fnc) {

	var temp,
	    i;

	for (i = 0; i < this.length; i++) {

		// Create augmented object
		temp = Object.create(this);

		temp._iterNextIndex = i;
		temp._madeSingular = true;

		// Call the function with that object
		fnc(temp, i);
	}
});

/**
 * Sort the records
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Document}
 */
Document.setMethod(function sortByPath(order, paths) {

	var i;

	if (paths == null) {
		paths = Array.cast(order);
		order = -1;
	} else {
		paths = Array.cast(paths);
	}

	for (i = 0; i < paths.length; i++) {

		if (paths[i].indexOf('.') > -1) {
			continue;
		}

		if (!paths[i].startsWith(this.modelName)) {
			paths[i] = this.modelName + '.' + paths[i];
		}
	}

	Array.prototype.sortByPath.call(this._records, order, paths);
	Object.assign(this, this._records);

	return this;
});

/**
 * Push elements onto the array
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Number}
 */
Document.setMethod(function push() {

	var length = this.length,
	    elements,
	    element,
	    arg,
	    i,
	    j;

	for (i = 0; i < arguments.length; i++) {
		arg = arguments[i];

		if (arg.length) {
			elements = arg;
		} else {
			elements = [arg];
		}

		for (j = 0; j < elements.length; j++) {
			element = elements[j];

			if (element[this.constructor.name]) {
				push.super.call(this, element[this.constructor.name]);
				this._records.push(element[this.constructor.name]);
			} else {
				push.super.call(this, element);
				this._records.push(element);
			}
		}
	}

	return length;
});

/**
 * Add associated data to this record
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function addAssociatedData(callback) {

	var that  = this,
	    model = this.model,
	    tasks = [],
	    i;

	this._records.forEach(function eachRecord(record, index) {
		tasks.push(function addAssocData(next) {
			model.addAssociatedDataToRecord({}, {associations: model.blueprint.associations}, record, next);
		});
	});

	Function.parallel(tasks, callback);
});
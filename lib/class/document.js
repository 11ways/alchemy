/**
 * The Document class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}   record   A record containing the main & related data
 * @param    {Object}   options
 */
var Document = Function.inherits('Iterator', 'Array', 'Informer', function Document(record, options) {

	var item,
	    i;

	if (!Array.isArray(record)) {
		record = Array.cast(record);
		this._arrayOrigin = false;
		this.available = record.length;
	} else {
		this._arrayOrigin = true;
		this.available = record.available || this.length;
	}

	this._options = options || {};

	this._model = this._options.model;

	this.length = record.length;

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
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Model}   model
 */
Document.setStatic(function getDocumentClass(model) {

	var name = model.name + 'Document',
	    DocClass,
	    alias;

	DocClass = alchemy.classes[name];

	if (DocClass == null) {
		DocClass = Function.inherits('Document', Function.create(name, function med(data, options) {
			med.wrapper.super.call(this, data, options);
		}));

		if (model.prototype.name) {
			// Set the getter for this document alias itself
			DocClass.setAliasGetter(model.prototype.name);

			// Set the model name
			DocClass.setProperty('modelName', model.prototype.name);
		}

		// Set association getters
		for (alias in model.blueprint.associations) {
			DocClass.setAliasGetter(alias);
		}
	}

	return DocClass;
});

/**
 * Set the getter for this field
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
Document.setStatic(function setFieldGetter(name) {

	// Don't overwrite an already set property
	if (this.prototype[name] != null) {
		return;
	}

	this.setProperty(name, function getFieldValue() {

		if (!this.length) {
			return;
		}

		return this._records[this._iterNextIndex][this.modelName][name];
	});
});

/**
 * Set the getter for an alias
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   name
 */
Document.setStatic(function setAliasGetter(name) {

	// Don't overwrite an already set property
	if (this.prototype[name] != null) {
		return;
	}

	this.setProperty(name, function getAliasObject() {
		return this._records[this._iterNextIndex][name];
	});
});

/**
 * Return the basic record for JSON
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function toJSON() {

	var result,
	    temp,
	    i;

	if (this._arrayOrigin && !this._options.singular && !this._madeSingular) {
		result = this._records;
	} else {
		if (!this._madeSingular) {
			result = this._records[0];
		} else {
			result = this._records[this._iterNextIndex];
		}
	}

	if (this._options.associated) {

		if (this._options.singular || this._madeSingular) {
			result = result[this.modelName];
		} else {
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
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function inspect(depth) {
	return this.toJSON();
});

/**
 * Get a record field property
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
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
 * @author   Jelle De Loecker <jelle@kipdola.be>
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
 * Save the updates to the record
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Object}    data
 * @param    {Function}  callback
 */
Document.setMethod(function save(data, callback) {

	var main = this._records[this._iterNextIndex][this.modelName];

	if (typeof data === 'function') {
		callback = data;
		data = null;
	}

	if (data) {

		// _id should never be updated
		if (data._id) {
			delete data._id;
		}

		Object.assign(main, data);

		data._id = main._id;

		this._model.save(data, callback);
	}

	// @todo: updates to the object directly
});

/**
 * Get current document
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
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
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function forEach(fnc) {

	var temp,
	    i;

	for (i = 0; i < this.length; i++) {

		// Create augmented object
		temp = Object.create(this, {
			_iterNextIndex: {writable: false, configurable: false, value: i},
			_madeSingular: {writable: false, configurable: false, value: true}
		});

		// Call the function with that object
		fnc(temp, i);
	}
});

/**
 * Sort the records
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
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
 * Add associated data to this record
 *
 * @author   Jelle De Loecker <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Document.setMethod(function addAssociatedData(callback) {

	var that  = this,
	    model = this._model || Model.get(this.modelName),
	    tasks = [],
	    i;

	this._records.forEach(function eachRecord(record, index) {
		tasks.push(function addAssocData(next) {
			model.addAssociatedDataToRecord({}, {associations: model.blueprint.associations}, record, next);
		});
	});

	Function.parallel(tasks, callback);
});
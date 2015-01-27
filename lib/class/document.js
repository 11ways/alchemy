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

	this.length = record.length;

	// The array of records
	this._records = record;

	// Set the iterator subject
	this._iterSubject = record;

	for (i = 0; i < record.length; i++) {

		// Make it available under this index number
		this[i] = record[i];

		if (!record[i][this.modelName]) {
			item = {};
			item[this.modelName] = record[i];
			record[i] = item;
		}
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
	    DocClass;

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

	var result;

	if (this._arrayOrigin && !this._options.singular) {
		result = this._records;
	} else {
		result = this._records[0];
	}

	if (this._options.associated) {
		result = result[this.modelName];
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
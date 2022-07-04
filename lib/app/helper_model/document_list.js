/**
 * The Document List class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.3
 *
 * @param    {Object}   record   A record containing the main & related data
 * @param    {Object}   options
 */
var DocumentList = Function.inherits(['Alchemy.Client.Base', 'Array'], 'Alchemy.Client', function DocumentList(records, options) {
	this.initData(records, options);
});

/**
 * Get the length
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Number}
 */
DocumentList.setProperty(function length() {
	return this.records.length;
});

/**
 * Get the page number
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @return   {Number}
 */
DocumentList.setProperty(function page() {
	if (this.options && this.options.options) {
		return this.options.options.page;
	}
});

/**
 * Get the page size
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @return   {Number}
 */
DocumentList.setProperty(function page_size() {
	if (this.options && this.options.options) {
		return this.options.options.page_size;
	}
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.3
 *
 * @param    {Object}   obj
 *
 * @return   {Hawkejs.DocumentList}
 */
DocumentList.setStatic(function unDry(obj) {
	var result = new this(obj.records, obj.options);

	if (obj.available != null) {
		result.available = obj.available;
	}

	return result;
});

/**
 * Init the data
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @param    {Array}    records
 * @param    {Object}   options
 */
DocumentList.setMethod(function initData(records, options) {

	if (records == null) {
		records = [];
	}

	// Store the options
	this.options = options || {};

	// Add all the entries to this instance
	Object.assign(this, records);

	// Also keep a reference to the original array
	this.records = records;

	// Store the amount of available records
	this.available = records.available || this.length;

});

/**
 * Iterator method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
DocumentList.setMethod(Symbol.iterator, function* iterate() {

	var i;

	for (i = 0; i < this.records.length; i++) {
		yield this.records[i];
	}
});

/**
 * Create an old-style iterator
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {Iterator}
 */
DocumentList.setMethod(function createIterator() {
	return new Blast.Classes.Iterator(this.records);
});

/**
 * Return an object for json-drying this list
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.2.3
 *
 * @return   {Object}
 */
DocumentList.setMethod(function toDry() {

	let options;

	if (this.options) {
		let key;

		options = {};

		for (key in this.options) {
			if (key == 'options' || key == 'assoc_cache') {
				continue;
			}

			options[key] = this.options[key];
		}
	}

	return {
		value: {
			options    : options,
			records    : this.records,
			available  : this.available,
		}
	};
});

/**
 * Simplify the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.3
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Object}
 */
DocumentList.setMethod(function toHawkejs(wm) {

	let records = JSON.clone(this.records, 'toHawkejs', wm),
	    result = new Blast.Classes.Alchemy.Client.DocumentList(records);

	if (this.options && this.options.options) {
		let options = JSON.clone(this.options.options, 'toHawkejs', wm);
		result.options = {options: options};
	}

	return result;
});

/**
 * Return a new array with the records
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.3
 *
 * @param    {Array|Object}
 *
 * @return   {Array}
 */
DocumentList.setMethod(function toArray(options) {

	if (!options) {
		return this.records.slice(0);
	}

	return this.toSimpleArray(options);
});

/**
 * Return a simple list of the main data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @param    {Array|Object}   options
 *
 * @return   {Array}
 */
DocumentList.setMethod(function toSimpleArray(options) {

	var result = [],
	    entry,
	    field,
	    temp,
	    i,
	    j;

	if (Array.isArray(options)) {
		options = {
			fields: options
		};
	}

	for (i = 0; i < this.length; i++) {
		entry = this[i];
		temp = {};

		if (options.fields) {
			for (j = 0; j < options.fields.length; j++) {
				field = options.fields[j];

				temp[field] = entry[field];
			}

			result.push(temp);
		} else {
			result.push(entry.$main)
		}
	}

	return result;
});
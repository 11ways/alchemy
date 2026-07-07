/**
 * The Document List class
 * (on the client side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @return   {number}
 */
DocumentList.setProperty(function length() {
	return this.records.length;
});

/**
 * Get the page number
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @return   {number}
 */
DocumentList.setProperty(function page() {
	if (this.options && this.options.options) {
		return this.options.options.page;
	}
});

/**
 * Get the page size
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 *
 * @return   {number}
 */
DocumentList.setProperty(function page_size() {
	if (this.options && this.options.options) {
		return this.options.options.page_size;
	}
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Append documents to this list.
 * Array#push would throw: it assigns `length`, which is getter-only here.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 *
 * @param    {...Document}   documents
 *
 * @return   {number}   The new length
 */
DocumentList.setMethod(function push(...documents) {

	for (let doc of documents) {
		this[this.records.length] = doc;
		this.records.push(doc);
	}

	this._syncAvailable();

	return this.records.length;
});

/**
 * Remove and return the last document.
 * Array#pop would throw: it assigns `length`, which is getter-only here.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 *
 * @return   {Document|undefined}
 */
DocumentList.setMethod(function pop() {

	if (!this.records.length) {
		return undefined;
	}

	let doc = this.records.pop();

	// Drop the now-stale own index property
	delete this[this.records.length];

	return doc;
});

/**
 * Remove and return the first document.
 * Array#shift would throw: it assigns `length`, which is getter-only here.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 *
 * @return   {Document|undefined}
 */
DocumentList.setMethod(function shift() {

	if (!this.records.length) {
		return undefined;
	}

	let previous_length = this.records.length,
	    doc = this.records.shift();

	this._syncIndexProperties(previous_length);

	return doc;
});

/**
 * Prepend documents to this list.
 * Array#unshift would throw: it assigns `length`, which is getter-only here.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 *
 * @param    {...Document}   documents
 *
 * @return   {number}   The new length
 */
DocumentList.setMethod(function unshift(...documents) {

	let previous_length = this.records.length;

	this.records.unshift(...documents);

	this._syncIndexProperties(previous_length);
	this._syncAvailable();

	return this.records.length;
});

/**
 * Remove and/or insert documents at an index. Returns the removed
 * documents as a plain Array (not a DocumentList).
 * Array#splice would throw: it assigns `length`, which is getter-only here.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 *
 * @param    {number}         start
 * @param    {number}         delete_count
 * @param    {...Document}    documents
 *
 * @return   {Array}   The removed documents
 */
DocumentList.setMethod(function splice(...args) {

	let previous_length = this.records.length,
	    removed = this.records.splice(...args);

	this._syncIndexProperties(previous_length);
	this._syncAvailable();

	return removed;
});

/**
 * Sort the list in place.
 * Array#sort would NOT throw here, but it only reorders the own index
 * properties, silently desyncing them from `records` (which iteration,
 * toDry/toHawkejs and clone all read) - so it must operate on `records`.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 *
 * @param    {Function}   [compare_fn]
 *
 * @return   {DocumentList}   this
 */
DocumentList.setMethod(function sort(compare_fn) {

	this.records.sort(compare_fn);
	this._syncIndexProperties(this.records.length);

	return this;
});

/**
 * Reverse the list in place.
 * Array#reverse has the same silent index/records desync as sort.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 *
 * @return   {DocumentList}   this
 */
DocumentList.setMethod(function reverse() {

	this.records.reverse();
	this._syncIndexProperties(this.records.length);

	return this;
});

/**
 * Rewrite the own numeric index properties after `records` changed shape
 * (entries are exposed via `Object.assign(this, records)` in initData, so
 * every mutator that shifts or shrinks must resync them or stale indexes
 * linger).
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 *
 * @param    {number}   previous_length
 */
DocumentList.setMethod(function _syncIndexProperties(previous_length) {

	let i;

	for (i = 0; i < this.records.length; i++) {
		this[i] = this.records[i];
	}

	for (; i < previous_length; i++) {
		delete this[i];
	}
});

/**
 * Keep `available` (the datasource total for the query) consistent after a
 * local mutation: it may never drop below the actual record count. Shrinking
 * mutators leave it alone - the datasource total is still what it was.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.8
 * @version  1.4.8
 */
DocumentList.setMethod(function _syncAvailable() {

	if (this.available == null || this.available < this.records.length) {
		this.available = this.records.length;
	}
});

// A DocumentList is not Array.isArray, so Array#concat would treat it as a
// single element (`list.concat(x)` returned `[list, x]`). This makes concat
// spread the documents like a real array (the result is a plain Array).
DocumentList.setProperty(Symbol.isConcatSpreadable, true);

/**
 * Iterator method
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.2.4
 *
 * @return   {Object}
 */
DocumentList.setMethod(function toDry() {

	let options;

	if (this.options) {
		let val,
		    key;

		options = {};

		for (key in this.options) {
			val = this.options[key];

			if (key == 'options') {
				val = Object.assign({}, val);
				val.assoc_cache = undefined;
			} else if (key == 'assoc_cache') {
				continue;
			}

			options[key] = val;
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.0
 * @version  1.3.4
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Object}
 */
DocumentList.setMethod(function toHawkejs(wm) {

	let records = JSON.clone(this.records, 'toHawkejs', wm),
	    result = new Blast.Classes.Alchemy.Client.DocumentList(records);

	result.available = this.available;

	if (this.options && this.options.options) {
		let options = JSON.clone(this.options.options, 'toHawkejs', wm);
		result.options = {options: options};
	}

	return result;
});

/**
 * Return a new array with the records
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
/**
 * The Document List class
 * (on the server side)
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.3
 *
 * @param    {Object}   record   A record containing the main & related data
 * @param    {Object}   options
 */
var DocumentList = Function.inherits(['Alchemy.Base', 'Array'], 'Alchemy', function DocumentList(records, options) {

	if (records == null) {
		records = [];
	}

	// Store the options
	this.options = options || {};

	// Add all the entries to this instance
	Object.assign(this, records);

	// Also keep a reference to the original array
	this.records = records;

	// Store the amount of records there are
	this.length = records.length;

	// Store the amount of available records
	this.available = records.available || this.length;
});

/**
 * Simplify the object for Hawkejs
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {WeakMap}   wm
 *
 * @return   {Object}
 */
DocumentList.setMethod(function toHawkejs(wm) {

	var records,
	    result;

	records = JSON.clone(this.records, 'toHawkejs', wm);

	result = new Classes.Alchemy.Client.DocumentList(records);

	return result;
});

/**
 * Clone this list
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @return   {DocumentList}
 */
DocumentList.setMethod(function clone() {

	var records,
	    result;

	records = JSON.clone(this.records);

	// @TODO: We're not really cloning the options
	result = new Classes.Alchemy.Client.DocumentList(records, this.options);

	return result;
});

/**
 * Get next page
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.4.0
 * @version  1.0.3
 *
 * @param    {Function}   callback
 */
DocumentList.setMethod(function findNextBatch(callback) {

	var that = this,
	    conditions,
	    options;

	if (!this.options.query_options) {
		return callback(new Error('No earlier query options were saved'));
	}

	options = Object.assign({}, this.options.query_options);
	options.query = null;
	options.assoc_cache = null;

	if (!options.page) {
		options.page = 2;
	} else {
		options.page++;
	}

	this.options.model.find('all', options, callback);
});

/**
 * Return a (sliced) array
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Array}
 */
DocumentList.setMethod(function toArray() {
	return this.records.slice(0);
});
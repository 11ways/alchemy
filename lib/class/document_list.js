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

	// Store the amount of available records
	this.available = records.available || this.length;
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
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.3
 * @version  1.0.3
 *
 * @param    {Object}   obj
 *
 * @return   {Hawkejs.DocumentList}
 */
DocumentList.setStatic(function unDry(obj) {
	var result = new this(obj.records, obj.options);
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
	result = new Classes.Alchemy.DocumentList(records, this.options);

	return result;
});

/**
 * Add associated data to all these records
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Criteria}   criteria
 *
 * @return   {Pledge}
 */
DocumentList.setMethod(['populate', 'addAssociatedData'], function addAssociatedData(criteria) {
	return Function.forEach.parallel(this.records, function eachDoc(doc, key, next) {
		doc.populate(criteria).done(next);
	});
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
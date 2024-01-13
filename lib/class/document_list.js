/**
 * The Document List class
 * (on the server side)
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
var DocumentList = Function.inherits(['Alchemy.Base', 'Array'], 'Alchemy', function DocumentList(records, options) {
	this.initData(records, options);
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.3
 * @version  1.0.3
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
 * Clone this list
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.2.3
 *
 * @param    {Criteria}   criteria
 *
 * @return   {Pledge}
 */
DocumentList.setMethod(['populate', 'addAssociatedData'], function addAssociatedData(criteria) {

	if (!this.records?.length) {
		return;
	}

	let doc = this.records[0];

	// Use the first doc to prepare the population criteria
	criteria = doc.preparePopulationCriteria(criteria);

	return Function.forEach.parallel(this.records, function eachDoc(doc, key, next) {
		doc.populate(criteria).done(next);
	});
});

/**
 * Get next page
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Keep private fields when sending to browser
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.4
 * @version  1.2.4
 */
DocumentList.setMethod(function keepPrivateFields(value) {

	if (arguments.length == 0) {
		value = true;
	} else {
		value = !!value;
	}

	let record;

	for (record of this) {
		record.keepPrivateFields(value);
	}
});
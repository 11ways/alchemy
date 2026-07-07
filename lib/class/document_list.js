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
 * Clone this list.
 * Preserves `available` (JSON.clone of the records array drops the
 * non-index property, which made a paginated clone under-report its
 * total) and the actual class, so subclasses don't downcast.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.3
 * @version  1.4.8
 *
 * @return   {DocumentList}
 */
DocumentList.setMethod(function clone() {

	var records,
	    result;

	records = JSON.clone(this.records);

	// @TODO: We're not really cloning the options
	result = new this.constructor(records, this.options);

	if (this.available != null) {
		result.available = this.available;
	}

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
 * Get the next batch of this list's query.
 * Rewritten against Criteria in 1.4.8: the old body guarded on a
 * `query_options` property nothing ever set, so it ALWAYS errored.
 * The original criteria must have a page or a limit - otherwise the
 * first find already returned everything.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.4.0
 * @version  1.4.8
 *
 * @param    {Function}   [callback]
 *
 * @return   {Pledge<DocumentList>}
 */
DocumentList.setMethod(function findNextBatch(callback) {

	let criteria = this.options,
	    pledge;

	if (!criteria || typeof criteria.clone != 'function' || !criteria.model) {
		pledge = Classes.Pledge.reject(new Error('This list was not created from a criteria, cannot find the next batch'));
	} else {

		criteria = criteria.clone();

		let options = criteria.options;

		if (options.page) {
			criteria.page(options.page + 1, options.page_size);
		} else if (options.limit) {
			criteria.skip((options.skip || 0) + options.limit);
		} else {
			pledge = Classes.Pledge.reject(new Error('The original criteria had no page or limit, so there is no next batch'));
		}

		if (!pledge) {
			pledge = criteria.model.find('all', criteria);
		}
	}

	if (callback) {
		pledge.done(callback);
	}

	return pledge;
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
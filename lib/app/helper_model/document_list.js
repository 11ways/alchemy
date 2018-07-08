/**
 * The Document List class
 * (on the client side)
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
var DocumentList = Function.inherits(['Alchemy.Client.Base', 'Array'], 'Alchemy.Client', function DocumentList(records, options) {

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
});

/**
 * unDry an object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * Return an object for json-drying this list
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @return   {Object}
 */
DocumentList.setMethod(function toDry() {
	return {
		value: {
			options    : this.options,
			records    : this.records
		}
	};
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

	result = new Blast.Classes.Alchemy.Client.DocumentList(records);

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
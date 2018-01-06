module.exports = function documentList(Hawkejs, Blast) {

	/**
	 * The Document List class
	 * (on the client side)
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
	var DocumentList = Function.inherits('Array', 'Hawkejs', function DocumentList(records, options) {

		// Store the options
		this.options = options || {};

		// Add all the entries to this instance
		Object.assign(this, records);

		// Also keep a reference to the original array
		this.records = records;

		// Store the amount of records there are
		this.length = records.length;
	});




};
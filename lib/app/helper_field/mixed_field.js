/**
 * The Mixed Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
const MixedField = Function.inherits('Alchemy.Field', 'Mixed');

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
MixedField.setDatatype('object');

/**
 * This field value is self-contained
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
MixedField.setSelfContained(true);

/**
 * Store objects as strings, if wanted
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @param    {Mixed}        value       The field's own value
 * @param    {Object}       data        The main record
 * @param    {Datasource}   datasource  The datasource instance
 *
 * @return   {Mixed}
 */
MixedField.setMethod(function _toDatasource(value, data, datasource, callback) {

	if (value && typeof value == 'object' && !Object.isPlainObject(value)) {
		if (!(value instanceof Date)) {
			value = JSON.toDryObject(value);
		}
	}

	Blast.nextTick(callback, null, null, value);
});

/**
 * Convert from database to app
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 *
 * @param    {Object}   query     The original query
 * @param    {Object}   options   The original query options
 * @param    {Mixed}    value     The field value, as stored in the DB
 * @param    {Function} callback
 */
MixedField.setMethod(function _toApp(query, options, value, callback) {

	if (value && typeof value == 'object' && typeof value.dry == 'string') {
		value = JSON.unDry(value);
	}

	callback(null, value);
});
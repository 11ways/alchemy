/**
 * The DateFieldType class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
var DateFieldType = FieldType.extend(function DateFieldType(schema, name, options) {
	FieldType.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
DateFieldType.setProperty('datatype', 'object');

/**
 * Cast the given value to this field's type
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 *
 * @param    {Mixed}   value
 *
 * @return   {Date}
 */
DateFieldType.setMethod(function cast(value) {

	// Don't cast falsy values,
	// that'll result in a date around 1970
	if (!value) {
		return null;
	}

	if (this.options.store_units && value.timestamp) {
		return Date.create(value.timestamp);
	}

	// Leave the time in
	return Date.create(value);
});

/**
 * Split date into multiple fields
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {Mixed}        value       The field's own value
 * @param    {Object}       data        The main record
 * @param    {Datasource}   datasource  The datasource instance
 *
 * @return   {Mixed}
 */
DateFieldType.setMethod(function _toDatasource(value, data, datasource, callback) {

	value = this.cast(value);

	if (this.options.store_units) {

		let day = value.getDay();

		if (day == 0) {
			day = 7;
		}

		value = {
			timestamp  : value.valueOf(),
			year       : value.getFullYear(),
			month      : value.getMonth() + 1,
			week       : Number(value.format('W')),
			date       : value.getDate(),
			day        : day
		};
	}

	setImmediate(function() {
		callback(null, value);
	});
});

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {Mixed}   value
 * @param    {Array}   field_paths   The path to the field
 *
 * @return   {Mixed}
 */
DateFieldType.setMethod(function castCondition(value, field_paths) {

	if (!this.options.store_units) {
		return castCondition.super.call(this, value, field_paths);
	}

	let last = field_paths.last();

	// If we're already querying a subfield, do nothing
	if (last.indexOf('.') > -1) {
		return value;
	}

	if (!Object.isPlainObject(value)) {

		if (typeof value != 'number') {
			value = Number(value);
		}

		// Compare to the timestamp
		field_paths[field_paths.length - 1] += '.timestamp';

		return value;
	}

	Object.walk(value, function eachEntry(value, key, parent) {
		if (Date.isDate(value)) {
			parent[key] = Number(value);
		}
	});

	// Compare to the timestamp
	field_paths[field_paths.length - 1] += '.timestamp';

	return value;
});
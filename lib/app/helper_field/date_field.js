/**
 * The Date Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var DateField = Function.inherits('Alchemy.Field', function Date(schema, name, options) {
	Date.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
DateField.setDatatype('date');

/**
 * Dates are self-contained objects
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
DateField.setSelfContained(true);

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
DateField.setMethod(function cast(value) {

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
DateField.setMethod(function _toDatasource(value, data, datasource, callback) {

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

	Blast.nextTick(function() {
		callback(null, value);
	});
});

/**
 * Cast the given value to this field's type for search in a db
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.1.0
 *
 * @param    {Mixed}             value
 * @param    {FieldExpression}   expression
 *
 * @return   {Mixed}
 */
DateField.setMethod(function castCondition(value, expression) {

	if (!this.options.store_units) {
		return castCondition.super.call(this, value, expression);
	}

	if (expression && expression.db_property) {
		return value;
	}

	expression.db_property = 'timestamp';

	if (!Object.isPlainObject(value)) {

		if (typeof value == 'string') {
			value = Date.create(value);
		}

		if (typeof value != 'number') {
			value = Number(value);
		}

		return value;
	}

	Object.walk(value, function eachEntry(value, key, parent) {

		if (typeof value == 'string') {
			value = Date.create(value);
		}

		if (Date.isDate(value)) {
			parent[key] = Number(value);
		}
	});

	return value;
});
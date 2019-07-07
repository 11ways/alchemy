/**
 * The DateTime Field class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
var Datetime = Function.inherits('Alchemy.Field.Date', function Datetime(schema, name, options) {
	Datetime.super.call(this, schema, name, options);
});

/**
 * Set the datatype name
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Datetime.setDatatype('datetime');

/**
 * Split date into multiple fields
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.1.0
 *
 * @param    {Mixed}        value       The field's own value
 * @param    {Object}       data        The main record
 * @param    {Datasource}   datasource  The datasource instance
 *
 * @return   {Mixed}
 */
Datetime.setMethod(function _toDatasource(value, data, datasource, callback) {

	value = this.cast(value);

	if (this.options.second_format) {
		value /= this.options.second_format;
	}

	if (this.options.store_units) {

		let day = value.getDay();

		if (day == 0) {
			day = 7;
		}

		value = {
			timestamp    : value.valueOf(),
			year         : value.getFullYear(),
			month        : value.getMonth() + 1,
			week         : Number(value.format('W')),
			date         : value.getDate(),
			day          : day,
			hour         : value.getHours(),
			minute       : value.getMinutes(),
			second       : value.getSeconds(),
			millisecond  : value.getMilliseconds()
		};
	}

	Blast.nextTick(function() {
		callback(null, value);
	});
});
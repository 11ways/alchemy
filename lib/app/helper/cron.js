const VAL_L = 'l';
const VAL_W = 'w';
const VAL_LW = 'lw';
const VAL_Q = '?';
const VAL_HASH = '#';
const VAL_STAR = '*';
const VAL_DASH = '-';
const VAL_SLASH = '/';

const FIELDS = ['second', 'minute', 'hour', 'day_of_month', 'month', 'day_of_week', 'year'];

const FIELD_INFO = {
	second: {min: 0, max: 59},
	minute: {min: 0, max: 59},
	hour: {min: 0, max: 23},
	day: {min: 1, max: 31},
	day_of_month: {min: 1, max: 31},
	month: {
		min: 1,
		max: 12,
		alias: {
			jan: 1,
			feb: 2,
			mar: 3,
			apr: 4,
			may: 5,
			jun: 6,
			jul: 7,
			aug: 8,
			sep: 9,
			oct: 10,
			nov: 11,
			dec: 12,
		},
	},
	day_of_week: {
		min: 0,
		max: 7,
		alias: {
			7: 0,
			sun: 0,
			mon: 1,
			tue: 2,
			wed: 3,
			thu: 4,
			fri: 5,
			sat: 6,
		},
	},
	year: {min: 1970, max: 2099},
};

/**
 * The Cron class:
 * Represents a Cron frequency
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
const Cron = Function.inherits('Alchemy.Base', 'Alchemy.Cron', function Cron(input) {
	
	// The original input
	this.input = input;

	// The parsed expressions
	this.expressions = [];

	// Options
	this.options = {};

	// The current expression
	this.current_expression = null;

	if (input) {
		this.parse(input);
	}
});

/**
 * Predefined expressions
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
Cron.setStatic('PREDEFINED_EXPRESSIONS', {
	'@yearly'  : '0 0 1 1 ?',
	'@monthly' : '0 0 1 * ?',
	'@weekly'  : '0 0 ? * 0',
	'@daily'   : '0 0 * * ?',
	'@hourly'  : '0 * * * ?',
});

/**
 * Undry this value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Object}   data
 *
 * @return   {Cron}
 */
Cron.setStatic(function unDry(data) {
	let result = new Cron(data.input, data.options);
	return result;
});

/**
 * Serialize this cron instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
Cron.setMethod(function toDry() {
	return {
		value: {
			input   : this.input,
			options : this.options,
		}
	};
});

/**
 * Parse the input
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
Cron.setMethod(function parse(input) {

	if (!input) {
		throw new Error('The Cron expression cannot be empty');
	}

	// Remember the input
	this.input = input;

	// Parse the expressions
	this.expressions = splitAndCleanup(input, '|').map(expression => this.parseSingleExpression(expression, this.options));
});

/**
 * Parse a single expression
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {string}   expression
 *
 * @return   {Cron.Expression}
 */
Cron.setMethod(function parseSingleExpression(expression) {
	let result = new CronExpression(expression);
	return result;
});

/**
 * Get the next valid date this cron job will run at
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}   current_date
 *
 * @return   {Date}
 */
Cron.setMethod(function getNextDate(current_date) {

	if (!current_date) {
		current_date = new Date();
	}

	let result,
	    test;

	for (let expression of this.expressions) {
		test = expression.getNextDate(current_date, true);

		if (!result) {
			result = test;
			continue;
		}

		if (!test || test > result) {
			continue;
		}

		result = test;
	}

	return result;
});

/**
 * Does the given date match the current cron expression?
 * Seconds will be ignored!
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}   date
 *
 * @return   {Date}
 */
Cron.setMethod(function matches(date) {

	if (!date) {
		date = new Date();
	} else {
		date = date.clone();
	}

	// Go to the start of the minute (set seconds & ms to 0)
	date.startOf('minute');

	let wanted_time = date.getTime(),
	    test;

	for (let expression of this.expressions) {
		test = expression.getNextDate(date, false);

		if (!test) {
			continue;
		}

		if (test.getTime() == wanted_time) {
			return true;
		}
	}

	return false;
});

/**
 * The CronExpression:
 * This represents a single Cron frequency expression
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
const CronExpression = Function.inherits('Alchemy.Base', 'Alchemy.Cron', function Expression(input) {
	this.expression = input;
	this.parse();
});

/**
 * Split the string, remove empty parts & deduplicate
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
function splitAndCleanup(input, separator) {

	let pieces = input.split(separator),
	    result = new Set(),
	    piece,
	    i;

	for (i = 0; i < pieces.length; i++) {
		piece = pieces[i].trim();
		if (!piece) continue;
		result.add(piece);
	}

	return [...result];
}

/**
 * Parse a single expression
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.4.1
 */
CronExpression.setMethod(function parse() {
	
	if (!this.expression) {
		throw new Error('Cron expression cannot be empty');
	}

	let internal_expression = this.expression;
	let has_seconds = this.has_seconds;

	if (Cron.PREDEFINED_EXPRESSIONS[internal_expression]) {
		internal_expression = Cron.PREDEFINED_EXPRESSIONS[internal_expression];
		has_seconds = false;
	}

	const min_fields = has_seconds ? 5 : 4;
	const max_fields = has_seconds ? 7 : 6;

	const parts = internal_expression
		.split(/\s+/)
		.map((part) => part.trim())
		.filter((part) => part);

	if (parts.length < min_fields || parts.length > max_fields) {
		let message = `Invalid cron expression [${this.expression}]. Expected [${min_fields} to ${max_fields}] fields but found [${parts.length}] fields.`;
		throw new Error(message);
	}

	// If seconds is not specified, then defaults to 0th sec
	if (!has_seconds) {
		parts.unshift('0');
	}

	// If day of week is not specified, will default to ?
	if (parts.length === 5) {
		parts.push(VAL_Q);
	}

	// If year is not specified, then default to *
	if (parts.length === 6) {
		parts.push(VAL_STAR);
	}

	const field_parts = {};
	for (let i = 0; i < FIELDS.length; i++) {
		field_parts[FIELDS[i]] = parts[i];
	}

	const parsed = {};
	for (const field of FIELDS) {
		if (field === 'second' && !has_seconds) {
			parsed[field] = {omit: true};
		} else {
			parsed[field] = this.parseField(field, field_parts[field]);
		}
	}

	this.current_expression = null;

	this.parsed = parsed;
});

/**
 * Parse a specific field of the current expression
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseField(field, value) {

	value = value.toLowerCase().trim();

	if (value === VAL_STAR) {
		return {all: true};
	}

	if (value === VAL_Q) {
		return this.parseQ(field, value);
	}

	const parts = splitAndCleanup(value, ',');
	const parsed = {};

	for (const part of parts) {
		if (!part) {
			continue;
		}

		if (part.indexOf(VAL_SLASH) >= 0) {
			parsed.steps = parsed.steps || [];
			parsed.steps.push(this.parseStepRange(field, part));
		} else if (part.indexOf(VAL_DASH) >= 0) {
			parsed.ranges = parsed.ranges || [];
			parsed.ranges.push(this.parseRange(field, part));
		} else if (part.indexOf(VAL_HASH) >= 0) {
			parsed.nthDays = parsed.nthDays || [];
			parsed.nthDays.push(this.parseNth(field, part));
		} else if (part === VAL_L) {
			parsed.lastDay = this.parseL(field, part);
		} else if (part === VAL_LW) {
			parsed.lastWeekday = this.parseLW(field, part);
		} else if (field === 'day_of_month' && part.indexOf(VAL_W) >= 0) {
			parsed.nearestWeekdays = parsed.nearestWeekdays || [];
			parsed.nearestWeekdays.push(this.parseNearestWeekday(field, part));
		} else if (field === 'day_of_week' && part.endsWith(VAL_L)) {
			parsed.lastDays = parsed.lastDays || [];
			parsed.lastDays.push(this.parseLastDays(field, part));
		} else {
			parsed.values = parsed.values || [];
			parsed.values.push(this.parseValue(field, part));
		}
	}

	if (parsed.values) {
		parsed.values = dedupe(parsed.values);
		parsed.values.sort((a, b) => a - b);
	}

	return parsed;
});

/**
 * Parse a question mark value for the current field
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseQ(field, value) {

	if (field === 'day_of_week' || field === 'day_of_month') {
		return {omit: true};
	}

	throw this.createInvalidExpressionError(
		`Invalid Value [${value}] for field [${field}]. It can be specified only for [day_of_month or day_of_week] fields.`
	);
});

/**
 * Parse "L" syntax: the last day of the month
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseL(field, value) {

	if (field === 'day_of_week' || field === 'day_of_month') {
		return true;
	}

	throw this.createInvalidExpressionError(
		`Invalid value for [${value}] for field [${field}]. It can be used only for [day_of_month or day_of_week] fields.`
	);
});

/**
 * Parse "LW" syntax, meaning: "last workday of the month"
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseLW(field, value) {

	if (field === 'day_of_month') {
		return true;
	}

	throw this.createInvalidExpressionError(
		`Invalid value for [${value}] for field [${field}]. It can be used only for [day_of_month] fields.`
	);
});

/**
 * Parse the steps of a specific field value
 * (Like /5)
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseStepRange(field, value) {

	const parts = value.split(VAL_SLASH);
	if (parts.length != 2) {
		throw this.createInvalidExpressionError(
			`Invalid step range [${value}] for field [${field}]. Expected exactly 2 values separated by a / but got [${parts.length}] values.`
		);
	}

	const info = FIELD_INFO[field];
	const fromParts = parts[0].indexOf(VAL_DASH) >= 0 ? parts[0].split(VAL_DASH) : [parts[0]];
	const from = fromParts[0] === VAL_STAR ? info.min : this.parseNumber(field, unalias(field, fromParts[0]));
	const to = fromParts.length > 1 ? this.parseNumber(field, unalias(field, fromParts[1])) : info.max;
	const step = this.parseNumber(field, unalias(field, parts[1]));

	if (from < info.min) {
		throw this.createInvalidExpressionError(
			`Invalid step range [${value}] for field [${field}]. From value [${from}] out of range. It must be greater than or equals to [${info.min}]`
		);
	}

	if (to > info.max) {
		throw this.createInvalidExpressionError(
			`Invalid step range [${value}] for field [${field}]. To value [${to}] out of range. It must be less than or equals to [${info.max}]`
		);
	}

	if (step > info.max) {
		throw this.createInvalidExpressionError(
			`Invalid step range [${value}] for field [${field}]. Step value [${value}] out of range. It must be less than or equals to [${info.max}]`
		);
	}

	return {from, to, step};
});

/**
 * Parse a number for the current field.
 * If it turns out to not be a valid number, an error will be thrown.
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseNumber(field, value) {
	const num = parseInt(unalias(field, value), 10);

	if (Number.isNaN(num)) {
		throw this.createInvalidExpressionError(`Invalid numeric value [${value}] in field [${field}].`);
	}

	return num;
});

/**
 * Parse a range (like 1-5)
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseRange(field, value) {

	const parts = value.split(VAL_DASH);

	if (parts.length != 2) {
		throw this.createInvalidExpressionError(
			`Invalid range [${value}] for field [${field}]. Range should have two values separated by a - but got [${parts.length}] values.`
		);
	}

	const from = this.parseNumber(field, unalias(field, parts[0]));
	let to = this.parseNumber(field, unalias(field, parts[1]));

	// For day of week, sun will act as 0 or 7 depending on if it is in from or to
	if (field == 'day_of_week') {
		if (to === 0) {
			to = 7;
		}
	}

	if (from > to) {
		throw this.createInvalidExpressionError(`Invalid range [${value}] for field [${field}]. From value must be less than to value.`);
	}

	const info = FIELD_INFO[field];

	if (from < info.min || to > info.max) {
		throw this.createInvalidExpressionError(
			`Invalid range [${value}] for field [${field}]. From or to value is out of allowed min/max values. Allowed values are between [${info.min}-${info.max}].`
		);
	}

	return {from, to};
});

/**
 * Parse a value
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseValue(field, value) {

	const num = this.parseNumber(field, value);
	const info = FIELD_INFO[field];
	if (num < info.min) {
		throw this.createInvalidExpressionError(
			`Value [${value}] out of range for field [${field}]. It must be greater than or equals to [${info.min}].`
		);
	}

	if (info.max && num > info.max) {
		throw this.createInvalidExpressionError(
			`Value [${value}] out of range for field [${field}]. It must be less than or equals to [${info.max}].`
		);
	}

	return num;
});

/**
 * Parse Nth day of week (like 5#3, the 3rd friday of the month)
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseNth(field, value) {

	if (field !== 'day_of_week') {
		throw this.createInvalidExpressionError(
			`Invalid value [${value}] for field [${field}]. Nth day can be used only in [day_of_week] field.`
		);
	}

	const parts = value.split(VAL_HASH);
	if (parts.length !== 2) {
		throw this.createInvalidExpressionError(
			`Invalid nth day value [${value}] for field [${field}]. It must be in [day_of_week#instance] format.`
		);
	}

	const day_of_week = this.parseNumber(field, parts[0]);
	const instance = this.parseNumber(undefined, parts[1]);

	if (instance < 1 || instance > 5) {
		throw this.createInvalidExpressionError(
			`Invalid Day of Week instance value [${instance}] for field [${field}]. It must be between 1 and 5.`
		);
	}

	return {
		day_of_week,
		instance: instance,
	};
});

/**
 * Parse 
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseNearestWeekday(field, value) {
	if (field !== 'day_of_month') {
		throw this.createInvalidExpressionError(
			`Invalid value [${value}] for field [${field}]. Nearest weekday can be used only in [day_of_month] field.`
		);
	}

	return this.parseNumber(field, value.split(VAL_W)[0]);
});

/**
 * Parse "last days" expressions, like "sunl"
 * which means "Last sunday of the month"
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function parseLastDays(field, value) {
	return this.parseNumber(field, value.split(VAL_L)[0]);
});

/**
 * Get the next valid date this cron job will run at
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}      current_date
 * @param    {boolean}   add_one_second   When false, the current date might be returned
 *
 * @return   {Date}
 */
CronExpression.setMethod(function getNextDate(current_date, add_one_second = true) {

	if (!current_date) {
		current_date = new Date();
	}

	let result = current_date.clone();

	if (add_one_second) {
		result.add(1, 'second');
	}

	let last_ts = result.getTime(),
	    current_ts = last_ts;

	do {

		let modified = this._modifyDate(result);

		if (modified) {
			current_ts = result.getTime();

			if (current_ts <= last_ts) {
				return false;
			}

			last_ts = current_ts;
		} else if (modified == null) {
			break;
		} else if (modified === false) {
			// Failed to get a next date!
			return false;
		}

		// Simple infinite loop fix
		if (result.getFullYear() > 2099) {
			return false;
		}

	} while (true);

	return result;
});

/**
 * Do only 1 modification. As soon as that happens, return.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}   date
 * @param    {Object} config
 * @param    {string} unit
 */
CronExpression.setMethod(function _modifyDate(date) {

	const parsed = this.parsed;

	let result = this.modifyDate(date, parsed.second, 'second');

	if (result != null) {
		return result;
	}

	result = this.modifyDate(date, parsed.minute, 'minute');

	if (result != null) {
		return result;
	}

	result = this.modifyDate(date, parsed.hour, 'hour');

	if (result != null) {
		return result;
	}

	result = this.modifyDate(date, parsed.day_of_month, 'day_of_month');

	if (result != null) {
		return result;
	}

	result = this.modifyDate(date, parsed.day_of_week, 'day_of_week');

	if (result != null) {
		return result;
	}

	result = this.modifyDate(date, parsed.month, 'month');

	if (result != null) {
		return result;
	}

	result = this.modifyDate(date, parsed.year, 'year');

	if (result != null) {
		return result;
	}

	return null;
});

/**
 * Potentially modify the given date (in place)
 * using the field info & the given unit of time
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date
 * @param    {Object}  config
 * @param    {string}  unit
 */
CronExpression.setMethod(function modifyDate(date, config, unit) {

	if (unit == 'day_of_month') {
		unit = 'day';
	}

	if (config.all) {
		return;
	}

	if (config.omit) {

		if (unit == 'second' && date.getSeconds() > 0)  {
			date.add(1, 'minute');
			date.startOf('minute');
			return true;
		} else {
			return null;
		}
	}

	if (config.values) {
		return this.modifyDateUsingValues(date, config, unit);
	}

	if (config.ranges) {
		return this.modifyDateUsingRanges(date, config, unit);
	}

	if (config.steps) {
		return this.modifyDateUsingSteps(date, config, unit);
	}

	if (config.nthDays) {
		return this.modifyDateUsingNthDays(date, config, unit);
	}

	if (config.lastDays) {
		return this.modifyDateUsingLastDays(date, config, unit);
	}

	if (config.lastWeekday) {
		return this.modifyDateUsingLastWeekday(date, config, unit);
	}

	if (config.lastDay) {
		return this.modifyDateUsingLastDay(date, config, unit);
	}

	return null;
});

/**
 * Potentially modify the given date (in place)
 * using the given values of the parsed field expression.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date     The date to modify in-place
 * @param    {Object}  config   The parsed Cron field expression
 * @param    {string}  unit     The unit of time (day, month, second, hour, ...)
 *
 * @return   {boolean|null}     True if the date was modified, false if it failed, null if it wasn't modified
 */
CronExpression.setMethod(function modifyDateUsingValues(date, config, unit) {

	// Get all the allowed values for this unit
	const allowed_values = config.values;

	// Get the current amount of the given unit of the given date
	let current_amount = this.getUnit(date, unit);

	// If the current value is allowed, do nothing!
	if (allowed_values.indexOf(current_amount) > -1) {
		return;
	}

	// Get the max allowed amount of the current unit of the current date
	// (Once this amount has been reached, the value should loop around)
	let max_amount = this.getUnitMax(unit, date);
	let min_amount = this.getUnitMin(unit, date);

	// We're going to look for the smallest change to reach the next allowed value.
	// Initial value is positive infinity, so any first change will be smaller.
	let smallest_change = Infinity;

	for (let value of allowed_values) {

		let change = 0;

		if (current_amount < value) {
			// The next allowed value is in the future (without looping around)
			// so this will be a simple change
			change = value - current_amount;
		} else if (current_amount > value) {

			// The next allowed value is smaller than the current one,
			// so this probably means we'll have to loop around
			// (Only years can't loop around)

			change = (max_amount - current_amount) + value;

			// If the minimum amount is 0, we'll have to add 1 to the change
			if (min_amount == 0) {
				change += 1;
			}
		} else {
			// Shouldn't happen, but ignore it anyway
			continue;
		}

		// If the current calculated change is smaller than the previous one,
		// it'll become the new smallest change
		if (change < smallest_change) {
			smallest_change = change;
		}
	}

	// If the smalles change is not finite, no allowed values were found
	if (!isFinite(smallest_change)) {
		return false;
	}

	// Actually add the smallest change amount to the date
	this.addUnitToDate(date, unit, smallest_change);

	return true;
});

/**
 * Potentially modify the given date (in place)
 * using the given ranges of the field config
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date
 * @param    {Object}  config
 * @param    {string}  unit
 */
CronExpression.setMethod(function modifyDateUsingRanges(date, config, unit) {

	// Get the current amount of the given unit of the given date
	let current_amount = this.getUnit(date, unit);

	// Get the max amount of the current date
	// (Once this amount has been reached, the value will loop around)
	let max_amount = this.getUnitMax(unit, date);
	let min_amount = this.getUnitMin(unit, date);

	// First see if the current unit is allowed by any of the ranges
	for (let range of config.ranges) {
		if (current_amount >= range.from && current_amount <= range.to) {
			// It's allowed!
			return null;
		}
	}

	// If not, we need to calculate the change to reach the next allowed value.
	// We'll do this for each range. The smallest change will be added to the date.
	let smallest_change = Infinity;

	for (let range of config.ranges) {

		let change = 0;

		if (current_amount < range.from) {
			change = range.from - current_amount;
		} else if (current_amount > range.to) {

			change = (max_amount - current_amount) + range.from;

			// If the minimum amount is 0, we'll have to add 1 to the change
			if (min_amount == 0) {
				change += 1;
			}

		} else {
			return false;
		}

		if (change < smallest_change) {
			smallest_change = change;
		}
	}

	this.addUnitToDate(date, unit, smallest_change);

	return true;
});


/**
 * Potentially modify the given date (in place)
 * using the given steps of the field config.
 * Steps can be like "10-30/5"
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date
 * @param    {Object}  config
 * @param    {string}  unit
 */
CronExpression.setMethod(function modifyDateUsingSteps(date, config, unit) {

	// Get the current amount of the given unit of the given date
	let current_amount = this.getUnit(date, unit);

	// Get the max amount of the current date
	// (Once this amount has been reached, the value will loop around)
	let max_amount = this.getUnitMax(unit, date);
	let min_amount = this.getUnitMin(unit, date);

	// First see if the current unit is allowed by any of the steps
	for (let step of config.steps) {

		let to = step.to;

		if (to == 7 && unit == 'day_of_week') {
			to = 6;
		}

		if (current_amount >= step.from && current_amount <= to) {
			if ((current_amount - step.from) % step.step == 0) {
				// It's allowed!
				return null;
			}
		}
	}

	// If not, we need to calculate the change to reach the next allowed value.
	// We'll do this for each step. The smallest change will be added to the date.
	let smallest_change = Infinity;

	for (let step of config.steps) {

		let change = 0;

		let to = step.to;

		if (to == 7 && unit == 'day_of_week') {
			to = 6;
		}

		if (current_amount < step.from) {
			change = step.from - current_amount;
		} else if (current_amount >= to) {

			change = (max_amount - current_amount) + step.from;

			// If the minimum amount is 0, we'll have to add 1 to the change
			if (min_amount == 0) {
				change += 1;
			}

		} else {
			change = step.step - ((current_amount - step.from) % step.step);
		}

		if (change < smallest_change) {
			smallest_change = change;
		}
	}

	this.addUnitToDate(date, unit, smallest_change);

	return true;
});

/**
 * Modify dates using Nth days
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date     The date to modify in-place
 * @param    {Object}  config   The parsed Cron field expression
 * @param    {string}  unit     The unit of time. Should always be day_of_week
 *
 * @return   {boolean|null}     True if the date was modified, false if it failed, null if it wasn't modified
 */
CronExpression.setMethod(function modifyDateUsingNthDays(date, config, unit) {

	// Get the current amount of the given unit of the given date
	let current_dow = this.getUnit(date, 'day_of_week');

	// Calculate the current instance of the current day
	let current_instance = Math.ceil(date.getDate() / 7);

	// First see if the current unit is allowed by any of the steps
	for (let entry of config.nthDays) {

		if (current_dow != entry.day_of_week) {
			continue;
		}

		// If the instance also matches, it's already good!
		if (current_instance == entry.instance) {
			return null;
		}
	}

	// Get the max amount of the current date
	// (Once this amount has been reached, the value will loop around)
	let max_amount = 6;

	// If not, we need to calculate the change to reach the next allowed value.
	// We'll do this for each step. The smallest change will be added to the date.
	let smallest_change = Infinity;

	for (let entry of config.nthDays) {

		let change = 0;

		// First: let's calculate the needed change to get the correct day_of_week
		// (It might even already be correct and stay at 0!)
		if (current_dow <= entry.day_of_week) {
			change = entry.day_of_week - current_dow;
		} else if (current_dow > entry.day_of_week) {
			change = (max_amount - current_dow) + entry.day_of_week + 1;
		}

		// Now let's calculate the change to get the correct instance
		let test = date.clone().add(change, 'days'),
		    instance = Math.ceil(test.getDate() / 7);

		if (instance != entry.instance) {
			if (instance > entry.instance) {
				// The newly calculated date is getting further away from the wanted instance,
				// so we just have to keep on going. The next iteration will take care of that

				// @TODO: maybe make it go to the start of the next month?

				// Make sure it goes ahead by at least 1 more day
				change += 1;
			} else {
				change += (7 * (entry.instance - instance));
			}
		}

		if (change > 0 && change < smallest_change) {
			smallest_change = change;
		}
	}

	if (!isFinite(smallest_change)) {
		return false;
	}

	this.addUnitToDate(date, 'day_of_week', smallest_change);

	return true;
});

/**
 * Modify dates using Last-days
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date     The date to modify in-place
 * @param    {Object}  config   The parsed Cron field expression
 * @param    {string}  unit     The unit of time. Should always be day_of_week
 *
 * @return   {boolean|null}     True if the date was modified, false if it failed, null if it wasn't modified
 */
CronExpression.setMethod(function modifyDateUsingLastDays(date, config, unit) {

	let current_date = date.getDate();
	let smallest_change = Infinity;

	// First see if the current unit is allowed by any of the steps
	for (let day_of_week of config.lastDays) {

		let wanted_date = this.getDayOfLastWantedDayOfWeek(date, day_of_week);

		if (current_date == wanted_date) {
			return null;
		}

		let change;

		if (wanted_date > current_date) {
			change = wanted_date - current_date;
		} else {
			continue;
		}

		if (change != null && change < smallest_change) {
			smallest_change = change;
		}
	}

	if (!isFinite(smallest_change)) {
		smallest_change = 1;
	}

	this.addUnitToDate(date, 'day_of_week', smallest_change);

	return true;
});

/**
 * Modify dates using Last-weekday
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date     The date to modify in-place
 * @param    {Object}  config   The parsed Cron field expression
 * @param    {string}  unit     The unit of time. Should always be day_of_week
 *
 * @return   {boolean|null}     True if the date was modified, false if it failed, null if it wasn't modified
 */
CronExpression.setMethod(function modifyDateUsingLastWeekday(date, config, unit) {

	let last_weekday = this.getDayOfLastWeekday(date),
	    current_day = date.getDate();

	if (last_weekday == current_day) {
		return null;
	}

	this.addUnitToDate(date, 'day', last_weekday - current_day);

	return true;
});

/**
 * Modify dates using Last-day
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date     The date to modify in-place
 * @param    {Object}  config   The parsed Cron field expression
 * @param    {string}  unit     The unit of time. Should always be day_of_week
 *
 * @return   {boolean|null}     True if the date was modified, false if it failed, null if it wasn't modified
 */
CronExpression.setMethod(function modifyDateUsingLastDay(date, config, unit) {

	let last_day = this.getUnitMax('day', date),
	    current_day = date.getDate();

	if (last_day == current_day) {
		return null;
	}

	this.addUnitToDate(date, 'day', last_day - current_day);

	return true;
});

/**
 * Add the given amount of units to the date.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date
 * @param    {Object}  config
 * @param    {string}  unit
 */
CronExpression.setMethod(function addUnitToDate(date, unit, amount) {

	if (unit == 'day_of_month') {
		unit = 'day';
	}

	if (unit == 'day_of_week') {
		unit = 'day';
	}

	// Now add the smallest change to the date
	date.add(amount, unit);

	// And go to the start of this unit
	date.startOf(unit);
});


/**
 * Get the date of the last weekday of the current month
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date
 *
 * @return   {number}  The date of the last weekday
 */
CronExpression.setMethod(function getDayOfLastWeekday(date) {

	let last_date = this.getUnitMax('day', date);

	// Create a new date that is the last day of the month of the current month
	let end_of_month = new Date(date.getFullYear(), date.getMonth(), last_date, 23, 59, 0);

	// Day of week in JavaScript Date are from 0-6
	// Sunday is 0, Monday is 1, ..., and Saturday is 6
	let last_day = end_of_month.getDay();

	if (last_day === 6) {
		// If it's Saturday (6), go back 1 day
		last_date -= 1;
	} else if (last_day === 0) {
		// If it's Sunday (0), go back 2 days
		last_date -= 2;
	}

	return last_date;
});

/**
 * Get the date of the last type of weekday of the current month
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date
 * @param    {number}  day_of_week
 *
 * @return   {number}  The date of the last weekday
 */
CronExpression.setMethod(function getDayOfLastWantedDayOfWeek(date, wanted_day_of_week) {

	let last_date = this.getUnitMax('day', date);

	// Create a new date that is the last day of the month of the current month
	let end_of_month = new Date(date.getFullYear(), date.getMonth(), last_date, 23, 59, 0);

	// Get the last day_of_week of the month
	let last_day_of_week = end_of_month.getDay();

	// Calculate difference
	let diff = last_day_of_week - wanted_day_of_week;

	if (diff < 0) {
		diff += 7;
	}

	// Calculate the date of the last wanted day_of_week
	let result = end_of_month.getDate() - diff;

	return result;
});

/**
 * Get a specific unit of the given date
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Date}    date
 * @param    {string}  unit
 */
CronExpression.setMethod(function getUnit(date, unit) {

	switch (unit) {
		case 'year':
			return date.getFullYear();
		case 'month':
			// In our cron system, months start at 1.
			// Because they start at 0 in JavaScript, we add 1.
			return date.getMonth() + 1;
		case 'day_of_month':
		case 'day':
			return date.getDate();
		case 'hour':
			return date.getHours();
		case 'minute':
			return date.getMinutes();
		case 'second':
			return date.getSeconds();
		case 'day_of_week':
			return date.getDay();
	}
});

/**
 * Get the maximum allowed value of the given unit
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {string}  unit
 */
CronExpression.setMethod(function getUnitMax(unit, of_date) {

	// The `FIELD_INFO` object says the max amount of days in a week is 7,
	// but the `Date` object says it's 6, and that's what's important here.
	if (unit == 'day_of_week') {
		return 6;
	}

	// The max amount of dates in a month depend on the month
	if (of_date && (unit == 'day_of_month' || unit == 'day')) {
		let month = of_date.getMonth() + 1;

		let days_in_month;

		switch (month) {
			case 2:
				days_in_month = 28;
				break;

			case 4:
			case 6:
			case 9:
			case 11:
				days_in_month = 30;
				break;

			default:
				days_in_month = 31;
		}

		return days_in_month;
	}

	const info = FIELD_INFO[unit];

	return info?.max;
});

/**
 * Get the minimum allowed value of the given unit
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {string}  unit
 */
CronExpression.setMethod(function getUnitMin(unit, of_date) {
	const info = FIELD_INFO[unit];
	return info?.min;
});

/**
 * Convert any aliases to their expected value
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
function unalias(field, value) {

	if (!field) {
		return value;
	}

	const info = FIELD_INFO[field];
	const unaliased = (info.alias || {})[value];
	return unaliased === undefined ? value : unaliased.toString();
}

/**
 * Create a new error for the current expression
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
CronExpression.setMethod(function createInvalidExpressionError(msg) {
	return new Error(`Invalid cron expression [${this.expression}]. ${msg}`);
});

/**
 * Deduplicate an array
 *
 * @author   Santhosh Kumar <brsanthu@gmail.com>
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
function dedupe(inArray, keySupplier = (it) => it) {
	const seen = new Set();
	const deduped = [];

	inArray.forEach((x) => {
		const keyValue = keySupplier(x);
		if (!seen.has(keyValue)) {
			seen.add(keyValue);
			deduped.push(x);
		}
	});

	return deduped;
}
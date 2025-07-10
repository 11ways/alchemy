const DATETIME = Symbol('datetime');

/**
 * The custom al-time element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const AlTime = Function.inherits('Alchemy.Element', 'AlTime');

/**
 * The preferred format
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 */
AlTime.setAttribute('format', null, function setFormat(format) {
	this._populate({value: this.datetime, format: format});
	return format;
});

/**
 * Get/set the datetime value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 */
AlTime.setAttribute('datetime', null, function setDatetime(value) {
	this._populate({value: value});
	return this[DATETIME];
});

/**
 * Set the value with a function call
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 */
AlTime.setMethod(function setDatetime(value) {
	this.datetime = value;
});

/**
 * Populate the element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @return   {Object[]}
 */
AlTime.setMethod(function populate() {
	let iso_string = this._populate({value: this.value, format: this.format});
	this[DATETIME] = iso_string;
	return iso_string;
});

/**
 * Populate the element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 */
AlTime.setMethod(function _populate(input) {

	if (!input) {
		input = {};
	}

	let {value, format} = input;

	if (value == null) {
		value = this[DATETIME];
	}

	if (format == null) {
		format = this.format;
	}

	let iso_date,
	    date;

	if (value) {
		date = Date.create(value);
		iso_date = date.toISOString();
	} else {
		iso_date = '';
	}

	value = iso_date;

	if (Blast.isServer) {
		return value;
	}

	let target_element = this.children?.[0];

	if (!target_element) {
		target_element = this.createElement('time');
		this.append(target_element);
	}

	let tag_name = target_element.tagName;
	let formatted;

	if (format) {
		formatted = date.format(format);
	} else {
		formatted = date + '';
	}

	if (tag_name == 'INPUT') {
		target_element.value = formatted;
	} else {
		if (tag_name == 'TIME') {
			target_element.setAttribute('datetime', iso_date);
		}

		target_element.textContent = formatted;
	}
});
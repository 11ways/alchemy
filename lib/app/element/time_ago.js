const TIMEOUT_ID = Symbol('timeout_id');

/**
 * The custom al-time-ago element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
const TimeAgo = Function.inherits('Alchemy.Element', 'TimeAgo');

/**
 * Set the time
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
TimeAgo.setAttribute(function date(str) {

	if (!str) {
		return null;
	}

	if (!this._date) {
		this._date = Date.create(str);
	}

	return this._date;
}, function setValue(value) {

	if (value) {
		this._date = Date.create(value);
	} else {
		this._date = null;
	}

	this.refresh(true);

	if (!this._date) {
		this.setAttribute('title', '');
		return '';
	}

	this.setAttribute('title', this._date.format('Y-m-d H:i:s'));

	return this._date.toISOString();
});

/**
 * Get the value
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
TimeAgo.setProperty(function value() {

	var date = this.date;

	if (!date) {
		return '';
	}

	return date.timeAgo();
});

/**
 * The element has been inserted in the dom
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
TimeAgo.setMethod(function connected() {
	this.refresh();
});

/**
 * Refresh the content
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.1.0
 * @version  1.3.17
 */
TimeAgo.setMethod(function refresh() {

	let text = this.value;

	if (this.textContent != text) {
		this.textContent = text;
	}

	if (Blast.isNode || !this.isConnected || !this.date) {
		return;
	}

	let diff = Math.abs(Date.now() - this.date),
	    timer;

	if (diff < 1000 * 70) {
		timer = 1000;
	} else {
		timer = 1000 * 29;
	}

	if (this[TIMEOUT_ID]) {
		clearTimeout(this[TIMEOUT_ID]);
	}

	this[TIMEOUT_ID] = setTimeout(() => this.refresh(), timer);
});
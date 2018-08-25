/**
 * The custom time-ago element
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 */
var TimeAgo = Function.inherits('Alchemy.Element', function TimeAgo() {
	return TimeAgo.super.call(this);
});

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

	var date;

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
 * Refresh the content
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Boolean}   reset_timer
 */
TimeAgo.setMethod(function refresh(reset_timer) {

	var that = this,
	    counter,
	    timer,
	    diff;

	this.innerHTML = this.value;

	if (!reset_timer || Blast.isNode) {
		return;
	}

	if (this._timer) {
		clearInterval(this._timer);
		this._timer = null;
	}

	if (this.date) {
		diff = Date.now() - this.date;
		counter = 0;

		if (diff < 1000 * 29) {
			timer = 1000;
		} else {
			timer = 1000 * 29;
		}

		this._timer = setInterval(function doUpdate() {
			counter++;

			if (counter > 60) {
				that.refresh(true);
			} else {
				that.refresh();
			}
		}, timer);
	}
});
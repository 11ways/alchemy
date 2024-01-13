var path = alchemy.use('path'),
    fs   = alchemy.use('fs');

/**
 * The Accumulator:
 * when you expect data to come in, but you don't know how many,
 * this class will accumulate it and fire the callback after a timeout.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.2.0
 */
var Accumulator = Function.inherits('Alchemy.Base', function Accumulator(callback) {

	// Function to call with the accumulated data
	this.callback = callback;

	// Has this instance finished?
	this.finished = false;

	// The actual accumulated data
	this.data = [];

	// The initial timeout (10 seconds)
	this.setTimeout(10);
});

/**
 * Fire the callback after these given amount of seconds
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {number}   seconds
 */
Accumulator.setMethod(function setTimeout(seconds) {

	var that = this;

	if (this.timeout) {
		clearTimeout(this.timeout);
	}

	this.timeout = global.setTimeout(function timedOut() {
		that.finish();
	}, seconds * 1000);
});

/**
 * Fire the callback now
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.2.0
 */
Accumulator.setMethod(function finish() {

	// Do nothing if it has already finished
	if (this.finished) {
		return;
	}

	// Make sure to clear the timeout
	if (this.timeout) {
		clearTimeout(this.timeout);
	}

	// Indicate this accumulator is done
	this.finished = true;

	// Emit the finished event
	this.emit('finished', this.data);

	if (this.callback) this.callback(this.data);
});

/**
 * Add data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.1.0
 */
Accumulator.setMethod(function addData() {

	var length = arguments.length,
	    args = new Array(length),
	    i;

	for (i = 0; i < length; i++) {
		args[i] = arguments[i];
	}

	// Add it to the data array
	this.data.push(args);

	// Set the timeout to 2 seconds
	this.setTimeout(2);

	// Emit the data event
	this.emit('data', args);
});
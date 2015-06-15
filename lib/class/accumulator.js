return
var clients   = alchemy.shared('Socket.clients'),
    types     = alchemy.shared('Socket.types'),
    iostream  = alchemy.use('socket.io-stream'),
    yenc      = alchemy.use('yenc-stream'),
    path      = alchemy.use('path'),
    fs        = alchemy.use('fs');

/**
 * The Accumulator:
 * when you expect data to come in, but you don't know how many,
 * this class will accumulate it and fire the callback after a timeout.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
alchemy.create(function Accumulator() {

	this.init = function init(callback) {

		var that = this;

		// The final callback
		this.callback = callback;

		// This isn't finished yet
		this.finished = false;

		// The accumulated data
		this.data = [];

		// Set the initial timeout to 10 seconds
		this.setTimeout(10);
	};

	/**
	 * Fire the callback after these given amount of seconds
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 *
	 * @param    {Number}   seconds
	 */
	this.setTimeout = function _setTimeout(seconds) {

		var that = this;

		if (this.timeout) {
			clearTimeout(this.timeout);
		}

		this.timeout = setTimeout(function() {
			that.finish();
		}, seconds * 1000);
	};

	/**
	 * Fire the callback now
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	this.finish = function finish() {

		if (this.finished) {
			throw alchemy.createError('This callback has already been executed');
		}

		if (this.timeout) {
			clearTimeout(this.timeout);
		}

		this.finished = true;

		this.callback(this.data);
	};

	/**
	 * Add data
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.1.0
	 * @version  0.1.0
	 */
	this.addData = function addData() {

		// Turn the arguments into an actual array
		var args = Array.cast(arguments);

		// Add it to the data
		this.data.push(args);

		// Set the timeout to 2 seconds
		this.setTimeout(2);
	};

});
var clients   = alchemy.shared('Socket.clients'),
    types     = alchemy.shared('Socket.types'),
    iostream  = alchemy.use('socket.io-stream'),
    yenc      = alchemy.use('yenc-stream'),
    path      = alchemy.use('path'),
    fs        = alchemy.use('fs');

/**
 * The Accumulator
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.create(function Accumulator() {

	this.init = function init(callback) {

		var that = this;

		// The final callback
		this.callback = callback;

		// This isn't finished yet
		this.finished = false;

		// Set the initial timeout to 10 seconds
		this.timeout = setTimeout(function() {

		}, 10000);

	};

	/**
	 * Fire the callback after these given amount of seconds
	 *
	 * @author   Jelle De Loecker   <jelle@codedor.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Number}   seconds
	 */
	this.setTimeout = function setTimeout(seconds) {

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
	 * @since    0.0.1
	 * @version  0.0.1
	 */
	this.finish = function finish() {

		if (this.finished) {
			throw alchemy.createError('This callback has already been executed');
		}

		if (this.timeout) {
			clearTimeout(this.timeout);
		}

		this.finished = true;

		this.callback();
	};

});
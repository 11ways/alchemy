var running = alchemy.shared('Command.running', 'Array');

/**
 * The base "Command" class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.3
 * @version  0.2.3
 */
var Command = Function.inherits('Informer', 'Alchemy', function Command() {

	// When this command started executing
	this.started = null;

	// When this command stopped executing
	this.stopped = null;

	// Caught error
	this.error = null;

	// Current percentage
	this.percentage = null;

	// Status reports
	this.reports = [];
});

/**
 * Each command has a configuration schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.3
 * @version  0.2.3
 */
Command.constitute(function setSchema() {
	this.schema = new alchemy.classes.Schema(this);
});

/**
 * Return the class-wide schema
 *
 * @type   {Schema}
 */
Command.setProperty(function schema() {
	return this.constructor.schema;
});

/**
 * Start executing the command
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.3
 * @version  0.2.3
 *
 * @param    {Object}   options    User provided data
 * @param    {Object}   callback
 */
Command.setMethod(function start(options, callback) {

	var that = this,
	    run_id = Crypto.pseudoHex();

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	// Register this command as running
	running.push(this);

	// Set the id
	this.id = run_id;

	// Set the start time
	this.started = Date.now();

	// Actually execute the command
	this.execute(options, function done(err, result) {

		var report;

		that.stopped = Date.now();

		if (err) {

			// Set the error
			that.error = err;

			// Report failed
			report = that.report('failed');
			report.error = err;

			return callback(err);
		}

		callback(null, result);
	});
});

/**
 * Report command progress
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.3
 * @version  0.2.3
 *
 * @param    {Number}   percentage    Percentage that is done
 * @param    {String}   type          The type of status
 *
 * @return   {Object}
 */
Command.setMethod(function report(percentage, type) {

	var modified = false,
	    report,
	    i;

	if (type == null) {
		report = this.reports.last();

		// If no report was found, and no percentage given,
		// use zero as percentage
		if (!report && percentage == null) {
			percentage = 0;
		}
	} else {
		// See if this report already exists
		for (i = 0; i < this.reports.length; i++) {
			if (this.reports[i].type == type) {
				report = this.reports[i];
			}
		}
	}

	if (report == null) {
		report = {
			start : Date.now(),
			type  : type,
			logs  : []
		};

		this.reports.push(report);
	}

	report.update = Date.now();

	if (percentage == 'done' || percentage == 100) {
		report.percentage = 100;
		report.done = true;
	} else if (percentage == 'failed') {
		report.done = true;
		report.failed = true;
	} else if (percentage != null) {
		report.percentage = percentage;
	}

	this.emit('report', report);

	return report;
});

/**
 * Log command messages
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.3
 * @version  0.2.3
 */
Command.setMethod(function log() {

	var report = this.report(),
	    args = [],
	    i;

	for (i = 0; i < arguments.length; i++) {
		args[i] = arguments[i];
	}

	report.logs.push({
		time : Date.now(),
		args : args
	});
});
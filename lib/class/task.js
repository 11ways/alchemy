var running = alchemy.shared('Task.running', 'Array');

/**
 * The base "Task" class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.5.0
 */
var Task = Function.inherits('Alchemy.Base', function Task() {

	// When this command started executing
	this.started = null;

	// When this command stopped executing
	this.stopped = null;

	// Caught error
	this.error = null;

	// Current percentage
	this.percentage = null;
	this.progress = 0;

	// Status reports
	this.reports = [];
});

/**
 * Each command has a configuration schema
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.5.0
 */
Task.constitute(function setSchema() {

	// Create the schema
	this.schema = new Classes.Alchemy.Schema(this);
});

/**
 * Return the class-wide schema
 *
 * @type   {Schema}
 */
Task.setProperty(function schema() {
	return this.constructor.schema;
});

/**
 * This is a wrapper class
 *
 * @type   {Boolean}
 */
Task.setProperty('is_abstract_class', true);

/**
 * This wrapper class starts a new group
 *
 * @type   {Boolean}
 */
Task.setProperty('starts_new_group', true);

/**
 * Indicate this command can be paused
 *
 * @type   {Boolean}
 */
Task.setProperty('can_be_paused', true);

/**
 * Indicate this command can be stopped
 *
 * @type   {Schema}
 */
Task.setProperty('can_be_stopped', true);

/**
 * Static description,
 * only set when command block should never use
 * `_getDescription`
 *
 * @type {Boolean}
 */
Task.setProperty('static_description', '');

/**
 * Always execute `_getDescription`, even when
 * there are no settings
 *
 * @type {Boolean}
 */
Task.setProperty('force_description_callback', false);

/**
 * Return the basic record for JSON
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Task.setMethod(function toJSON() {
	return {
		id                : this.id,
		name              : this.name || this.type_name,
		title             : this.title,
		started           : this.started,
		stopped           : this.stopped,
		paused            : this.paused,
		error             : this.error,
		percentage        : this.percentage,
		reports           : this.reports,
		manual_stop_start : this.manual_stop_start,
		manual_stop_end   : this.manual_stop_end,
		need_stop         : this.need_stop,
		description       : this.description
	};
});

/**
 * Callback with a nice description
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Function}   callback
 */
Task.setMethod(function getDescription(callback) {

	var that = this;

	// If there is a static description, that should be returned
	if (this.static_description && !this.force_description_callback) {
		return callback(null, this.static_description);
	}

	return this._getDescription(function gotDescription(err, description) {

		if (err) {
			return callback(err);
		}

		that.description = description;
		return callback(null, description);
	});
});

/**
 * Callback with a nice description,
 * should be modified upon extension
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Function}   callback
 */
Task.setMethod(function _getDescription(callback) {
	callback(null, this.title || this.name);
});

/**
 * The function to execute, needs to be overridden
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {Object}   payload    User provided data
 * @param    {Object}   callback
 */
Task.setMethod(function execute(payload, callback) {
	if (!callback) {
		callback = Function.thrower;
	}

	callback(new Error('Task ' + this.title + ' has no executable function!'));
});

/**
 * Start executing the command
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.5.0
 *
 * @param    {Object}   payload    User provided data
 * @param    {Object}   callback
 */
Task.setMethod(function start(payload, callback) {

	var that = this,
	    run_id = String(alchemy.ObjectId());

	if (typeof payload == 'function') {
		callback = payload;
		payload = {};
	}

	if (typeof callback != 'function') {
		callback = Function.thrower;
	}

	if (!payload) {
		payload = {};
	}

	// Store the payload
	this.payload = payload;

	// Register this command as running
	running.push(this);

	// Set the id
	this.id = run_id;

	// Set the start time
	this.started = Date.now();

	// Actually execute the command
	this.execute(payload, function done(err, result) {

		var report;

		// Catch manua stop requests
		if (err == 'stopped') {
			that.report('stopped', 'Stopped');
			return callback(null);
		}

		if (err) {

			// Set the error
			that.error = err;

			// Report failed
			report = that.report('failed');
			report.error = err;

			return callback(err);
		}

		// If the command hasn't been manually stopped,
		// report it as done
		if (!that.manual_stop_end) {
			that.report('done');
		}

		callback(null, result);
	});
});

/**
 * Stop the running command
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Object}   callback
 */
Task.setMethod(function stop(callback) {

	var that = this;

	if (!callback) {
		callback = Function.thrower;
	}

	// Set time when manual stop was requested
	this.manual_stop_start = Date.now();
	this.need_stop = true;

	if (typeof this.doStop == 'function') {
		return this.doStop(function stopped(err) {

			if (err) {
				return callback(err);
			}

			that.manual_stop_end = Date.now();
			callback(null);
		});
	} else {
		callback();
	}
});

/**
 * Pause the running command
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Object}   callback
 */
Task.setMethod(function pause(callback) {

	var that = this;

	if (!callback) {
		callback = Function.thrower;
	}

	// Indicate this command needs to be paused
	this.pause_requested = true;

	if (typeof this.doPause == 'function') {
		return this.doPause(function paused(err) {

			if (err) {
				return callback(err);
			}

			callback(null);
		});
	} else {
		callback();
	}
});

/**
 * Resule the paused command
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Object}   callback
 */
Task.setMethod(function resume(callback) {

	var that = this;

	if (!callback) {
		callback = Function.thrower;
	}

	// Indicate this command needs to be resumed
	this.pause_requested = false;
	this.resume_requested = true;

	if (typeof this.doResume == 'function') {
		return this.doResume(function resumed(err) {

			if (err) {
				return callback(err);
			}

			callback(null);
		});
	} else {
		callback();
	}
});

/**
 * Report command progress
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @param    {Number}   percentage    Percentage that is done
 * @param    {String}   type          The type of status
 *
 * @return   {Object}
 */
Task.setMethod(function report(percentage, type) {

	var modified = false,
	    report,
	    i;

	if (!type && percentage == 'stopped') {
		type = 'Stopped';
	}

	if (percentage == 'paused') {
		this.paused = true;
	} else {
		this.paused = false;
	}

	report = this.reports.last();

	if (type == null) {
		// If no report was found, and no percentage given,
		// use zero as percentage
		if (!report && percentage == null) {
			percentage = 0;
		}
	} else {
		if (report && report.type != type) {
			report = null;
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
	} else if (percentage == 'stopped') {
		report.done = true;
		this.manual_stop_end = Date.now();
	} else if (percentage != null && typeof percentage == 'number') {
		report.percentage = percentage;
	}

	if (report.done && this.stopped == null) {
		this.stopped = Date.now();
	}

	if (report.percentage != null) {
		this.percentage = report.percentage;
		this.reportProgress(report.percentage, type);
	}

	this.emit('report', report);
	alchemy.updateData(this.id, this);

	return report;
});

/**
 * Report progress, Janeway hooks into this
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {Number}   value   A value between 0-100
 * @param    {String}   label   An optional label
 */
Task.setMethod(function reportProgress(value, label) {
	this.progress = value;
});

/**
 * Log command messages
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.3.0
 */
Task.setMethod(function log() {

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

/**
 * Start executing a task
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.3.0
 * @version  0.5.0
 *
 * @return   {Task}
 */
Task.execute = function execute(name, options, callback) {

	var constructor = Task.getMember(name),
	    task;

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	if (!constructor) {
		return callback(new Error('Could not find "' + name + '" task'));
	}

	task = new constructor();
	task.start(options, callback);

	return task;
};
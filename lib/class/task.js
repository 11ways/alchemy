const running = alchemy.shared('Task.running', 'Array'),
      HISTORY_DOC = Symbol('history_document'),
      PAUSE_PLEDGE = Symbol('pause_pledge'),
      RUNNING_PLEDGE = Symbol('running_pledge'),
      INITIALIZED_PLEDGE = Symbol('initialized_pledge'),
      STATUS = Symbol('status'),
      STARTING = 0,
      STARTED = 1,
      PAUSED = 2,
      STOPPED = 3;

/**
 * The base "Task" class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.5.0
 */
const Task = Function.inherits('Alchemy.Base', 'Alchemy.Task', function Task() {

	// When this command started executing
	this.started_at = null;

	// When this command stopped executing
	this.stopped_at = null;

	// The current status
	this[STATUS] = STARTING;

	// Optional pause pledge
	this[PAUSE_PLEDGE] = null;

	// The main running pledge
	this[RUNNING_PLEDGE] = null;

	// Pledge that resolves when the task is initialized (has an ID)
	this[INITIALIZED_PLEDGE] = null;

	// Caught error
	this.error = null;

	// Current percentage
	this.percentage = null;
	this.progress = 0;

	// Status reports
	this.reports = [];

	// The payload/settings
	this.payload = null;

	// The origin AlchemyTask document
	this.alchemy_task_document = null;

	// The AlchemyTaskHistory document
	this[HISTORY_DOC] = null;
});

/**
 * Add a forced cron schedule:
 * this task will always run at the given time
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {string}   cron_schedule
 * @param    {Object}   settings
 */
Task.setStatic(function addForcedCronSchedule(cron_schedule, settings) {

	cron_schedule = new Classes.Alchemy.Cron(cron_schedule);

	if (!this.forced_cron_schedules) {
		this.forced_cron_schedules = [];
	}

	this.forced_cron_schedules.push({cron_schedule, settings});
});

/**
 * Add a fallback cron schedule:
 * this task will run at the given time if no other schedule is found
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {string}   cron_schedule
 * @param    {Object}   settings
 */
Task.setStatic(function addFallbackCronSchedule(cron_schedule, settings) {

	cron_schedule = new Classes.Alchemy.Cron(cron_schedule);

	if (!this.fallback_cron_schedules) {
		this.fallback_cron_schedules = [];
	}

	this.fallback_cron_schedules.push({cron_schedule, settings});
});

/**
 * Each command has a configuration schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @type     {Schema}
 */
Task.setProperty(function schema() {
	return this.constructor.schema;
});

/**
 * This is a wrapper class
 */
Task.makeAbstractClass();

/**
 * This wrapper class starts a new group
 */
Task.startNewGroup();

/**
 * Indicate this command can be paused
 *
 * @type     {boolean}
 */
Task.setProperty('can_be_paused', true);

/**
 * Indicate this command can be stopped
 *
 * @type     {Schema}
 */
Task.setProperty('can_be_stopped', true);

/**
 * Static description,
 * only set when command block should never use
 * `_getDescription`
 *
 * @type     {boolean}
 */
Task.setProperty('static_description', '');

/**
 * Always execute `_getDescription`, even when
 * there are no settings
 *
 * @type     {boolean}
 */
Task.setProperty('force_description_callback', false);

/**
 * Has this task started?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @type     {boolean}
 */
Task.setProperty(function has_started() {
	return this[STATUS] > STARTING;
});

/**
 * Has this task been paused?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @type     {boolean}
 */
Task.setProperty(function is_paused() {
	return this[STATUS] == PAUSED;
});

/**
 * Has this task stopped?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @type     {boolean}
 */
Task.setProperty(function has_stopped() {
	return this[STATUS] == STOPPED;
});

/**
 * Return the basic record for JSON
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.0.0
 */
Task.setMethod(function toJSON() {
	return {
		id                : this.id,
		name              : this.name || this.constructor.type_name,
		title             : this.constructor.title,
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.3.17
 *
 * @return   {Promise<string>}
 */
Task.setMethod(async function getDescription() {

	// If there is a static description, that should be returned
	if (this.static_description && !this.force_description_callback) {
		return this.static_description;
	}

	let description = await this._getDescription();
	this.description = description;

	return description;
});

/**
 * Callback with a nice description,
 * should be modified upon extension
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  0.3.0
 *
 * @return   {Promise<string>}
 */
Task.setMethod(async function _getDescription() {
	return this.constructor.title || this.name;
});

/**
 * The main function to execute. Should not be called directly.
 * Needs to be overridden by child classes.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  1.3.17
 */
Task.setMethod(async function executor() {
	throw new Error('Task ' + this.constructor.title + ' has no executor function!');
});

/**
 * Set the payload/settings
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Object}   payload    User provided data
 */
Task.setMethod(function setPayload(payload) {
	this.payload = payload;
});

/**
 * Set the original AlchemyTask document
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Document.AlchemyTask}   doc
 */
Task.setMethod(function setAlchemyTaskDocument(doc) {
	this.alchemy_task_document = doc;
});

/**
 * Set the AlchemyTaskHistory document
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Document.AlchemyTaskHistory}   doc
 */
Task.setMethod(function setAlchemyTaskHistoryDocument(doc) {
	this[HISTORY_DOC] = doc;
});

/**
 * Start executing the command
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.4.0
 *
 * @param    {Object}   payload    User provided data
 */
Task.setMethod(async function start(payload) {

	if (this.has_started) {
		throw new Error('Task ' + this.constructor.title + ' has already started!');
	}

	if (payload) {
		this.setPayload(payload);
	}

	const History = Model.get('System.TaskHistory');

	this[STATUS] = STARTED;
	this[RUNNING_PLEDGE] = new Pledge();
	this[INITIALIZED_PLEDGE] = new Pledge();

	let document = this[HISTORY_DOC];

	if (!document) {
		document = History.createDocument();
		document.type = this.constructor.type_path || this.constructor.type_name;
		document.alchemy_task_id = this.alchemy_task_document?.$pk;
		document.process_id = process.pid;
		this[HISTORY_DOC] = document;
	}

	let started_at = new Date();
	document.settings = this.payload;
	document.started_at = started_at;
	document.is_running = true;

	// Register this command as running
	running.push(this);

	await document.save();

	// Set the id
	this.id = String(document.$pk);

	// Resolve the initialized pledge so callers can get the ID immediately
	this[INITIALIZED_PLEDGE].resolve(this.id);

	// Set the start time
	this.started = started_at.getTime();

	let result;

	try {
		result = await this.executor();
	} catch (err) {
		if (err == 'stopped') {
			this.report('stopped', 'Stopped');
			return;
		}

		// Set the error
		this.error = err;

		// Report failed
		let report = this.report('failed');
		report.error = err;

		throw err;
	}

	// If the command hasn't been manually stopped,
	// report it as done
	if (!this.manual_stop_end) {
		this.report('done');
	}

	document.ended_at = new Date();
	document.is_running = false;
	await document.save();

	this[RUNNING_PLEDGE].resolve(result);

	return result;
});

/**
 * Stop the running command
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.3.17
 */
Task.setMethod(async function stop() {

	// Set time when manual stop was requested
	this.manual_stop_start = Date.now();
	this.need_stop = true;

	if (typeof this.doStop == 'function') {
		let result = await this.doStop();
		this.manual_stop_end = Date.now();
		return result;
	}
});

/**
 * Pause the running command
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.3.17
 */
Task.setMethod(function pause() {

	// Do nothing if already paused
	if (this.is_paused) {
		return;
	}

	// If this has stopped, throw an error
	if (this.has_stopped) {
		throw new Error('Unable to pause a task that has already stopped');
	}

	this[PAUSE_PLEDGE] = new Pledge();
	this[STATUS] = PAUSED;

	if (typeof this.doPause == 'function') {
		return this.doPause();
	}
});

/**
 * Resume this task if it has been paused
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.3.17
 */
Task.setMethod(function resume() {

	if (!this.is_paused) {
		return;
	}

	if (this.has_stopped) {
		throw new Error('Unable to resume a task that has already stopped');
	}

	if (typeof this.doResume == 'function') {
		this.doResume();
	}

	// If there is a pause pledge, resolve it
	if (this[PAUSE_PLEDGE]) {
		this[PAUSE_PLEDGE].resolve();
		this[PAUSE_PLEDGE] = null;
	}

	// Set the status back to `started`
	this[STATUS] = STARTED;
});

/**
 * Get a parameter from the payload by the given name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
Task.setMethod(function getParam(name) {
	return this.payload?.[name];
});

/**
 * Wait until the task is initialized (has an ID).
 * Returns a pledge that resolves with the task ID once the history document is saved.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {Pledge<string>}   Pledge that resolves with the task ID
 */
Task.setMethod(function waitUntilInitialized() {

	// If already initialized, return the ID immediately
	if (this.id) {
		return Pledge.resolve(this.id);
	}

	// Return the initialized pledge (will be resolved when ID is set)
	return this[INITIALIZED_PLEDGE];
});

/**
 * Wait for the pause to resolve
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.21
 */
Task.setMethod(function waitUntilResumed() {

	if (!this.is_paused || this.has_stopped) {
		return false;
	}

	let paused = this[PAUSE_PLEDGE];

	if (paused) {
		return paused;
	}

	return this.waitIfTooBusy();
});

/**
 * Wait if the system is too busy
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
Task.setMethod(function waitIfTooBusy() {

	if (!alchemy.isTooBusy()) {
		return false;
	}

	return doAsyncLoopUntilNotBusy(10);
});

/**
 * Do a loop until the system is no longer busy
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.21
 * @version  1.3.21
 */
async function doAsyncLoopUntilNotBusy(max_tries) {

	let tries = 0;

	if (!max_tries || max_tries < 1) {
		max_tries = 5;
	}

	do {
		console.log('Waiting for system to be less busy', tries)
		await Pledge.after(500);
		tries++;
	} while (tries < max_tries && alchemy.isTooBusy());

	return true;
}

/**
 * Report command progress
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.3.17
 *
 * @param    {number}   percentage    Percentage that is done as a decimal (between 0 & 1)
 * @param    {string}   type          The type of status
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

	if (typeof percentage == 'number') {
		percentage = Math.round(percentage * 10000) / 100;
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
 * Report progress, Janeway monkey-patches this method
 * and uses it to display the progress bar.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  0.5.0
 *
 * @param    {number}   value   A value between 0-100
 * @param    {string}   label   An optional label
 */
Task.setMethod(function reportProgress(value, label) {
	this.progress = value;
});

/**
 * Log command messages
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
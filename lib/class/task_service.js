let TIMEOUT_UPDATE_INTERVAL = 7200000; // 2 hours
let MAX_TIMEOUT_DURATION = 86400000; // 24 hours

let running_task_menu,
    start_task_menu,
    singleton;

/**
 * The TaskService class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
const Service = Function.inherits('Alchemy.Base', 'Alchemy.Task', function TaskService() {

	if (singleton) {
		return singleton;
	}

	// Get the AlchemyTask model
	this.AlchemyTask = Model.get('AlchemyTask');

	// Keep track of all running tasks
	this.running_tasks = [];

	// Keep track of next schedule per task
	this.schedules = new Map();

	// Has the task service finished loading?
	this.has_loaded = false;

	this.initSchedules();

	singleton = this;

	if (alchemy.settings.janeway_task_menu) {
		this.createJanewayTaskMenu();
	}
});

/**
 * Get a TaskSchedule instance for the given taks
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @return   {TaskSchedules|String}
 */
Service.setMethod(function getTaskSchedules(constructor) {

	if (typeof constructor == 'string') {
		constructor = Classes.Alchemy.Task.Task.getMember(constructor);

		if (!constructor) {
			console.warn('Could not find task constructor', constructor);
		}
	}

	if (!constructor) {
		return null;
	}

	let result = this.schedules.get(constructor);

	if (!result) {
		result = new TaskSchedules(constructor);
		this.schedules.set(constructor, result);
	}

	return result;
});

/**
 * Checksum the given cron schedule & settings
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {String} type_path
 * @param    {Cron}   cron
 * @param    {Object} settings
 *
 * @return   {String}
 */
Service.setMethod(function checksumSystemSchedule(type_path, cron, settings) {

	if (!cron) {
		return '';
	}

	if (!settings) {
		settings = {};
	}

	let result = Object.checksum([type_path, cron.toDry(), settings]);

	return result;
});

/**
 * Initialize the schedules on boot
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
Service.setMethod(async function initSchedules() {

	if (this.has_loaded) {
		return;
	}

	let crit = this.AlchemyTask.find();
	crit.where('schedule_type').in(['system_forced', 'system_fallback']);

	let existing_system_records = new Map(),
	    required_system_schedules = new Map();

	// Iterate over all the Task classes & see if they have any forced schedules
	for (let task_class of Classes.Alchemy.Task.Task.getLiveDescendantsMap()) {

		let forced_schedules = task_class.forced_cron_schedules,
		    fallback_schedules = task_class.fallback_cron_schedules;

		// Add the hard-coded forced schedules
		if (forced_schedules?.length) {
			for (let entry of forced_schedules) {
				let checksum = this.checksumSystemSchedule(task_class.type_path, entry.cron_schedule, entry.settings);
				required_system_schedules.set(checksum, {
					schedule_type : 'system_forced',
					task_type     : task_class.type_path,
					cron          : entry.cron_schedule,
					settings      : entry.settings,
				});
			}
		}

		// And the fallback schedules
		if (fallback_schedules?.length) {
			for (let entry of fallback_schedules) {
				let checksum = this.checksumSystemSchedule(task_class.type_path, entry.cron_schedule, entry.settings);
				required_system_schedules.set(checksum, {
					schedule_type : 'system_fallback',
					task_type     : task_class.type_path,
					cron          : entry.cron_schedule,
					settings      : entry.settings,
				});
			}
		}
	}

	// Iterate over all the existing system schedules in the database
	for await (let record of crit) {

		if (!record.schedule_type || record.schedule_type == 'user') {
			continue;
		}

		try {

			const checksum = record.forced_schedule_checksum;

			// If (for any reason) this system schedule does not have a checksum,
			// just remove it
			if (!checksum) {
				await record.remove();
			}

			let entry = required_system_schedules.get(checksum);

			// If the checksum is not in the required system schedules, remove it
			if (!entry) {
				await record.remove();
			}

			// If this checksum has already been seen, also remove it
			if (existing_system_records.has(checksum)) {
				await record.remove();
			}

			// Update the record
			record.frequency = entry.cron.input;
			record.settings = entry.settings;
			record.schedule_type = entry.schedule_type;

			await record.save();

		} catch (err) {
			alchemy.registerError(err);
		}
	}

	// Iterate over all the required system schedules and create new ones
	for (let [checksum, entry] of required_system_schedules) {

		if (existing_system_records.has(checksum)) {
			continue;
		}

		try {
			let record = this.AlchemyTask.createDocument();
			record.frequency = entry.cron.input;
			record.settings = entry.settings;
			record.schedule_type = entry.schedule_type;
			record.forced_schedule_checksum = checksum;
			record.type = entry.task_type;
			record.enabled = true;
			await record.save();

			existing_system_records.set(checksum, record);
		} catch (err) {
			alchemy.registerError(err);
		}
	}

	// Now we can schedule all the tasks
	await this.rescheduleAllTasks();

	// Check all the timeout calls every 2 hours
	setInterval(() => this.updateTimeoutCalls(), TIMEOUT_UPDATE_INTERVAL);

	this.has_loaded = true;
});

/**
 * Create the Janeway task menu
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
Service.setMethod(function createJanewayTaskMenu() {

	if (!alchemy.Janeway || running_task_menu) {
		return;
	}

	running_task_menu = alchemy.Janeway.addIndicator('⌚︎', {
		sorter: function sortItems(a, b) {

			let result = 0;

			if (!a.task_schedule) {
				// Things without schedules are titles
				result = -10;
			} else if (!b.task_schedule) {
				// Things without schedules are titles
				result = 10;
			} else if (a.task_schedule.is_running) {
				// If it's running, it should be at the top
				result = -5;
			} else if (a.task_schedule.has_ended) {
				// If it has ended, it should be at the bottom
				result = -3;
			} else if (!a.task_schedule.next_scheduled_date) {
				// If it has no scheduled date, it should be at the bottom
				result = 1;
			} else {
				result = a.task_schedule.next_scheduled_date - b.task_schedule.next_scheduled_date;
			}

			return result;
		}
	});

	if (!running_task_menu.addItem) {
		return running_task_menu.remove();
	}

	running_task_menu.addItem('Currently scheduled tasks:', () => {
		console.log('Currently scheduled tasks:', this.schedules);
	});

	alchemy.Janeway.running_task_menu = running_task_menu;
	this.janeway_running_task_menu = running_task_menu;
	this.janeway_running_task_menu_entries = [];

	start_task_menu = alchemy.Janeway.addIndicator('▶︎', {
		area: 'left',
		sorter: function(a, b) {

			if (!isFinite(a.weight) || !isFinite(b.weight)) {
				return b.weight - a.weight;
			}

			return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
		}
	});

	start_task_menu.addItem('Start a task:', {weight: Infinity});
});

/**
 * Update all the schedule `setTimeout` calls that need it
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
Service.setMethod(function updateTimeoutCalls() {
	for (let task_schedule of this.schedules.values()) {
		task_schedule.updateTimeoutCalls();
	}
});

/**
 * Schedule forced tasks
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
Service.setMethod(async function rescheduleAllTasks() {

	// Iterate over all the existing schedules & clear them
	for (let existing_schedule of this.schedules.values()) {
		existing_schedule.clearAll();
	}

	// Iterate over all the Task classes & reschedule them
	for (let task_class of Classes.Alchemy.Task.Task.getLiveDescendantsMap()) {
		await this.rescheduleTasksOfType(task_class);
	}
});

/**
 * Get the constructor of the given task type
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {String|Function}   task_type_path
 *
 * @return   {Function|Boolean}
 */
Service.setMethod(function getTaskConstructor(task_type_path) {

	let task_class;

	if (typeof task_type_path == 'string') {
		task_class = Classes.Alchemy.Task.Task.getMember(task_type_path);

		if (!task_class) {
			console.warn('Could not find task constructor', task_type_path);
			return false;
		}
	} else if (typeof task_type_path == 'function') {
		task_class = task_type_path;
	} else {
		task_class = false;
	}

	return task_class;
});

/**
 * Reschedule all tasks of the given type
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {String|Function}   task_class
 */
Service.setMethod(async function rescheduleTasksOfType(task_class) {

	task_class = this.getTaskConstructor(task_class);

	if (!task_class) {
		return;
	}

	let schedules = this.getTaskSchedules(task_class);

	if (!schedules) {
		return;
	}

	schedules.clearAll();

	const Task = Model.get('AlchemyTask');
	const crit = Task.find();
	crit.where('type').equals(task_class.type_path);
	const records = await Task.find('all', crit);

	// Do the user & forced tasks first
	for (let task_record of records) {

		schedules.createStartMenuEntry(task_record);

		// Skip records without a valid frequency or that are disabled
		if (!task_record.frequency || !task_record.enabled) {
			continue;
		}

		if (!task_record.schedule_type || task_record.schedule_type == 'system_fallback') {
			continue;
		}

		try {
			let cron = new Classes.Alchemy.Cron(task_record.frequency);
			let settings = task_record.settings;
			schedules.add(cron, settings, task_record);
		} catch (err) {
			alchemy.registerError(err);
		}
	}

	// Do the fallback tasks now
	if (!schedules.length) {
		for (let task_record of records) {

			// Skip records without a valid frequency or that are disabled
			if (!task_record.frequency || !task_record.enabled) {
				continue;
			}
	
			// Skip records that are not fallbacks
			if (task_record.schedule_type != 'system_fallback') {
				continue;
			}

			try {
				let cron = new Classes.Alchemy.Cron(task_record.frequency);
				let settings = task_record.settings;
				schedules.add(cron, settings, task_record);
			} catch (err) {
				alchemy.registerError(err);
			}
		}
	}
});

/**
 * Simple class to keep track of a task's schedule
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
class TaskSchedules {
	task_constructor = null;
	schedules = [];
	start_task_menu_items = new Map();

	/**
	 * Initialize the instance
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	constructor(task_constructor) {
		this.task_constructor = task_constructor;
	}

	/**
	 * Getter for the amount of schedules
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	get length() {
		return this.schedules.length;
	}

	/**
	 * Add a schedule (with the given settings)
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 *
	 * @param    {Cron}      cron       The actual schedule
	 * @param    {Object}    settings   The settings
	 * @param    {Document.AlchemyTask}   task_document   The task record
	 */
	add(cron, settings, task_document) {
		let schedule = new TaskSchedule(this, cron, settings, task_document);
		schedule.calculateNextScheduledDate();
		this.schedules.push(schedule);
	}

	/**
	 * Update all the timeout calls that need it.
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	updateTimeoutCalls() {
		for (let task_schedule of this.schedules.values()) {
			task_schedule.updateTimeoutCall();
		}
	}

	/**
	 * Create a start menu entry for the given record
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	createStartMenuEntry(task_record) {

		if (!start_task_menu) {
			return;
		}

		let title = task_record.title || task_record.type;

		let entry = start_task_menu.addItem('▪︎ ' + title, () => {
			this.#startFromMenu(task_record);
		});

		this.start_task_menu_items.set(task_record, entry);
	}

	/**
	 * Start a task from the menu
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.20
	 */
	async #startFromMenu(task_record) {
		console.log('Manually starting', task_record.type, 'task:', task_record);
		let schedule = new TaskSchedule(this, null, task_record.settings, task_record);
		let task_instance = await schedule.startManually();
		console.log(' -- Started:', task_instance);

		return task_instance;
	}

	/**
	 * Clear all the schedules
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	clearAll() {

		for (let entry of this.start_task_menu_items.values()) {
			entry.remove();
		}

		this.start_task_menu_items.clear();
		
		for (let schedule of this.schedules) {
			schedule.clearTimer();
		}

		this.schedules = [];
	}
}

/**
 * Simple class to keep track of a task's schedule
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
class TaskSchedule {
	task_schedules = null;
	task_document = null;
	cron = null;
	settings = null;

	next_scheduled_date = null;
	timer_id = null;
	is_running = false;
	has_ended = false;
	task_instance = null;
	history_document = null;
	janeway_menu_item = null;

	#change_counter = 0;
	#instance_pledge = null;

	/**
	 * Initialize the instance
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 *
	 * @param    {TaskSchedules}          task_schedules
	 * @param    {Cron}                   cron
	 * @param    {Object}                 settings
	 * @param    {Document.AlchemyTask}   task_document
	 */
	constructor(task_schedules, cron, settings, task_document) {
		this.task_schedules = task_schedules;
		this.task_document = task_document;
		this.cron = cron;
		this.settings = settings;
	}

	/**
	 * Create a new instance with the current settings
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	createInstance() {
		let settings = this.settings ? JSON.clone(this.settings) : null;
		let result = new this.task_schedules.task_constructor();
		result.setPayload(settings);
		result.setAlchemyTaskDocument(this.task_document);
		result.setAlchemyTaskHistoryDocument(this.history_document);
		return result;
	}

	/**
	 * Calculate the next scheduled date
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	calculateNextScheduledDate() {
		let next_date = this.cron.getNextDate();
		this.proposeDate(next_date);
	}

	/**
	 * With the current scheduled date,
	 * check if the timeout call needs to be updated.
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	updateTimeoutCall() {

		// If it already has a timer_id, or it's running, do nothing
		if (this.timer_id != null || this.is_running) {
			return;
		}

		// If there is no next scheduled date, or it's in the past, calculate a new one
		if (!this.next_scheduled_date || this.next_scheduled_date < Date.now()) {
			return this.calculateNextScheduledDate();
		}

		// Propose the wanted next scheduled date again
		if (this.next_scheduled_date) {
			this.#setDate(this.next_scheduled_date);
		}
	}

	/**
	 * Propose a new scheduled date.
	 * If another date is already set, the closest one will be used.
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	proposeDate(scheduled_date) {

		if (this.is_running) {
			return;
		}
		
		if (!scheduled_date) {
			return;
		}

		if (!this.next_scheduled_date || scheduled_date < this.next_scheduled_date) {
			this.#setDate(scheduled_date);
		}
	}

	/**
	 * Get the AlchemyTaskHistory document for the given date.
	 * If it does not exist yet, it will be created.
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	async getHistoryDocumentForDate(date) {

		const TaskHistory = Model.get('AlchemyTaskHistory');
		const crit = TaskHistory.find();

		crit.where('scheduled_at').equals(date);
		crit.where('alchemy_task_id').equals(this.task_document.$pk);
		crit.where('type').equals(this.task_schedules.task_constructor.type_path);
		crit.where('started_at').isEmpty();

		let result = await TaskHistory.find('first', crit);

		if (!result) {
			result = TaskHistory.createDocument();

			// Try to set the possible AlchemyTask document id first
			result.alchemy_task_id = this.task_document?.$pk;

			// Set when this task is supposed to run
			result.scheduled_at = date;

			// Set our PID
			result.process_id = process.pid;

			// Set the type of task
			result.type = this.task_schedules.task_constructor.type_path;

			// Set the settings
			result.settings = this.settings;

			// It is not yet running
			result.is_running = false;

			await result.save();
		}

		return result;
	}

	/**
	 * Set the next scheduled date.
	 * Current date will be overridden no matter what.
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	#setDate(scheduled_date) {

		this.clearTimer();

		if (!scheduled_date) {
			return;
		}

		if (running_task_menu) {
			let title = this.task_document?.title || this.task_schedules.task_constructor.type_name;
			title += ' @ ' + scheduled_date.format('Y-m-d H:i:s');
			this.janeway_menu_item = running_task_menu.addItem(title, () => this.clickedJanewayMenuItem());
			this.janeway_menu_item.task_schedule = this;
		}

		// Calculate the timeout that should be set
		let timeout = scheduled_date.getTime() - Date.now();

		if (timeout < 0) {
			timeout = 0;
		}

		// `setTimeout` can only handle 32-bit integers,
		// so we can't set timeouts for longer than 24.8 days
		// We've even lowered this limit a bit further.
		if (timeout >= MAX_TIMEOUT_DURATION) {
			return;
		}

		return this.#setDateAndTimeout(scheduled_date, timeout);
	}

	/**
	 * Do something when the Janeway menu item is clicked.
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	clickedJanewayMenuItem() {
		console.log('Clicked on scheduled task:', this);
	}

	/**
	 * Actually set the date & timeout (and history document)
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	async #setDateAndTimeout(scheduled_date, timeout) {

		let current_counter = this.#change_counter;

		this.next_scheduled_date = scheduled_date;

		let history_document = await this.getHistoryDocumentForDate(scheduled_date);

		// If something else triggered a change, do nothing
		if (current_counter != this.#change_counter) {
			return;
		}

		this.history_document = history_document;

		this.timer_id = setTimeout(() => this.#run(), timeout);
	}

	/**
	 * Does the current process own this task?
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	async ownsScheduledTask() {

		if (!this.history_document || !this.next_scheduled_date) {
			return true;
		}

		// Get the document again!
		let doc = await this.getHistoryDocumentForDate(this.next_scheduled_date);

		if (!doc) {
			return true;
		}

		this.history_document = doc;

		// If it has already ended, return false
		if (doc.ended_at || doc.had_error) {
			return false;
		}

		// If we own the process, return true
		if (doc.process_id == process.pid || !doc.process_id) {
			return true;
		}

		// If the process is no longer running, claim it!
		if (!alchemy.isProcessRunning(doc.process_id)) {
			doc.process_id = process.pid;
			return true;
		}

		return false;
	}

	/**
	 * Do a manual start
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.20
	 *
	 * @return   {Task}
	 */
	async startManually() {

		if (this.is_running) {
			return false;
		}

		let pledge = new Pledge();
		this.#instance_pledge = pledge;

		this.#run(true);

		return pledge;
	}

	/**
	 * Actually run the task
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.20
	 */
	async #run(started_manually = false) {

		if (this.is_running) {
			return false;
		}

		this.is_running = true;
		let janeway_item;
		let janeway_title;

		let postfix = '';

		if (started_manually) {
			postfix += ' (manually)';
		}

		try {
			if (running_task_menu) {
				janeway_title = this.task_document?.title || this.task_schedules.task_constructor.type_name;
				let title = 'Currently running: ' + janeway_title + postfix;
				janeway_item = running_task_menu.addItem(title, () => this.clickedJanewayMenuItem());
				janeway_item.task_schedule = this;
			}
		} catch (err) {
			alchemy.registerError(err);
		}

		try {
			if (started_manually || await this.ownsScheduledTask()) {
				let instance = this.createInstance();
				this.task_instance = instance;

				if (this.#instance_pledge) {
					this.#instance_pledge.resolve(instance);
					this.#instance_pledge = null;
				}

				await instance.start();
			}
		} catch (err) {
			alchemy.registerError(err);
		}

		this.history_document = null;
		this.next_scheduled_date = null;
		this.task_instance = null;
		this.is_running = false;
		this.has_ended = true;

		if (!started_manually) {
			this.calculateNextScheduledDate();
		}

		if (janeway_item) {
			let title = 'Finished: ' + janeway_title + postfix;
			janeway_item.setContent(title);
			setTimeout(() => janeway_item.remove(), 5000);
		}
	}

	/**
	 * Clear the timer
	 *
	 * @author   Jelle De Loecker   <jelle@elevenways.be>
	 * @since    1.3.17
	 * @version  1.3.17
	 */
	clearTimer() {
		clearTimeout(this.timer_id);
		this.timer_id = null;
		this.next_scheduled_date = null;
		this.#change_counter++;

		if (this.janeway_menu_item) {
			this.janeway_menu_item.remove();
			this.janeway_menu_item = null;
		}
	}
}
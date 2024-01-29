/**
 * The Alchemy Task model:
 * 
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
const SystemTask = Function.inherits('Alchemy.Model.System', 'Task');

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
SystemTask.constitute(function addTaskFields() {

	this.addField('title', 'String', {
		description : 'The title of the task',
	});

	this.addField('type', 'Enum', {
		values      : Classes.Alchemy.Task.Task.getLiveDescendantsMap(),
		description : 'The type of task to run',
	});

	this.addField('settings', 'Schema', {
		description : 'The settings to use for running the task',
		schema: 'type'
	});

	this.addField('enabled', 'Boolean', {
		description : 'Is this task enabled?',
		default     : true,
	});

	this.addField('frequency', 'String', {
		description : 'The frequency this task should run at (CRON syntax)',
	});

	this.addField('comment', 'Text', {
		description : 'A comment about this task',
	});

	this.addField('schedule_type', 'Enum', {
		values: {
			user            : 'User',
			system_forced   : 'System (forced)',
			system_fallback : 'System (fallback)',
		},
		default: 'user',
	});

	this.addField('forced_schedule_checksum', 'String', {
		description : 'Checksum of the cron syntax and settings, set only for tasks originating from forced schedules',
	});

	this.addIndex('forced_schedule_checksum', {
		unique : true,
		sparse : true,
	});
});

/**
 * Configure the default chimera fieldsets
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
SystemTask.constitute(function chimeraConfig() {

	if (!this.chimera) {
		return;
	}

	// Get the list group
	let list = this.chimera.getActionFields('list');

	list.addField('title');
	list.addField('type');
	list.addField('enabled');
	list.addField('frequency');
	list.addField('schedule_type');

	// Get the edit group
	let edit = this.chimera.getActionFields('edit');

	edit.addField('title');
	edit.addField('frequency')
	edit.addField('enabled');
	edit.addField('type');
	edit.addField('settings');
	edit.addField('comment');
});

/**
 * Do something before saving the record
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Document.SystemTask}   doc
 */
SystemTask.setMethod(function beforeSave(doc) {

	if (!doc.schedule_type) {
		doc.schedule_type = 'user';
	}

	if (doc.enabled == null) {
		doc.enabled = false;
	}

	if (!doc.title) {
		let title = '';

		if (doc.schedule_type == 'system_forced') {
			title += 'System forced: ';
		}

		if (doc.schedule_type == 'system_fallback') {
			title += 'System fallback: ';
		}

		title += doc.type;
		doc.title = title;
	}
});

/**
 * Update the schedules after saving
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 *
 * @param    {Object}   main
 * @param    {Object}   info
 */
SystemTask.setMethod(function afterSave(main, info) {

	if (!main.type) {
		return;
	}

	if (!alchemy.task_service.has_loaded) {
		return;
	}

	alchemy.task_service.rescheduleTasksOfType(main.type);
});
/**
 * The Alchemy Task History model:
 * keep track of all the tasks that have been run
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  0.5.0
 */
const SystemTaskHistory = Function.inherits('Alchemy.Model.System', 'TaskHistory');

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  1.3.17
 */
SystemTaskHistory.constitute(function addTaskFields() {

	this.belongsTo('System.Task', {
		description : 'The original AlchemyTask document it belonged to',
	});

	// The timestamp this was scheduled for
	this.addField('scheduled_at', 'Date', {
		description : 'The original date this was scheduled for',
	});

	this.addField('process_id', 'Integer', {
		description : 'The process ID of the task',
	});

	// The type of Task that is running
	this.addField('type', 'Enum', {
		values: Classes.Alchemy.Task.Task.getLiveDescendantsMap(),
	});

	// The payload/settings of the task
	this.addField('settings', 'Schema', {
		description : 'The settings of the task at the time it ran',
		schema: 'type'
	});

	this.addField('had_error', 'Boolean', {
		description : 'Did this task run into an error?'
	});

	this.addField('error_message', 'String', {
		description : 'The main error message'
	});

	this.addField('error_stack', 'Text', {
		description : 'The error stack trace'
	});

	this.addField('is_running', 'Boolean', {
		description : 'Is this task still running?',
		default     : false,
	});

	this.addField('result', 'Mixed', {
		description : 'The value the task\'s executor returned (its outcome summary)',
	});

	this.addField('started_at', 'Datetime', {
		description : 'The datetime this task actually started running',
	});

	this.addField('ended_at', 'Datetime', {
		description : 'The datetime this task actually ended',
	});

	this.addIndex('type');
	this.addIndex('is_running');
});

/**
 * Configure the default chimera fieldsets
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.4.0
 */
SystemTaskHistory.constitute(function chimeraConfig() {

	if (!this.chimera) {
		return;
	}

	// Get the list group
	let list = this.chimera.getActionFields('list');

	list.addField('created');
	list.addField('type');
	list.addField('process_id');
	list.addField('scheduled_at');
	list.addField('started_at');
	list.addField('ended_at');
	list.addField('had_error');

	// Get the edit group
	let edit = this.chimera.getActionFields('edit');

	edit.addField('type');
	edit.addField('settings');
	edit.addField('had_error');
	edit.addField('error_message');
	edit.addField('error_stack');
	edit.addField('started_at');
	edit.addField('ended_at');

	// Add monitor action for viewing live task progress
	this.chimera.addRowAction({
		name         : 'monitor',
		icon         : 'chart-line',
		title        : 'Monitor',
		placement    : ['row', 'context'],
		route        : 'Chimera.Editor#taskMonitor',
		route_params : {task_history_id: '$pk'},
	});
});

/**
 * Derive a single-word status from the recorded fields.
 *
 *   - 'running': is_running is still true
 *   - 'failed':  had_error is true
 *   - 'done':    started AND ended cleanly
 *   - 'aborted': started but never ended (pre-1.4.2 zombies, or a process
 *                that died mid-task without unwinding the try/finally)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.2
 *
 * @return   {string}
 */
SystemTaskHistory.setDocumentMethod(function getStatus() {

	if (this.had_error) {
		return 'failed';
	}

	if (this.is_running) {
		return 'running';
	}

	if (this.ended_at) {
		return 'done';
	}

	if (this.started_at) {
		return 'aborted';
	}

	return 'scheduled';
});

/**
 * Return how long this run took (or has been running so far), in
 * milliseconds. Null when nothing has started yet.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.2
 *
 * @return   {number|null}
 */
SystemTaskHistory.setDocumentMethod(function getDuration() {

	if (!this.started_at) {
		return null;
	}

	let end = this.ended_at || (this.is_running ? new Date() : null);

	if (!end) {
		return null;
	}

	return end.getTime() - this.started_at.getTime();
});

/**
 * Query the most recent task runs with optional filters. Centralized
 * here so that both Chimera-side dashboards and MCP / API consumers can
 * use the same paginated query - avoids forking the criteria.
 *
 * Options:
 *   type    {string}  Filter by task type_path (e.g. 'arcana.task.sync_harvest_clients')
 *   status  {string}  'running' | 'done' | 'failed' | 'aborted'
 *   since   {Date}    Earliest started_at to include
 *   limit   {number}  Page size (1-100, default 25)
 *   offset  {number}  Skip count
 *
 * Returns `{rows, total}` where `total` is the unpaginated count.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.2
 *
 * @param    {Object}   [options]
 *
 * @return   {Promise<{rows: DocumentList, total: number}>}
 */
SystemTaskHistory.setMethod(async function findRecent(options) {

	options = options || {};

	let crit = this.find();

	if (options.type) {
		crit.where('type').equals(options.type);
	}

	if (options.status) {
		switch (options.status) {
			case 'running':
				crit.where('is_running').equals(true);
				break;

			case 'failed':
				crit.where('had_error').equals(true);
				break;

			case 'done':
				crit.where('is_running').equals(false);
				crit.where('had_error').not().equals(true);
				crit.where('ended_at').exists(true);
				break;

			case 'aborted':
				crit.where('is_running').equals(false);
				crit.where('had_error').not().equals(true);
				crit.where('ended_at').isEmpty();
				crit.where('started_at').exists(true);
				break;

			default:
				throw new Error('Unknown task-run status filter: ' + options.status);
		}
	}

	if (options.since) {
		crit.where('started_at').gte(options.since);
	}

	let limit = Math.min(Math.max(options.limit || 25, 1), 100);
	let offset = Math.max(options.offset || 0, 0);

	crit.sort({started_at: -1});
	crit.setOption('available', true);
	crit.limit(limit);
	if (offset > 0) crit.skip(offset);

	let rows = await this.find('all', crit);
	return {rows, total: rows.available || 0};
});
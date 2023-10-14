/**
 * The Alchemy Task History model:
 * keep track of all the tasks that have been run
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.5.0
 * @version  0.5.0
 */
const AlchemyTaskHistory = Function.inherits('Alchemy.Model.App', 'AlchemyTaskHistory');

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    0.5.0
 * @version  1.3.17
 */
AlchemyTaskHistory.constitute(function addTaskFields() {

	this.belongsTo('AlchemyTask', {
		description : 'The original AlchemyTask document it belonged to',
	});

	// The timestamp this was scheduled for
	this.addField('scheduled_timestamp', 'Integer', {
		description : 'The original timestamp this was scheduled for',
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
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.17
 * @version  1.3.17
 */
AlchemyTaskHistory.constitute(function chimeraConfig() {

	if (!this.chimera) {
		return;
	}

	// Get the list group
	let list = this.chimera.getActionFields('list');

	list.addField('created');
	list.addField('type');
	list.addField('process_id');
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
});
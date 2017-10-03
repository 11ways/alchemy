var all_task_types = alchemy.getClassGroup('task');

/**
 * The Alchemy Task Model class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.4.4
 * @version  0.4.4
 */
var AlchemyTask = Function.inherits('Alchemy.AppModel', function AlchemyTaskModel(conduit, options) {

	var that = this;

	AlchemyTaskModel.super.call(this, conduit, options);
});

/**
 * Constitute the class wide schema
 *
 * @author   Jelle De Loecker <jelle@develry.be>
 * @since    0.4.4
 * @version  0.4.4
 */
AlchemyTask.constitute(function addFields() {

	// The type of Task that is running
	this.addField('type', 'Enum', {values: all_task_types});

	// When the task ended
	this.addField('ended', 'Datetime');

});
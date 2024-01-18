/**
 * The "tasks" stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const tasks = STAGES.createStage('tasks');

// Do not start any task stage before the datasources are connected
tasks.dependsOn('datasource.connect');

/**
 * "tasks.start_service"
 * Start the task service
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @type     {Alchemy.Stages.Stage}
 */
const start_service = tasks.createStage('start_service', () => {
	alchemy.task_service = new Classes.Alchemy.Task.TaskService();
});

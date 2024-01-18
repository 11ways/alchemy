const STATUS = Symbol('status'),
      STATUS_PLEDGE = Symbol('status_pledge'),
      MAIN_PLEDGE = Symbol('main_pledge'),
      PRE_STATUS = 'pre',
      MAIN_STATUS = 'main',
      CHILD_STATUS = 'children',
      POST_STATUS = 'post';

/**
 * The Stage class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}                  name
 * @param    {Alchemy.Stages.Stages}   parent
 */
const Stage = Function.inherits('Alchemy.Base', 'Alchemy.Stages', function Stage(name, parent) {

	// The name of this stage
	this.name = name;

	// The path
	this.id = parent ? parent.id + '.' + name : name;

	// The parent Stage (if any)
	this.parent = parent;

	// The root stage
	this.root_stage = parent ? parent.root_stage : this;

	// The current status
	this[STATUS] = null;

	// The main pledge
	this[MAIN_PLEDGE] = new Pledge.Swift();

	// The dependencies of this stage
	this.depends_on = null;

	// Pre-tasks
	this.pre_tasks = new Map();

	// Main tasks
	this.main_tasks = new Map();

	// Child stages
	this.child_stages = new Map();

	// Post-tasks
	this.post_tasks = new Map();

	// When this started
	this.started = null;

	// When this ended
	this.ended = null;
});

/**
 * Is this the root stage?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Stage.setProperty(function is_root() {
	return this.root_stage === this;
});

/**
 * Get the main pledge
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Stage.setProperty(function pledge() {
	return this[MAIN_PLEDGE];
});

/**
 * Add a dependency to this stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   stage_ids   The id of the stage it depends on.
 *
 * @return   {Alchemy.Stages.Stage}
 */
Stage.setMethod(function dependsOn(stage_ids) {

	if (!this.depends_on) {
		this.depends_on = [];
	}

	stage_ids = Array.cast(stage_ids);

	for (let i = 0; i < stage_ids.length; i++) {
		let id = stage_ids[i];

		if (typeof id != 'string') {
			throw new Error('Stage id should be a string');
		}

		if (!this.is_root && !id.startsWith(this.root_stage.name)) {
			id = this.root_stage.name + '.' + id;
		}

		stage_ids[i] = id;
	
	}

	this.depends_on.push(...stage_ids);

	// Push these dependencies to the already existing children
	for (let [name, stage] of this.child_stages) {
		stage.dependsOn(stage_ids);
	}

	return this;
});

/**
 * Add a new child stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}     name   Name of the stage
 * @param    {Function}   fnc    The function to execute as a main task
 *
 * @return   {Alchemy.Stages.Stage}
 */
Stage.setMethod(function createStage(name, fnc) {

	if (this.child_stages.has(name)) {
		throw new Error('Stage "' + name + '" already exists');
	}

	let stage = new Stage(name, this);

	if (this.depends_on?.length) {
		stage.dependsOn(this.depends_on);
	}

	this.child_stages.set(name, stage);

	if (fnc) {
		stage.addMainTask(fnc);
	}

	return stage;
});

/**
 * Add a certain task
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}     type
 * @param    {Function}   fnc
 */
Stage.setMethod(function _addTask(type, fnc) {

	let task_map = this[type];

	// First see if this type has already been started
	let pledge = task_map[STATUS_PLEDGE];

	// If it has, we can already start the task,
	// but we have to set a new pledge.
	if (pledge) {
		let new_pledge = new Pledge.Swift();
		task_map[STATUS_PLEDGE] = new_pledge;

		let task_result;

		try {
			task_result = fnc();
		} catch (err) {
			new_pledge.reject(err);
			task_map.set(fnc, err);
			return;
		}

		if (!task_result) {
			task_result = true;
		}

		task_map.set(fnc, task_result);
	} else {
		task_map.set(fnc, null);
	}
});

/**
 * Do the given type of tasks
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}     type
 */
Stage.setMethod(function _doTasks(type) {

	let task_map = this[type];

	let pledge = new Pledge.Swift();
	task_map[STATUS_PLEDGE] = pledge;

	let tasks = [];
	let errors = [];

	for (let [fnc, value] of task_map) {

		// It already has a value: it has already been executed
		if (value) {
			if (Pledge.isThenable(value)) {
				tasks.push(value);
			}

			continue;
		}

		// If needs to be executed
		try {
			value = fnc();

			if (!value) {
				value = true;
			} else if (Pledge.isThenable(value)) {
				tasks.push(value);

				Pledge.cast(value).done((err, result) => {
					task_map.set(fnc, result || err || true);
				});
			}

			task_map.set(fnc, value);

		} catch (err) {
			errors.push(err);
			task_map.set(fnc, err);
		}
	}

	if (!tasks.length && !errors.length) {
		pledge.resolve(true);
		return pledge;
	}

	if (errors.length) {
		pledge.reject(errors[0]);
		return pledge;
	}

	Function.parallel(tasks).done((err) => {
		if (err) {
			pledge.reject(err);
		} else {
			pledge.resolve(this._doTasks(type));
		}
	});

	return pledge;
});

/**
 * Add a pre-task to this stage:
 * This task will be performed before the main tasks of this stage.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Function}   fnc
 */
Stage.setMethod(function addPreTask(fnc) {
	this._addTask('pre_tasks', fnc);
});

/**
 * Add a main task to this stage:
 * This task will be performed after the pre-tasks of this stage.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Function}   fnc
 */
Stage.setMethod(function addMainTask(fnc) {
	this._addTask('main_tasks', fnc);
});

/**
 * Add a post task to this stage:
 * This task will be performed after the main-tasks
 * and the child stages of this stage.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Function}   fnc
 */
Stage.setMethod(function addPostTask(fnc) {
	this._addTask('post_tasks', fnc);
});

/**
 * Have all the child stages finished?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Stage.setMethod(function hasFinishedAllChildStages() {

	if (this.child_stages.size == 0) {
		return true;
	}

	for (let [name, stage] of this.child_stages) {
		if (!stage.ended) {
			return false;
		}
	}

	return true;
});

/**
 * Get a child stage by its path/id
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   id
 */
Stage.setMethod(function getStage(id) {

	if (!id) {
		throw new Error('Unable to get stage without id');
	}

	let parts = id.split('.');

	if (this.is_root && parts[0] == this.name) {
		parts.shift();
	}

	let current = this;

	while (parts.length) {
		let part = parts.shift();

		current = current.child_stages.get(part);

		if (!current) {
			return;
		}
	}

	return current;
});

/**
 * Wait for the given child stages (without starting them)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   stages
 * @param	 {Function}   callback
 */
Stage.setMethod(function afterStages(stages, callback) {

	stages = Array.cast(stages);

	let tasks = [];

	for (let id of stages) {
		let stage = this.getStage(id);

		if (!stage) {
			throw new Error('Child stage "' + id + '" not found');
		}

		if (stage.ended) {
			continue;
		}

		tasks.push(async (next) => {
			await stage.pledge;
			next();
		});
	}

	return Function.series(tasks, callback);
});

/**
 * Recursively get all the child-stages (including this one)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   filter
 *
 * @return   {Alchemy.Stage.Stage[]}
 */
Stage.setMethod(function getFlattenedStages(filter) {

	let result = [];

	result.push(this);

	// If the filter is given, split each entry up into parts
	if (filter) {
		filter = Array.cast(filter);

		for (let i = 0; i < filter.length; i++) {
			let parts = filter[i].split('.');

			if (this.is_root && parts[0] == this.name) {
				parts.shift();
			}

			filter[i] = parts;
		}
	}

	for (let [name, stage] of this.child_stages) {

		let sub_filter;

		if (filter) {
			let matches_filter = false;

			sub_filter = [];

			for (let i = 0; i < filter.length; i++) {
				let parts = filter[i];

				if (parts[0] == name) {
					matches_filter = true;

					// Create a clone of the parts array
					parts = parts.slice(0);

					// Remove the first part
					parts.shift();

					if (parts.length) {
						// And add it to the sub filter
						sub_filter.push(parts);
					}
				}
			}

			if (!matches_filter) {
				continue;
			}

			if (!sub_filter.length) {
				sub_filter = null;
			}
		}

		result.push(...stage.getFlattenedStages(sub_filter));
	}

	return result;
});

/**
 * Recursively get all the child-stages (including this one)
 * sorted in launch order.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   filter
 *
 * @return   {Alchemy.Stage.Stage[]}
 */
Stage.setMethod(function getSortedStages(filter) {

	let stages = this.getFlattenedStages(filter);

	stages.sortTopological('id', 'depends_on');

	return stages;
});

/**
 * Launch this stage and all the given child stages.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   child_stages   The child stages to launch
 */
Stage.setMethod(async function launch(child_stages) {

	if (child_stages == null) {
		throw new Error('Unable to launch a stage without allowed child stages');
	}

	if (child_stages === true) {
		child_stages = undefined;
	}

	let stages = this.getSortedStages(child_stages);

	for (let stage of stages) {
		await stage._launch();
	}
});

/**
 * Actually launch this stage and all the given child stages
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   child_stages   The child stages to launch
 */
Stage.setMethod(async function _launch(child_stages) {

	if (!this.started) {
		this.started = Date.now();

		this.emit('launching', this);

		if (!this.is_root) {
			this.root_stage.emit('launching', this);
		}
	}

	if (!this[STATUS]) {
		this[STATUS] = PRE_STATUS;
	}

	await this._doTasks('pre_tasks');

	if (this[STATUS] == PRE_STATUS) {
		this[STATUS] = MAIN_STATUS;
	}

	await this._doTasks('main_tasks');

	await this.pre_tasks[STATUS_PLEDGE];
	await this.main_tasks[STATUS_PLEDGE];

	if (this[STATUS] != POST_STATUS) {
		this[STATUS] = CHILD_STATUS;
	}

	await this.refreshStatus();
});

/**
 * Check if everything is finished
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Stage.setMethod(async function refreshStatus() {

	if (!this.hasFinishedAllChildStages()) {
		return;
	}

	await this._doTasks('post_tasks');

	if (!this.ended) {
		this.ended = Date.now();
	}

	this[STATUS] = POST_STATUS;

	this.pledge.resolve();

	if (this.parent) {
		this.parent.refreshStatus();
	}
});

/**
 * Create a sputnik shim
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   mapping
 *
 * @return   {Alchemy.Stages.SputnikShim}
 */
Stage.setMethod(function createSputnikShim(mapping) {
	return new SputnikShim(this, mapping);
});

/**
 * Custom Janeway representation (left side)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {string}
 */
Stage.setMethod(Symbol.for('janeway_arg_left'), function janewayClassIdentifier() {
	return 'A.S.' + this.constructor.name;
});

/**
 * Custom Janeway representation (right side)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @return   {String}
 */
Stage.setMethod(Symbol.for('janeway_arg_right'), function janewayInstanceInfo() {
	return this.id;
});

/**
 * The SputnikShim class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Alchemy.Stages.Stages}   stage
 * @param    {Object}                  mapping
 */
const SputnikShim = Function.inherits('Alchemy.Base', 'Alchemy.Stages', function SputnikShim(stage, mapping) {
	this.stage = stage;
	this.mapping = mapping;
});

/**
 * Get a stage by its old name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   name
 *
 * @return   {Alchemy.Stages.Stage}
 */
SputnikShim.setMethod(function getStage(name) {

	if (!name) {
		throw new Error('Unable to get stage without name');
	}

	let id = this.mapping[name];

	if (!id) {
		id = name;
	}

	return this.stage.getStage(id);
});

/**
 * Do something before the given stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   names
 * @param    {Function}   callback
 */
SputnikShim.setMethod(function before(names, callback) {

	let pledges = [],
	    stage;

	names = Array.cast(names);

	for (let name of names) {
		stage = this.getStage(name);

		if (!stage) {
			throw new Error('Stage "' + name + '" not found');
		}

		let pledge = new Pledge.Swift();

		stage.addPreTask(() => {
			pledge.resolve();
		});

		pledges.push(pledge);
	}

	return Function.parallel(pledges).then(callback);
});

/**
 * Do something after the given stage
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   names
 * @param    {Function}   callback
 */
SputnikShim.setMethod(function after(names, callback) {

	let pledges = [],
	    stage;

	names = Array.cast(names);

	for (let name of names) {
		stage = this.getStage(name);

		if (!stage) {
			throw new Error('Stage "' + name + '" not found');
		}

		let pledge = new Pledge.Swift();

		stage.addPostTask(() => {
			pledge.resolve();
		});

		pledges.push(pledge);
	}

	return Function.parallel(pledges).then(callback);
});
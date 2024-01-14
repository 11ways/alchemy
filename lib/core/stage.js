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

				value.done((err, result) => {
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

	if (parts[0] == this.name) {
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
 * Launch this stage and all the given child stages.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string[]}   child_stages   The child stages to launch
 */
Stage.setMethod(function launch(child_stages) {

	if (child_stages == null) {
		throw new Error('Unable to launch a stage without allowed child stages');
	}

	if (!this.started) {
		this.started = Date.now();

		this.emit('launching', this);

		if (this !== this.root_stage) {
			this.root_stage.emit('launching', this);
		}
	}

	return this._launch(child_stages);
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

	if (!this[STATUS]) {
		this[STATUS] = PRE_STATUS;
	}

	await this._doTasks('pre_tasks');

	if (this[STATUS] == PRE_STATUS) {
		this[STATUS] = MAIN_STATUS;
	}

	await this._doTasks('main_tasks');

	if (child_stages === true) {
		child_stages = [];
		
		for (let [name, stage] of this.child_stages) {
			child_stages.push(name);
		}
	} else if (typeof child_stages == 'string') {
		child_stages = [child_stages];
	}

	if (child_stages.length) {
		await this.pre_tasks[STATUS_PLEDGE];
		await this.main_tasks[STATUS_PLEDGE];

		if (this[STATUS] != POST_STATUS) {
			this[STATUS] = CHILD_STATUS;
		}

		let stage_tasks = [];

		for (let name of child_stages) {
			let stage = this.child_stages.get(name);

			if (!stage) {
				throw new Error('Child stage "' + name + '" not found');
			}

			stage_tasks.push(async (next) => {
				await stage.launch(true);
				next();
			});
		}

		await Function.series(stage_tasks);
	}

	this[STATUS] = POST_STATUS;

	if (this.hasFinishedAllChildStages()) {
		await this._doTasks('post_tasks');
		this.refreshStatus();
	}
});


/**
 * Check if everything is finished
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
Stage.setMethod(function refreshStatus() {

	if (!this.hasFinishedAllChildStages()) {
		return;
	}

	if (!this.ended) {
		this.ended = Date.now();
	}

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
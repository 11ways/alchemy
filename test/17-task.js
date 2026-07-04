var assert = require('assert');

describe('Task', function() {

	let TaskClass,
	    TestTask,
	    test_task;

	before(function(next) {
		next = Function.regulate(next);

		TaskClass = Classes.Alchemy.Task.Task;

		TestTask = Function.inherits('Alchemy.Task', function TestTask() {
			TestTask.super.call(this);
		});

		TestTask.constitute(function setSchema() {
			this.schema = new Classes.Alchemy.Schema(this);
			next();
		});

		TestTask.setMethod(async function executor() {
			return 'done';
		});
	});

	beforeEach(function() {
		test_task = new TestTask();
	});

	describe('.getMember(name)', function() {
		it('should be a class group that supports getMember', function() {
			assert.strictEqual(typeof TaskClass.getMember, 'function');
		});
	});

	describe('.addForcedCronSchedule(cron_schedule, settings)', function() {
		it('should store forced cron schedules on the class', function() {

			let ForcedTask = Function.inherits('Alchemy.Task', function TestForcedTask() {
				TestForcedTask.super.call(this);
			});

			ForcedTask.constitute(function setSchema() {
				this.schema = new Classes.Alchemy.Schema(this);
			});

			ForcedTask.addForcedCronSchedule('0 2 * * *', {setting: 'nightly'});

			assert.strictEqual(Array.isArray(ForcedTask.forced_cron_schedules), true);
			assert.strictEqual(ForcedTask.forced_cron_schedules.length, 1);

			let entry = ForcedTask.forced_cron_schedules[0];
			assert.strictEqual(entry.cron_schedule instanceof Classes.Alchemy.Cron, true);
			assert.strictEqual(entry.settings.setting, 'nightly');
		});

		it('should allow multiple forced cron schedules', function() {

			let MultiForced = Function.inherits('Alchemy.Task', function TestMultiForced() {
				TestMultiForced.super.call(this);
			});

			MultiForced.constitute(function setSchema() {
				this.schema = new Classes.Alchemy.Schema(this);
			});

			MultiForced.addForcedCronSchedule('0 2 * * *', {time: 'night'});
			MultiForced.addForcedCronSchedule('0 14 * * *', {time: 'afternoon'});

			assert.strictEqual(MultiForced.forced_cron_schedules.length, 2);
		});
	});

	describe('.addFallbackCronSchedule(cron_schedule, settings)', function() {
		it('should store fallback cron schedules on the class', function() {

			let FallbackTask = Function.inherits('Alchemy.Task', function TestFallbackTask() {
				TestFallbackTask.super.call(this);
			});

			FallbackTask.constitute(function setSchema() {
				this.schema = new Classes.Alchemy.Schema(this);
			});

			FallbackTask.addFallbackCronSchedule('30 3 * * *', {mode: 'fallback'});

			assert.strictEqual(Array.isArray(FallbackTask.fallback_cron_schedules), true);
			assert.strictEqual(FallbackTask.fallback_cron_schedules.length, 1);

			let entry = FallbackTask.fallback_cron_schedules[0];
			assert.strictEqual(entry.cron_schedule instanceof Classes.Alchemy.Cron, true);
			assert.strictEqual(entry.settings.mode, 'fallback');
		});
	});

	describe('status properties', function() {

		it('should have has_started as false initially', function() {
			assert.strictEqual(test_task.has_started, false);
			assert.strictEqual(test_task.is_paused, false);
			assert.strictEqual(test_task.has_stopped, false);
		});
	});

	describe('#setPayload(payload)', function() {
		it('should store the payload on the task', function() {
			assert.strictEqual(test_task.payload, null);

			test_task.setPayload({key: 'value', count: 42});
			assert.deepStrictEqual(test_task.payload, {key: 'value', count: 42});
		});
	});

	describe('#getParam(name)', function() {
		it('should return a value from the payload', function() {
			test_task.setPayload({name: 'test_job', retries: 3});

			assert.strictEqual(test_task.getParam('name'), 'test_job');
			assert.strictEqual(test_task.getParam('retries'), 3);
		});

		it('should return undefined for non-existent params', function() {
			test_task.setPayload({a: 1});

			assert.strictEqual(test_task.getParam('nonexistent'), undefined);
		});

		it('should return undefined when payload is null', function() {
			assert.strictEqual(test_task.getParam('anything'), undefined);
		});
	});

	describe('#pause()', function() {
		it('should pause the task and be idempotent', function() {
			test_task.pause();
			assert.strictEqual(test_task.is_paused, true);

			// Calling pause again should do nothing (early return)
			test_task.pause();
			assert.strictEqual(test_task.is_paused, true);
		});
	});

	describe('#resume()', function() {
		it('should do nothing when not paused', function() {
			assert.strictEqual(test_task.is_paused, false);

			test_task.resume();

			assert.strictEqual(test_task.is_paused, false);
		});

		it('should resume a paused task', function() {
			test_task.pause();
			assert.strictEqual(test_task.is_paused, true);

			test_task.resume();
			assert.strictEqual(test_task.is_paused, false);
		});
	});

	describe('#toJSON()', function() {
		it('should return an object with expected shape', function() {
			let json = test_task.toJSON();

			assert.strictEqual(typeof json, 'object');
			assert.strictEqual('id' in json, true);
			assert.strictEqual('name' in json, true);
			assert.strictEqual('title' in json, true);
			assert.strictEqual('started' in json, true);
			assert.strictEqual('stopped' in json, true);
			assert.strictEqual('paused' in json, true);
			assert.strictEqual('error' in json, true);
			assert.strictEqual('percentage' in json, true);
			assert.strictEqual('reports' in json, true);
			assert.strictEqual(Array.isArray(json.reports), true);
		});
	});

	describe('#schema', function() {
		it('should return the class-wide schema from the instance', function() {
			let base_schema = TaskClass.schema;

			assert.strictEqual(base_schema instanceof Classes.Alchemy.Schema, true,
				'The base Task class should have a schema');
		});
	});

	describe('Task.execute(name, options, callback)', function() {
		it('should call back with an error for unknown task names', function(done) {

			Classes.Alchemy.Task.Task.execute('NonExistentTaskXyz', {}, function(err) {
				assert.strictEqual(err instanceof Error, true);
				assert.strictEqual(err.message.includes('NonExistentTaskXyz'), true);
				done();
			});
		});
	});

	describe('can_be_paused / can_be_stopped defaults', function() {
		it('should default to true', function() {
			assert.strictEqual(test_task.can_be_paused, true);
			assert.strictEqual(test_task.can_be_stopped, true);
		});
	});

	describe('#start() terminal state', function() {

		it('should mark the task as stopped and settle the running pledge', async function() {

			let task = new TestTask();

			let result = await task.start();

			assert.strictEqual(result, 'done');
			assert.strictEqual(task.has_stopped, true, 'has_stopped should be true after the run');
		});

		it('should deregister the task from the shared running array', async function() {

			const running = alchemy.shared('Task.running', 'Array');

			let before = running.length;

			let task = new TestTask();
			await task.start();

			assert.strictEqual(running.length, before, 'the running array should not keep finished tasks');
			assert.strictEqual(running.includes(task), false);
		});

		it('should also stop failed tasks and reject start()', async function() {

			const FailingTask = Function.inherits('Alchemy.Task', function FailingTaskXyz() {
				FailingTaskXyz.super.call(this);
			});

			await new Promise(resolve => FailingTask.constitute(function setSchema() {
				this.schema = new Classes.Alchemy.Schema(this);
				resolve();
			}));

			FailingTask.setMethod(async function executor() {
				throw new Error('exploded');
			});

			let task = new FailingTask();

			await assert.rejects(() => task.start(), /exploded/);

			assert.strictEqual(task.has_stopped, true, 'a failed task should count as stopped');

			const running = alchemy.shared('Task.running', 'Array');
			assert.strictEqual(running.includes(task), false);
		});
	});

	describe('Task.execute(name, options, callback)', function() {
		it('should call back with the result when the task finishes', function(done) {

			// Task classes register in the group with the `Task` suffix
			// stripped: TestTask is the member `test`
			Classes.Alchemy.Task.Task.execute('test', {}, function finished(err, result) {

				try {
					assert.strictEqual(err, null);
					assert.strictEqual(result, 'done');
					done();
				} catch (assertion_err) {
					done(assertion_err);
				}
			});
		});
	});

});

var assert = require('assert');

describe('Base', function() {

	it('is the base class for most Alchemy classes', function() {
		var model = new Model();

		assert.strictEqual(model instanceof Classes.Alchemy.Base, true);
		assert.strictEqual(Router instanceof Classes.Alchemy.Base, true);
	});

	describe('.getAllChildren()', function() {
		it('returns an array of all the children & grandchildren', function() {

			var result = Classes.Alchemy.Field.Field.getAllChildren();

			assert.strictEqual(result.length > 15, true, 'There are at least 15 Field classes');

			for (let i = 0; i < result.length; i++) {
				assert.strictEqual(typeof result[i], 'function', 'All children should be functions');
			}
		});
	});

	describe('.getMember(name)', function() {
		it('should return a member of a class group', function() {
			var result = Classes.Alchemy.Field.Field.getMember('Password');

			assert.strictEqual(typeof result, 'function');
		});

		it('allows being passed underscored names', function() {

			var result = Classes.Alchemy.Field.Field.getMember('has_and_belongs_to_many');

			assert.strictEqual(typeof result, 'function');
			assert.strictEqual(result.name, 'HasAndBelongsToMany');
		});

		it('returns null for classes that are not a group', function() {
			var result = Classes.Alchemy.Conduit.Conduit.getMember('http');

			assert.strictEqual(result, null);
		});
	});

	describe('Postponement', function() {

		let PostponementClass,
		    queue;

		before(function() {
			PostponementClass = Classes.Alchemy.Conduit.Postponement;
			queue = PostponementClass.queue;
		});

		function createFake(overrides) {
			let fake = Object.create(PostponementClass.prototype);
			fake.expired = false;
			fake.last_queue_position = null;
			fake.started = Date.now();
			fake.ended = null;
			fake.last_check = Date.now();
			Object.assign(fake, overrides);
			return fake;
		}

		describe('#putInQueue()', function() {
			it('should assign the correct queue position and queue length', function() {

				let fake = createFake();

				fake.putInQueue();

				assert.strictEqual(fake.last_queue_position, queue.length - 1, 'Queue position should be the last index');
				assert.strictEqual(PostponementClass.queue_length, queue.length, 'Queue length should match actual array length');

				// Clean up
				queue.splice(queue.indexOf(fake), 1);
				PostponementClass.queue_length = queue.length;
			});
		});

		describe('#time_waited', function() {
			it('should return the time elapsed since the postponement started', function() {

				let fake = createFake({started: Date.now() - 5000, ended: null});

				let waited = fake.time_waited;

				assert.strictEqual(waited >= 4900, true, 'time_waited should be at least 4900ms, got ' + waited);
				assert.strictEqual(waited < 6000, true, 'time_waited should be less than 6000ms, got ' + waited);
			});

			it('should return the total duration when ended', function() {

				let fake = createFake({started: 1000, ended: 4000});

				assert.strictEqual(fake.time_waited, 3000);
			});
		});

		describe('#has_been_abandoned', function() {
			it('should return true when unchecked for more than 3 minutes', function() {

				let fake = createFake({last_check: Date.now() - 200_000});

				assert.strictEqual(fake.has_been_abandoned, true);
			});

			it('should return false when recently checked', function() {

				let fake = createFake({last_check: Date.now() - 1000});

				assert.strictEqual(fake.has_been_abandoned, false);
			});
		});

		describe('#position_in_queue', function() {
			it('should return null when the item has never been in a queue', function() {

				let fake = createFake({last_queue_position: null});

				assert.strictEqual(fake.position_in_queue, null);
			});

			it('should return null when the item is no longer in the queue', function() {

				let fake = createFake({last_queue_position: 5});

				// The fake is not in the actual QUEUE array, so indexOf returns -1
				let pos = fake.position_in_queue;
				assert.strictEqual(pos, null);
			});
		});

		describe('#expire()', function() {
			it('should set the expired flag to true', function() {

				let fake = createFake();

				// Add to queue so expire() -> remove() can find it
				queue.push(fake);
				fake.last_queue_position = queue.indexOf(fake);

				fake.expire();

				assert.strictEqual(fake.expired, true);

				// Clean up: ensure fake is removed from queue
				let idx = queue.indexOf(fake);
				if (idx > -1) {
					queue.splice(idx, 1);
				}
				PostponementClass.queue_length = queue.length;
			});
		});

		describe('.checkQueue()', function() {
			it('should remove abandoned postponements from the queue', function() {

				let abandoned1 = createFake({
					last_check: Date.now() - 200_000,
					started: Date.now() - 200_000,
				});

				let abandoned2 = createFake({
					last_check: Date.now() - 250_000,
					started: Date.now() - 250_000,
				});

				let recent = createFake({
					last_check: Date.now() - 1000,
					started: Date.now() - 1000,
				});

				// Add all to queue
				queue.push(abandoned1);
				abandoned1.last_queue_position = queue.length - 1;
				queue.push(abandoned2);
				abandoned2.last_queue_position = queue.length - 1;
				queue.push(recent);
				recent.last_queue_position = queue.length - 1;
				PostponementClass.queue_length = queue.length;

				PostponementClass.checkQueue();

				assert.strictEqual(abandoned1.expired, true, 'First abandoned should be expired');
				assert.strictEqual(abandoned2.expired, true, 'Second abandoned should be expired');
				assert.strictEqual(recent.expired, false, 'Recent postponement should not be expired');
				assert.strictEqual(queue.includes(recent), true, 'Recent postponement should still be in queue');

				// Clean up
				let idx = queue.indexOf(recent);
				if (idx > -1) {
					queue.splice(idx, 1);
				}
				PostponementClass.queue_length = queue.length;
			});
		});
	});

	describe('File.getMimetype(path)', function() {
		it('should resolve the pledge even when mmmagic is not available', async function() {

			let FileClass = Classes.Alchemy.Inode.File;

			let result = await FileClass.getMimetype('/tmp/test-file.json');

			assert.strictEqual(typeof result, 'string');
		});
	});

	describe('.setDeprecatedProperty(old_key, new_key)', function() {
		it('redirects getter/setter logic to another property', function() {

			var Deprecated = Function.inherits('Alchemy.Base', function Deprecated() {});

			Deprecated.setProperty(function my_value() {
				return this._my_value || 'nothing';
			}, function set_my_value(value) {
				return this._my_value = value;
			});

			Deprecated.setDeprecatedProperty('myValue', 'my_value');

			var test = new Deprecated();

			let old_warn = console.warn,
			    called = 0;

			console.warn = function(msg) {
				called++;
			};

			try {

				assert.strictEqual(test.my_value, 'nothing');
				assert.strictEqual(called, 0);
				assert.strictEqual(test.myValue, 'nothing');
				assert.strictEqual(called, 1, 'A deprecation warning should have been logged');

				test.my_value = 'something';
				assert.strictEqual(test.my_value, 'something');
				assert.strictEqual(test.myValue, 'something');

				test.myValue = 'something_else';

				assert.strictEqual(test.my_value, 'something_else');
			} catch (err) {
				console.warn = old_warn;
				throw err;
			}

			console.warn = old_warn;
		});
	});

});
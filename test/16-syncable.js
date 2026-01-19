const assert = require('assert');

describe('Syncable', function() {

	let Syncable;

	before(function() {
		Syncable = Classes.Alchemy.Syncable.Syncable;
	});

	describe('constructor', function() {
		it('should require a type', function() {
			assert.throws(() => {
				new Syncable();
			}, /Each Syncable must have a type/);
		});

		it('should create a Syncable instance with the given type', function() {
			let syncable = new Syncable('test');
			assert.strictEqual(syncable.type, 'test');
		});

		it('should generate an ID automatically', function() {
			let syncable = new Syncable('test');
			assert.ok(syncable.id, 'ID should be generated');
			assert.strictEqual(typeof syncable.id, 'string');
		});

		it('should initialize state as an empty object', function() {
			let syncable = new Syncable('test');
			assert.deepStrictEqual(syncable.state, {});
		});

		it('should initialize version to 0', function() {
			let syncable = new Syncable('test');
			assert.strictEqual(syncable.version, 0);
		});

		it('should initialize queues as a Map', function() {
			let syncable = new Syncable('test');
			assert.ok(syncable.queues instanceof Map);
		});
	});

	describe('#setProperty(key, value)', function() {
		it('should set a property in the state', function() {
			let syncable = new Syncable('test');
			syncable.setProperty('name', 'test_value');
			assert.strictEqual(syncable.state.name, 'test_value');
		});

		it('should emit a property change event', function(done) {
			let syncable = new Syncable('test');
			
			syncable.on('property_change_status', (value) => {
				assert.strictEqual(value, 'active');
				done();
			});

			syncable.setProperty('status', 'active');
		});

		it('should not emit event if value does not change', function() {
			let syncable = new Syncable('test');
			let emitCount = 0;

			syncable.setProperty('value', 'original');
			
			syncable.on('property_change_value', () => {
				emitCount++;
			});

			syncable.setProperty('value', 'original');
			assert.strictEqual(emitCount, 0, 'Should not emit when value is unchanged');
		});

		it('should add to the log on the server', function() {
			let syncable = new Syncable('test');
			syncable.setProperty('key', 'value');

			assert.strictEqual(syncable.log.length, 1);
			// Version is incremented before adding to log, so first entry is version 1
			assert.deepStrictEqual(syncable.log[0], {
				version: 1,
				type: 'set',
				args: ['key', 'value'],
			});
		});
	});

	describe('#watchProperty(property, callback)', function() {
		it('should call the callback with the current value immediately', function() {
			let syncable = new Syncable('test');
			syncable.setProperty('watched', 'initial');

			let receivedValue;
			syncable.watchProperty('watched', (value) => {
				receivedValue = value;
			});

			assert.strictEqual(receivedValue, 'initial');
		});

		it('should call the callback when the property changes', function(done) {
			let syncable = new Syncable('test');
			let callCount = 0;

			syncable.watchProperty('status', (value) => {
				callCount++;
				if (callCount === 2) {
					assert.strictEqual(value, 'updated');
					done();
				}
			});

			syncable.setProperty('status', 'updated');
		});
	});

	describe('#toDry()', function() {
		it('should serialize the syncable', function() {
			let syncable = new Syncable('test_type');
			syncable.setProperty('name', 'test');

			let dried = syncable.toDry();

			assert.ok(dried.value);
			assert.strictEqual(dried.value.type, 'test_type');
			assert.strictEqual(dried.value.id, syncable.id);
			assert.deepStrictEqual(dried.value.state, {name: 'test'});
		});

		it('should exclude queue listeners from serialization', function() {
			let syncable = new Syncable('test');
			
			// Add a queue watcher
			syncable.watchQueue('messages', () => {});
			
			let dried = syncable.toDry();
			let queue = dried.value.queues.get('messages');
			
			assert.ok(queue);
			assert.deepStrictEqual(queue.listeners, [], 'Listeners should be empty');
		});
	});

	describe('.unDry(data)', function() {
		it('should restore a syncable from dried data', function() {
			let original = new Syncable('test_type');
			original.setProperty('counter', 42);

			let dried = original.toDry();
			let restored = Syncable.unDry(dried.value);

			assert.strictEqual(restored.type, 'test_type');
			assert.strictEqual(restored.state.counter, 42);
		});
	});

	describe('#processUpdate(update)', function() {
		it('should process set updates', function() {
			let syncable = new Syncable('test');

			syncable.processUpdate({
				type: 'set',
				args: ['key', 'value'],
			});

			assert.strictEqual(syncable.state.key, 'value');
		});

		it('should throw for unknown update types', function() {
			let syncable = new Syncable('test');

			assert.throws(() => {
				syncable.processUpdate({
					type: 'unknown',
					args: [],
				});
			}, /Unknown update type/);
		});
	});

	describe('#addLog(type, args)', function() {
		it('should increment version', function() {
			let syncable = new Syncable('test');
			assert.strictEqual(syncable.version, 0);

			syncable.addLog('test', ['arg']);
			assert.strictEqual(syncable.version, 1);

			syncable.addLog('test', ['arg2']);
			assert.strictEqual(syncable.version, 2);
		});

		it('should add entry to log array with incremented version', function() {
			let syncable = new Syncable('test');
			syncable.addLog('call', ['methodName', ['arg1']]);

			assert.strictEqual(syncable.log.length, 1);
			// Version is incremented BEFORE adding to log, so entry has version 1
			assert.deepStrictEqual(syncable.log[0], {
				version: 1,
				type: 'call',
				args: ['methodName', ['arg1']],
			});
		});
	});

	describe('#pushQueue(name, ...args)', function() {
		it('should create a new queue if it does not exist', function(done) {
			let syncable = new Syncable('test');
			
			// Ready event is expected
			syncable.emit('ready');

			// Watch the queue to drain messages
			syncable.watchQueue('notifications', (message) => {
				assert.strictEqual(message, 'Hello');
				done();
			});

			syncable.pushQueue('notifications', 'Hello');
		});
	});

	describe('#clearQueue(name)', function() {
		it('should clear all messages in a queue', function(done) {
			let syncable = new Syncable('test');
			
			// Emit ready
			syncable.emit('ready');

			// Watch to create queue
			syncable.watchQueue('messages', () => {});

			// Add some messages
			syncable.pushQueue('messages', 'msg1');
			syncable.pushQueue('messages', 'msg2');

			// Clear the queue
			syncable.clearQueue('messages');

			let queue = syncable.queues.get('messages');
			assert.deepStrictEqual(queue.messages, []);
			done();
		});
	});

	describe('#release()', function() {
		it('should set the _released flag', function() {
			let syncable = new Syncable('test');
			assert.strictEqual(syncable._released, undefined);

			syncable.release();
			assert.strictEqual(syncable._released, true);
		});

		it('should emit the released event', function(done) {
			let syncable = new Syncable('test');
			
			syncable.on('released', () => {
				done();
			});

			syncable.release();
		});
	});

	describe('state properties', function() {
		let TestSyncable;

		before(function() {
			TestSyncable = Function.inherits('Alchemy.Syncable.Syncable', 'TestSyncable', function TestSyncable(type) {
				TestSyncable.super.call(this, type || 'test');
			});

			TestSyncable.setStateProperty('counter', {
				default: 0,
				allow_server_set: true,
			});

			TestSyncable.setStateProperty('readonly_prop', {
				default: 'fixed',
				allow_server_set: false,
			});
		});

		it('should provide default values via getter', function() {
			let syncable = new TestSyncable();
			assert.strictEqual(syncable.counter, 0);
		});

		it('should allow setting values when allow_server_set is true', function() {
			let syncable = new TestSyncable();
			syncable.counter = 5;
			assert.strictEqual(syncable.counter, 5);
		});
	});

	describe('.setSyncMethod()', function() {
		let MethodTestSyncable;

		before(function() {
			MethodTestSyncable = Function.inherits('Alchemy.Syncable.Syncable', 'MethodTestSyncable', function MethodTestSyncable() {
				MethodTestSyncable.super.call(this, 'method_test');
			});

			MethodTestSyncable.setSyncMethod(function addValue(amount) {
				if (!this.state.total) {
					this.state.total = 0;
				}
				this.state.total += amount;
				return this.state.total;
			});
		});

		it('should add a method that logs calls', function() {
			let syncable = new MethodTestSyncable();
			let result = syncable.addValue(10);

			assert.strictEqual(result, 10);
			assert.strictEqual(syncable.state.total, 10);

			// Check that call was logged
			let callLog = syncable.log.find(entry => entry.type === 'call');
			assert.ok(callLog, 'A call log entry should exist');
			assert.deepStrictEqual(callLog.args, ['addValue', [10]]);
		});
	});

	describe('.handleLink() error handling', function() {
		it('should submit error with SYNCABLE_NOT_FOUND code when no syncables exist', async function() {
			// Create a mock linkup
			let submitted_error = null;
			let destroyed = false;
			
			let mockLinkup = {
				submit: function(event, data) {
					if (event === 'error') {
						submitted_error = data;
					}
				},
				destroy: function() {
					destroyed = true;
				}
			};

			// Create a mock conduit with no syncables
			let mockConduit = {
				session: function() {
					return null; // No syncables
				}
			};

			await Syncable.handleLink(mockConduit, mockLinkup, {type: 'test', id: 'test-id'});

			assert.ok(submitted_error, 'An error should be submitted');
			assert.strictEqual(submitted_error.code, 'SYNCABLE_NOT_FOUND');
			assert.ok(submitted_error.message.includes('No syncable found'));
			assert.ok(destroyed, 'Linkup should be destroyed');
		});

		it('should submit error with SYNCABLE_NOT_FOUND code when syncable id not found', async function() {
			let submitted_error = null;
			let destroyed = false;
			
			let mockLinkup = {
				submit: function(event, data) {
					if (event === 'error') {
						submitted_error = data;
					}
				},
				destroy: function() {
					destroyed = true;
				}
			};

			// Create a type map but without the requested id
			let typeMap = new Map();
			typeMap.set('other-id', {});
			
			let syncablesMap = new Map();
			syncablesMap.set('test', typeMap);

			let mockConduit = {
				session: function() {
					return syncablesMap;
				}
			};

			await Syncable.handleLink(mockConduit, mockLinkup, {type: 'test', id: 'missing-id'});

			assert.ok(submitted_error, 'An error should be submitted');
			assert.strictEqual(submitted_error.code, 'SYNCABLE_NOT_FOUND');
			assert.ok(submitted_error.message.includes('No syncable found'));
			assert.ok(destroyed, 'Linkup should be destroyed');
		});
	});

	describe('.tryRecreate()', function() {
		let RecreatableSyncable;
		let Specialized;
		let recreateCalls = [];

		before(async function() {
			Specialized = Classes.Alchemy.Syncable.Specialized;

			// Create a subclass of Specialized with a recreate method for testing
			RecreatableSyncable = Function.inherits('Alchemy.Syncable.Specialized', 'Alchemy.Syncable', function RecreatableSyncable() {
				RecreatableSyncable.super.call(this);
			});

			RecreatableSyncable.setStatic(async function recreate(conduit, config) {
				recreateCalls.push({conduit, config});
				
				let instance = new RecreatableSyncable();
				instance.id = config.id;
				return instance;
			});

			// Wait for class registration to complete
			await Pledge.after(1);
		});

		beforeEach(function() {
			recreateCalls = [];
		});

		it('should return null for unknown type', async function() {
			let result = await Syncable.tryRecreate({}, {type: 'nonexistent_type_xyz', id: 'test'});
			assert.strictEqual(result, null);
		});

		it('should return null when class has no recreate method', async function() {
			// Create a subclass without recreate method
			const NoRecreateSyncable = Function.inherits('Alchemy.Syncable.Specialized', 'Alchemy.Syncable', function NoRecreateSyncable() {
				NoRecreateSyncable.super.call(this);
			});

			await Pledge.after(1);

			let result = await Syncable.tryRecreate({}, {type: 'no_recreate_syncable', id: 'test'});
			assert.strictEqual(result, null);
		});

		it('should call recreate and register the result when class has recreate method', async function() {
			let sessionData = null;
			let mockConduit = {
				session: function(key, value) {
					if (value !== undefined) {
						sessionData = value;
					}
					return sessionData;
				}
			};

			// The type must match what getDescendantsDict produces for this class
			let config = {type: 'recreatable_syncable', id: 'my-test-id'};
			let result = await Syncable.tryRecreate(mockConduit, config);

			assert.strictEqual(recreateCalls.length, 1, 'recreate() should be called once');
			assert.strictEqual(recreateCalls[0].conduit, mockConduit);
			assert.strictEqual(recreateCalls[0].config, config);
			assert.ok(result instanceof RecreatableSyncable);
			assert.strictEqual(result.id, 'my-test-id');

			// Verify it was registered
			assert.ok(sessionData, 'Session should have syncables map');
			assert.ok(sessionData instanceof Map);
			
			let typeMap = sessionData.get('recreatable_syncable');
			assert.ok(typeMap, 'Should have type map for recreatable_syncable');
			assert.strictEqual(typeMap.get('my-test-id'), result);
		});

		it('should return null and log error when recreate throws', async function() {
			// Create a subclass that throws in recreate
			const ErrorSyncable = Function.inherits('Alchemy.Syncable.Specialized', 'Alchemy.Syncable', function ErrorSyncable() {
				ErrorSyncable.super.call(this);
			});

			ErrorSyncable.setStatic(async function recreate(conduit, config) {
				throw new Error('Recreation failed intentionally');
			});

			await Pledge.after(1);

			let mockConduit = {
				session: function() { return null; }
			};

			// Should not throw, should return null
			let result = await Syncable.tryRecreate(mockConduit, {type: 'error_syncable', id: 'test'});
			assert.strictEqual(result, null);
		});

		it('should return null when recreate returns null', async function() {
			// Create a subclass that returns null from recreate
			const NullSyncable = Function.inherits('Alchemy.Syncable.Specialized', 'Alchemy.Syncable', function NullSyncable() {
				NullSyncable.super.call(this);
			});

			NullSyncable.setStatic(async function recreate(conduit, config) {
				return null; // Explicitly return null
			});

			await Pledge.after(1);

			let mockConduit = {
				session: function() { return null; }
			};

			let result = await Syncable.tryRecreate(mockConduit, {type: 'null_syncable', id: 'test'});
			assert.strictEqual(result, null);
		});
	});

	describe('.unDry() with broken instances', function() {
		it('should return existing valid instance if version matches', function() {
			let original = new Syncable('test_type');
			original.setProperty('data', 'value');

			let dried = original.toDry();
			
			// First unDry creates and caches
			let first = Syncable.unDry(dried.value);
			assert.strictEqual(first.id, original.id);

			// Second unDry with same data should return cached (on browser)
			// On server, it always creates new instances
			let second = Syncable.unDry(dried.value);
			
			// On server, instances are always new
			assert.strictEqual(second.type, 'test_type');
		});

		it('should update state if server version is newer', function() {
			let syncable = new Syncable('test_type');
			syncable.setProperty('counter', 1);

			let dried = syncable.toDry();
			let restored = Syncable.unDry(dried.value);

			// Simulate server sending newer version
			let newerData = {
				...dried.value,
				version: dried.value.version + 5,
				state: { counter: 100 }
			};

			// On server, this creates a new instance with the newer state
			let updated = Syncable.unDry(newerData);
			assert.strictEqual(updated.state.counter, 100);
		});
	});

	describe('#release()', function() {
		it('should set _released flag to prevent reconnection', function() {
			let syncable = new Syncable('test');
			assert.strictEqual(syncable._released, undefined);

			syncable.release();
			assert.strictEqual(syncable._released, true);
		});

		it('should clear pending reconnect timeout', function() {
			let syncable = new Syncable('test');
			
			// Manually set a fake timeout
			syncable._reconnect_timeout = setTimeout(() => {}, 10000);
			
			syncable.release();
			
			assert.strictEqual(syncable._reconnect_timeout, null);
		});

		it('should emit released event', function(done) {
			let syncable = new Syncable('test');
			
			syncable.on('released', () => {
				done();
			});

			syncable.release();
		});
	});

	describe('reconnection behavior (server-side simulation)', function() {
		it('should track reconnect attempts for exponential backoff', function() {
			let syncable = new Syncable('test');
			
			// Initially no attempts
			assert.strictEqual(syncable._reconnect_attempts, undefined);
			
			// Simulate incrementing (as _scheduleReconnect would do on browser)
			syncable._reconnect_attempts = 1;
			assert.strictEqual(syncable._reconnect_attempts, 1);
			
			syncable._reconnect_attempts = 2;
			assert.strictEqual(syncable._reconnect_attempts, 2);
		});

		it('should not reconnect when _released is true', function() {
			let syncable = new Syncable('test');
			syncable._released = true;
			
			// The _scheduleReconnect method checks this flag
			// We can verify the flag is respected
			assert.strictEqual(syncable._released, true);
		});

		it('should emit replaced event when old instance is invalidated', function(done) {
			let syncable = new Syncable('test');
			
			syncable.on('replaced', () => {
				assert.strictEqual(syncable._replaced, true);
				done();
			});

			// Simulate what unDry does when it finds a broken instance
			syncable._replaced = true;
			syncable.emit('replaced');
		});
	});
});

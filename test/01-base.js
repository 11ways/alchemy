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
			var result = Classes.Alchemy.Conduit.getMember('http');

			assert.strictEqual(result, null);
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
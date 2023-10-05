var assert = require('assert');

describe('Mongo Datasource', function() {

	describe('#_read()', function() {
		it('uses pipelines to perform join queries', async function() {

			var conditions = {
				'Project.name'                  : 'protoblast',
				'ProjectVersion.version_string' : '1.0.1'
			};

			let options = {
				conditions : conditions,
				recursive  : 1,
				//document   : false
			};

			let top_record = await Model.get('ProjectVersion').find('first', options);

			assert.strictEqual(top_record.version_string, '1.0.1');
			assert.strictEqual(top_record.Project.name, 'protoblast');
		});
	});

	describe('ObjectId', function() {
		it('should be able to be checksummed', function() {

			let set = new HashSet();

			let a = alchemy.ObjectId(),
			    b = alchemy.ObjectId(),
			    c = alchemy.ObjectId();

			let old_a = a,
			    old_b = b,
			    old_c = c;

			assert.strictEqual((a+'').isObjectId(), true);
			assert.strictEqual((b+'').isObjectId(), true);
			assert.strictEqual((c+'').isObjectId(), true);

			set.add(a);
			set.add(b);
			set.add(c);

			assert.notStrictEqual(a+'', b+'');
			assert.notStrictEqual(a+'', c+'');

			assert.strictEqual(set.size, 3);

			assert.strictEqual(set.has(a), true);
			assert.strictEqual(set.has(b), true);
			assert.strictEqual(set.has(c), true);

			a = alchemy.castObjectId(a+'');
			b = alchemy.castObjectId(b+'');
			c = alchemy.castObjectId(c+'');

			assert.strictEqual(set.has(a), true);
			assert.strictEqual(set.has(b), true);
			assert.strictEqual(set.has(c), true);

			assert.notStrictEqual(old_a, a);
			assert.notStrictEqual(old_b, b);
			assert.notStrictEqual(old_c, c);
		});
	})
});
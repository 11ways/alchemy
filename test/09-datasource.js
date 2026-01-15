var assert = require('assert');

describe('Mongo Datasource', function() {

	describe('#_read()', function() {
		it('uses pipelines to perform join queries', async function() {

			var conditions = {
				'Project.name'   : 'protoblast',
				'version_string' : '1.0.1'
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
	});

	describe('$lookup optimization for populate()', function() {
		it('should generate $lookup pipeline for criteria populate()', async function() {
			// Create criteria with populate
			let criteria = Model.get('Person').find();
			criteria.populate('Parent');

			// Get the datasource and compile the criteria
			let ds = Model.get('Person').datasource;
			let compiled = await ds.compileCriteria(criteria);

			// Verify pipeline contains $lookup
			assert.strictEqual(!!compiled.pipeline, true, 'Should generate a pipeline');

			let has_lookup = compiled.pipeline.some(stage => stage.$lookup);
			assert.strictEqual(has_lookup, true, 'Pipeline should contain $lookup stage');
		});

		it('should return populated data correctly', async function() {
			// Query persons with Parent populated
			let criteria = Model.get('Person').find();
			criteria.where('firstname').equals('Jelle');
			criteria.populate('Parent');

			let records = await Model.get('Person').find('all', criteria);

			assert.strictEqual(records.length, 1);
			assert.strictEqual(records[0].firstname, 'Jelle');
			assert.strictEqual(!!records[0].Parent, true, 'Parent should be populated');
			assert.strictEqual(records[0].Parent.firstname, 'Griet', 'Parent should be Griet');
		});
	});

	describe('$facet optimization for pagination', function() {
		it('should return correct available count with pagination and populate', async function() {
			// Get total count first for comparison
			let total = await Model.get('Person').find('count');

			// Query with pagination and populate - this triggers $facet
			let criteria = Model.get('Person').find();
			criteria.populate('Parent');
			criteria.limit(1);

			let records = await Model.get('Person').find('all', criteria);

			// Verify we get limited results but correct available count
			assert.strictEqual(records.length, 1);
			assert.strictEqual(records.available, total, 'Available count should match total records');
		});

		it('should skip count when available option is false', async function() {
			let criteria = Model.get('Person').find();
			criteria.populate('Parent');
			criteria.limit(1);
			criteria.setOption('available', false);

			let records = await Model.get('Person').find('all', criteria);

			assert.strictEqual(records.length, 1);
			assert.strictEqual(records.available, null, 'Available should be null when disabled');
		});

		it('should work correctly with skip and limit', async function() {
			// Get total count first
			let total = await Model.get('Person').find('count');

			let criteria = Model.get('Person').find();
			criteria.populate('Parent');
			criteria.limit(1);
			criteria.skip(1);

			let records = await Model.get('Person').find('all', criteria);

			assert.strictEqual(records.length, 1);
			assert.strictEqual(records.available, total, 'Available should equal total count');
		});

		it('should handle empty results correctly', async function() {
			// Query for a non-existent person
			let criteria = Model.get('Person').find();
			criteria.where('firstname').equals('NonExistentPersonXYZ');
			criteria.populate('Parent');
			criteria.limit(10);

			let records = await Model.get('Person').find('all', criteria);

			assert.strictEqual(records.length, 0, 'Should return no records');
			assert.strictEqual(records.available, 0, 'Available should be 0 for empty results');
		});

		it('should return correct count when skip exceeds matching records', async function() {
			// Get count of people matching a specific condition
			let criteria = Model.get('Person').find();
			criteria.where('firstname').equals('Jelle');
			let matchCount = await Model.get('Person').find('count', criteria);

			// Now query with skip exceeding the count
			criteria = Model.get('Person').find();
			criteria.where('firstname').equals('Jelle');
			criteria.populate('Parent');
			criteria.skip(100);  // Skip way more than exists
			criteria.limit(10);

			let records = await Model.get('Person').find('all', criteria);

			assert.strictEqual(records.length, 0, 'Should return no records when skip exceeds count');
			assert.strictEqual(records.available, matchCount, 'Available should still reflect total matching records');
		});
	});
});
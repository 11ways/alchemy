var assert = require('assert'),
    Person;

function makeCriteria() {
	return new Classes.Alchemy.Criteria();
}

describe('Criteria', function() {

	before(function() {
		Person = Model.get('Person');
	});

	describe('#where(field)', function() {
		it('targets the given field', async function() {

			var criteria = makeCriteria();
			criteria.where('firstname').equals('Jelle');

			let records = await Person.find('all', criteria),
			    record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(record.firstname, 'Jelle');
		});

		it('can target fields in an associated BelongsTo model', async function() {

			var criteria = makeCriteria();
			criteria.where('Parent.firstname').equals('Griet');

			let records = await Person.find('all', criteria),
			    record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(record.firstname, 'Jelle');
		});

		it('can target fields in an associated HasMany model', async function() {

			var criteria = makeCriteria();
			criteria.where('Children.firstname').equals('Jelle');

			let records = await Person.find('all', criteria),
			    record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(record.firstname, 'Griet');
		});
	});

	describe('#equals(text)', function() {
		it('tests if the field is equal to the given text', async function() {

			var criteria = makeCriteria();
			criteria.where('firstname').equals('elle');

			let records = await Person.find('all', criteria);
			assert.strictEqual(records.length, 0);
		});
	});

	describe('#contains(text)', function() {
		it('tests if the field contains the text', async function() {

			var criteria = makeCriteria();
			criteria.where('firstname').contains('elle');

			let records = await Person.find('all', criteria),
			    record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(record.firstname, 'Jelle');
		});
	});

	describe('#not()', function() {
		it('negates the following expression', async function() {

			var criteria = makeCriteria();
			criteria.where('firstname').not().contains('elle');

			let records = await Person.find('all', criteria),
			    record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(record.firstname, 'Griet');
		});
	});

	describe('#applyOldConditions(conditions)', function() {
		it('should parse pre version 1.1.0 style conditions', async function() {

			let records = await Person.find('all', {
				conditions: {
					firstname: {$ne: 'Griet'}
				}
			});

			console.log('Records:', records);
			console.dir(records.options.compile(), {depth: null})
			console.dir(records.options.all_expressions, {depth: 3});

			assert.strictEqual(records.length, 1);

			let record = records[0];

			assert.notStrictEqual(record.firstname, 'Griet');
		});
	});

});
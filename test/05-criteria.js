var assert = require('assert'),
    Person;

function makeCriteria() {
	return new Classes.Alchemy.Criteria();
}

describe('Criteria', function() {

	before(function() {
		Person = Model.get('Person');
	});

	describe('#select(field)', function() {
		it('selects the given field', async function() {

			var criteria = Person.find();

			criteria.select('firstname');

			let records = await Person.find(criteria);

			assert.strictEqual(records.length, 2);

			let record = records[0];

			assert.strictEqual(!!record._id, true, 'The _id should always be selected');
			assert.strictEqual(typeof record.firstname, 'string');
			assert.strictEqual(typeof record.lastname, 'undefined');
			assert.strictEqual(typeof record.birthdate, 'undefined');
			assert.strictEqual(typeof record.male, 'undefined');
			assert.strictEqual(typeof record.Parent, 'undefined');
			assert.strictEqual(typeof records[1].Parent, 'undefined');
		});
	});

	describe('#select(association)', function() {
		it('also query the association', async function() {

			var criteria = Person.find();

			criteria.select('Parent');
			criteria.where('firstname').equals('Jelle');

			let records = await Person.find(criteria);

			assert.strictEqual(records.length, 1);

			let record = records[0];

			assert.strictEqual(!!record.Parent, true, 'The Parent record wasn\'t selected');
			assert.strictEqual(record.Parent.firstname, 'Griet', 'The wrong record was selected as Parent');
			assert.strictEqual(typeof record.Parent.lastname, 'string', 'The lastname field was not selected');
			assert.strictEqual(record.Parent.lastname, 'De Leener');
		});
	});

	describe('#select(association.field)', function() {
		it('also query the association but limit it to the given field', async function() {

			var criteria = Person.find();

			criteria.select('Parent.firstname');
			criteria.where('firstname').equals('Jelle');

			let records = await Person.find(criteria);

			assert.strictEqual(records.length, 1);

			let record = records[0];

			assert.strictEqual(!!record.Parent, true, 'The Parent record wasn\'t selected');
			assert.strictEqual(!!record.Parent._id, true, 'The Parent should have an _id field');
			assert.strictEqual(record.Parent.firstname, 'Griet', 'The wrong record was selected as Parent');
			assert.strictEqual(typeof record.Parent.lastname, 'undefined', 'The parent record should only have an _id and firstname field');
		});
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

			assert.strictEqual(records.length, 1);

			let record = records[0];

			assert.notStrictEqual(record.firstname, 'Griet');
		});
	});

});
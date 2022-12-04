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

		it('should accept regex values', async function() {

			var criteria = makeCriteria();
			criteria.where('firstname').equals(/.*elle.*/i);

			let records = await Person.find('all', criteria),
			    record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(record.firstname, 'Jelle');
		});

		it('should accept regex values for any kind of field', async function() {
			var criteria = makeCriteria();
			criteria.where('birthdate').equals(/.*1987.*/i);

			let records = await Person.find('all', criteria),
			    record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(record.firstname, 'Jelle');
		});

		it('should respect limits when giving regex values', async function() {

			var criteria = makeCriteria();
			criteria.where('birthdate').equals(/.*19.*/i);

			criteria.sort({birthdate: 1});
			criteria.limit(1);

			let records = await Person.find('all', criteria),
			    record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(records.available, 2);
			assert.strictEqual(record.firstname, 'Griet');

			// Now do the reverse sort
			criteria = makeCriteria();
			criteria.where('birthdate').equals(/.*19.*/i);

			criteria.sort({birthdate: -1});
			criteria.limit(1);

			records = await Person.find('all', criteria);
			record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(records.available, 2);
			assert.strictEqual(record.firstname, 'Jelle');

			// And now let's use the skip
			criteria = makeCriteria();
			criteria.where('birthdate').equals(/.*19.*/i);

			criteria.sort({birthdate: -1});
			criteria.limit(1);
			criteria.skip(1);

			records = await Person.find('all', criteria);
			record = records[0];

			assert.strictEqual(records.length, 1);
			assert.strictEqual(record.firstname, 'Griet', 'Expected "Griet", the "Jelle" record should have been skipped');
			assert.strictEqual(records.available, 2);
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

	describe('#isEmpty()', function() {
		it('selects records if the context field is empty', async function() {

			await createModel(function EmptyTester() {
				this.addField('name', 'String');
				this.addField('tags', 'String', {array: true});
			});

			let EmptyTester = Model.get('EmptyTester');

			let doc = EmptyTester.createDocument();
			doc.name = 'first';
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = 'second';
			doc.tags = [];
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = 'third';
			doc.tags = ['t1'];
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = 'fourth';
			doc.tags = ['t2'];
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.tags = ['t3'];
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = '';
			doc.tags = ['t4'];
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = null;
			doc.tags = ['t5'];
			await doc.save();

			let crit = EmptyTester.find();
			crit.where('name').isEmpty();

			let all_records = await EmptyTester.find('all');
			assert.strictEqual(all_records.length, 7);

			let empty_names = await EmptyTester.find('all', crit);
			assert.strictEqual(empty_names.length, 3);

			crit = EmptyTester.find();
			crit.where('name').not().isEmpty();

			let not_empty_names = await EmptyTester.find('all', crit);
			assert.strictEqual(not_empty_names.length, 4);

			crit = EmptyTester.find();

			crit.where('name').not().isEmpty();
			crit.where('tags').not().isEmpty();

			let nothing_empty = await EmptyTester.find('all', crit);
			assert.strictEqual(nothing_empty.length, 2);

			crit = EmptyTester.find();
			let not = crit.where('name').not();
			not.isEmpty();
			not.equals('first');

			let not_empty_or_first = await EmptyTester.find('all', crit);
			assert.strictEqual(not_empty_or_first.length, 3);

			assert.strictEqual(not_empty_or_first[0].name, 'second');
			assert.strictEqual(not_empty_or_first[1].name, 'third');
			assert.strictEqual(not_empty_or_first[2].name, 'fourth');

			// @TODO: this doesn't work yet
			// crit = EmptyTester.find();
			// not = crit.where('name').not();
			// not.isEmpty(false);
			// not.equals('');

			// let empty_no_empty_string = await EmptyTester.find('all', crit);

		});

		it('should also work with translatable fields', async function() {

			await createModel(function TranslatableEmptyTester() {
				this.addField('name', 'String');
				this.addField('title', 'String', {translatable: true});
			});

			let EmptyTester = Model.get('TranslatableEmptyTester');

			let doc = EmptyTester.createDocument();
			doc.name = 'complete-1';
			doc.title = {en: 'EN1', nl: 'NL1', fr: 'FR1'};
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = 'complete-2';
			doc.title = {en: 'EN2', nl: 'NL2', fr: 'FR2'};
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = 'en-only-3';
			doc.title = {en: 'EN3'};
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = 'nl-only-4';
			doc.title = {nl: 'NL4'};
			await doc.save();

			doc = EmptyTester.createDocument();
			doc.name = 'no-english-5';
			doc.title = {nl: 'NL5', fr: 'FR5'};
			await doc.save();

			let all = await EmptyTester.find('all');

			assert.strictEqual(all.length, 5, '5 records should have been returned');

			// Get them all, but translated in english
			let crit = EmptyTester.find();
			crit.setOption('locale', 'en');

			all = await EmptyTester.find('all', crit);

			assert.strictEqual(all[0].title, 'EN1');
			assert.strictEqual(all[1].title, 'EN2');
			assert.strictEqual(all[2].title, 'EN3');
			assert.strictEqual(all[3].title, undefined);
			assert.strictEqual(all[4].title, undefined);

			// Only get the ones with a dutch translation
			crit = EmptyTester.find();
			crit.setOption('locale', 'nl');

			crit.where('title').not().isEmpty();

			all = await EmptyTester.find('all', crit);

			assert.strictEqual(all.length, 4, 'Only 4 records with a dutch translation should have returned');

			assert.strictEqual(all[0].title, 'NL1');
			assert.strictEqual(all[1].title, 'NL2');
			assert.strictEqual(all[2].title, 'NL4');
			assert.strictEqual(all[3].title, 'NL5');

			// Only get the ones with a french translation
			crit = EmptyTester.find();
			crit.setOption('locale', 'fr');

			crit.where('title').not().isEmpty();

			all = await EmptyTester.find('all', crit);

			assert.strictEqual(all.length, 3, 'Only 3 records with a french translation should have returned');

			assert.strictEqual(all[0].title, 'FR1');
			assert.strictEqual(all[1].title, 'FR2');
			assert.strictEqual(all[2].title, 'FR5');

			// Get every document that does not have an english translation
			crit = EmptyTester.find();
			crit.setOption('locale', 'en');
			crit.where('title').isEmpty();

			all = await EmptyTester.find('all', crit);

			assert.strictEqual(all.length, 2, 'Only 2 records should have been returned');

			let message = 'An undefined title should have been returned, because fallback translations are disabled and english ones were requested';
			assert.strictEqual(all[0].title, undefined, message);
			assert.strictEqual(all[1].title, undefined, message);

			assert.strictEqual(all[0].name, 'nl-only-4');
			assert.strictEqual(all[1].name, 'no-english-5');
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

	describe('#sort()', function() {

		it('should sort the result', async function() {

			let criteria = Person.find();

			let records = await Person.find('all', criteria);

			assert.strictEqual(records.length, 2, '2 records should have been found');

			criteria = Person.find();

			// Sort descending
			criteria.sort(['firstname', -1]);

			records = await Person.find('all', criteria);

			assert.strictEqual(records[0].firstname, 'Jelle');
			assert.strictEqual(records[1].firstname, 'Griet');

			criteria = Person.find();

			// Sort ascending
			criteria.sort(['firstname', 1]);

			records = await Person.find('all', criteria);

			assert.strictEqual(records[0].firstname, 'Griet');
			assert.strictEqual(records[1].firstname, 'Jelle');

			criteria = Person.find();
			criteria.sort(['Person.firstname', -1]);

			records = await Person.find('all', criteria);

			assert.strictEqual(records[0].firstname, 'Jelle');
			assert.strictEqual(records[1].firstname, 'Griet');
		});

	});

});
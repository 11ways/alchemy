var assert = require('assert');

describe('DocumentList', function() {

	var person_list;

	before(async function() {
		let Person = Model.get('Person');
		person_list = await Person.find('all', {sort: {created: -1}});
	});

	describe('#length', function() {
		it('should return the number of records', function() {
			assert.strictEqual(typeof person_list.length, 'number');
			assert.strictEqual(person_list.length >= 3, true, 'Should have at least 3 Person records');
		});
	});

	describe('#available', function() {
		it('should reflect the total number of available records', function() {
			assert.strictEqual(typeof person_list.available, 'number');
			assert.strictEqual(person_list.available >= person_list.length, true,
				'available should be >= length');
		});
	});

	describe('#clone()', function() {
		it('should clone the list and all the documents', function() {

			var clone = two_person_list.clone();

			// These should be equal
			assert.strictEqual(clone[0].firstname, two_person_list[0].firstname);
			assert.strictEqual(clone[1].firstname, two_person_list[1].firstname);

			clone[0].firstname = 'first_firstname';

			assert.notStrictEqual(clone[0].firstname, two_person_list[0].firstname);
			assert.strictEqual(clone[1].firstname, two_person_list[1].firstname);
		});
	});

	describe('iteration', function() {
		it('should support for...of iteration', function() {

			let count = 0;
			let names = [];

			for (let doc of person_list) {
				count++;
				names.push(doc.firstname);
			}

			assert.strictEqual(count, person_list.length,
				'for...of should iterate over all records');
			assert.strictEqual(names.length, person_list.length);
		});

		it('should support index-based access', function() {
			assert.strictEqual(person_list[0].firstname, person_list.records[0].firstname);

			if (person_list.length > 1) {
				assert.strictEqual(person_list[1].firstname, person_list.records[1].firstname);
			}
		});
	});

	describe('#push(document)', function() {
		it('should append documents and keep length, index access & iteration in sync', async function() {

			let Person = Model.get('Person');
			let list = await Person.find('all', {sort: {created: -1}, limit: 2});
			let extra = (await Person.find('all', {sort: {created: 1}, limit: 1}))[0];

			let original_length = list.length;
			let result = list.push(extra);

			assert.strictEqual(result, original_length + 1, 'push should return the new length');
			assert.strictEqual(list.length, original_length + 1);
			assert.strictEqual(list[original_length], extra, 'the document should be index-accessible');

			let seen = 0;

			for (let doc of list) {
				if (doc === extra) seen++;
			}

			assert.strictEqual(seen, 1, 'for...of should include the pushed document');
			assert.strictEqual(list.some(doc => doc === extra), true);
		});

		it('should support pushing multiple documents at once', async function() {

			let Person = Model.get('Person');
			let list = await Person.find('all', {sort: {created: -1}, limit: 1});
			let extras = (await Person.find('all', {sort: {created: 1}, limit: 2})).toArray();

			let result = list.push(...extras);

			assert.strictEqual(result, 1 + extras.length);
			assert.strictEqual(list.length, 1 + extras.length);
			assert.strictEqual(list[list.length - 1], extras[extras.length - 1]);
		});
	});

	describe('#toArray()', function() {
		it('should return a plain array of documents', function() {

			let arr = person_list.toArray();

			assert.strictEqual(Array.isArray(arr), true);
			assert.strictEqual(arr.length, person_list.length);
			assert.strictEqual(arr[0].firstname, person_list[0].firstname);
		});

		it('should return a new array, not the internal records reference', function() {

			let arr = person_list.toArray();

			assert.notStrictEqual(arr, person_list.records);
		});
	});

	describe('#toSimpleArray(options)', function() {
		it('should return only the requested fields', function() {

			let arr = person_list.toSimpleArray({fields: ['firstname']});

			assert.strictEqual(Array.isArray(arr), true);
			assert.strictEqual(arr.length, person_list.length);
			assert.strictEqual(arr[0].firstname, person_list[0].firstname);
			assert.strictEqual(arr[0].lastname, undefined,
				'Should not include fields that were not requested');
		});

		it('should accept an array shorthand for fields', function() {

			let arr = person_list.toSimpleArray(['firstname', 'lastname']);

			assert.strictEqual(arr.length, person_list.length);
			assert.strictEqual(typeof arr[0].firstname, 'string');
			assert.strictEqual(typeof arr[0].lastname, 'string');
		});
	});

	describe('#toHawkejs()', function() {
		it('should return a Client.DocumentList instance', function() {

			let client_list = person_list.toHawkejs();

			assert.strictEqual(
				client_list instanceof Blast.Classes.Alchemy.Client.DocumentList,
				true,
				'Should be an instance of Client.DocumentList'
			);

			assert.strictEqual(client_list.length, person_list.length);
			assert.strictEqual(client_list.available, person_list.available);
			assert.strictEqual(client_list[0].firstname, person_list[0].firstname);
		});

		it('should produce client documents inside the list', function() {

			let client_list = person_list.toHawkejs();

			assert.strictEqual(
				client_list[0] instanceof Blast.Classes.Alchemy.Client.Document.Document,
				true,
				'Records should be Client Document instances'
			);
		});
	});

	describe('#toDry()', function() {
		it('should allow the list to be json-dried and undried', function() {

			let dried = JSON.dry(person_list);
			let undried = JSON.undry(dried);

			assert.strictEqual(undried instanceof Blast.Classes.Alchemy.DocumentList, true);
			assert.strictEqual(undried.length, person_list.length);
			assert.strictEqual(undried.available, person_list.available);
			assert.strictEqual(undried[0].firstname, person_list[0].firstname);
		});
	});

	describe('empty DocumentList', function() {
		it('should handle an empty list correctly', function() {

			let empty = new Classes.Alchemy.DocumentList([]);

			assert.strictEqual(empty.length, 0);
			assert.strictEqual(empty.available, 0);

			let arr = empty.toArray();
			assert.strictEqual(arr.length, 0);

			let count = 0;
			for (let doc of empty) {
				count++;
			}
			assert.strictEqual(count, 0);
		});

		it('should handle a null records argument', function() {

			let empty = new Classes.Alchemy.DocumentList(null);

			assert.strictEqual(empty.length, 0);
			assert.strictEqual(empty.available, 0);
		});
	});

	describe('#keepPrivateFields()', function() {
		it('should call keepPrivateFields on all documents', function() {

			let list = person_list.clone();
			let called = 0;

			// Temporarily override keepPrivateFields on the cloned docs to track calls
			for (let doc of list) {
				doc.keepPrivateFields = function(val) {
					called++;
				};
			}

			list.keepPrivateFields(true);

			assert.strictEqual(called, list.length,
				'keepPrivateFields should be called on every document');
		});
	});

});

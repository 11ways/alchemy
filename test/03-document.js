var assert = require('assert');

describe('Document', function() {

	describe('.setMethod(fnc)', function() {
		it('should set custom methods on the given Document class', function() {
			// Already set one earlier
			assert.strictEqual(person_doc.getFamiliarName(), 'Jelle');
		});
	});

	describe('.setProperty(getter)', function() {
		it('should add a custom property on the given Document class', function() {

			Person.Document.setProperty(function familiar_name() {
				return this.getFamiliarName();
			});

			assert.strictEqual(person_doc.familiar_name, 'Jelle');

			var empty_doc = new Person.Document();

			assert.strictEqual(empty_doc.familiar_name, 'Unknown');

			var base_doc = new Classes.Alchemy.Document.Document();
			assert.strictEqual(base_doc.familiar_name, undefined);
		});
	});

	describe('model field properties', function() {
		it('should refer to the $main object', function() {
			assert.strictEqual(person_doc.firstname, person_doc.$main.firstname);
			assert.strictEqual(person_doc.nicknames, person_doc.$main.nicknames);
			assert.strictEqual(person_doc.birthdate, person_doc.$main.birthdate);
			assert.strictEqual(person_doc.Person,    person_doc.$main);
		});

		it('should overwrite the original values', function() {
			person_doc.firstname = 'Jellie';
			assert.strictEqual(person_doc.firstname, 'Jellie');
			assert.strictEqual(person_doc.firstname, person_doc.$main.firstname);
			person_doc.firstname = 'Jelle';
		});
	});

	describe('#model', function() {
		it('should return an instance of the Model of the Document', function() {
			var new_doc = new Classes.Alchemy.Document.Person(),
			    model;

			model = new_doc.$model;

			assert.strictEqual(model.constructor.name, 'Person');
		});
	});

	describe('#clone()', function() {
		it('should clone the Document', function() {

			var clone = person_doc.clone();

			// It should NOT be the same reference
			assert.notStrictEqual(clone.$main, person_doc.$main);

			// It SHOULD contain the same values
			assert.deepStrictEqual(clone.$main, person_doc.$main);

			clone.firstname = 'Clonie';

			assert.strictEqual(clone.firstname,      'Clonie');
			assert.strictEqual(person_doc.firstname, 'Jelle');
			assert.strictEqual(clone.familiar_name,  'Clonie');

		});
	});

	describe('#toHawkejs()', function() {
		it('should return a ClientDocument instance', function() {
			var client_doc = person_doc.toHawkejs();

			assert.strictEqual(client_doc.firstname,     person_doc.firstname);
			assert.strictEqual(client_doc.lastname,      person_doc.lastname);
			assert.strictEqual(client_doc.familiar_name, undefined);
		});
	});

	describe('#get(field_name)', function() {
		it('should return the value of the given field name', function() {
			var firstname = person_doc.get('firstname');

			assert.strictEqual(firstname, 'Jelle');
		});
	});

	describe('#get(alias, field_name)', function() {
		it('should return the value of the field name of the wanted alias', function() {
			var firstname = person_doc.get('Person', 'firstname');
			assert.strictEqual(firstname, 'Jelle');

			var does_not_exist = person_doc.get('SomethingElse', 'firstname');
			assert.strictEqual(does_not_exist, undefined);
		});
	});
});
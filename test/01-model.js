var assert = require('assert');

describe('Model', function() {

	var data,
	    _id;

	data = {
		firstname : 'Jelle',
		lastname  : 'De Loecker',
		nicknames : ['skerit', 'Jellie'],
		birthdate : new Date('1987-10-29'),
		male      : true
	};

	function testDocument(document, data) {
		assert.strictEqual(document.firstname,     data.firstname);
		assert.strictEqual(document.lastname,      data.lastname);
		assert.deepStrictEqual(document.nicknames, data.nicknames);
		assert.strictEqual(document.birthdate+'',  data.birthdate+'');
		assert.strictEqual(document.male,          data.male);
		assert.strictEqual(String(document._id).isObjectId(), true);
	}

	/**
	 * Inheritance testing
	 */
	describe('inheritance', function() {
		it('lets you inherit from the main Model class', function() {
			global.Person = Function.inherits('Alchemy.Model', function Person(options) {
				Person.super.call(this, options);
			});

			assert.strictEqual(Person.super, Classes.Alchemy.Model.Model, true);
		});
	});

	/**
	 * Adding fields to the new Model
	 */
	describe('.addField(name, type, options)', function() {
		it('should add fields (during constitution)', function(done) {
			Person.constitute(function addFields() {

				this.addField('firstname', 'String');
				this.addField('lastname',  'String');
				this.addField('nicknames', 'String', {array: true});
				this.addField('birthdate', 'Date');
				this.addField('male',      'Boolean');

				done();
			});
		});
	});

	/**
	 * Get the Document class for this model
	 */
	describe('.Document', function() {
		it('should create a Document class for this specific Model', function() {

			var PersonDocument = Person.Document;

			assert.strictEqual(PersonDocument,      Person.Document, 'Should return the same constructor instance');
			assert.strictEqual(PersonDocument.name, Person.name,     'The Document class should have the same name as the Model');
			assert.notStrictEqual(PersonDocument,   Person,          'The model & the document are different things');
		});
	});

	/**
	 * Get the ClientDocument class for this model
	 */
	describe('.ClientDocument', function() {
		it('should create a ClientDocument class for this specific Model', function() {

			var PersonDocument = Person.ClientDocument;

			assert.strictEqual(PersonDocument,      Person.ClientDocument, 'Should return the same constructor instance');
			assert.strictEqual(PersonDocument.name, Person.name,           'The Document class should have the same name as the Model');
			assert.notStrictEqual(PersonDocument,   Person,                'The model & the document are different things');
			assert.notStrictEqual(PersonDocument,   Person.Document,       'The ClientDocument & the Document are different things');
		});
	});

	/**
	 * Add Document methods
	 */
	describe('.setDocumentMethod(fnc)', function() {
		it('adds a new method to the Document class', function() {
			Person.setDocumentMethod(function getFamiliarName() {
				var result;

				if (this.firstname) {
					return this.firstname;
				} else if (this.nicknames && this.nicknames[0]) {
					return this.nicknames[0];
				} else if (this.lastname) {
					return this.lastname;
				} else {
					return 'Unknown';
				}
			});

			assert.strictEqual(Person.Document.prototype.getFamiliarName.name, 'getFamiliarName');
			assert.strictEqual(Person.ClientDocument.prototype.getFamiliarName, undefined);
		});
	});

	/**
	 * Getting an instance of the model
	 */
	describe('.get(model_name)', function() {
		it('should create a new instance of the wanted model', function() {

			var person = Model.get('Person');

			assert.strictEqual(person instanceof Person, true);
			assert.strictEqual(person instanceof Classes.Alchemy.Model.Model, true);

		});
	});

	/**
	 * Saving data
	 */
	describe('.save(data, callback)', function() {

		it('should save the data and call back with a DocumentList', function(done) {

			Model.get('Person').save(data, function saved(err, list) {

				if (err) {
					return done(err);
				}

				assert.strictEqual(list.length, 1);

				let document = list[0];

				testDocument(document, data);

				// Save the _id for next tests
				_id = document._id;

				// Save this for later tests
				global.person_doc = document;

				done();
			});
		});
	});

	/**
	 * Getting data
	 */
	describe('.find(\'first\', options, callback)', function() {
		it('should find 1 document by ObjectId instance', function(done) {
			Model.get('Person').find('first', {conditions: {_id: _id}}, function gotDocument(err, document) {

				if (err) {
					return done(err);
				}

				try {

					assert.notStrictEqual(document instanceof Classes.Alchemy.DocumentList, true, 'Should not have returned a DocumentList');
					assert.strictEqual(document instanceof Classes.Alchemy.Document.Document, true, 'Should have returned a Document');

					assert.strictEqual(String(document._id), String(_id));

					testDocument(document, data);
				} catch (err) {
					return done(err);
				}

				done();
			});
		});

		it('should find 1 document by ObjectId string', function(done) {
			Model.get('Person').find('first', {conditions: {_id: String(_id)}}, function gotDocument(err, document) {

				if (err) {
					return done(err);
				}

				try {
					assert.notStrictEqual(document instanceof Classes.Alchemy.DocumentList, true, 'Should not have returned a DocumentList');
					assert.strictEqual(document instanceof Classes.Alchemy.Document.Document, true, 'Should have returned a Document');

					assert.strictEqual(String(document._id), String(_id));

					testDocument(document, data);
				} catch (err) {
					return done(err);
				}

				done();
			});
		});
	});
});
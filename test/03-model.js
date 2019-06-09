var assert = require('assert');

describe('Model', function() {

	var WithSchemaField,
	    WithTranslation,
	    data,
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

			Person.prepareProperty('sort', function sort() {
				return {firstname: 1};
			});

			assert.strictEqual(Person.super, Classes.Alchemy.Model.Model, true);

			global.Event = Function.inherits('Alchemy.Model', function Event(options) {
				Person.super.call(this, options);
			});

			assert.strictEqual(Event.super, Classes.Alchemy.Model.Model, true);

			global.Product = Function.inherits('Alchemy.Model', function Product(options) {
				Product.super.call(this, options);
			});

			global.Project = Function.inherits('Alchemy.Model', function Project(options) {
				Project.super.call(this, options);
			});

			global.ProjectVersion = Function.inherits('Alchemy.Model', function ProjectVersion(options) {
				ProjectVersion.super.call(this, options);
			});

			ProjectVersion.prepareProperty('sort', function sort() {
				return {major: 1, minor: 1, patch: 1};
			});
		});
	});

	describe('.cache_duration', function() {
		it('gets the current cache_duration', function() {
			assert.strictEqual(Person.cache_duration, undefined);
		});

		it('gets the cache duration from the settings', function() {
			alchemy.settings.model_query_cache_duration = '1 second';

			assert.strictEqual(Person.cache_duration, '1 second');

			alchemy.settings.model_query_cache_duration = '2 seconds';
			assert.strictEqual(Person.cache_duration, '1 second', 'Changing the settings should not have affected the existing duration');

			Person.cache_duration = null;
			assert.strictEqual(Person.cache_duration, '2 seconds', 'After setting cache_duration to null, it should revert back to the settings value');
		});

		it('sets the duration for future caches', function() {

			// Warning: this has ZERO effect after the cache has been made
			Person.cache_duration = '3 seconds';
			assert.strictEqual(Person.cache_duration, '3 seconds');

			Person.cache_duration = '1 second';
			assert.strictEqual(Person.cache_duration, '1 second');
		});
	});

	describe('.cache', function() {
		var Animal;

		it('returns false if there is no duration set', function() {

			Animal = Function.inherits('Alchemy.Model', function Animal(options) {
				Animal.super.call(this, options);
			});

			Animal.cache_duration = null;
			assert.strictEqual(Animal.cache_duration, '2 seconds');
			Animal.cache_duration = false;
			assert.strictEqual(Animal.cache_duration, false);

			assert.strictEqual(Animal.cache, false);
		});

		it('returns the cache object', function() {
			Person.cache_duration = '10 ms';
			Animal.cache_duration = '10 ms';
			assert.strictEqual(typeof Animal.cache, 'object');
		});
	});

	/**
	 * The schema
	 */
	describe('.schema', function() {
		it('returns the Model\'s schema', function() {
			assert.strictEqual(Person.schema instanceof Classes.Alchemy.Schema, true);
		});

		it('returns false when getting the schema of the base Model class', function() {
			assert.strictEqual(Model.schema, false);
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
	 * Adding fields to the new Model
	 */
	describe('.addField(name, type, options)', function() {
		it('should add fields (during constitution) - Person example', function(done) {
			Person.constitute(function addFields() {

				this.addField('firstname', 'String');
				this.addField('lastname',  'String');
				this.addField('nicknames', 'String', {array: true});
				this.addField('birthdate', 'Date');
				this.addField('male',      'Boolean');

				this.belongsTo('Parent', 'Person');
				this.hasMany('Children', 'Person', {foreignKey: 'parent_id'});

				done();
			});
		});

		it('should add fields (during constitution) - Event example', function(done) {
			Event.constitute(function addFields() {
				this.addField('name', 'String');
				this.hasAndBelongsToMany('Invited', 'Person');

				done();
			});
		});

		it('should add fields (during constitution) - Product example', function(done) {
			Product.constitute(function addFields() {
				this.addField('name', 'String');

				done();
			});
		});

		it('should add fields (during constitution) - Project example', function(done) {
			Project.constitute(function addFields() {
				this.addField('name', 'String');
				this.hasMany('Versions', 'ProjectVersion');

				done();
			});
		});

		it('should add fields (during constitution) - ProjectVersion example', function(done) {
			ProjectVersion.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('major', 'Number');
				this.addField('minor', 'Number');
				this.addField('patch', 'Number');
				this.addField('version_string', 'String');
				this.belongsTo('Project');

				done();
			});
		});

		it('should be able to add schema as fields', function(next) {
			next = Function.regulate(next);

			WithSchemaField = Function.inherits('Alchemy.Model', function WithSchemaField(options) {
				WithSchemaField.super.call(this, options);
			});

			WithSchemaField.constitute(function addFields() {
				var schema = new Classes.Alchemy.Schema(this);

				schema.addField('subname', 'String');
				schema.addField('subvalue', 'String');

				this.addField('subschema', schema);

				var schema_two = new Classes.Alchemy.Schema(this);

				schema_two.addField('entryname', 'String');

				this.addField('entries', schema, {array: true});

				next();
			});
		});

		it('should be able to add translatable fields', function(next) {
			next = Function.regulate(next);

			WithTranslation = Function.inherits('Alchemy.Model', function WithTranslation(options) {
				WithTranslation.super.call(this, options);
			});

			WithTranslation.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('title', 'String', {translatable: true});

				next();
			});
		});
	});

	/**
	 * Add a belongsTo relation
	 */
	describe('.belongsTo(alias, model)', function() {
		var Group,
		    Member;

		it('adds a new relation', function(next) {

			Function.series(function(next) {

				Group = Function.inherits('Alchemy.Model', function PeopleGroup(options) {
					PeopleGroup.super.call(this, options);
				});

				Group.constitute(function addFields() {

					// Group name
					this.addField('name', 'String');

					next();
				});
			}, function(next) {

				Member = Function.inherits('Alchemy.Model', function Member(options) {
					Member.super.call(this, options);
				});

				Member.constitute(function addFields() {

					// Member name
					this.addField('name', 'String');

					// The group it belongs to
					this.belongsTo('PeopleGroup');

					next();
				});
			}, function done(err) {

				if (err) {
					return next(err);
				}

				let people_group_id = Member.getField('people_group_id');

				assert.strictEqual(people_group_id instanceof Classes.Alchemy.Field.BelongsTo, true, 'Should have made a people_group_id field');
				assert.strictEqual(people_group_id.parent_schema.name, 'Member');
				next();
			});
		});
	});

	/**
	 * Add Document methods
	 */
	describe('.setDocumentMethod(fnc)', function() {
		it('adds a new method to the linked Document class', function() {
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
	 * Add Document properties
	 */
	describe('.setDocumentProperty(getter)', function() {
		it('adds a new property getter to the linked Document class', function() {
			Person.setDocumentProperty(function upper_firstname() {

				if (!this.firstname) {
					return '';
				}

				return this.firstname.toUpperCase();
			});

			var person = new Person.Document();

			assert.strictEqual(person.upper_firstname, '');

			person.firstname = 'test';

			assert.strictEqual(person.upper_firstname, 'TEST');
		});
	});

	/**
	 * The name of a model
	 */
	describe('#name', function() {
		it('should return the name of the model class', function() {
			var person = Model.get('Person');
			assert.strictEqual(person.name, Person.name);
		});

		it('should allow you to override the name per instance', function() {
			var person = Model.get('Person'),
			    second = Model.get('Person');

			assert.strictEqual(person.name, 'Person');
			assert.strictEqual(second.name, person.name);

			// Now set a different name
			second.name = 'SecondPerson';

			assert.strictEqual(second.name, 'SecondPerson');
			assert.strictEqual(person.name, 'Person');
			assert.strictEqual(Model.get('Person').name, 'Person');
		});
	});

	/**
	 * Getting an instance of the model
	 */
	describe('#get(model_name)', function() {
		it('should create a new instance of the wanted model', function() {

			var person = Model.get('Person');

			assert.strictEqual(person instanceof Person, true);
			assert.strictEqual(person instanceof Classes.Alchemy.Model.Model, true);

		});
	});

	/**
	 * Saving data
	 */
	describe('#save(data, callback)', function() {

		it('should save the data and call back with a DocumentList', function(done) {

			Function.series(function doGriet(next) {

				var griet_data = {
					firstname : 'Griet',
					lastname  : 'De Leener',
					male      : false
				};

				Model.get('Person').save(griet_data, function saved(err, list) {

					if (err) {
						return next(err);
					}

					assert.strictEqual(list.length, 1);

					let document = list[0];
					next(null, document);
				});

			}, function doJelle(next, griet) {

				data.parent_id = griet._id;

				Model.get('Person').save(data, function saved(err, list) {

					if (err) {
						return next(err);
					}

					assert.strictEqual(list.length, 1);

					let document = list[0];

					testDocument(document, data);

					// Save the _id for next tests
					_id = document._id;

					// Save this for later tests
					global.person_doc = document;

					next(null, document);
				});
			}, done);
		});
	});

	describe('#sort', function() {
		it('should be used when no sort parameter is given', async function() {

			var persons = await Model.get('Person').find('all');

			assert.strictEqual(persons[0].firstname, 'Griet');
			assert.strictEqual(persons[1].firstname, 'Jelle');
		});
	});

	/**
	 * Getting data
	 */
	describe('#find(\'first\', options, callback)', function() {
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

	describe('#findById(object_id, callback)', function() {
		it('should find a single document by ObjectId instance', function(done) {
			Model.get('Person').findById(_id, function gotPerson(err, person) {

				if (err) {
					return done(err);
				}

				assert.strictEqual(String(_id), String(person._id));
				assert.strictEqual(person instanceof Classes.Alchemy.Document.Document, true);
				done();
			});
		});

		it('should find a single document by ObjectId string', function(done) {
			Model.get('Person').findById(String(_id), function gotPerson(err, person) {

				if (err) {
					return done(err);
				}

				assert.strictEqual(String(_id), String(person._id));
				assert.strictEqual(person instanceof Classes.Alchemy.Document.Document, true);
				done();
			});
		});
	});

	describe('#ensureIds(list, callback)', function() {

		var product,
		    list;

		list = [
			{
				_id   : '52efff000073570002000000',
				name  : 'screen'
			},
			{
				_id   : '52efff000073570002000001',
				name  : 'mouse'
			},
			{
				_id   : '52efff000073570002000002',
				name  : 'keyboard'
			}
		];

		it('should make sure the given ids & records exist in the database', async function() {

			product = Model.get('Product');

			await product.ensureIds(list, async function done(err) {

				if (err) {
					return done(err);
				}

				let prod;

				prod = await product.findById('52efff000073570002000000');
				assert.strictEqual(prod.name, 'screen');

				prod = await product.findById('52efff000073570002000001');
				assert.strictEqual(prod.name, 'mouse');

				prod = await product.findById('52efff000073570002000002');
				assert.strictEqual(prod.name, 'keyboard');

				let prods = await product.find('all');
				assert.strictEqual(prods.length, 3);

				let removed = await prod.remove();

				assert.strictEqual(removed, true);

				prod = await product.findById('52efff000073570002000002');
				assert.strictEqual(prod, null);

				prods = await product.find('all');
				assert.strictEqual(prods.length, 2, 'There should only be 3 products after one was removed');

				// Ensure them again
				await product.ensureIds(list);

				prods = await product.find('all');
				assert.strictEqual(prods.length, 3, 'There should only be 3 products: only the missing one should have been added');

				prod = await product.findById('52efff000073570002000002');
				assert.strictEqual(prod.name, 'keyboard');
			});
		});
	});
});
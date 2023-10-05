var assert = require('assert');

describe('Model', function() {

	var WithSchemaField,
	    WithTranslation,
	    WithComplexSchemaField,
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

				this.addBehaviour('Sluggable', {source: 'firstname'});

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

				this.addField('entries', schema_two, {array: true});

				let sub_sub = new Classes.Alchemy.Schema(this);

				sub_sub.addField('lorem', 'String');
				sub_sub.addField('ipsum', 'String');

				schema_two.addField('sub_sub', sub_sub, {array: true});

				let sub_sub_no_initial_parent = new Classes.Alchemy.Schema();
				sub_sub_no_initial_parent.addField('test', 'String');
				schema_two.addField('sub_nip', sub_sub_no_initial_parent);

				this.addField('name', 'String');

				let translatable_schema = new Classes.Alchemy.Schema(this);
				translatable_schema.addField('name', 'String');
				this.addField('translatable_schema', translatable_schema, {translatable: true});

				this.addField('description', 'String', {translatable: true});

				this.addField('translatable_tags', 'String', {translatable: true, array: true});

				next();
			});
		});

		it('should be able to add cloned schemas', function(done) {

			global.ClonedSchemas = Function.inherits('Alchemy.Model', 'ClonedSchemas');

			ClonedSchemas.constitute(async function addFields() {

				let components = alchemy.createSchema();
				components.addField('uid', 'ObjectId', {default: alchemy.ObjectId});

				let connections = alchemy.createSchema();
				let connection = alchemy.createSchema();
				let anchor = alchemy.createSchema();
				anchor.addField('node_uid', 'ObjectId');
				anchor.addField('anchor_name', 'String');

				connection.addField('source', JSON.clone(anchor));
				connection.addField('target', JSON.clone(anchor));

				connections.addField('in', JSON.clone(connection), {array: true});
				connections.addField('out', JSON.clone(connection), {array: true});

				components.addField('connections', connections);

				this.addField('components', components, {array: true});

				try {
					await testClonedSchemas();
				} catch (err) {
					done(err);
				}
			});

			async function testClonedSchemas() {

				let doc = Model.get('ClonedSchemas').createDocument();

				doc.components = [
					{
						connections: {
							in : [{
								source : {
									node_uid : alchemy.ObjectId(),
									anchor_name : 'in-source-1',
								},
								target : {
									node_uid : alchemy.ObjectId(),
									anchor_name : 'in-target-1'
								}
							}],
							out : [{
								source : {
									node_uid : alchemy.ObjectId(),
									anchor_name : 'out-source-1',
								},
								target : {
									node_uid : alchemy.ObjectId(),
									anchor_name : 'out-target-1'
								}
							}]
						}
					}
				];

				await doc.save();

				assert.strictEqual(!!doc._id, true, 'The _id property is missing');

				let refetched = await Model.get('ClonedSchemas').findByPk(doc._id);

				let comp = refetched.components?.[0];

				if (!comp) {
					throw new Error('The `components` field was not saved properly');
				}

				let connections = comp.connections;

				if (!connections) {
					throw new Error('The `connections` sub-field of the `components` field was not saved properly');
				}

				if (!connections.in?.[0] || !connections.out?.[0]) {
					throw new Error('The `in` and `out` sub-fields of the `connections` field were not saved properly');
				}

				let in_val = connections.in[0],
				    out_val = connections.out[0];

				assert.strictEqual(in_val.source.anchor_name, 'in-source-1');
				assert.strictEqual(in_val.target.anchor_name, 'in-target-1');

				assert.strictEqual(out_val.source.anchor_name, 'out-source-1');
				assert.strictEqual(out_val.target.anchor_name, 'out-target-1');

				assert.strictEqual(in_val.source.node_uid.constructor.name, 'ObjectId');
				assert.strictEqual(in_val.target.node_uid.constructor.name, 'ObjectId');
				assert.strictEqual(out_val.source.node_uid.constructor.name, 'ObjectId');
				assert.strictEqual(out_val.target.node_uid.constructor.name, 'ObjectId');

				done();
			}
		});

		it('should be able to add translatable & array schema fields', function(next) {

			let pledge = new Classes.Pledge();

			next = Function.regulate(next);

			WithComplexSchemaField = Function.inherits('Alchemy.Model', 'WithComplexSchemaField');

			WithComplexSchemaField.constitute(function addFields() {

				let subschema = new Classes.Alchemy.Schema();

				subschema.addField('name', 'String');
				subschema.addField('value', 'String');

				this.addField('name', 'String');
				this.addField('values', subschema, {array: true, translatable: true});

				this.addField('tags', 'String', {array: true, translatable: true});

				pledge.resolve();
			});

			pledge.done(async function() {

				let WCSF = Model.get('WithComplexSchemaField');

				let doc = WCSF.createDocument();

				doc.name = 'wcsftest';
				doc.values = {
					en : [
						{name: 'en-name', value: 'en'}
					],
					nl: [
						{name: 'nl-name', value: 'nl'}
					]
				};

				doc.tags = {
					en: ['en-tag'],
					nl: ['nl-tag']
				};

				await doc.save();

				let found_doc = await WCSF.find('first');

				assert.deepStrictEqual(doc.tags, {
					en: ['en-tag'],
					nl: ['nl-tag']
				});

				assert.deepStrictEqual(found_doc.tags, {
					en: ['en-tag'],
					nl: ['nl-tag']
				});

				next();
			});
		});

		it('should be able to add cloned schemas', function(next) {

			let pledge = new Classes.Pledge();

			next = Function.regulate(next);

			let Scenario = Function.inherits('Alchemy.Model', function Scenario(options) {
				Scenario.super.call(this, options);
			});

			Scenario.constitute(function addFields() {
				this.addField('name', 'String');

				let components = new Classes.Alchemy.Schema(this);

				components.addField('uid', 'ObjectId', {default: alchemy.ObjectId});

				let connections = new Classes.Alchemy.Schema();
				let connection = new Classes.Alchemy.Schema();

				// Create the anchor schema
				let anchor = new Classes.Alchemy.Schema();
				anchor.addField('node_uid', 'ObjectId');
				anchor.addField('anchor_name', 'String');

				// And we'll use this anchor schema twice!
				connection.addField('source', JSON.clone(anchor));
				connection.addField('target', JSON.clone(anchor));

				// And the connections will also be used twice!
				connections.addField('in', JSON.clone(connection), {array: true});
				connections.addField('out', JSON.clone(connection), {array: true});

				components.addField('connections', connections);

				let pos = new Classes.Alchemy.Schema();
				pos.addField('x', 'Number');
				pos.addField('y', 'Number');

				components.addField('pos', pos);

				// All the blocks of this scenario
				this.addField('components', components, {array: true});

				pledge.resolve();
			});

			pledge.done(async function() {

				let ScenarioModel = Model.get('Scenario'),
				    scenario = ScenarioModel.createDocument();

				scenario.name = 'first-scenario';

				let components = [
					{
						uid : alchemy.ObjectId(),
						pos : {x: 1, y: 2},
						connections : {
							in : [
								{
									source : {
										node_uid     : alchemy.ObjectId(),
										anchor_name  : 'alpha'
									},
									target : {
										node_uid     : alchemy.ObjectId(),
										anchor_name  : 'beta'
									}
								}
							],
							out : []
						}
					}
				];

				scenario.components = components;

				await scenario.save();

				let saved = await ScenarioModel.find('first');

				assert.strictEqual(saved.name, scenario.name);

				let alike = Object.alike(scenario.components, saved.components);

				assert.strictEqual(alike, true);

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

				let sub_schema = new Classes.Alchemy.Schema();
				sub_schema.addField('foobar', 'String', {translatable: true});

				this.addField('items', sub_schema, {array: true});

				next();
			});
		});

		it('should be able to handle nested enum schemas', function (next) {

			next = Function.regulate(next);

			const WidgetsField = Function.inherits('Alchemy.Field.Schema', function Widgets(schema, name, options) {

				if (!options) {
					options = {};
				}
			
				if (!options.schema) {
					options.schema = Classes.Alchemy.Widget.Container.schema.clone();
				}
			
				Widgets.super.call(this, schema, name, options);
			});

			const Widget = Function.inherits('Alchemy.Base', 'Alchemy.Widget', function Widget(config) {

				// The configuration of this widget
				if (config) {
					this.config = config;
				}
			
				this.originalconfig = this.config;
			
				// Are we currently editing?
				this.editing = false;
			
				// The parent instance
				this.parent_instance = null;
			});

			Widget.makeAbstractClass();
			Widget.startNewGroup('widgets');

			Widget.setProperty(function schema() {
				return this.constructor.schema;
			});

			Widget.constitute(function prepareSchema() {
				this.schema = alchemy.createSchema();
			});

			const Container = Function.inherits('Alchemy.Widget', 'Container');

			Container.constitute(function prepareSchema() {

				let widgets = alchemy.createSchema();
			
				widgets.addField('type', 'Enum', {values: alchemy.getClassGroup('widgets')});
				widgets.addField('config', 'Schema', {schema: 'type'});
			
				this.schema.addField('widgets', widgets, {array: true});
			});

			const List = Function.inherits('Alchemy.Widget.Container', 'List');
			const Text = Function.inherits('Alchemy.Widget', 'Text');
			Text.constitute(function prepareSchema() {
				this.schema.addField('content', 'Text');
			});

			let WithWidgets = Function.inherits('Alchemy.Model', 'WithWidgets');

			WithWidgets.constitute(async function prepareSchema() {
				this.addField('widgets', 'Widgets', {translatable: true});

				try {
					await Pledge.after(50);
					await testWidgets();
				} catch (err) {
					next(err);
				}
			});

			async function testWidgets() {

				const WithWidgets = Model.get('WithWidgets');

				let doc = WithWidgets.createDocument();

				doc.widgets = {
					en: {
						widgets: [
							{
								type : 'text',
								config : {
									content : 'text1'
								}
							},
							{
								type : 'list',
								config : {
									widgets : [
										{
											type : 'text',
											config: {
												content: 'nested-text2'
											}
										}
									]
								}
							}
						]
					}
				};

				await doc.save();

				let refetched = await WithWidgets.findByPk(doc.$pk);

				let en = refetched?.widgets?.en;

				if (!en) {
					throw new Error('The english widgets were not saved');
				}

				let widgets = en.widgets;

				if (!widgets || !widgets.length) {
					throw new Error('The widgets were not saved');
				}

				let text = widgets[0],
				    list = widgets[1];
				
				assert.strictEqual(text?.type, 'text');
				assert.strictEqual(text?.config?.content, 'text1');

				assert.strictEqual(list?.type, 'list');

				let contents = list?.config?.widgets;

				if (!contents) {
					throw new Error('The nested list widget has no contents');
				}

				let sub_text = contents[0];

				assert.strictEqual(sub_text?.type, 'text');
				assert.strictEqual(sub_text?.config?.content, 'nested-text2');

				next();
			}
		});
	});

	/**
	 * Adding validation rules to the model
	 */
	describe('.addRule(validation_name, options)', function() {

		it('should add rules (during constitution) - Person example', function(done) {
			Person.constitute(function addFields() {

				this.addRule('NotEmpty', {fields: ['firstname']});

				done();
			});
		});

		it('should throw an error when trying to create a new record without a firstname', async function() {

			let person = Model.get('Person').createDocument(),
			    caught_err;

			person.lastname = 'Only Lastname';

			try {
				await person.save();
			} catch (err) {
				caught_err = err;
			}

			assert.strictEqual(!!caught_err, true, 'An error should have been thrown while trying to save this record');
			assert.strictEqual(caught_err instanceof Blast.Classes.Alchemy.Error.Validation.Violations, true, 'A `Violations` error should have been thrown');
			assert.strictEqual(caught_err.length, 1, 'The `Violations` error should contain 1 violation');

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
					birthdate : new Date('1967-04-14'),
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

					if (document.slug != 'jelle') {
						return done(new Error('Expected the document to get the slug "jelle", but got: "' + document.slug + '"'));
					}

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

		it.skip('should allow adding the model name before the field name', function() {
			// @TODO: need to write this!
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

	describe('#createDocument()', function() {
		it('should not break variables that were already documents', function() {

			let Person = Model.get('Person');

			let empty = Person.createDocument();

			assert.strictEqual(empty.is_new_record, true);
			assert.strictEqual(empty.$record.Person.Person, undefined);

			let double = Person.createDocument(empty);

			// Doing anything with this new document will now break the original one!
			let test = double.is_new_record;

			assert.strictEqual(test, true);

			assert.strictEqual(empty.$record.Person.Person, undefined);
		});
	});

	describe('#compose(data, options)', function() {

		it.skip('should set default values', function() {

		});

		it('should set creation fields', async function() {

			let Person = Model.get('Person');

			let empty = Person.createDocument();

			let data = Person.compose(empty, {create: true});

			// Compose is actually not the source of this issue :(
			assert.strictEqual(empty.$record.Person.Person, undefined);

			assert.strictEqual(!!data._id, true, 'No _id field was created');
			assert.strictEqual(!!data.created, true, 'The `created` field was not set');
			assert.strictEqual(!!data.updated, true, 'The `updated` field was not set');
		});
	});
});
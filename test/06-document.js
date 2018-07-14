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

	describe('#$model', function() {
		it('should return an instance of the Model of the Document', function() {
			var new_doc = new Classes.Alchemy.Document.Person(),
			    model;

			model = new_doc.$model;

			assert.strictEqual(model.constructor.name, 'Person');
		});
	});

	describe('#$attributes', function() {
		it('creates an `attributes` property on the fly', function() {

			var new_doc = new Classes.Alchemy.Document.Person();

			if (!new_doc.hasObjectFields()) {
				assert.strictEqual(new_doc.$_attributes, undefined, 'New document instances should have no $_attributes');
			}

			let $attributes = new_doc.$attributes;

			assert.strictEqual(typeof $attributes, 'object', 'The $attributes getter should have created an object');
			assert.strictEqual(new_doc.$_attributes, $attributes);
			assert.strictEqual(new_doc.$attributes, $attributes, 'It should always return the same object instance')
		});
	});

	describe('#save(callback)', function() {
		it('should save a new record to the database', function(done) {

			var doc = new Classes.Alchemy.Document.Person();

			doc.firstname = 'Roel',
			doc.lastname = 'Van Gils';
			doc.birthdate = new Date('1979-05-21');
			doc.male = true;

			doc.save(function saved(err) {

				if (err) {
					return done(err);
				}

				try {
					assert.strictEqual(String(doc._id).isObjectId(), true);
				} catch (err) {
					return done(err);
				}

				Model.get('Person').find('all', {sort: {created: -1}}, function found(err, list) {

					if (err) {
						return done(err);
					}

					try {
						assert.strictEqual(list.length, 2);
						assert.strictEqual(list.available, 2);

						assert.strictEqual(list[0].firstname, 'Roel');
						global.person_roel = list[0];
						global.two_person_list = list;

					} catch (err) {
						return done(err);
					}

					done();
				});
			});
		});

		it('should save updated document records to the database', function(done) {

			var updated;
			var new_updated;

			Model.get('Person').find('first', {sort: {created: -1}}, function found(err, roel) {

				if (err) {
					return done(err);
				}

				if (!roel) {
					return done(new Error('Did not find expected Person record'));
				}

				try {
					assert.strictEqual(roel.firstname, 'Roel');
					updated = getUpdatedTimestamp(roel);
				} catch (err) {
					return done(err);
				}

				roel.firstname = 'Roelie';

				roel.save(function saved(err) {

					if (err) {
						return done(err);
					}

					Model.get('Person').find('first', {sort: {created: -1}}, function found(err, roel) {

						if (err) {
							return done(err);
						}

						try {
							assert.strictEqual(roel.firstname, 'Roelie');
							checkUpdatedIncrease(roel);
						} catch (err) {
							return done(err);
						}

						roel.firstname = 'Roel';

						roel.save(function savedAgain(err) {

							if (err) {
								return done(err);
							}

							Model.get('Person').find('first', {sort: {created: -1}}, function found(err, roel) {

								if (err) {
									return done(err);
								}

								try {
									assert.strictEqual(roel.firstname, 'Roel');
									checkUpdatedIncrease(roel);
								} catch (err) {
									return done(err);
								}

								done();
							});
						});
					});
				});
			});

			function checkUpdatedIncrease(doc) {
				new_updated = getUpdatedTimestamp(doc);

				if (new_updated > updated) {
					// Ok
				} else {
					throw new Error('The updated timestamp did not increase');
				}

				updated = new_updated;
			}

			function getUpdatedTimestamp(doc) {
				var result = Number(doc.updated);
				assert.strictEqual(typeof result, 'number');
				return result;
			}
		});
	});


	describe('#markChangedField(name, value)', function() {
		it('marks the document as having been changed', async function() {

			var doc = await Model.get('Person').find('first');

			assert.strictEqual(doc.hasChanged(), false);

			assert.strictEqual(doc.firstname, 'Jelle');

			// Let's change the firstname
			doc.firstname = 'Someone else';

			assert.strictEqual(doc.hasChanged(), true, 'The document should have been marked as changed');
			assert.strictEqual(doc.hasChanged('lastname'), false, 'The lastname did not change');
			assert.strictEqual(doc.hasChanged('firstname'), true, 'The firstname did change');

			// Let's change the firstname back
			doc.firstname = 'Jelle';

			assert.strictEqual(doc.hasChanged(), false, 'After manually restoring the value, `hasChanged()` should be false');
		});
	});

	describe('#resetFields()', function() {
		it('should reset the document as it was', async function() {

			var doc = await Model.get('Person').find('first');

			assert.strictEqual(doc.hasChanged(), false);
			assert.strictEqual(doc.firstname, 'Jelle');

			doc.firstname = 'Reset this';

			assert.strictEqual(doc.hasChanged(), true);
			assert.strictEqual(doc.hasChanged('firstname'), true);

			doc.resetFields();

			assert.strictEqual(doc.hasChanged(), false);
			assert.strictEqual(doc.hasChanged('firstname'), false);
			assert.strictEqual(doc.firstname, 'Jelle');

			let first = doc.$main;
			doc.resetFields();
			let second = doc.$main;

			assert.notStrictEqual(first, second, '`resetFields()` should always create a new object');

			let new_doc = Model.get('Person').createDocument();

			first = new_doc.$main;
			new_doc.resetFields();
			second = new_doc.$main;

			assert.notStrictEqual(first, second, '`resetFields()` should always create a new object, even when nothing changed');
		});
	});

	describe('#resetFields(fields)', function() {
		it('should reset the given fields as they were', async function() {

			var doc = await Model.get('Person').find('first');

			assert.strictEqual(doc.hasChanged(), false);
			assert.strictEqual(doc.firstname, 'Jelle');

			doc.firstname = 'Roel';
			doc.lastname = 'Van Gils';

			assert.strictEqual(doc.hasChanged(), true);
			assert.strictEqual(doc.hasChanged('firstname'), true);
			assert.strictEqual(doc.hasChanged('lastname'), true);

			doc.resetFields(['lastname']);

			assert.strictEqual(doc.hasChanged(), true);
			assert.strictEqual(doc.hasChanged('firstname'), true);
			assert.strictEqual(doc.hasChanged('lastname'), false);

			doc.resetFields(['firstname']);

			assert.strictEqual(doc.hasChanged(), false);
			assert.strictEqual(doc.hasChanged('firstname'), false);
			assert.strictEqual(doc.hasChanged('lastname'), false);
		});
	});

	describe('#hasChanged()', function() {

		var p_model;

		it('should say if a document has changed', async function() {

			var doc;

			// Get the model instance
			p_model = Model.get('Person');

			// Create a new record
			doc = p_model.createDocument();

			// The doc is new, so it has not changed
			assert.strictEqual(doc.hasChanged(), false);

			// Set something
			doc.firstname = 'Griet';
			doc.lastname = 'De Leener';

			// Now the doc has changed
			assert.strictEqual(doc.hasChanged(), true);

			// Save the document
			await doc.save();

			// It should be false again!
			assert.strictEqual(doc.hasChanged(), false, 'A document should be marked as unchanged after a save');
		});

		it('should not mark new documents with data as changed', function() {

			var doc = p_model.createDocument({firstname: 'Patrick', lastname: 'De Loecker'});

			assert.strictEqual(doc.firstname, 'Patrick');
			assert.strictEqual(doc.lastname, 'De Loecker');

			assert.strictEqual(doc.hasChanged(), false);
		});

		it('should notice changes in object & schema fields', async function() {
			var model = Model.get('WithSchemaField'),
			    doc = model.createDocument();

			doc.subschema = {
				subname: 'subname',
				subvalue: 'subvalue'
			};

			assert.strictEqual(doc.hasChanged(), true);

			await doc.save();

			assert.strictEqual(doc.hasChanged(), false, 'The document has been saved, so it should no longer be marked as changed');

			// Change subschema value
			doc.subschema.subname = 'changed';

			assert.strictEqual(doc.hasChanged(), true, 'The document was changed again after it has been saved, so it should be marked as changed again');

			// Manually restore value
			doc.subschema.subname = 'subname';

			assert.strictEqual(doc.hasChanged(), false, 'The value was restored manually, so it should no longer be marked as changed');

			doc.entries = [
				{entryname: 'a'},
				{entryname: 'b'}
			];

			assert.strictEqual(doc.hasChanged(), true);

			await doc.save();

			assert.strictEqual(doc.hasChanged(), false);

			let a = doc.entries[0],
			    b = doc.entries[1];

			doc.entries[0] = b;
			doc.entries[1] = a;

			assert.strictEqual(doc.hasChanged(), true, 'Two array values have been switched, so it should have been marked as changed');
		});
	});

	describe('#needsToBeSaved()', function() {
		var p_model;

		it('should say if a queried document needs to be saved', async function() {

			var doc;

			// Get the model instance
			p_model = Model.get('Person');

			doc = await p_model.find('first');

			assert.strictEqual(doc.needsToBeSaved(), false);

			// Change the firstname
			doc.firstname = 'Whodis?';

			// It has changed, so it needs saving
			assert.strictEqual(doc.hasChanged(), true);
			assert.strictEqual(doc.needsToBeSaved(), true);

			// Create a new doc
			doc = p_model.createDocument({firstname: 'Flo'});

			assert.strictEqual(doc.hasChanged(), false, 'The document has not changed since its creation');
			assert.strictEqual(doc.needsToBeSaved(), true, 'The document does need to be saved');

			await doc.save();

			assert.strictEqual(String(doc._id).isObjectId(), true);
			assert.strictEqual(doc.hasChanged(), false);
			assert.strictEqual(doc.needsToBeSaved(), false, 'The document has just been saved, so this should be false');
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

	describe('#remove()', function() {
		it('should remove the current record', async function() {

			var p_model,
			    doc;

			// Get the model instance
			p_model = Model.get('Person');

			doc = await p_model.find('first', {conditions: {firstname: 'Flo'}});

			assert.strictEqual(doc.firstname, 'Flo');

			// Remove it
			doc.remove();

			let removed_doc = await p_model.find('first', {conditions: {firstname: 'Flo'}});

			assert.strictEqual(removed_doc, null);
		});
	});
});
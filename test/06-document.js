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

	describe('.isDocument(obj)', function() {
		it('should say if argument is a document or not', function() {

			var empty_doc = new Person.Document();

			assert.strictEqual(Blast.Classes.Alchemy.Document.Document.isDocument(empty_doc), true);
			assert.strictEqual(Person.Document.isDocument(empty_doc), true);

			assert.strictEqual(Person.Document.isDocument({}), false);
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

	describe('#is_new_record', function() {

		it('should return true if it\'s a new record', async function() {

			let Person = Model.get('Person');

			let empty = Person.createDocument();

			assert.strictEqual(empty.is_new_record, true);
		});
	});

	describe('#populate()', function() {
		it('should add associated records', async function() {

			let griet = await Model.get('Person').findByValues({firstname: 'Griet'});

			assert.strictEqual(griet.lastname, 'De Leener');

			assert.strictEqual(griet.Children, undefined);

			let clone = griet.clone();

			await griet.populate('Children');

			assert.strictEqual(griet.Children.length, 1);

			let child = griet.Children[0];

			assert.strictEqual(child.firstname, 'Jelle');
			assert.strictEqual(child.lastname, 'De Loecker');
			assert.strictEqual(child.male, true);
			assert.deepStrictEqual(child.nicknames, ['skerit', 'Jellie']);

			await clone.populate(['Children.firstname', 'Children.lastname']);

			child = clone.Children[0];

			assert.strictEqual(child.firstname, 'Jelle');
			assert.strictEqual(child.lastname, 'De Loecker');
			assert.strictEqual(child.male, null);
			assert.deepStrictEqual(child.nicknames, null);

			let jelle = await Model.get('Person').findByValues({firstname: 'Jelle'});

			assert.strictEqual(jelle.firstname, 'Jelle');
			assert.strictEqual(jelle.lastname, 'De Loecker');
			assert.deepStrictEqual(jelle.nicknames, ['skerit', 'Jellie']);
			assert.strictEqual(jelle.Parent, undefined);

			clone = jelle.clone();

			await jelle.populate('Parent');

			assert.strictEqual(clone.Parent, undefined);
			assert.strictEqual(jelle.Parent.firstname, 'Griet');
			assert.strictEqual(jelle.Parent.lastname, 'De Leener');

			await clone.populate(['Parent.firstname', 'Parent.male']);

			assert.strictEqual(clone.Parent.firstname, 'Griet');
			assert.strictEqual(clone.Parent.lastname, null);
			assert.strictEqual(clone.Parent.male, false);
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
						assert.strictEqual(list.length, 3);
						assert.strictEqual(list.available, 3);

						assert.strictEqual(list[0].firstname, 'Roel', 'The returned list is not in the correct order');
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

		it('should return a pledge', async function() {

			var Project = Model.get('Project'),
			    ProjectVersion = Model.get('ProjectVersion');

			let project = Project.createDocument();
			project.name = 'protoblast';

			await project.save();

			assert.strictEqual(String(project._id).isObjectId(), true);

			let version_one = ProjectVersion.createDocument(),
			    version_two = ProjectVersion.createDocument(),
			    version_three = ProjectVersion.createDocument(),
			    version_four = ProjectVersion.createDocument(),
			    version_five = ProjectVersion.createDocument();

			version_one.project_id = project._id;
			version_two.project_id = project._id;
			version_three.project_id = project._id;
			version_four.project_id = project._id;
			version_five.project_id = project._id;

			version_one.major = 0;
			version_one.minor = 1;
			version_one.patch = 1;
			version_one.version_string = '0.1.1';

			version_two.major = 0;
			version_two.minor = 2;
			version_three.patch = 0;
			version_one.version_string = '0.2.0';

			version_three.major = 1;
			version_three.minor = 0;
			version_three.patch = 1;
			version_three.version_string = '1.0.1';

			version_four.major = 2;
			version_four.minor = 0;
			version_four.patch = 0;
			version_four.version_string = '2.0.0';

			version_five.major = 10;
			version_five.minor = 0;
			version_five.patch = 0;
			version_five.version_string = '10.0.0';

			// Save in random order
			await version_four.save();
			await version_two.save();
			await version_three.save();
			await version_one.save();
			await version_five.save();
		});
	});

	describe('#markChangedField(name, value)', function() {
		it('marks the document as having been changed', async function() {

			var doc = await Model.get('Person').find('first');

			assert.strictEqual(doc.hasChanged(), false, 'The document should not have been marked as changed yet');

			assert.strictEqual(doc.firstname, 'Griet');

			// Let's change the firstname
			doc.firstname = 'Someone else';

			assert.strictEqual(doc.hasChanged(), true, 'The document should have been marked as changed');
			assert.strictEqual(doc.hasChanged('lastname'), false, 'The lastname did not change');
			assert.strictEqual(doc.hasChanged('firstname'), true, 'The firstname did change');

			// Let's change the firstname back
			doc.firstname = 'Griet';

			assert.strictEqual(doc.hasChanged(), false, 'After manually restoring the value, `hasChanged()` should be false');
		});
	});

	describe('#refreshValues()', function() {
		it('should requery the database and update the document', async function() {

			var Project = Model.get('Project'),
			    ProjectVersion = Model.get('ProjectVersion');

			let protoblast = await Project.findByValues({name: 'protoblast'});

			if (!protoblast) {
				throw new Error('Could not find expected Project document');
			}

			let version_five = await ProjectVersion.findByValues({
				project_id     : protoblast.$pk,
				version_string : '10.0.0'
			});

			if (!version_five) {
				throw new Error('Could not find expected ProjectVersion document');
			}

			let duplicate = version_five.clone();

			assert.strictEqual(version_five.hasChanged(), false);
			assert.strictEqual(duplicate.hasChanged(), false);

			version_five.version_string = '10.0.0-alpha';

			assert.strictEqual(version_five.hasChanged(), true);
			assert.strictEqual(duplicate.hasChanged(), false);

			await version_five.save();

			assert.strictEqual(version_five.hasChanged(), false);
			assert.strictEqual(version_five.version_string, '10.0.0-alpha');
			assert.strictEqual(duplicate.version_string, '10.0.0', 'The duplicate should not have been updated');

			await duplicate.refreshValues();

			assert.strictEqual(duplicate.hasChanged(), false);
			assert.strictEqual(duplicate.version_string, version_five.version_string);
		});
	});

	describe('#resetFields()', function() {
		it('should reset the document as it was', async function() {

			var doc = await Model.get('Person').find('first');

			assert.strictEqual(doc.hasChanged(), false);
			assert.strictEqual(doc.firstname, 'Griet');

			doc.firstname = 'Reset this';

			assert.strictEqual(doc.hasChanged(), true);
			assert.strictEqual(doc.hasChanged('firstname'), true);

			doc.resetFields();

			assert.strictEqual(doc.hasChanged(), false);
			assert.strictEqual(doc.hasChanged('firstname'), false);
			assert.strictEqual(doc.firstname, 'Griet');

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
			assert.strictEqual(doc.firstname, 'Griet');

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
			doc.firstname = 'Patrick';
			doc.lastname = 'De Loecker';

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

			assert.strictEqual(doc.entries[0].entryname, 'a', 'Saved subschema value is wrong');

			assert.strictEqual(doc.hasChanged(), false);

			let a = doc.entries[0],
			    b = doc.entries[1];

			doc.entries[0] = b;
			doc.entries[1] = a;

			assert.strictEqual(doc.hasChanged(), true, 'Two array values have been switched, so it should have been marked as changed');
		});

		it('should check specific fields if wanted', async function() {

			var model = Model.get('WithSchemaField'),
			    doc = model.createDocument();

			doc.subschema = {
				subname: 'subname',
				subvalue: 'subvalue'
			};

			doc.entries = [
				{entryname: 'first'},
				{entryname: 'second'}
			];

			await doc.save();

			assert.strictEqual(doc.hasChanged(), false);

			assert.strictEqual(doc.hasChanged('subschema'), false, 'The field has not yet changed, yet the changed check returns true');

			doc.subschema.subname = 'newname';

			assert.strictEqual(doc.hasChanged(), true);
			assert.strictEqual(doc.hasChanged('subschema'), true);
			assert.strictEqual(doc.hasChanged('subschema.subname'), true);

			await doc.save();

			assert.strictEqual(doc.hasChanged(), false);
			assert.strictEqual(doc.hasChanged('subschema'), false);
			assert.strictEqual(doc.hasChanged('subschema.subname'), false);
		});

		it('should still be correct in the beforeSave method', async function() {

			let subname_has_changed = null,
			    entries_has_changed = null;

			const ChildModel = Function.inherits('Alchemy.Model.WithSchemaField', 'BeforeSaveSchemaField');

			ChildModel.setMethod(function beforeSave(document) {
				subname_has_changed = document.hasChanged('subschema.subname');
				entries_has_changed = document.hasChanged('entries');
			});

			let model = Model.get('BeforeSaveSchemaField'),
			    doc = model.createDocument();

			doc.subschema = {
				subname: 'subname',
				subvalue: 'subvalue'
			};

			doc.entries = [
				{entryname: 'first'},
				{entryname: 'second'}
			];

			await doc.save();

			assert.strictEqual(subname_has_changed, true);
			assert.strictEqual(entries_has_changed, true);

			doc.entries[0].entryname = 'first-changed';
			await doc.save();

			assert.strictEqual(subname_has_changed, false);
			assert.strictEqual(entries_has_changed, true);

			doc.subschema.subname = 'modified-subname';
			await doc.save();

			assert.strictEqual(subname_has_changed, true);
			assert.strictEqual(entries_has_changed, false);
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

			assert.strictEqual(clone instanceof Informer, true);
			assert.strictEqual(person_doc instanceof Informer, true);

			assert.strictEqual(Object.alike(person_doc, clone), true, 'Object.alike() should work on these documents');

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
			await doc.remove();

			let removed_doc = await p_model.find('first', {conditions: {firstname: 'Flo'}});

			assert.strictEqual(removed_doc, null);
		});
	});

	describe('#toDry()', function() {
		it('should allow it to be json-dried', async function() {
			var product = Model.get('Product');

			let prod = await product.findById('52efff000073570002000000');
			let prod_str = JSON.dry(prod, null, 4);
			let undried_prod = JSON.undry(prod_str);

			assert.strictEqual(undried_prod instanceof Blast.Classes.Alchemy.Document.Document, true);
			assert.strictEqual(undried_prod.name, 'screen');
		});
	});
});

describe('Client.Document', function() {
	var product;

	before(function() {
		product = Model.get('Product');
	});

	describe('Document#toHawkejs()', function() {
		it('should return a client document', async function() {
			let prod = await product.findById('52efff000073570002000000');

			let client_prod = JSON.clone(prod, 'toHawkejs');

			assert.strictEqual(client_prod instanceof Blast.Classes.Alchemy.Client.Document.Document, true);
			assert.strictEqual(client_prod.name, 'screen');
		});
	});

	describe('#clone()', function() {
		it('should return a clone', async function() {
			let prod = await product.findById('52efff000073570002000000');
			let client_prod = JSON.clone(prod, 'toHawkejs');
			let clone = JSON.clone(client_prod);

			assert.strictEqual(client_prod instanceof Blast.Classes.Alchemy.Client.Document.Document, true);
			assert.strictEqual(clone instanceof Blast.Classes.Alchemy.Client.Document.Document, true);
			assert.strictEqual(client_prod.name, 'screen');
			assert.strictEqual(clone.name, 'screen');

			client_prod.name = 'something_else';

			assert.strictEqual(client_prod.name, 'something_else');
			assert.strictEqual(clone.name, 'screen');
		});
	});

	describe('Namespaces', () => {
		it('should handle namespaces', async () => {

			let Task = Model.get('System.Task');
			assert.strictEqual(Task.model_name, 'System_Task');

			let doc = Task.createDocument();
			let client = JSON.clone(doc, 'toHawkejs');

			assert.strictEqual(doc.constructor.namespace, 'Alchemy.Document.System');
			assert.strictEqual(client.constructor.namespace, 'Alchemy.Client.Document.System');

			doc.title = 'TEST';
			await doc.save();

			client = JSON.clone(doc, 'toHawkejs');
			assert.strictEqual(client.title, 'TEST');
		});
	});
});
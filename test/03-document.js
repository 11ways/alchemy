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
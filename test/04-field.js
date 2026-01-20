var assert = require('assert');
const { cp } = require('fs');

function sameContents(a, b, message) {

	if (!a && a !== b) {
		throw new Error(message);
	}

	let i;

	for (i = 0; i < a.length; i++) {
		assert.strictEqual(a[i], b[i], message + ' (array length: ' + a.length + ')');
	}

	for (i = 0; i < b.length; i++) {
		assert.strictEqual(a[i], b[i], message + ' (array length: ' + a.length + ')');
	}
}

describe('Field', function() {

	describe('translatable fields', function() {

		it('handles translatable fields', async function() {

			var model = Model.get('WithTranslation'),
			    doc = model.createDocument();

			doc.name = 'name';
			doc.title = 'title';

			await doc.save();

			let saved_doc = await model.find('first');

			assert.strictEqual(typeof saved_doc.title, 'object');
			assert.strictEqual(saved_doc.title.__, 'title', 'Should have saved the title under the __ prefix');

			// @TODO: should have overwritten the saved doc
			//assert.strictEqual(doc.title.__, saved_doc.title.__);
		});

		it('translates fields when needed', async function() {

			var model = Model.get('WithTranslation'),
			    doc = model.createDocument();

			doc.name = 'with-translations';

			doc.title = {
				en: 'title',
				nl: 'titel'
			};

			doc.items = [
				{
					foobar: {
						en: 'one',
						nl: 'een'
					}
				},
				{
					foobar: {
						en: 'two',
						nl: 'twee'
					}
				}
			];

			await doc.save();

			doc = await model.findByValues({
				name : 'with-translations'
			});

			assert.strictEqual(doc.name, 'with-translations');

			assert.deepStrictEqual(doc.title, {
				en: 'title',
				nl: 'titel'
			});

			assert.deepStrictEqual(doc.items, [
				{
					foobar: {
						en: 'one',
						nl: 'een'
					}
				},
				{
					foobar: {
						en: 'two',
						nl: 'twee'
					}
				}
			]);

			let crit = model.find();
			crit.setOption('locale', 'nl');
			crit.where('name').equals('with-translations');

			let nl = await model.find('first', crit);

			assert.strictEqual(nl.title, 'titel');

			assert.deepStrictEqual(nl.items, [
				{
				  foobar: 'een',
				  _prefix_foobar: 'nl',
				  '$translated_fields': { foobar: 'nl' }
				},
				{
				  foobar: 'twee',
				  _prefix_foobar: 'nl',
				  '$translated_fields': { foobar: 'nl' }
				}
			]);

			crit = model.find();
			crit.setOption('locale', 'en');
			crit.where('name').equals('with-translations');

			let en = await model.find('first', crit);

			assert.strictEqual(en.title, 'title');

			assert.deepStrictEqual(en.items, [
				{
					foobar: 'one',
					_prefix_foobar: 'en',
					'$translated_fields': { foobar: 'en' }
				},
				{
					foobar: 'two',
					_prefix_foobar: 'en',
					'$translated_fields': { foobar: 'en' }
				}
			]);

		});
	});

	describe('#path', function() {
		it('gets the path in the main document', async function() {

			let WithSchema = Model.get('WithSchemaField');

			let name_field = WithSchema.getField('name');
			assert.strictEqual(name_field.path, 'name');

			let subschema_field = WithSchema.getField('subschema');
			assert.strictEqual(subschema_field.path, 'subschema');

			let subname_field = WithSchema.getField('subschema.subname');
			assert.strictEqual(subname_field.path, 'subschema.subname');

			let entryname_in_arr_field = WithSchema.getField('entries.entryname');
			assert.strictEqual(entryname_in_arr_field.path, 'entries.entryname');

			let sub_sub_field = WithSchema.getField('entries.sub_sub');
			assert.strictEqual(sub_sub_field.path, 'entries.sub_sub');

			let sub_sub_lorem_field = WithSchema.getField('entries.sub_sub.lorem');
			assert.strictEqual(sub_sub_lorem_field.path, 'entries.sub_sub.lorem');

			let sub_nip_test = WithSchema.getField('entries.sub_nip.test');
			assert.strictEqual(sub_nip_test.path, 'entries.sub_nip.test');
		});
	});

	describe('#getFieldChain()', function() {
		it('should return the current field and all its ancestors', function() {

			let WithSchema = Model.get('WithSchemaField');

			let name_field = WithSchema.getField('name');
			let entries_field = WithSchema.getField('entries');
			let sub_sub_field = WithSchema.getField('entries.sub_sub');
			let lorem_field = WithSchema.getField('entries.sub_sub.lorem');

			sameContents(name_field.getFieldChain(), [name_field], 'Expected an array with the "name" field');
			sameContents(entries_field.getFieldChain(), [entries_field], 'Expected an array with the "entries" field');
			sameContents(sub_sub_field.getFieldChain(), [entries_field, sub_sub_field], 'Expected an array with the "entries" and "sub_sub" field');
			sameContents(lorem_field.getFieldChain(), [entries_field, sub_sub_field, lorem_field], 'Expected an array with the "entries", "sub_sub" and "lorem" field');
		});
	});

	describe('#getFieldValues(document)', function() {
		it('should return all the values of this field in the document', async function() {

			let WithSchema = Model.get('WithSchemaField'),
			    doc = WithSchema.createDocument();

			let name_field = WithSchema.getField('name');
			let entries_field = WithSchema.getField('entries');
			let sub_sub_field = WithSchema.getField('entries.sub_sub');
			let lorem_field = WithSchema.getField('entries.sub_sub.lorem');

			let values = name_field.getDocumentValues(doc);

			assert.strictEqual(values.length, 1, 'Even when the value is undefined, it should be returned');
			assert.strictEqual(values[0].value, undefined);

			doc.name = 'Jelle';

			values = name_field.getDocumentValues(doc);

			assert.strictEqual(values.length, 1, 'Only 1 result is expected for the "name" field');

			assert.strictEqual(values[0].field.name, 'name');
			assert.strictEqual(values[0].value, 'Jelle');
			assert.strictEqual(values[0].path, 'name');

			doc.entries = [];

			values = entries_field.getDocumentValues(doc);

			assert.strictEqual(values.length, 1, 'Even empty array fields should return at least 1 undefined value');
			assert.strictEqual(values[0].value, undefined);

			doc.entries = [
				{
					sub_sub: [
						{lorem: 0},
						{lorem: 1},
						{lorem: 2}
					]
				}, {
					sub_sub: [
						{lorem: 3}
					]
				}
			];

			values = lorem_field.getDocumentValues(doc);

			assert.strictEqual(values[0].field.name, 'lorem');
			assert.strictEqual(values[0].value, 0);
			assert.strictEqual(values[0].path,  'entries.0.sub_sub.0.lorem');

			assert.strictEqual(values[1].field.name, 'lorem');
			assert.strictEqual(values[1].value, 1);
			assert.strictEqual(values[1].path,  'entries.0.sub_sub.1.lorem');

			assert.strictEqual(values[2].field.name, 'lorem');
			assert.strictEqual(values[2].value, 2);
			assert.strictEqual(values[2].path,  'entries.0.sub_sub.2.lorem');

			assert.strictEqual(values[3].field.name, 'lorem');
			assert.strictEqual(values[3].value, 3);
			assert.strictEqual(values[3].path,  'entries.1.sub_sub.0.lorem');

			doc.translatable_schema = {
				en: {
					name: 'en'
				},
				nl: {
					name: 'nl'
				}
			};

			let translatable_schema_name_field = WithSchema.getField('translatable_schema.name');

			values = translatable_schema_name_field.getDocumentValues(doc);

			// Sort the result by the prefix
			values.sortByPath(1, 'path');

			assert.strictEqual(values.length, 2, 'Expected 2 translated names, but got ' + values.length);

			assert.strictEqual(values[0].field.name, 'name');
			assert.strictEqual(values[0].value, 'en');
			assert.strictEqual(values[0].path, 'translatable_schema.en.name');

			assert.strictEqual(values[1].field.name, 'name');
			assert.strictEqual(values[1].value, 'nl');
			assert.strictEqual(values[1].path, 'translatable_schema.nl.name');

			doc.description = {
				en: 'english',
				nl: 'dutch'
			}

			let description_field = WithSchema.getField('description');

			values = description_field.getDocumentValues(doc);

			// Sort the result by the prefix
			values.sortByPath(1, 'path');

			assert.strictEqual(values.length, 2, 'Expected 2 description values, but got ' + values.length);

			assert.strictEqual(values[0].field.name, 'description');
			assert.strictEqual(values[0].value, 'english');
			assert.strictEqual(values[0].path, 'description.en');

			assert.strictEqual(values[1].field.name, 'description');
			assert.strictEqual(values[1].value, 'dutch');
			assert.strictEqual(values[1].path, 'description.nl');

			doc.translatable_tags = {
				en: ['en0', 'en1'],
				nl: ['nl0', 'nl1']
			};

			let translatable_tags_field = WithSchema.getField('translatable_tags');
			values = translatable_tags_field.getDocumentValues(doc);

			// Sort the result by the prefix
			values.sortByPath(1, 'path');

			assert.strictEqual(values.length, 4, 'Expected 4 tags, but got ' + values.length);

			assert.strictEqual(values[0].field.name, 'translatable_tags');
			assert.strictEqual(values[0].value, 'en0');
			assert.strictEqual(values[0].path,  'translatable_tags.en.0');

			assert.strictEqual(values[1].value, 'en1');
			assert.strictEqual(values[1].path,  'translatable_tags.en.1');

			assert.strictEqual(values[2].value, 'nl0');
			assert.strictEqual(values[2].path,  'translatable_tags.nl.0');

			assert.strictEqual(values[3].value, 'nl1');
			assert.strictEqual(values[3].path,  'translatable_tags.nl.1');

			await doc.save();

			values = translatable_tags_field.getDocumentValues(doc);

			// Sort the result by the prefix
			values.sortByPath(1, 'path');

			assert.strictEqual(values.length, 4, 'Expected 4 tags, but got ' + values.length + ', something happend while saving');
		});
	});

});

describe('Field.String', function() {

	var schema,
	    field;

	before(function() {
		schema = new Classes.Alchemy.Schema();
		field = new Classes.Alchemy.Field.String(schema, 'test');
	});

	describe('#cast(value)', function() {
		it('should cast the given value to a string', function() {
			assert.strictEqual(field.cast(1), '1');
			assert.strictEqual(field.cast('a'), 'a');
		});
	});
});

describe('Field.BigInt', function() {

	let BigIntModel;

	before(function(next) {
		next = Function.regulate(next);

		BigIntModel = Function.inherits('Alchemy.Model', 'BigInt');

		BigIntModel.constitute(function addFields() {
			this.addField('name', 'String');
			this.addField('big_int', 'BigInt');
			next();
		});
	});

	it('should store & revive big integers', async function() {

		let BigInt = Model.get('BigInt');
		let doc = BigInt.createDocument();

		doc.name = 'first';
		doc.big_int = 1234567867890n;

		await doc.save();

		let output_doc = await BigInt.find('first');

		assert.strictEqual(output_doc.name, 'first');
		assert.strictEqual(output_doc.big_int, 1234567867890n);
	});
});

describe('Field.DateTime', function() {

	var dtf_model,
	    Dtf;

	before(function(next) {
		next = Function.regulate(next);

		Dtf = Function.inherits('Alchemy.Model', function Dtf(options) {
			Dtf.super.call(this, options);
		});

		Dtf.constitute(function addFields() {
			this.addField('name', 'String');
			this.addField('datetime_with_units', 'Datetime', {store_units: true});
			next();
		});
	});

	it('should store & revive dates in the database with `store_units: true` option', async function() {

		dtf_model = Model.get('Dtf');

		var input_doc = dtf_model.createDocument(),
		    output_doc;

		input_doc.name = 'first';
		input_doc.datetime_with_units = new Date();

		await input_doc.save();

		assert.strictEqual(String(input_doc._id).isObjectId(), true);

		output_doc = await dtf_model.find('first');

		assert.strictEqual(output_doc.name, 'first');
		assert.strictEqual(Number(output_doc.datetime_with_units), Number(input_doc.datetime_with_units));
		assert.strictEqual(Date.isDate(output_doc.datetime_with_units), true);
	});

	it('should be possible to query for those separate units', async function() {

		// Create another doc
		input_doc = dtf_model.createDocument();
		input_doc.name = 'second';
		input_doc.datetime_with_units = Date.create('2017-09-01T21:00:00+02:00');

		await input_doc.save();

		let all_docs = await dtf_model.find('all');

		assert.strictEqual(all_docs.length, 2);

		let unit_query_result = await dtf_model.find('all', {
			conditions: {
				'datetime_with_units.year' : 2017,
				'datetime_with_units.date' : 1
			}
		});

		assert.strictEqual(unit_query_result.length, 1);

		unit_query_result = await dtf_model.find('all', {
			conditions: {
				'datetime_with_units.year' : 2017,
				'datetime_with_units.date' : 2
			}
		});

		assert.strictEqual(unit_query_result.length, 0);
	});
});

describe('Field.LocalTemporal', function() {

	let LocalDtf,
	    first_input_doc,
	    first_output_doc;

	before(function(next) {
		next = Function.regulate(next);

		LocalDtf = Function.inherits('Alchemy.Model', 'LocalDtf');

		LocalDtf.constitute(function addFields() {
			this.addField('name', 'String');
			this.addField('datetime', 'LocalDateTime');
			this.addField('date', 'LocalDate');
			this.addField('time', 'LocalTime');
			next();
		});
	});

	it('should store Local Date & Time fields in the database', async function() {

		let LocalDtf = Model.get('LocalDtf');

		first_input_doc = LocalDtf.createDocument();

		let date_time = new Classes.Develry.LocalDateTime('2023-10-22 13:08:14');
		let date = new Classes.Develry.LocalDate('2023-10-24');
		let time = new Classes.Develry.LocalTime('11:14:23');

		first_input_doc.name = 'first';
		first_input_doc.datetime = date_time.clone();
		first_input_doc.date = date.clone();
		first_input_doc.time = time.clone();

		await first_input_doc.save();

		assert.strictEqual(String(first_input_doc._id).isObjectId(), true);
	});

	it('should revive Local Date & Time fields in the database', async function() {

		let LocalDtf = Model.get('LocalDtf');

		first_output_doc = await LocalDtf.find('first');

		assert.strictEqual(first_output_doc.name, 'first');
		assert.strictEqual(Number(first_output_doc.datetime), Number(first_input_doc.datetime));
		assert.strictEqual(Number(first_output_doc.date), Number(first_input_doc.date));
		assert.strictEqual(Number(first_output_doc.time), Number(first_input_doc.time));

		assert.strictEqual(first_output_doc.datetime.constructor.name, 'LocalDateTime');
		assert.strictEqual(first_output_doc.date.constructor.name, 'LocalDate');
		assert.strictEqual(first_output_doc.time.constructor.name, 'LocalTime');
	});

	it('should be possible to query LocalDateTime fields', async function() {

		let LocalDtf = Model.get('LocalDtf');

		// Create another doc
		let input_doc = LocalDtf.createDocument();

		let date_time = new Classes.Develry.LocalDateTime('2022-09-11 14:11:23');
		let date = new Classes.Develry.LocalDate('2022-09-11');
		let time = new Classes.Develry.LocalTime('14:12:11');

		input_doc.name = 'second';
		input_doc.datetime = date_time.clone();
		input_doc.date = date.clone();
		input_doc.time = time.clone();

		await input_doc.save();

		input_doc = LocalDtf.createDocument();
		input_doc.name = 'third';
		input_doc.datetime = '1999-06-14 14:22:31';

		await input_doc.save();

		let crit = LocalDtf.find();
		crit.sort({datetime: 1});

		let all_docs = await LocalDtf.find('all', crit);
		assert.strictEqual(all_docs.length, 3);
		assert.strictEqual(all_docs[0].name, 'third');
		assert.strictEqual(all_docs[1].name, 'second');
		assert.strictEqual(all_docs[2].name, 'first');

		crit = LocalDtf.find();
		crit.where('datetime').equals(date_time);

		let found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'second');

		crit = LocalDtf.find();
		crit.where('datetime').gte('2022-11-01');
		crit.sort({datetime: -1});

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'first');

		crit = LocalDtf.find();
		crit.where('datetime').lte('2022-11-01');
		crit.sort({datetime: 1});

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'third');
		assert.strictEqual(found[1].name, 'second');

		crit = LocalDtf.find();
		crit.where('datetime').lte(new Classes.Develry.LocalDateTime('2022-11-01'));
		crit.sort({datetime: -1});

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'second');
		assert.strictEqual(found[1].name, 'third');
	});

	it('should be possible to query LocalDate fields', async function() {

		let LocalDtf = Model.get('LocalDtf');

		let crit = LocalDtf.find();
		crit.sort({date: 1});
		crit.where('date').not().isEmpty();

		let found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'second');
		assert.strictEqual(found[1].name, 'first');

		crit = LocalDtf.find();
		crit.sort({date: 1});
		crit.where('date').equals('2022-09-11');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'second');

		let record = await LocalDtf.findByValues({
			date : LocalDate.create('2022-09-11'),
		});

		assert.strictEqual(record?.name, 'second');

		record = await LocalDtf.findByValues({
			_id  : record.$pk,
			date : LocalDate.create('2022-09-11'),
		});

		assert.strictEqual(record?.name, 'second');

		crit = LocalDtf.find();
		crit.sort({date: 1});
		crit.where('date').gt('2022-09-11');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'first');
		assert.strictEqual(found[0].date.toString(), '2023-10-24');

		crit = LocalDtf.find();
		crit.sort({date: 1});
		crit.where('date').gte('2022-09-11');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'second');
		assert.strictEqual(found[0].date.toString(), '2022-09-11');
		assert.strictEqual(found[1].name, 'first');
		assert.strictEqual(found[1].date.toString(), '2023-10-24');
	});

	it('should be possible to query LocalTime fields', async function() {

		let LocalDtf = Model.get('LocalDtf');

		let crit = LocalDtf.find();
		crit.sort({time: 1});
		crit.where('time').not().isEmpty();

		let found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'first');
		assert.strictEqual(found[1].name, 'second');

		crit = LocalDtf.find();
		crit.sort({time: 1});
		crit.where('time').equals('14:12:11');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'second');

		crit = LocalDtf.find();
		crit.sort({time: 1});
		crit.where('time').lte('12:00:00');

		found = await LocalDtf.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'first');
	});
});

describe('Field.Decimal', function() {

	let DecimalTester,
	    DecimalInSubSchema;

	before(function(done) {
		done = Function.regulate(done);

		DecimalTester = Function.inherits('Alchemy.Model', 'DecimalTester');
		DecimalInSubSchema = Function.inherits('Alchemy.Model', 'DecimalInSubSchema');

		Function.parallel(function firstModel(next) {

			DecimalTester.constitute(function addFields() {
				this.addField('name', 'String');
				this.addField('decimal', 'Decimal');
				next();
			});

		}, async function secondModel(next) {

			DecimalInSubSchema.constitute(function addFields() {
				this.addField('name', 'String');

				let schema = alchemy.createSchema();
				schema.addField('entry_name', 'String');
				schema.addField('decimal', 'Decimal');

				this.addField('decimals', schema, {is_array: true});
				next();
			});
		}, done);
	});

	it('should store decimal fields in the database', async function() {

		let DecimalTester = Model.get('DecimalTester');

		let doc = DecimalTester.createDocument();
		doc.name = 'first';
		doc.decimal = new Classes.Develry.Decimal('1.123');
		await doc.save();

		let refetch = await DecimalTester.find('first');

		assert.strictEqual(refetch.name, 'first');
		assert.strictEqual(refetch.decimal.toString(), '1.123');
		assert.strictEqual(refetch.decimal.constructor.name, 'Decimal');
	});

	it('should store decimal fields in subschemas', async function() {

		let DecimalInSubSchema = Model.get('DecimalInSubSchema');

		let doc = DecimalInSubSchema.createDocument();
		doc.name = 'first';
		doc.decimals = [
			{
				entry_name: 'first',
				decimal: new Classes.Develry.Decimal('1.123')
			},
			{
				entry_name: 'second',
				decimal: new Classes.Develry.Decimal('2.123')
			}
		];

		await doc.save();

		let refetch = await DecimalInSubSchema.find('first');
		assert.strictEqual(refetch.name, 'first');

		assert.strictEqual(refetch.decimals[0].entry_name, 'first');
		assert.strictEqual(refetch.decimals[0].decimal.toString(), '1.123');

		assert.strictEqual(refetch.decimals[1].entry_name, 'second');
		assert.strictEqual(refetch.decimals[1].decimal.toString(), '2.123');

		assert.strictEqual(refetch.decimals[0].decimal.constructor.name, 'Decimal');
		assert.strictEqual(refetch.decimals[1].decimal.constructor.name, 'Decimal');
	});

	it('should be possible to query decimal fields', async function() {

		let DecimalTester = Model.get('DecimalTester');

		let doc = DecimalTester.createDocument();
		doc.name = 'second';
		doc.decimal = new Classes.Develry.Decimal('2.12345678901234567');
		await doc.save();

		let crit = DecimalTester.find();
		crit.sort({decimal: 1});

		let all_docs = await DecimalTester.find('all', crit);
		assert.strictEqual(all_docs.length, 2);
		assert.strictEqual(all_docs[0].name, 'first');
		assert.strictEqual(all_docs[1].name, 'second');

		crit = DecimalTester.find();
		crit.where('decimal').equals('2.12345678901234567');

		let found = await DecimalTester.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'second');

		crit = DecimalTester.find();
		crit.where('decimal').gt('1.123');

		found = await DecimalTester.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'second');

		crit = DecimalTester.find();
		crit.where('decimal').gte('1.123');
		crit.sort({decimal: 1});

		found = await DecimalTester.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'first');
		assert.strictEqual(found[1].name, 'second');

		crit = DecimalTester.find();
		crit.where('decimal').lt('2.1234567890123457');
		crit.sort({decimal: -1});

		found = await DecimalTester.find('all', crit);
		assert.strictEqual(found.length, 2);
		assert.strictEqual(found[0].name, 'second');
	});
});

describe('Field.FixedDecimal', function() {

	let FixedDecimalTester;

	before(function(next) {
		next = Function.regulate(next);

		FixedDecimalTester = Function.inherits('Alchemy.Model', 'FixedDecimalTester');

		FixedDecimalTester.constitute(function addFields() {
			this.addField('name', 'String');
			this.addField('decimal', 'FixedDecimal', {scale: 2});
			next();
		});
	});

	it('should store decimal fields in the database', async function() {

		let FixedDecimalTester = Model.get('FixedDecimalTester');

		let doc = FixedDecimalTester.createDocument();
		doc.name = 'first';
		doc.decimal = new Classes.Develry.Decimal('1.123');
		await doc.save();

		let refetch = await FixedDecimalTester.find('first');

		assert.strictEqual(refetch.name, 'first');
		assert.strictEqual(refetch.decimal.toString(), '1.12');
		assert.strictEqual(refetch.decimal.constructor.name, 'FixedDecimal');
	});

	it('should be possible to query decimal fields', async function() {

		let FixedDecimalTester = Model.get('FixedDecimalTester');

		let doc = FixedDecimalTester.createDocument();
		doc.name = 'second';
		doc.decimal = new Classes.Develry.Decimal('2.12345678901234567');
		await doc.save();

		let crit = FixedDecimalTester.find();
		crit.sort({decimal: 1});

		let all_docs = await FixedDecimalTester.find('all', crit);
		assert.strictEqual(all_docs.length, 2);
		assert.strictEqual(all_docs[0].name, 'first');
		assert.strictEqual(all_docs[1].name, 'second');

		crit = FixedDecimalTester.find();
		crit.where('decimal').equals('1.12');

		let found = await FixedDecimalTester.find('all', crit);
		assert.strictEqual(found.length, 1);
		assert.strictEqual(found[0].name, 'first');
	});
});

let flobotonum_to_app_counter = 0;
let flobotonum_to_ds_counter = 0;

describe('Field.Schema', function() {

	before(function(next) {
		next = Function.regulate(next);

		const FlobotonumField = Function.inherits('Alchemy.Field', 'Flobotonum');
		FlobotonumField.setDatatype('object');
		FlobotonumField.setSelfContained(true);
		FlobotonumField.setMethod(function _toApp(context, value) {

			let result = {
				type     : 'flobotonum',
				value    : value?.main_value,
				to_apped : true,
				to_app_counter : ++flobotonum_to_app_counter,
			};


			return result;
		});

		FlobotonumField.setMethod(function _toDatasource(context, value) {

			let main_value = value.value;

			let value_wrapper = {
				main_value,
				to_ds_counter: ++flobotonum_to_ds_counter,
			};

			return value_wrapper;
		});

		let QuestComponents = alchemy.getClassGroup('all_quest_component');
		const QuestComponent = Function.inherits('Alchemy.Base', 'Alchemy.Quest.Component', 'QuestComponent');
		QuestComponent.makeAbstractClass();
		QuestComponent.startNewGroup('all_quest_component');
		QuestComponent.setProperty(function schema() {
			return this.constructor.schema;
		});
		QuestComponent.constitute(function setSchema() {
			this.schema = alchemy.createSchema();
		});

		const Sleep = Function.inherits('Alchemy.Quest.Component.QuestComponent', 'Sleep');
		Sleep.constitute(function setSchema() {
			// Set the sleep time
			this.schema.addField('duration', 'Number');
			this.schema.addField('flobotonum', 'Flobotonum');
			this.schema.addField('decimal_duration', 'FixedDecimal', {scale: 2});
		});

		const QuestTest = Function.inherits('Alchemy.Model', 'QuestTest');
		QuestTest.constitute(async function addFields() {

			let schema = alchemy.createSchema();

			schema.addField('type', 'Enum', {values: QuestComponents});
			schema.addField('settings', 'Schema', {schema: 'type'});

			this.addField('objectives', schema, {array: true});

			this.addField('main_type', 'Enum', {values: QuestComponents});
			this.addField('main_settings', 'Schema', {schema: 'main_type'});

			await Pledge.after(1);
			next();
		});
	});

	it('should correctly handle nested schemas', async function() {
		const Quest = Model.get('QuestTest');
		let doc = Quest.createDocument();

		doc.objectives = [
			{
				type : 'sleep',
				settings : {
					duration : 1,
					decimal_duration: '1.03',
					flobotonum: {
						value : {
							stuff : true
						}
					}
				}
			},
			{
				type : 'sleep',
				settings : {
					duration : 2,
					decimal_duration: '2.22',
					flobotonum: {
						value : {
							morestuff : true
						}
					}
				}
			}
		];

		doc.main_type = 'sleep';
		doc.main_settings = {
			duration : 3,
			decimal_duration: '3.13',
			flobotonum: {
				value : {
					mainstuff : true
				}
			}
		};

		await doc.save();

		let first,
		    second;

		assert.strictEqual(!!doc._id, true, 'The saved document should have an _id');
		assert.strictEqual(doc.objectives.length, 2, 'The saved document should have 2 objectives');

		first = doc.objectives[0];
		second = doc.objectives[1];
		let main = doc;
		
		assert.strictEqual(first.type, 'sleep');
		assert.strictEqual(first.settings?.duration, 1);
		assert.strictEqual(first.settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(first.settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(first.settings?.flobotonum?.value?.stuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(first.settings?.flobotonum?.to_app_counter, 1, 'This should have been the first `toApp` call for this field');

		assert.strictEqual(first.settings?.decimal_duration?.toString(), '1.03');
		assert.strictEqual(first.settings?.decimal_duration?.constructor?.name, 'FixedDecimal');

		assert.strictEqual(second.type, 'sleep');
		assert.strictEqual(second.settings?.duration, 2);
		assert.strictEqual(second.settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(second.settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(second.settings?.flobotonum?.value?.morestuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(second.settings?.flobotonum?.to_app_counter, 2, 'This should have been the second `toApp` call for this field');
		assert.strictEqual(second.settings?.decimal_duration?.toString(), '2.22');
		assert.strictEqual(second.settings?.decimal_duration?.constructor?.name, 'FixedDecimal');

		assert.strictEqual(main.main_type, 'sleep');
		assert.strictEqual(main.main_settings?.duration, 3);
		assert.strictEqual(main.main_settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(main.main_settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(main.main_settings?.flobotonum?.value?.mainstuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(main.main_settings?.flobotonum?.to_app_counter, 3, 'This should have been the third `toApp` call for this field');
		assert.strictEqual(main.main_settings?.decimal_duration?.toString(), '3.13');
		assert.strictEqual(main.main_settings?.decimal_duration?.constructor?.name, 'FixedDecimal');

		doc = await Quest.findByPk(doc._id);

		assert.strictEqual(doc.objectives.length, 2, 'The saved document should have 2 objectives');

		first = doc.objectives[0];
		second = doc.objectives[1];
		main = doc;

		assert.strictEqual(main.main_type, 'sleep');
		assert.strictEqual(main.main_settings?.duration, 3);
		assert.strictEqual(main.main_settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(main.main_settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(main.main_settings?.flobotonum?.value?.mainstuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(main.main_settings?.flobotonum?.to_app_counter, 6, 'This should have been the sixth `toApp` call for this field');
		assert.strictEqual(main.main_settings?.decimal_duration?.toString(), '3.13');
		assert.strictEqual(main.main_settings?.decimal_duration?.constructor?.name, 'FixedDecimal');
		
		assert.strictEqual(first.type, 'sleep');
		assert.strictEqual(first.settings?.duration, 1);
		assert.strictEqual(first.settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(first.settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(first.settings?.flobotonum?.value?.stuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(first.settings?.flobotonum?.to_app_counter, 4, 'This should have been the fourth `toApp` call for this field');

		assert.strictEqual(second.type, 'sleep');
		assert.strictEqual(second.settings?.duration, 2);
		assert.strictEqual(second.settings?.flobotonum?.to_apped, true, 'The value should have been passed through `toApp`');
		assert.strictEqual(second.settings?.flobotonum?.type, 'flobotonum', 'The value should have been passed through `toApp`');
		assert.strictEqual(second.settings?.flobotonum?.value?.morestuff, true, 'The inner flobotonum value should have been saved');
		assert.strictEqual(second.settings?.flobotonum?.to_app_counter, 5, 'This should have been the fifth `toApp` call for this field');
	});

	it('should handle nested schemas with custom property names', async () => {

		flobotonum_to_app_counter = 0;

		const PropertyType = Function.inherits('Alchemy.Base', 'PropertyType', 'PropertyType');
		
		PropertyType.constitute(function setConfigSchema() {
			// Create a new schema
			let configuration_schema = alchemy.createSchema();
			this.configuration_schema = configuration_schema;
		});

		PropertyType.constitute(function setValueSchema() {
			// Create a new schema
			let value_schema = alchemy.createSchema();
			this.value_schema = value_schema;
		});

		const StringType = Function.inherits('PropertyType', 'String');

		StringType.constitute(function setSchema() {

			this.value_schema.addField('value', 'String', {
				description : 'The actual value of this string property',
			});

			this.configuration_schema.addField('max_length', 'Number', {
				description : 'The maximum length of the string',
			});

			this.configuration_schema.addField('flobotonum', 'Flobotonum');
		});

		const UnitType = Function.inherits('Alchemy.Base', 'UnitType', 'UnitType');
		const TypeDefinitionType = Function.inherits('UnitType', 'TypeDefinition');

		TypeDefinitionType.constitute(function setSchema() {

			this.schema = alchemy.createSchema();

			this.schema.addField('defined_type', 'Enum', {
				description : 'The defined type of this property',
				values      : PropertyType.getDescendantsDict(),
			});
		
			this.schema.addField('defined_type_configuration', 'Schema', {
				description : 'The configuration of the defined type',
				schema      : 'defined_type.configuration_schema',
			});
		});

		let pledge = new Classes.Pledge.Swift();

		const Unit = Function.inherits('Alchemy.Model', 'SwUnit');
		Unit.constitute(function addFields() {

			this.addField('unit_type', 'Enum', {
				description : 'The type of this unit',
				values      : UnitType.getDescendantsDict(),
			});
		
			this.addField('unit_type_settings', 'Schema', {
				schema : 'unit_type',
			});

			pledge.resolve();
		});

		await pledge;

		let UnitModel = Model.get('SwUnit');
		let unit = UnitModel.createDocument();
		unit.unit_type = 'type_definition';
		unit.unit_type_settings = {
			defined_type : 'string',
			defined_type_configuration : {
				max_length : '10',
				flobotonum: {
					value : {
						xstuff : true
					}
				}
			},
		};

		await unit.save();

		unit = await UnitModel.findByPk(unit._id);
		const type_settings = unit.unit_type_settings || {};

		assert.strictEqual(unit.unit_type, 'type_definition');
		assert.strictEqual(type_settings.defined_type, 'string');
		assert.strictEqual(type_settings.defined_type_configuration?.max_length, 10);
		assert.strictEqual(type_settings.defined_type_configuration?.flobotonum?.value?.xstuff, true);
		assert.strictEqual(type_settings.defined_type_configuration?.flobotonum?.to_app_counter, 2);
	});

	it('should support dynamic schemas', async () => {

		let constitute_pledge = new Pledge();

		const BookType = Function.inherits('Informer', 'BookType');

		BookType.postInherit(function afterInherit() {
			// A type_name or type_path is required,
			// and this is actually not (yet) automatically set by Protoblast
			this.type_name = this.name.underscore();
		});

		BookType.constitute(function addSchema() {
			this.schema = alchemy.createSchema();
			this.schema.addField('pagecount', 'Integer');
		});

		const Comic = Function.inherits('BookType', 'ComicBook');
		Comic.constitute(function setSchema() {
			this.schema.addField('in_color', 'Boolean');
		});

		const Hardback = Function.inherits('BookType', 'HardbackBook');
		Hardback.constitute(function setSchema() {
			this.schema.addField('has_dust_jacket', 'Boolean');
		});

		const Paperback = Function.inherits('BookType', 'PaperbackBook');
		Paperback.constitute(function setSchema() {});

		const BookWithEnumSchema = Function.inherits('Alchemy.Model', 'BookWithEnumSchema');
		BookWithEnumSchema.constitute(function setSchema() {
			this.addField('title', 'String');
			this.addField('type', 'Enum', {
				values: Classes.BookType.getLiveDescendantsMap(),
			});
			this.addField('settings', 'Schema', {
				schema: 'type.schema'
			});

			this.addField('custom_property', 'String');
			this.addField('custom_property_type', 'String');
		});

		/**
		 * Resolve the remote schema request.
		 * This allows us to create dynamic schemas based on database contents!
		 *
		 * @param    {Alchemy.OperationalContext.Schema}   context
		 *
		 * @return   {Alchemy.Document|Object|Schema}
		 */
		BookWithEnumSchema.setMethod(async function resolveRemoteSchemaRequest(context) {

			let schema_path = context.getSubSchemaPath();

			// The schema by default is `schema`, unless it is otherwise
			// specified in the external field.
			// This way, we can have multiple fields that request different schemas
			if (schema_path == 'other_schema') {
				let schema = alchemy.createSchema();
				schema.addField('other_property', 'String');
				return schema;
			}

			if (schema_path != 'schema') {
				return;
			}

			let our_field_value = context.getOurFieldValue();

			let doc = await this.findByPk(our_field_value);

			if (!doc) {
				throw new Error('Failed to find document!');
			}

			if (!doc.custom_property) {
				return false;
			}

			let schema = alchemy.createSchema();
			schema.addField(doc.custom_property, doc.custom_property_type || 'String');

			return schema;
		});

		const MetaWithRemoteSchema = Function.inherits('Alchemy.Model', 'MetaWithRemoteSchema');
		MetaWithRemoteSchema.constitute(function setSchema() {

			this.belongsTo('BookWithEnumSchema');
			this.addField('book_settings', 'Schema', {
				schema: 'book_with_enum_schema_id'
			});

			this.addField('other_settings', 'Schema', {
				schema: 'book_with_enum_schema_id.other_schema',
			});

			constitute_pledge.resolve();
		});

		await constitute_pledge;

		const BookModel = Model.get('BookWithEnumSchema');
		const MetaModel = Model.get('MetaWithRemoteSchema');

		let miles_one = BookModel.createDocument();
		miles_one.title = 'Warrior\'s Apprentice';
		miles_one.type = 'paperback_book';
		miles_one.settings = {

			// Should be saved
			pagecount: 372,

			// Won't be saved
			in_color: false,
		};

		miles_one.custom_property = 'goodreads_rating';
		miles_one.custom_property_type = 'Decimal';

		await miles_one.save();

		assert.deepStrictEqual(miles_one.settings, {pagecount: 372});

		let meta_doc = MetaModel.createDocument();
		meta_doc.book_with_enum_schema_id = miles_one._id;
		meta_doc.book_settings = {
			// Should be saved
			goodreads_rating: 4.7,

			// Should not be saved
			year: 1986,
		};

		meta_doc.other_settings = {
			other_property: 'other_value',
			year: 1986,
			goodreads_rating: 4.7,
		};

		await meta_doc.save();

		assert.strictEqual(
			meta_doc.book_settings.goodreads_rating + '',
			'4.7',
			'The goodreads_rating field should have been saved!'
		);

		assert.strictEqual(
			meta_doc.book_settings.goodreads_rating.constructor.name,
			'Decimal',
			'The goodreads_rating field should have been saved as a Decimal'
		);

		assert.strictEqual(
			meta_doc.book_settings.year,
			undefined,
			'The `year` field should not have been saved, it was not part of the schema'
		);

		assert.strictEqual(
			meta_doc.other_settings.other_property,
			'other_value',
			'The `other_settings` field should have also been saved'
		);

		assert.strictEqual(
			meta_doc.other_settings.year,
			undefined,
			'The `year` field in the `other_settings` field should not have been saved, it was not part of the schema'
		);
	});

	it('should allow you to create dynamic properties', async () => {

		let constitute_pledge = new Pledge();

		const DynamicType = Function.inherits('Informer', function DynamicType(doc) {
			this.document = doc;
		});

		DynamicType.setMethod(function getValueSchema() {
			return this.constructor.value_schema;
		});

		DynamicType.postInherit(function afterInherit() {
			// A type_name or type_path is required,
			// and this is actually not (yet) automatically set by Protoblast
			this.type_name = this.name.underscore();
		});

		DynamicType.constitute(function setSchema() {
			this.value_schema = alchemy.createSchema();
			this.settings_schema = alchemy.createSchema();
		});

		const StringDynamicType = Function.inherits('DynamicType', 'StringDynamicType');
		StringDynamicType.constitute(function setSchema() {
			this.value_schema.addField('value', 'String');
			this.settings_schema.addField('max_length', 'Integer');
		});

		const BooleanDynamicType = Function.inherits('DynamicType', 'BooleanDynamicType');
		BooleanDynamicType.constitute(function setSchema() {
			this.value_schema.addField('value', 'Boolean');
		});

		const NumberDynamicType = Function.inherits('DynamicType', 'NumberDynamicType');
		NumberDynamicType.constitute(function setSchema() {
			this.value_schema.addField('value', 'Number');
		});

		const CompoundDynamicType = Function.inherits('DynamicType', 'CompoundDynamicType');
		CompoundDynamicType.constitute(function setSchema() {
			let schema = alchemy.createSchema();
			schema.belongsTo('DynamicProperty');
		});

		// The model that will define the dynamic property types
		const DynamicPropertyModel = Function.inherits('Alchemy.Model', 'DynamicProperty');
		DynamicPropertyModel.constitute(function addSchema() {

			this.addField('title', 'String');

			this.addField('type', 'Enum', {
				values: Classes.DynamicType.getLiveDescendantsMap(),
			});

			this.addField('settings', 'Schema', {
				schema : 'type.settings_schema'
			});
		});

		DynamicPropertyModel.setMethod(async function resolveRemoteSchemaRequest(context) {

			let our_field_value = context.getOurFieldValue(),
				our_field_name = context.getOurFieldName();

			let doc = await this.findByValues({
				[our_field_name]: our_field_value,
			});

			if (!doc) {
				return null;
			}

			const external_field = context.getExternalField();

			context = context.createChild();
			context.setHolder(doc);
			context.setSchema(this.schema);

			return doc.resolveSchemaPath(context);
		});

		DynamicPropertyModel.setDocumentMethod(function resolveSchemaPath(context) {

			let sub_schema_path = context.getSubSchemaPath();
			let doc = context.getHolder();

			let TypeConstructor = DynamicType.getDescendant(doc.type);

			let instance = new TypeConstructor(doc);

			if (sub_schema_path == 'value_schema') {
				return instance.getValueSchema();
			}
		});

		// The model that will exist out of dynamic properties
		const DynamicMetaModel = Function.inherits('Alchemy.Model', 'DynamicMeta');
		DynamicMetaModel.constitute(function setSchema() {

			let schema = alchemy.createSchema();

			schema.belongsTo('DynamicProperty');
			schema.addField('value_config', 'Schema', {
				schema : 'dynamic_property_id.value_schema',
			});

			this.addField('properties', schema, {array: true});

			constitute_pledge.resolve();
		});

		await constitute_pledge;

		const DP = Model.get('DynamicProperty');

		let firstname_property = DP.createDocument();
		firstname_property.title = 'Firstname';
		firstname_property.type = 'string_dynamic_type';
		firstname_property.settings = {
			max_length: 10,
			wont_be_saved: 99,
		};
		await firstname_property.save();

		assert.strictEqual(firstname_property.title, 'Firstname');
		assert.strictEqual(firstname_property.type, 'string_dynamic_type');
		assert.strictEqual(firstname_property.settings.max_length, 10);
		assert.strictEqual(firstname_property.settings.wont_be_saved, undefined);

		let age_property = DP.createDocument();
		age_property.title = 'Age';
		age_property.type = 'number_dynamic_type';
		await age_property.save();

		let location_property = DP.createDocument();
		location_property.title = 'Location';
		location_property.type = 'string_dynamic_type';
		await location_property.save();

		let is_admin_property = DP.createDocument();
		is_admin_property.title = 'Is admin';
		is_admin_property.type = 'boolean_dynamic_type';
		await is_admin_property.save();

		let DynamicMeta = Model.get('DynamicMeta');

		let meta = DynamicMeta.createDocument();
		meta.properties = [
			{
				dynamic_property_id: firstname_property._id,
				value_config: {
					value: 1,
					extra: 'will_be_ignored',
				}
			}
		];

		await meta.save();

		assert.strictEqual(meta.properties[0].value_config.value, '1');
		assert.strictEqual(meta.properties[0].value_config.extra, undefined);

		let more_meta = DynamicMeta.createDocument();
		more_meta.properties = [
			{
				dynamic_property_id: firstname_property._id,
				value_config: {
					value: 'Jelle',
					extra: 'will_be_ignored',
				}
			},
			{
				dynamic_property_id: age_property._id,
				value_config: {
					value: 33,
					extra: 'will_be_ignored',
				}
			},
			{
				dynamic_property_id: location_property._id,
				value_config: {
					value: 'Belgium',
					extra: 'will_be_ignored',
				}
			},
			{
				dynamic_property_id: is_admin_property._id,
				value_config: {
					value: true,
					extra: 'will_be_ignored',
				}
			}
		];

		await more_meta.save();

		let firstname = more_meta.properties[0],
			age = more_meta.properties[1],
			location = more_meta.properties[2],
			is_admin = more_meta.properties[3];

		assert.strictEqual(firstname.value_config.value, 'Jelle');
		assert.strictEqual(age.value_config.value, 33);
		assert.strictEqual(location.value_config.value, 'Belgium');
		assert.strictEqual(is_admin.value_config.value, true);

		assert.strictEqual(firstname.value_config.extra, undefined);
		assert.strictEqual(age.value_config.extra, undefined);
		assert.strictEqual(location.value_config.extra, undefined);
		assert.strictEqual(is_admin.value_config.extra, undefined);
	});

	it('should also support dynamic properties with the builtin resolves', async () => {

		let constitute_pledge = new Pledge();

		// Another dynamic property model, but without custom resolve logic
		const OtherDynamicPropertyModel = Function.inherits('Alchemy.Model', 'OtherDynamicProperty');
		OtherDynamicPropertyModel.constitute(function addSchema() {

			this.addField('title', 'String');

			this.addField('type', 'Enum', {
				values: Classes.DynamicType.getLiveDescendantsMap(),
			});

			this.addField('settings', 'Schema', {
				schema : 'type.settings_schema'
			});
		});

		const OtherDynamicMetaModel = Function.inherits('Alchemy.Model', 'OtherDynamicMeta');
		OtherDynamicMetaModel.constitute(function setSchema() {

			let schema = alchemy.createSchema();

			schema.belongsTo('OtherDynamicProperty');
			schema.addField('value_config', 'Schema', {
				schema : 'other_dynamic_property_id.type.value_schema',
			});

			this.addField('properties', schema, {array: true});

			constitute_pledge.resolve();
		});

		await constitute_pledge;

		let ODP = Model.get('OtherDynamicProperty');

		let age_property = ODP.createDocument();
		age_property.title = 'Age';
		age_property.type = 'number_dynamic_type';
		await age_property.save();

		assert.strictEqual(age_property.title, 'Age');
		assert.strictEqual(age_property.type, 'number_dynamic_type');

		age_property = await ODP.findByPk(age_property._id);
		assert.strictEqual(age_property.title, 'Age');
		assert.strictEqual(age_property.type, 'number_dynamic_type');

		let location_property = ODP.createDocument();
		location_property.title = 'Location';
		location_property.type = 'string_dynamic_type';
		await location_property.save();

		let is_admin_property = ODP.createDocument();
		is_admin_property.title = 'Is admin';
		is_admin_property.type = 'boolean_dynamic_type';
		await is_admin_property.save();

		let OtherDynamicMeta = Model.get('OtherDynamicMeta');

		let other_meta = OtherDynamicMeta.createDocument();
		other_meta.properties = [
			{
				other_dynamic_property_id: age_property._id,
				value_config: {
					value: 33,
					extra: 'will_be_ignored',
				}
			}
		];

		await other_meta.save();

		assert.strictEqual(other_meta.properties[0].value_config.value, 33);
		assert.strictEqual(other_meta.properties[0].value_config.extra, undefined);

	});
});

describe('Field#toJsonSchema()', function() {

	describe('basic field types', function() {

		it('should convert String field to JSON Schema', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'name', {
				description: 'The user name'
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.type[1], 'null');
			assert.strictEqual(json_schema.title, 'Name');
			assert.strictEqual(json_schema.description, 'The user name');
		});

		it('should convert Number field to JSON Schema', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Number(schema, 'age');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'number');
		});

		it('should convert Boolean field to JSON Schema', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Boolean(schema, 'active');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'boolean');
		});

		it('should convert Integer field to JSON Schema', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Integer(schema, 'count');

			let json_schema = field.toJsonSchema();

			// Integer should be type: integer per JSON Schema spec
			assert.strictEqual(json_schema.type[0], 'integer');
		});
	});

	describe('is_array handling', function() {

		it('should wrap in array schema when is_array is true', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'tags', {
				is_array: true
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'array');
			assert.strictEqual(json_schema.items.type[0], 'string');
		});
	});

	describe('is_nullable handling', function() {

		it('should include null in type array by default', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'name');

			let json_schema = field.toJsonSchema();

			assert.ok(Array.isArray(json_schema.type));
			assert.strictEqual(json_schema.type[1], 'null');
		});

		it('should not include null when is_nullable is false', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'name', {
				is_nullable: false
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'string');
		});
	});

	describe('title, description, default', function() {

		it('should include title from field name', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'user_name');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.title, 'User name');
		});

		it('should use custom title when provided', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'name', {
				title: 'Full Name'
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.title, 'Full Name');
		});

		it('should include description when provided', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'name', {
				description: 'The full name of the person'
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.description, 'The full name of the person');
		});

		it('should include default value when provided (non-function)', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'status', {
				default: 'pending'
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.default, 'pending');
		});

		it('should not include function defaults', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.String(schema, 'code', {
				default: () => Math.random().toString()
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.default, undefined);
		});
	});

	describe('Enum field', function() {

		it('should include enum values in JSON Schema', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Enum(schema, 'status', {
				values: {
					active: 'Active',
					inactive: 'Inactive',
					pending: 'Pending'
				}
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.ok(Array.isArray(json_schema.enum), 'enum should be an array, got: ' + JSON.stringify(json_schema.enum));
			assert.strictEqual(json_schema.enum.length, 3, 'should have 3 enum values, got: ' + JSON.stringify(json_schema.enum));
			assert.ok(json_schema.enum.includes('active'), 'should include active, got: ' + JSON.stringify(json_schema.enum));
			assert.ok(json_schema.enum.includes('inactive'));
			assert.ok(json_schema.enum.includes('pending'));
		});
	});

	describe('date/time fields', function() {

		it('should add format: date for LocalDate field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.LocalDate(schema, 'birth_date');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.format, 'date');
		});

		it('should add format: date-time for LocalDateTime field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.LocalDateTime(schema, 'created_at');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.format, 'date-time');
		});

		it('should add format: time for LocalTime field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.LocalTime(schema, 'start_time');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.format, 'time');
		});

		it('should add format: date for Date field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Date(schema, 'event_date');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.format, 'date');
		});

		it('should add format: date-time for Datetime field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Datetime(schema, 'updated_at');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.format, 'date-time');
		});
	});

	describe('special fields', function() {

		it('should add format: objectid for ObjectId field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.ObjectId(schema, 'ref_id');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.format, 'objectid');
			assert.ok(json_schema.pattern);
		});

		it('should add format: uri for Url field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Url(schema, 'website');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.format, 'uri');
		});

		it('should add contentMediaType for Html field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Html(schema, 'content');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.contentMediaType, 'text/html');
		});

		it('should add writeOnly for Password field', function() {
			let schema = new Classes.Alchemy.Schema();
			let field = new Classes.Alchemy.Field.Password(schema, 'password');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.writeOnly, true);
			assert.strictEqual(json_schema.format, 'password');
		});

		it('should create GeoJSON schema for Geopoint field', function() {
			let schema = new Classes.Alchemy.Schema();
			schema.setName('TestSchema');
			let field = new Classes.Alchemy.Field.Geopoint(schema, 'location');

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'object');
			assert.ok(json_schema.properties);
			assert.ok(json_schema.properties.type);
			assert.ok(json_schema.properties.coordinates);
			assert.deepStrictEqual(json_schema.properties.type.enum, ['Point']);
		});
	});

	describe('Schema field (nested schemas)', function() {

		it('should delegate to nested schema toJsonSchema()', function() {
			let parent_schema = new Classes.Alchemy.Schema();
			parent_schema.setName('Parent');

			let address_schema = alchemy.createSchema();
			address_schema.addField('street', 'String');
			address_schema.addField('city', 'String');
			address_schema.addField('zip', 'String');

			let field = new Classes.Alchemy.Field.Schema(parent_schema, 'address', {
				schema: address_schema
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'object');
			assert.ok(json_schema.properties);
			assert.ok(json_schema.properties.street);
			assert.ok(json_schema.properties.city);
			assert.ok(json_schema.properties.zip);
		});

		it('should handle array schema fields', function() {
			let parent_schema = new Classes.Alchemy.Schema();
			parent_schema.setName('Parent');

			let item_schema = alchemy.createSchema();
			item_schema.addField('name', 'String');
			item_schema.addField('quantity', 'Integer');

			let field = new Classes.Alchemy.Field.Schema(parent_schema, 'items', {
				schema: item_schema,
				is_array: true
			});

			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'array');
			assert.ok(json_schema.items);
			assert.strictEqual(json_schema.items.type, 'object');
			assert.ok(json_schema.items.properties.name);
			assert.ok(json_schema.items.properties.quantity);
		});
	});
});

describe('Schema#toJsonSchema()', function() {

	it('should convert a full schema to JSON Schema', function() {
		let schema = alchemy.createSchema();
		schema.setName('Person');
		schema.addField('name', 'String', {description: 'Full name'});
		schema.addField('age', 'Integer');
		schema.addField('email', 'String');
		schema.addField('status', 'Enum', {values: {active: 'Active', inactive: 'Inactive'}});

		let json_schema = schema.toJsonSchema();

		assert.strictEqual(json_schema.type, 'object');
		assert.strictEqual(json_schema.title, 'Person');
		assert.ok(json_schema.properties);
		assert.ok(json_schema.properties.name);
		assert.ok(json_schema.properties.age);
		assert.ok(json_schema.properties.email);
		assert.ok(json_schema.properties.status);
		assert.ok(json_schema.properties.status.enum);
	});

	it('should detect required fields from required option', function() {
		let schema = alchemy.createSchema();
		schema.setName('User');
		schema.addField('username', 'String', {required: true});
		schema.addField('email', 'String', {required: true});
		schema.addField('bio', 'String');

		let json_schema = schema.toJsonSchema();

		assert.ok(Array.isArray(json_schema.required));
		assert.ok(json_schema.required.includes('username'));
		assert.ok(json_schema.required.includes('email'));
		assert.ok(!json_schema.required.includes('bio'));
	});

	it('should skip private fields by default', function() {
		let schema = alchemy.createSchema();
		schema.setName('Secure');
		schema.addField('public_data', 'String');
		schema.addField('private_data', 'String', {is_private: true});

		let json_schema = schema.toJsonSchema();

		assert.ok(json_schema.properties.public_data);
		assert.strictEqual(json_schema.properties.private_data, undefined);
	});

	it('should include private fields when requested', function() {
		let schema = alchemy.createSchema();
		schema.setName('Secure');
		schema.addField('public_data', 'String');
		schema.addField('private_data', 'String', {is_private: true});

		let json_schema = schema.toJsonSchema({include_private: true});

		assert.ok(json_schema.properties.public_data);
		assert.ok(json_schema.properties.private_data);
	});

	it('should handle nested schemas', function() {
		let address_schema = alchemy.createSchema();
		address_schema.addField('street', 'String');
		address_schema.addField('city', 'String');

		let person_schema = alchemy.createSchema();
		person_schema.setName('Person');
		person_schema.addField('name', 'String');
		person_schema.addField('address', 'Schema', {schema: address_schema});

		let json_schema = person_schema.toJsonSchema();

		assert.strictEqual(json_schema.type, 'object');
		assert.ok(json_schema.properties.name);
		assert.ok(json_schema.properties.address);
		assert.strictEqual(json_schema.properties.address.type, 'object');
		assert.ok(json_schema.properties.address.properties.street);
		assert.ok(json_schema.properties.address.properties.city);
	});

	it('should handle array of nested schemas', function() {
		let item_schema = alchemy.createSchema();
		item_schema.addField('name', 'String');
		item_schema.addField('price', 'Number');

		let order_schema = alchemy.createSchema();
		order_schema.setName('Order');
		order_schema.addField('order_number', 'String');
		order_schema.addField('items', 'Schema', {schema: item_schema, is_array: true});

		let json_schema = order_schema.toJsonSchema();

		assert.ok(json_schema.properties.items);
		assert.strictEqual(json_schema.properties.items.type, 'array');
		assert.ok(json_schema.properties.items.items);
		assert.strictEqual(json_schema.properties.items.items.type, 'object');
	});
});

describe('JSON Schema specification conformance', function() {

	// These tests verify that our toJsonSchema() output matches official
	// JSON Schema examples from https://json-schema.org/learn/miscellaneous-examples
	//
	// LIMITATIONS (documented for future implementation):
	// - minimum/maximum: Not yet supported on fields. Tests skip these constraints.
	// - pattern: Not yet supported on fields. Tests skip regex pattern constraints.
	// - Auto-generated titles: Our fields auto-generate titles from field names.
	//   To match official examples exactly (which don't include titles), we strip
	//   titles from our output when comparing.

	describe('Basic Person Schema (Example 1)', function() {

		// Target official JSON Schema:
		// {
		//   "type": "object",
		//   "properties": {
		//     "firstName": { "type": "string", "description": "The person's first name." },
		//     "lastName": { "type": "string", "description": "The person's last name." },
		//     "age": { "type": "integer", "description": "Age in years which must be equal to or greater than zero.", "minimum": 0 }
		//   }
		// }

		it('should produce spec-compliant output for a basic person schema', function() {
			let schema = alchemy.createSchema();
			schema.addField('firstName', 'String', {
				description: "The person's first name.",
				is_nullable: false
			});
			schema.addField('lastName', 'String', {
				description: "The person's last name.",
				is_nullable: false
			});
			schema.addField('age', 'Integer', {
				description: 'Age in years which must be equal to or greater than zero.',
				is_nullable: false
				// Note: minimum: 0 is not yet supported
			});

			let json_schema = schema.toJsonSchema();

			// Verify the overall structure
			assert.strictEqual(json_schema.type, 'object');
			assert.ok(json_schema.properties);

			// Verify firstName field
			let firstName = json_schema.properties.firstName;
			assert.strictEqual(firstName.type, 'string', 'firstName should be type string');
			assert.strictEqual(firstName.description, "The person's first name.");

			// Verify lastName field
			let lastName = json_schema.properties.lastName;
			assert.strictEqual(lastName.type, 'string', 'lastName should be type string');
			assert.strictEqual(lastName.description, "The person's last name.");

			// Verify age field - critical: should be "integer" not "number"
			let age = json_schema.properties.age;
			assert.strictEqual(age.type, 'integer', 'age should be type integer (not number)');
			assert.strictEqual(age.description, 'Age in years which must be equal to or greater than zero.');
			// Note: minimum constraint is not yet supported, so we don't test for it
		});

		it('should exactly match simplified official schema (without titles)', function() {
			let schema = alchemy.createSchema();
			schema.addField('firstName', 'String', {
				description: "The person's first name.",
				is_nullable: false
			});
			schema.addField('lastName', 'String', {
				description: "The person's last name.",
				is_nullable: false
			});
			schema.addField('age', 'Integer', {
				description: 'Age in years which must be equal to or greater than zero.',
				is_nullable: false
			});

			let json_schema = schema.toJsonSchema();

			// Remove auto-generated titles for comparison with official examples
			delete json_schema.title;
			delete json_schema.properties.firstName.title;
			delete json_schema.properties.lastName.title;
			delete json_schema.properties.age.title;

			// Target schema (without minimum which we don't support yet)
			let expected = {
				type: 'object',
				properties: {
					firstName: {
						type: 'string',
						description: "The person's first name."
					},
					lastName: {
						type: 'string',
						description: "The person's last name."
					},
					age: {
						type: 'integer',
						description: 'Age in years which must be equal to or greater than zero.'
					}
				}
			};

			assert.deepStrictEqual(json_schema, expected);
		});
	});

	describe('Complex Object with Nested Properties (Example 2)', function() {

		// Target official JSON Schema:
		// {
		//   "type": "object",
		//   "properties": {
		//     "name": { "type": "string" },
		//     "age": { "type": "integer", "minimum": 0 },
		//     "address": {
		//       "type": "object",
		//       "properties": {
		//         "street": { "type": "string" },
		//         "city": { "type": "string" },
		//         "state": { "type": "string" },
		//         "postalCode": { "type": "string", "pattern": "\\d{5}" }
		//       },
		//       "required": ["street", "city", "state", "postalCode"]
		//     },
		//     "hobbies": { "type": "array", "items": { "type": "string" } }
		//   },
		//   "required": ["name", "age"]
		// }

		it('should produce spec-compliant output for nested object schema', function() {
			// Create address subschema
			let address_schema = alchemy.createSchema();
			address_schema.addField('street', 'String', {is_nullable: false, required: true});
			address_schema.addField('city', 'String', {is_nullable: false, required: true});
			address_schema.addField('state', 'String', {is_nullable: false, required: true});
			address_schema.addField('postalCode', 'String', {
				is_nullable: false,
				required: true
				// Note: pattern: "\\d{5}" is not yet supported
			});

			// Create main schema
			let schema = alchemy.createSchema();
			schema.addField('name', 'String', {is_nullable: false, required: true});
			schema.addField('age', 'Integer', {
				is_nullable: false,
				required: true
				// Note: minimum: 0 is not yet supported
			});
			schema.addField('address', 'Schema', {
				schema: address_schema,
				is_nullable: false
			});
			schema.addField('hobbies', 'String', {
				is_array: true,
				is_nullable: false
			});

			let json_schema = schema.toJsonSchema();

			// Verify the overall structure
			assert.strictEqual(json_schema.type, 'object');
			assert.ok(json_schema.properties);

			// Verify name field
			assert.strictEqual(json_schema.properties.name.type, 'string');

			// Verify age field - must be "integer"
			assert.strictEqual(json_schema.properties.age.type, 'integer');

			// Verify address is nested object
			let address = json_schema.properties.address;
			assert.strictEqual(address.type, 'object');
			assert.ok(address.properties);
			assert.strictEqual(address.properties.street.type, 'string');
			assert.strictEqual(address.properties.city.type, 'string');
			assert.strictEqual(address.properties.state.type, 'string');
			assert.strictEqual(address.properties.postalCode.type, 'string');

			// Verify address required fields
			assert.ok(Array.isArray(address.required), 'address should have required array');
			assert.ok(address.required.includes('street'));
			assert.ok(address.required.includes('city'));
			assert.ok(address.required.includes('state'));
			assert.ok(address.required.includes('postalCode'));

			// Verify hobbies is array of strings
			let hobbies = json_schema.properties.hobbies;
			assert.strictEqual(hobbies.type, 'array');
			assert.ok(hobbies.items);
			assert.strictEqual(hobbies.items.type, 'string');

			// Verify top-level required fields
			assert.ok(Array.isArray(json_schema.required));
			assert.ok(json_schema.required.includes('name'));
			assert.ok(json_schema.required.includes('age'));
		});

		it('should exactly match simplified official schema (without titles and unsupported constraints)', function() {
			// Create address subschema
			let address_schema = alchemy.createSchema();
			address_schema.addField('street', 'String', {is_nullable: false, required: true});
			address_schema.addField('city', 'String', {is_nullable: false, required: true});
			address_schema.addField('state', 'String', {is_nullable: false, required: true});
			address_schema.addField('postalCode', 'String', {is_nullable: false, required: true});

			// Create main schema
			let schema = alchemy.createSchema();
			schema.addField('name', 'String', {is_nullable: false, required: true});
			schema.addField('age', 'Integer', {is_nullable: false, required: true});
			schema.addField('address', 'Schema', {schema: address_schema, is_nullable: false});
			schema.addField('hobbies', 'String', {is_array: true, is_nullable: false});

			let json_schema = schema.toJsonSchema();

			// Helper to recursively remove titles
			function removeTitles(obj) {
				if (!obj || typeof obj !== 'object') return obj;
				if (Array.isArray(obj)) return obj.map(removeTitles);

				let result = {};
				for (let key in obj) {
					if (key === 'title') continue;
					result[key] = removeTitles(obj[key]);
				}
				return result;
			}

			json_schema = removeTitles(json_schema);

			// Target schema (without pattern/minimum which we don't support yet)
			let expected = {
				type: 'object',
				properties: {
					name: {type: 'string'},
					age: {type: 'integer'},
					address: {
						type: 'object',
						properties: {
							street: {type: 'string'},
							city: {type: 'string'},
							state: {type: 'string'},
							postalCode: {type: 'string'}
						},
						required: ['street', 'city', 'state', 'postalCode']
					},
					hobbies: {
						type: 'array',
						items: {type: 'string'}
					}
				},
				required: ['name', 'age']
			};

			assert.deepStrictEqual(json_schema, expected);
		});
	});

	describe('Integer vs Number type distinction', function() {

		it('should use "integer" for Integer fields', function() {
			let schema = alchemy.createSchema();
			let field = new Classes.Alchemy.Field.Integer(schema, 'count', {is_nullable: false});
			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'integer');
		});

		it('should use "number" for Number fields', function() {
			let schema = alchemy.createSchema();
			let field = new Classes.Alchemy.Field.Number(schema, 'price', {is_nullable: false});
			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'number');
		});

		it('should use "integer" for BigInt fields', function() {
			let schema = alchemy.createSchema();
			let field = new Classes.Alchemy.Field.BigInt(schema, 'large_num', {is_nullable: false});
			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'integer');
		});

		it('should use "number" for Decimal fields', function() {
			let schema = alchemy.createSchema();
			let field = new Classes.Alchemy.Field.Decimal(schema, 'amount', {is_nullable: false});
			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'number');
		});

		it('should use "number" for FixedDecimal fields', function() {
			let schema = alchemy.createSchema();
			let field = new Classes.Alchemy.Field.FixedDecimal(schema, 'money', {
				scale: 2,
				is_nullable: false
			});
			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'number');
		});
	});

	describe('Nullable handling', function() {

		it('should produce array type with null when is_nullable is true (default)', function() {
			let schema = alchemy.createSchema();
			let field = new Classes.Alchemy.Field.String(schema, 'name');
			let json_schema = field.toJsonSchema();

			assert.ok(Array.isArray(json_schema.type));
			assert.strictEqual(json_schema.type[0], 'string');
			assert.strictEqual(json_schema.type[1], 'null');
		});

		it('should produce simple type when is_nullable is false', function() {
			let schema = alchemy.createSchema();
			let field = new Classes.Alchemy.Field.String(schema, 'name', {is_nullable: false});
			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'string');
		});

		it('should produce simple integer type when is_nullable is false', function() {
			let schema = alchemy.createSchema();
			let field = new Classes.Alchemy.Field.Integer(schema, 'count', {is_nullable: false});
			let json_schema = field.toJsonSchema();

			assert.strictEqual(json_schema.type, 'integer');
		});
	});

	describe('Required fields detection', function() {

		it('should include field in required array when required: true', function() {
			let schema = alchemy.createSchema();
			schema.addField('name', 'String', {required: true});
			schema.addField('optional_field', 'String');

			let json_schema = schema.toJsonSchema();

			assert.ok(Array.isArray(json_schema.required));
			assert.strictEqual(json_schema.required.length, 1);
			assert.ok(json_schema.required.includes('name'));
		});

		it('should detect required from NotEmpty rule', function() {
			let schema = alchemy.createSchema();
			schema.addField('name', 'String');
			schema.addField('email', 'String');
			schema.addRule('not_empty', {fields: ['name']});

			let json_schema = schema.toJsonSchema();

			assert.ok(Array.isArray(json_schema.required));
			assert.ok(json_schema.required.includes('name'));
			assert.ok(!json_schema.required.includes('email'));
		});
	});
});
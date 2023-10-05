const assert = require('assert');
const libfs = require('fs');

let post_pledge;

describe('Controller', function() {

	before(function() {
		global.ConduitTestController = Function.inherits('Alchemy.Controller', 'ConduitTest');
	});

	describe('#body', function() {
		it('should parse the body of any encoding type', async function() {

			Router.add({
				name    : 'ConduitTest#bodyTest',
				paths   : '/conduit/body_test',
				methods : ['get', 'post'],
			});

			ConduitTestController.setAction(function bodyTest(conduit) {

				if (conduit.method == 'post') {

					let result = {
						method  : conduit.method,
						body    : conduit.body,
						params  : conduit.params,
						headers : conduit.headers,
						files   : conduit.files,
					};

					if (post_pledge) {
						post_pledge.resolve(result);
						post_pledge = null;
					}

					return conduit.end();
				}

				let enctype = conduit.param('enctype');
				this.set('form_enctype', enctype);

				let disable_hawkejs = conduit.param('disable_hawkejs');
				this.set('disable_hawkejs', disable_hawkejs);

				let add_files = conduit.param('add_files');
				this.set('add_files', add_files);

				this.render('static/conduit_body_test');
			});

			post_pledge = new Pledge();
			await testFormSubmission(post_pledge, 'application/x-www-form-urlencoded');

			post_pledge = new Pledge();
			await testFormSubmission(post_pledge, 'multipart/form-data');

			post_pledge = new Pledge();
			await testFormSubmission(post_pledge, 'json');
		});
	});

	describe('#files', function() {
		it('should parse submitted files', async function() {
			post_pledge = new Pledge();
			await testFormSubmission(post_pledge, 'addfiles');
		});
	});
});

async function testFormSubmission(post_pledge, enctype) {

	let base_url = global.getRouteUrl('ConduitTest#bodyTest');
	let actual_url = '' + base_url;
	let add_files = false;
	let file_contents = '';

	if (enctype == 'addfiles') {
		add_files = true;
		enctype = 'multipart/form-data';
	}

	if (enctype) {
		actual_url += '?&enctype=' + enctype + '&disable_hawkejs=true';

		if (add_files) {
			actual_url += '&add_files=true';
		}
	}

	if (enctype == 'json') {
		// Do a single JSON post

		let body = {
			set_type  : enctype,
			firstname : 'Jelle',
			lastname  : 'De Loecker',
			list      : ['Eerst', 'Tweede', 'Derde'],
			single_entry_list : ['Single'],
			nestedtext : {
				first : {
					second : 'Nested text'
				}
			},
			nestedarray : {
				first : {
					second : ['Nested array']
				}
			}
		};

		Blast.fetch(actual_url, {post: body});

	} else {
		// Use Puppeteer for normal form submissions
		await setLocation(actual_url);

		await queryElementData('.form-wrapper');

		await setElementValueOrThrow('#firstname', 'Jelle');
		await setElementValueOrThrow('#lastname', 'De Loecker');

		await setElementValueOrThrow('#list_one', 'Eerst');
		await setElementValueOrThrow('#list_two', 'Tweede');
		await setElementValueOrThrow('#list_three', 'Derde');
		await setElementValueOrThrow('#single_entry_list', 'Single');

		await setElementValueOrThrow('#nested_text', 'Nested text');
		await setElementValueOrThrow('#nested_array', 'Nested array');

		if (add_files) {
			let {path, fd} = Blast.openTempFileSync();
			file_contents = 'Hello: ' + Crypto.randomHex(32);
			libfs.writeSync(fd, file_contents);

			await setFileInputPath('#file_one', path);
		}

		let submit_result = await clickElement('#submitbutton');

		if (!submit_result) {
			throw new Error('Failed to click the submit button');
		}
	}

	let result = await post_pledge;

	if (!result) {
		throw new Error('Failed to receive submission result');
	}

	assert.strictEqual(result.method, 'post', 'This request should have been posted');

	if (enctype) {
		let content_type = result.headers?.['content-type'] || '';

		if (content_type.indexOf(enctype) == -1) {
			throw new Error('The headers did not contain the correct content-type');
		}
	}

	const body = result.body;
	
	if (Array.isArray(body.firstname)) {
		throw new Error('Form inputs should not be arrays, but they are');
	}

	assert.strictEqual(body.set_type, enctype);
	assert.strictEqual(body.firstname, 'Jelle');
	assert.strictEqual(body.lastname, 'De Loecker');
	assert.deepStrictEqual(body.list, ['Eerst', 'Tweede', 'Derde']);
	assert.deepStrictEqual(body.single_entry_list, ['Single']);
	assert.deepStrictEqual(body.nestedtext, {first: {second: 'Nested text'}});
	assert.deepStrictEqual(body.nestedarray, {first: {second: ['Nested array']}});

	if (add_files) {
		let file = result.files.file_one;

		let contents = await file.read('utf8');

		assert.strictEqual(contents, file_contents);
	}
}
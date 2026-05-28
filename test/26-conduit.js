const assert = require('assert');
const libfs = require('fs');
const libpath = require('path');

let post_pledge;

describe('Controller', function() {

	before(function() {
		global.ConduitTestController = Function.inherits('Alchemy.Controller', 'ConduitTest');
	});

	describe('#body', function() {

		before(() => {
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
		});

		it('should parse the body of a url-encoded form', async function() {
			post_pledge = new Pledge();
			await testFormSubmission(post_pledge, 'application/x-www-form-urlencoded');

		});

		it('should parse the body of a multipart form', async function() {
			post_pledge = new Pledge();
			await testFormSubmission(post_pledge, 'multipart/form-data');
		});

		it('should parse the body of a json-encoded form', async function() {
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

	describe('#end(data)', function() {

		before(() => {
			Router.add({
				name    : 'ConduitTest#endJsonObject',
				paths   : '/conduit/end_json_object',
				methods : 'get',
			});

			Router.add({
				name    : 'ConduitTest#endString',
				paths   : '/conduit/end_string',
				methods : 'get',
			});

			Router.add({
				name    : 'ConduitTest#endArray',
				paths   : '/conduit/end_array',
				methods : 'get',
			});

			ConduitTestController.setAction(function endJsonObject(conduit) {
				conduit.end({status: 'ok', count: 42});
			});

			ConduitTestController.setAction(function endString(conduit) {
				conduit.end('plain text response');
			});

			ConduitTestController.setAction(function endArray(conduit) {
				conduit.end([{id: 1, name: 'first'}, {id: 2, name: 'second'}]);
			});
		});

		it('should respond with a JSON object', async function() {

			let url = global.getRouteUrl('ConduitTest#endJsonObject');
			let { response, body } = await harness.fetch(url);

			assert.strictEqual(response.statusCode, 200, 'Should return 200');

			let parsed = typeof body === 'string' ? JSON.parse(body) : body;
			assert.strictEqual(parsed.status, 'ok');
			assert.strictEqual(parsed.count, 42);
		});

		it('should respond with a plain string', async function() {

			let url = global.getRouteUrl('ConduitTest#endString');
			let { response, body } = await harness.fetch(url);

			assert.strictEqual(response.statusCode, 200, 'Should return 200');
			assert.strictEqual(body, 'plain text response');
		});

		it('should respond with a JSON array', async function() {

			let url = global.getRouteUrl('ConduitTest#endArray');
			let { response, body } = await harness.fetch(url);

			assert.strictEqual(response.statusCode, 200, 'Should return 200');

			let parsed = typeof body === 'string' ? JSON.parse(body) : body;
			assert.strictEqual(Array.isArray(parsed), true, 'Should be an array');
			assert.strictEqual(parsed.length, 2);
			assert.strictEqual(parsed[0].id, 1);
			assert.strictEqual(parsed[1].name, 'second');
		});
	});

	describe('#status', function() {

		before(() => {
			Router.add({
				name    : 'ConduitTest#statusTest',
				paths   : '/conduit/status_test',
				methods : 'get',
			});

			ConduitTestController.setAction(function statusTest(conduit) {
				let code = parseInt(conduit.param('code'));
				conduit.status = code;
				conduit.end({requested_status: code});
			});
		});

		it('should allow setting a custom status code', async function() {

			let url = global.getRouteUrl('ConduitTest#statusTest');
			url += '?code=201';

			let { response, body } = await harness.fetch(url);

			assert.strictEqual(response.statusCode, 201, 'Should return the custom 201 status code');

			let parsed = typeof body === 'string' ? JSON.parse(body) : body;
			assert.strictEqual(parsed.requested_status, 201);
		});
	});

	describe('#notFound()', function() {

		before(() => {
			Router.add({
				name    : 'ConduitTest#notFoundTest',
				paths   : '/conduit/not_found_test',
				methods : 'get',
			});

			ConduitTestController.setAction(function notFoundTest(conduit) {
				conduit.notFound();
			});
		});

		it('should return a 404 status code', async function() {

			let url = global.getRouteUrl('ConduitTest#notFoundTest');
			let threw = false;
			let errorNumber;

			try {
				await harness.fetch(url);
			} catch (err) {
				threw = true;
				errorNumber = err.number;
			}

			assert.strictEqual(threw, true, 'Should throw an error for 404');
			assert.strictEqual(errorNumber, 404, 'Should return 404 status code');
		});
	});

	describe('#error(status, message)', function() {

		before(() => {
			Router.add({
				name    : 'ConduitTest#errorTest',
				paths   : '/conduit/error_test',
				methods : 'get',
			});

			ConduitTestController.setAction(function errorTest(conduit) {
				let code = parseInt(conduit.param('code')) || 500;
				conduit.error(code, 'Test error message');
			});
		});

		it('should return a 500 error status code', async function() {

			let url = global.getRouteUrl('ConduitTest#errorTest');
			url += '?code=500';

			let threw = false;
			let errorNumber;

			try {
				await harness.fetch(url);
			} catch (err) {
				threw = true;
				errorNumber = err.number;
			}

			assert.strictEqual(threw, true, 'Should throw an error for 500');
			assert.strictEqual(errorNumber, 500, 'Should return 500 status code');
		});

		it('should return a custom error status code', async function() {

			let url = global.getRouteUrl('ConduitTest#errorTest');
			url += '?code=403';

			let threw = false;
			let errorNumber;

			try {
				await harness.fetch(url);
			} catch (err) {
				threw = true;
				errorNumber = err.number;
			}

			assert.strictEqual(threw, true, 'Should throw an error for 403');
			assert.strictEqual(errorNumber, 403, 'Should return 403 status code');
		});
	});

	describe('#redirect(status, url)', function() {

		before(() => {
			Router.add({
				name    : 'ConduitTest#redirectTest',
				paths   : '/conduit/redirect_test',
				methods : 'get',
			});

			Router.add({
				name    : 'ConduitTest#redirectTarget',
				paths   : '/conduit/redirect_target',
				methods : 'get',
			});

			ConduitTestController.setAction(function redirectTest(conduit) {
				let target = conduit.param('target') || '/conduit/redirect_target';
				conduit.redirect(target);
			});

			ConduitTestController.setAction(function redirectTarget(conduit) {
				conduit.end({redirected: true});
			});
		});

		it('should redirect to the target URL', async function() {

			let url = global.getRouteUrl('ConduitTest#redirectTest');

			// Use Node's http module directly to check redirect without following
			let http = require('http');
			let parsed = new URL(url);

			let result = await new Promise((resolve, reject) => {
				let req = http.get({
					hostname : parsed.hostname,
					port     : parsed.port,
					path     : parsed.pathname + parsed.search,
				}, function(res) {
					resolve(res);
				});

				req.on('error', reject);
			});

			assert.strictEqual(result.statusCode, 302, 'Should return 302 redirect');
			assert.strictEqual(result.headers.location, '/conduit/redirect_target',
				'Should set the Location header to the target URL');
		});
	});

	describe('#serveFile', function() {

		let serve_file_pledge;

		before(() => {
			Router.add({
				name    : 'ConduitTest#serveFileTest',
				paths   : '/conduit/serve_file_test',
				methods : 'get',
			});

			ConduitTestController.setAction(async function serveFileTest(conduit) {
				let use_on_error = conduit.param('use_on_error') === 'true';
				let file_path = conduit.param('file_path');

				// Create an Inode.File instance
				let file = new Classes.Alchemy.Inode.File(file_path);

				let options = {};

				if (use_on_error) {
					options.onError = (err) => {
						// Custom error handling: return a JSON response with error info
						conduit.setHeader('content-type', 'application/json');
						conduit.end(JSON.stringify({
							custom_error: true,
							error_code: err.code,
							error_message: err.message
						}));
					};
				}

				return conduit.serveFile(file, options);
			});
		});

		it('should call onError callback when serving a non-existent File object', async function() {

			let non_existent_path = libpath.resolve(__dirname, 'does_not_exist_' + Date.now() + '.txt');
			let url = global.getRouteUrl('ConduitTest#serveFileTest');
			url += '?use_on_error=true&file_path=' + encodeURIComponent(non_existent_path);

			let { response, body } = await harness.fetch(url);

			// The onError callback should have been called, returning a JSON response
			// instead of the default 404 notFound behavior
			assert.strictEqual(response.statusCode, 200, 'Should return 200 because onError handled it');
			
			// Body may already be parsed as JSON by Blast.fetch
			let parsed = typeof body === 'string' ? JSON.parse(body) : body;
			assert.strictEqual(parsed.custom_error, true, 'Should have custom_error flag');
			assert.strictEqual(parsed.error_code, 'ENOENT', 'Should have ENOENT error code');
		});

		it('should call notFound when onError is not provided for non-existent File', async function() {

			let non_existent_path = libpath.resolve(__dirname, 'does_not_exist_' + Date.now() + '.txt');
			let url = global.getRouteUrl('ConduitTest#serveFileTest');
			url += '?use_on_error=false&file_path=' + encodeURIComponent(non_existent_path);

			// Without onError, notFound should be called, returning 404
			// Blast.fetch throws on 4xx/5xx status codes, so we need to catch the error
			let threw = false;
			let errorNumber;
			
			try {
				await harness.fetch(url);
			} catch (err) {
				threw = true;
				errorNumber = err.number;
			}

			assert.strictEqual(threw, true, 'Should throw an error for 404');
			assert.strictEqual(errorNumber, 404, 'Should return 404 when file not found and no onError');
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

		let html = await getDocumentHTML();

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
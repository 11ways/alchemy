var assert = require('assert');

global.queued_controller = true;

describe('Controller', function() {

	/**
	 * Inheritance testing
	 */
	describe('inheritance', function() {
		it('lets you inherit from the main Controller class', function() {
			global.PersonController = Function.inherits('Alchemy.Controller', function Person(options) {
				Person.super.call(this, options);
			});

			global.StaticController = Function.inherits('Alchemy.Controller', function Static(options) {
				Static.super.call(this, options);
			});
		});
	});

	describe('.setAction(fnc)', function() {
		var test_function = function test(conduit) {
			conduit.end('conduit_end_test');
		};

		it('adds an action to the controller', function() {
			PersonController.setAction(test_function);

			StaticController.setAction(function content(conduit) {
				let response = 'SCT:' + JSON.stringify(conduit.param());
				conduit.end(response);
			});

			StaticController.setAction(function segment(conduit, name) {
				this.renderSegment('segment/' + name);
			});

			StaticController.setAction(function rootview(conduit, name) {
				this.render(name);
			});

			StaticController.setAction(function view(conduit, name) {
				this.render('static/' + name);
			});

			StaticController.setAction(function viewContent(conduit) {
				this.render('static/viewcontent');
			});
		});

		it('adds the actions in a seperate object', function() {
			assert.strictEqual(typeof PersonController.actions.test, 'function');
			assert.strictEqual(PersonController.actions.test, test_function);
		});
	});

	describe('#cookie(name)', function() {
		var url;

		it('should return the value of the cookie', function(done) {

			// Make sure cookies are DISABLED
			alchemy.settings.cookies = false;

			Router.add({
				name    : 'Cookietest',
				handler : 'Person#cookietest',
				paths   : '/cookie_test',
				methods : 'get'
			});

			url = global.getRouteUrl('Cookietest');

			PersonController.setAction(function cookietest(conduit) {

				var response = '';

				response += (this.cookie('my_cookie') || '');

				this.cookie('my_cookie', 'some_value');

				conduit.end(response);
			});

			Function.series(function disabledCookies(next) {
				Blast.fetch(url, function gotResponse(err, res, body) {

					if (err) {
						return next(err);
					}

					assert.strictEqual(res.headers['set-cookie'], undefined);
					assert.strictEqual(body, '');
					next();
				});
			}, function setACookie(next) {

				// Enable cookies
				alchemy.settings.cookies = true;

				Blast.Classes.Develry.Request.cache.reset();

				Blast.fetch(url, function gotResponse(err, res, body) {

					if (err) {
						return next(err);
					}

					if (!res.headers['set-cookie']) {
						throw new Error('Response is missing the `set-cookie` header');
					}

					assert.deepStrictEqual(res.headers['set-cookie'].indexOf('my_cookie=some_value; path=/; domain=localhost') > -1, true);
					assert.strictEqual(body, '');
					next();
				});
			}, function setAgain(next) {
				Blast.fetch({
					url     : url,
					headers : {
						'Cookie': 'my_cookie=SENTVALUE'
					}
				}, function gotResponse(err, res, body) {

					if (err) {
						return next(err);
					}

					assert.deepStrictEqual(res.headers['set-cookie'].indexOf('my_cookie=some_value; path=/; domain=localhost') > -1, true);
					assert.strictEqual(body, 'SENTVALUE');
					next();
				});
			}, done);
		});

		it('should parse Cookie headers case insensitively', function(done) {
			Blast.fetch({
				url     : url,
				headers : {
					'cOoKiE': 'my_cookie=whatever'
				}
			}, function gotResponse(err, res, body) {

				if (err) {
					return next(err);
				}

				assert.deepStrictEqual(res.headers['set-cookie'].indexOf('my_cookie=some_value; path=/; domain=localhost') > -1, true);
				assert.strictEqual(body, 'whatever');
				done();
			});
		});
	});

	describe('#render(template)', function() {
		var url;

		before(function() {
			Router.add({
				name    : 'Rendertest',
				handler : 'Person#rendertest',
				paths   : '/render_test',
				methods : 'get'
			});

			url = Router.getUrl('Rendertest');

			url.host = 'localhost';
			url.protocol = 'http';
			url.port = alchemy.settings.port;

			url = String(url);

			PersonController.setAction(function rendertest(conduit) {
				var view = this.param('view');

				this.render(view);
			});
		});

		it('should render the given template with a status of 200', function(done) {
			Blast.fetch(url + '?view=single', function gotResponse(err, res, body) {

				assert.strictEqual(!!err, false);
				assert.strictEqual(body, 'this is a single ejs');
				assert.strictEqual(res.statusCode, 200);
				done();
			});
		});

		it.skip('should render an error when a non-existing template is requested', function(done) {
			Blast.fetch(url + '?view=does_not_exist_at_all', function gotResponse(err, res, body) {
				// Right now a 404 view is returned with a 200 status code.
				// I guess this should actually all be 500s?
			});
		});

		it('should render views with expansions', function(done) {
			Blast.fetch(url + '?view=test', function gotResponse(err, res, body) {

				assert.strictEqual(!!err, false);
				assert.strictEqual(res.statusCode, 200);

				if (body.indexOf('\nthis is the main block\n') == -1) {
					throw new Error('Main block content not found');
				}

				if (body.indexOf('Main block will go here:') == -1) {
					throw new Error('Expanded view "body" not found');
				}

				if (body.indexOf('Body will go here:') == -1) {
					throw new Error('Expanded view "base" not found');
				}

				done();
			});
		});
	});

	describe('#beforeAction(name)', function() {
		it('should be called before an action is called', async function() {

			let last_called,
			    calls = 0,
			    pledge = new Blast.Classes.Pledge();

			PersonController.setMethod(function beforeAction(name) {
				last_called = name;
				calls++;
				pledge.resolve();
			});

			let result = await setLocation('/render_test?view=body');

			await pledge;

			assert.strictEqual(last_called, 'rendertest');
			assert.strictEqual(calls, 1);

			result = await openHeUrl('/render_test?view=body');

			assert.strictEqual(result.location, '/render_test');

			assert.strictEqual(last_called, 'rendertest');
			assert.strictEqual(calls, 2);

		});
	});
});
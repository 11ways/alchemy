var assert = require('assert');

describe('Controller', function() {

	/**
	 * Inheritance testing
	 */
	describe('inheritance', function() {
		it('lets you inherit from the main Controller class', function() {
			global.PersonController = Function.inherits('Alchemy.Controller', function Person(options) {
				Person.super.call(this, options);
			});
		});
	});

	describe('.setAction(fnc)', function() {
		var test_function = function test(conduit) {
			conduit.end('conduit_end_test');
		};

		it('adds an action to the controller', function() {
			PersonController.setAction(test_function);
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

			url = Router.getUrl('Cookietest');

			url.host = 'localhost';
			url.protocol = 'http';
			url.port = alchemy.settings.port;

			url = String(url);

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

				Blast.fetch(url, function gotResponse(err, res, body) {

					if (err) {
						return next(err);
					}

					assert.deepStrictEqual(res.headers['set-cookie'], [ 'my_cookie=some_value; path=/' ]);
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

					assert.deepStrictEqual(res.headers['set-cookie'], [ 'my_cookie=some_value; path=/' ]);
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

				assert.deepStrictEqual(res.headers['set-cookie'], [ 'my_cookie=some_value; path=/' ]);
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

				console.log('RENDERING.....', view);

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
});

describe('Router', function() {

	var people_url;

	it('is available as a global object', function() {
		assert.strictEqual(typeof Router, 'object');
	});

	describe('#add(options) - GET', function() {
		it('allows you to add a new GET route', function() {
			Router.add({
				name    : 'People',
				handler : 'Person#test',
				paths   : '/test',
				methods : 'get'
			});
		});

		it('routes requests to the correct controller & action', function(done) {

			var url = Router.getUrl('People');

			url.host = 'localhost';
			url.protocol = 'http';
			url.port = alchemy.settings.port;

			people_url = String(url);

			Blast.fetch(people_url, function gotResponse(err, res, body) {

				if (err) {
					return done(err);
				}

				assert.strictEqual(body, 'conduit_end_test');
				done();
			});
		});

		it('does not respond to POSTs', function(done) {

			Blast.fetch({
				url  : people_url,
				post : {date: 1}
			}, function gotResponse(err, res, body) {

				assert.strictEqual(!!err, true);
				assert.strictEqual(err instanceof Error, true);
				assert.strictEqual(res.statusCode, 404);

				done();
			});
		});
	});
});
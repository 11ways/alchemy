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
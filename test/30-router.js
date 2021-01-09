var assert = require('assert');

global.queued_router = true;

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

			let route = Router.add({
				name       : 'DevTest',
				methods    : 'get',
				paths      : '/_dev_test',
				handler    : 'Static#test',
				breadcrumb : 'static.test'
			});

			Router.add({
				name    : 'Static#segment',
				methods : 'get',
				paths   : '/api/static/segment/{name}'
			});

			Router.add({
				name    : 'Static#view',
				methods : 'get',
				paths   : '/static/view/{view}'
			});

			assert.strictEqual(route instanceof Classes.Alchemy.Route, true);

			assert.strictEqual(route.controller, 'Static');
			assert.strictEqual(route.action, 'test');
		});

		it('should extract the handler from the name', function() {

			let route = Router.add({
				name  : 'Static#content',
				paths : '/api/static/content'
			});

			assert.strictEqual(route.controller, 'Static');
			assert.strictEqual(route.action, 'content');
			assert.strictEqual(route.paths[''].path, '/api/static/content');
			assert.strictEqual(route.methods[0], 'get', 'It should have enabled the GET method by default');

			route = Router.add({
				name    : 'Static#more',
				paths   : '/api/static/more',
				methods : []
			});

			assert.strictEqual(route.methods[0], 'get', 'It should have enabled the GET method by default');

			Router.add({
				name    : 'Static#viewContent',
				paths   : '/viewcontent'
			});
		});

		// If this is a test that does not include the controller tests,
		// stop now
		if (!global.queued_controller) {
			return;
		}

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
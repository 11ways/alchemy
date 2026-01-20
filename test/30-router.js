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
				name    : 'Static#rootview',
				methods : 'get',
				paths   : '/root/{view}'
			});

			Router.add({
				name    : 'Static#view',
				methods : 'get',
				paths   : '/static/view/{view}'
			});

			Router.add({
				name    : 'Static#localeView',
				methods : 'get',
				paths   : {
					nl  : '/static/view/{view}',
					en  : '/static/view/{view}'
				},
				breadcrumb: 'static.view.{view}'
			});

			Router.post('Person#readDatasource', '/api/person/readDatasource');

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

			let url = alchemy.routeUrl('Static#content');

			assert.strictEqual(''+url, '/api/static/content');

			url = alchemy.routeUrl('Static#content', {}, {extra_get_parameters: false});
			assert.strictEqual(''+url, '/api/static/content');

			let conduit = new Classes.Alchemy.Conduit();
			url = conduit.routeUrl('Static#content');

			assert.strictEqual(''+url, '/api/static/content');
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
			url.port = alchemy.settings.network.port;

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

				try {
					assert.strictEqual(!!err, true);
					assert.strictEqual(err instanceof Error, true);
					assert.strictEqual(res.statusCode, 405, 'A 405 is expected (Method not allowed)');
				} catch (err) {
					return done(err);
				}

				done();
			});
		});

		it('should support field paths in a type check', function(done) {

			Router.add({
				name    : 'Person#typeCheckView',
				paths   : '/typecheckview/person/{[Person.slug]name}',
				methods : 'get'
			});

			url = alchemy.routeUrl('Person#typeCheckView', {name: 'jelle'}, {absolute: true});
			url = RURL.parse(url);

			url.host = 'localhost';
			url.protocol = 'http';
			url.port = alchemy.settings.network.port;

			url = String(url);

			PersonController.setAction(function typeCheckView(conduit, person) {
				conduit.end('Person: ' + person.firstname + ' ' + person.lastname);
			});

			Blast.fetch(url, function gotResponse(err, res, body) {

				if (err) {
					return done(err);
				}

				try {
					assert.strictEqual(body, 'Person: Jelle De Loecker');
				} catch (err) {
					return done(err);
				}

				done();
			});

		});
	});

	describe('nested section middleware order', function() {

		// Array to track middleware execution order
		// We need it to be accessible globally so the middleware and handler can access it
		global.middleware_execution_order = [];

		before(function() {
			// Create the action on the Static controller
			StaticController.setAction(function middlewareOrderTest(conduit) {
				middleware_execution_order.push('handler');
				conduit.end('order:' + middleware_execution_order.join(','));
			});

			// Create nested sections: parent > child
			// Note: We need to use proper nested mount paths because getPathSection
			// checks against mount directly, not full mount
			let parentSection = Router.section('mw_parent', '/mw-parent');
			let childSection = parentSection.section('mw_child', '/mw-parent/child');

			// Add middleware to parent section
			parentSection.use('/', function parentMiddleware(req, res, next) {
				middleware_execution_order.push('parent');
				next();
			}, {name: 'parentMiddleware'});

			// Add middleware to child section
			childSection.use('/', function childMiddleware(req, res, next) {
				middleware_execution_order.push('child');
				next();
			}, {name: 'childMiddleware'});

			// Add route handler to child section
			childSection.add({
				name    : 'Static#middlewareOrderTest',
				paths   : '/test',
				methods : 'get'
			});
		});

		it('should execute parent middleware before child middleware', function(done) {
			// Reset execution order for this test
			middleware_execution_order.length = 0;

			let url = 'http://localhost:' + alchemy.settings.network.port + '/mw-parent/child/test';

			Blast.fetch(url, function gotResponse(err, res, body) {
				if (err) {
					return done(err);
				}

				try {
					// The expected order should be: parent -> child -> handler
					// But currently the bug causes: child -> parent -> handler
					assert.deepStrictEqual(
						middleware_execution_order,
						['parent', 'child', 'handler'],
						'Middleware should execute in order: parent -> child -> handler, but got: ' + middleware_execution_order.join(' -> ')
					);
					assert.strictEqual(body, 'order:parent,child,handler');
				} catch (err) {
					return done(err);
				}

				done();
			});
		});
	});

});
var assert = require('assert');

global.queued_router = true;

describe('Router', function() {

	var people_url;

	it('is available as a global object', function() {
		assert.strictEqual(typeof Router, 'object');
	});

	describe('#getPrefix(path)', function() {
		it('should not leak `key` as a global variable', function() {

			// Before the fix, `key` was not declared with var/let/const
			// in the for-in loop, making it an implicit global.
			// Call getPrefix and check that no global `key` is created.
			let had_global_key = 'key' in global;
			let old_key = global.key;

			Router.getPrefix('/nonexistent/path');

			if (!had_global_key) {
				assert.strictEqual('key' in global, false,
					'getPrefix() should not create an implicit global `key` variable');
			}

			// Clean up just in case
			if (!had_global_key) {
				delete global.key;
			} else {
				global.key = old_key;
			}
		});

		it('should return undefined for paths without a matching prefix', function() {
			let result = Router.getPrefix('/no-prefix/path');
			assert.strictEqual(result, undefined);
		});
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

	describe('#section(name, mount)', function() {
		it('should create a sub-section with the given name and mount', function() {
			let section = Router.section('test_api', '/test-api');

			assert.strictEqual(section.name, 'test_api');
			assert.strictEqual(section.mount, '/test-api');
			assert.strictEqual(section.parent != null, true, 'The sub-section should have a parent');
		});

		it('should return the same section instance when called again with the same name', function() {
			let section1 = Router.section('test_api', '/test-api');
			let section2 = Router.section('test_api', '/test-api');

			assert.strictEqual(section1, section2);
		});

		it('should return the default Router when name is "default"', function() {
			let section = Router.section('default');
			assert.strictEqual(section, Router);
		});

		it('should auto-generate mount from name if mount is omitted', function() {
			let section = Router.section('auto_mount_test');
			assert.strictEqual(section.mount, '/auto_mount_test');
		});

		it('should allow nested sub-sections', function() {
			let parent = Router.section('nest_parent', '/nest-parent');
			let child = parent.section('nest_child', '/nest-child');

			assert.strictEqual(child.parent, parent);
			assert.strictEqual(child.name, 'nest_child');
			assert.strictEqual(child.mount, '/nest-child');
		});

		it('should generate a section identifier including parent names', function() {
			let parent = Router.section('sid_parent', '/sid-parent');
			let child = parent.section('sid_child', '/sid-child');

			// Direct children of 'default' router do not include 'default:' prefix
			assert.strictEqual(parent.section_identifier, 'sid_parent');
			assert.strictEqual(child.section_identifier, 'sid_parent:sid_child');
		});
	});

	describe('#requirePermission(permission)', function() {
		it('should store the required permission', function() {
			let section = Router.section('perm_test', '/perm-test');
			assert.strictEqual(section.permissions, null);

			section.requirePermission('admin.access');
			assert.strictEqual(Array.isArray(section.permissions), true);
			assert.strictEqual(section.permissions.length, 1);
			assert.strictEqual(section.permissions[0], 'admin.access');
		});

		it('should accumulate permissions across multiple calls', function() {
			let section = Router.section('perm_acc_test', '/perm-acc-test');
			section.requirePermission('api.read');
			section.requirePermission('api.write');

			assert.strictEqual(section.permissions.length, 2);
			assert.strictEqual(section.permissions[0], 'api.read');
			assert.strictEqual(section.permissions[1], 'api.write');
		});

		it('should do nothing when called with a falsy value', function() {
			let section = Router.section('perm_falsy_test', '/perm-falsy-test');
			section.requirePermission(null);
			section.requirePermission('');

			assert.strictEqual(section.permissions, null);
		});

	});

	describe('#post(name, paths)', function() {
		it('should create a route that only responds to POST', function() {
			let route = Router.post('Rtest#postTest', '/api/rtest/post-test');

			assert.strictEqual(route instanceof Classes.Alchemy.Route, true);
			assert.strictEqual(route.methods.length, 1);
			assert.strictEqual(route.methods[0], 'post');
			assert.strictEqual(route.controller, 'Rtest');
			assert.strictEqual(route.action, 'postTest');
		});
	});

	describe('#put(name, paths)', function() {
		it('should create a route that only responds to PUT', function() {
			let route = Router.put('Rtest#putTest', '/api/rtest/put-test');

			assert.strictEqual(route instanceof Classes.Alchemy.Route, true);
			assert.strictEqual(route.methods.length, 1);
			assert.strictEqual(route.methods[0], 'put');
		});
	});

	describe('#get(name, paths)', function() {
		it('should create a route that only responds to GET', function() {
			let route = Router.get('Rtest#getTest', '/api/rtest/get-test');

			assert.strictEqual(route instanceof Classes.Alchemy.Route, true);
			assert.strictEqual(route.methods.length, 1);
			assert.strictEqual(route.methods[0], 'get');
		});
	});

	describe('#add(options) - with various methods', function() {
		it('should support adding a route with multiple methods', function() {
			let route = Router.add({
				name    : 'Rtest#multiMethod',
				paths   : '/api/rtest/multi-method',
				methods : ['get', 'post', 'put']
			});

			assert.strictEqual(route.methods.length, 3);
			assert.strictEqual(route.methods.includes('get'), true);
			assert.strictEqual(route.methods.includes('post'), true);
			assert.strictEqual(route.methods.includes('put'), true);
		});

		it('should store permission on the route when specified', function() {
			let route = Router.add({
				name       : 'Rtest#permRoute',
				paths      : '/api/rtest/perm-route',
				permission : 'admin.manage'
			});

			assert.deepStrictEqual(route.permission, ['admin.manage']);
		});

		it('should support {[Model]param} syntax in path definition', function() {
			let route = Router.add({
				name    : 'Rtest#modelParam',
				paths   : '/api/rtest/person/{[Person]id}',
				methods : 'get'
			});

			assert.strictEqual(route instanceof Classes.Alchemy.Route, true);
			assert.strictEqual(route.keys.length > 0, true, 'Route should have keys');
			assert.strictEqual(route.keys.includes('id'), true, 'Route should have "id" key');
			assert.strictEqual(route.has_path_assignments, true);
		});

		it('should store breadcrumb info', function() {
			let route = Router.add({
				name       : 'Rtest#bcTest',
				paths      : '/bc-test',
				breadcrumb : 'static.bc_test'
			});

			assert.strictEqual(route.breadcrumb, 'static.bc_test');
		});

		it('should set can_be_postponed when specified', function() {
			let route = Router.add({
				name              : 'Rtest#noPostpone',
				paths             : '/no-postpone',
				can_be_postponed  : false
			});

			assert.strictEqual(route.can_be_postponed, false);
		});
	});

	describe('#getFullMount()', function() {
		it('should return "/" for the root router', function() {
			assert.strictEqual(Router.getFullMount(), '/');
		});

		it('should return the full mount path for nested sections', function() {
			let parent = Router.section('mount_parent', '/mount-test');
			let child = parent.section('mount_child', '/v1');

			assert.strictEqual(parent.getFullMount(), '/mount-test');
			assert.strictEqual(child.getFullMount(), '/mount-test/v1');
		});
	});

	describe('#getRouteByName(name)', function() {
		it('should find a route by its name', function() {
			let route = Router.getRouteByName('Static#content');
			assert.strictEqual(route instanceof Classes.Alchemy.Route, true);
			assert.strictEqual(route.controller, 'Static');
			assert.strictEqual(route.action, 'content');
		});

		it('should return false for non-existent routes', function() {
			let route = Router.getRouteByName('NonExistent#route');
			assert.strictEqual(route, false);
		});
	});

	describe('#setOption(name, value)', function() {
		it('should store custom options on the router', function() {
			let section = Router.section('opt_test', '/opt-test');
			section.setOption('custom_key', 'custom_value');

			assert.strictEqual(section.options.custom_key, 'custom_value');
		});
	});

	describe('#getRoutes()', function() {
		it('should return an object with route information', function() {
			let routes = Router.getRoutes();

			assert.strictEqual(typeof routes, 'object');
			assert.strictEqual('default' in routes, true, 'Should have a default section');
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
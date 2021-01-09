const assert = require('assert');

// These tests require the controller & router tests
if (!global.queued_controller) {
	require('./25-controller.js');
}

if (!global.queued_router) {
	require('./30-router.js');
}

describe('Helper.Alchemy', function() {

	describe('#getResource()', function() {

		it('should throw an error when called without a conduit', function(next) {
			alchemy.hawkejs.render('static/viewcontent', {}, function rendered(err, res) {

				try {
					assert.strictEqual(!!err, true);
				} catch (err) {
					return next(err);
				}

				if (err.message.indexOf('Unable to find template') > -1) {
					return next(err);
				}

				next();
			});
		});

		it('should render correctly on the server', function(next) {

			let url = global.getRouteUrl('Static#viewContent');

			if (!String(url).endsWith('viewcontent')) {
				return next(new Error('The Static#viewContent url was not found'));
			}

			Blast.fetch(url, function gotResponse(err, res, body) {

				if (err) {
					return next(err);
				}

				let has_name = body.indexOf('SCT:{"name":"Roel"}') > -1;

				assert.strictEqual(has_name, true, 'The expected resource')

				next();
			});
		});

		it('should render correctly in the browser', async function() {

			let url = global.getRouteUrl('Rendertest', {view: 'test', name: 'Roel'});

			await setLocation(url);

			let body = await global.getBodyHtml();

			let has_name = body.indexOf('SCT:{"name":"Roel"}') > -1;

			assert.strictEqual(has_name, false, 'The wrong view has been rendered');

			let route_info = await global.evalPage(function() {
				return hawkejs.scene.helpers.Router.routeUrl('Static#viewContent') + '';
			});

			assert.strictEqual(route_info, '/viewcontent', 'The route could not be found on the client side');

			let navresult = await global.evalPage(async function() {
				// @TODO: this doesn't seem to work?
				await alchemy.openUrl('Static#viewContent');

				return document.location.pathname;
			});

			assert.strictEqual(navresult, '/viewcontent', 'The browser did not navigate to the correct page');

			body = await global.getBodyHtml();

			// Leave the trailing curly brace off, because it might add a `hajax` parameter too
			has_name = body.indexOf('SCT:{"name":"Roel"') > -1;

			assert.strictEqual(has_name, true, 'The client-side render did not produce the expected result');
		});
	});

	describe('#segment(route)', function() {
		it('should render a route', async function() {

			let url = global.getRouteUrl('Static#view', {view: 'segment_test'});

			alchemy.settings.debug = true;

			await setLocation(url);

			let ids = await global.evalPage(function() {

				let elements = document.querySelectorAll('[data-hid]'),
				    element,
				    ids = [],
				    i;

				for (i = 0; i < elements.length; i++) {
					element = elements[i];

					ids.push(element.dataset.hid);
				}

				ids.sort();

				return ids;
			});

			alchemy.settings.debug = false;

			let expected_ids = [
				'hserverside-0',
				'hserverside-1',
				'hserverside-2',
				'hserverside-3',
				'hserverside-4',
				'hserverside-5',
				'hserverside-6',
				'hserverside-7',
				'hserverside-8',
				'hserverside-9'
			];

			assert.deepStrictEqual(ids, expected_ids);
		});
	});

});

describe('Helper.Router', function() {

	describe('#applyDirective', function() {
		it('is used as a directive in Hawkejs templates', function(done) {

			var template = `<a !Router="APIResource" #route_action="test"></a>`;

			var compiled = alchemy.hawkejs.compile({
				template_name: 'test_router',
				template: template,
				throw_error: true
			});

			alchemy.hawkejs.render(compiled, {}, function rendered(err, res) {

				if (err) {
					return next(err);
				}

				assert.strictEqual(res, `<a href="/api/test"></a>`);
				done();
			});

		});
	});
});
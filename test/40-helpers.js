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

			silenceConsole();

			alchemy.hawkejs.render('static/viewcontent', {}, function rendered(err, res) {

				restoreConsole();

				if (err) {
					return next(err);
				}

				let has_error = res.indexOf('Could not find conduit, alchemy resource will not be fetched') > -1;

				if (!has_error) {
					return next(new Error('Hawkejs should have printed an error in the html'));
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

				let resource_rendered = body.indexOf('SCT:{') > -1;

				let has_name = body.indexOf('SCT:{"name":"Roel"}') > -1;

				let error_start = 'The Alchemy#getResource("Static#content") call ';

				if (!resource_rendered) {
					return next(new Error(error_start + 'content was not added at all'))
				}

				if (!has_name) {
					return next(new Error(error_start + 'did respond, but did not print the parameter data'))
				}

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

		it('should be used when getting documents on the server side during a render', async function() {

			let url = global.getRouteUrl('Static#rootview', {view: 'my_document_list_test'});

			await setLocation(url);

			let element = await queryElementData('my-document-list');
			let text = element.text;

			assert.strictEqual(text.indexOf('ID: true') > -1, true);
			assert.strictEqual(text.indexOf('Constructor: Person') > -1, true);
			assert.strictEqual(text.indexOf('Name: Griet') > -1, true);
			assert.strictEqual(text.indexOf('Name: Jelle') > -1, true);
		});
	});

	describe('#segment(route)', function() {
		it('should render a route', async function() {

			let url = global.getRouteUrl('Static#rootview', {view: 'segment_test'});

			alchemy.settings.debugging.debug = true;

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

			alchemy.settings.debugging.debug = false;

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

	describe('#routeUrl()', () => {
		it('should return the wanted route url', async () => {

			let result = await setLocation('/static/view/routertest');

			let html = await getBodyHtml();

			let nl_span = await queryElementData('span#nlurl');
			let en_span = await queryElementData('span#enurl');
			let current_url = await queryElementData('#currenturl');

			assert.strictEqual(nl_span.text, '/nl/static/view/routertest');
			assert.strictEqual(en_span.text, '/en/static/view/routertest');
			assert.strictEqual(current_url.text, 'http://127.0.0.1:3470/static/view/routertest');
		});
	});
});
var assert = require('assert');

describe('Router Helper', function() {

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
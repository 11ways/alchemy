module.exports = function alchemyHelpers(Hawkejs, Blast) {

	var Alchemy = Hawkejs.Helper.extend(function AlchemyHelper(view) {
		Hawkejs.Helper.call(this, view);
	});

	/**
	 * Perform a resource request 
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	Alchemy.setMethod(function getResource(name, data, callback) {

		if (Blast.isNode) {
			Resource.get(name, data, callback);
		} else {
			hawkejs.scene.fetch('/resource/api/' + name, {get: data}, callback);
		}
	});

	if (!Blast.isBrowser) {
		return;
	}

	// Send a message to the server when we unload the page
	window.addEventListener('unload', function(event) {
		if (console) {
			console.log('Unloading the page ...');
		}
	});

	return
	// References
	var helpers = hawkejs.helpers,
	    drones  = hawkejs.drones,
	    asset   = helpers.asset = {},
	    formatError;

	/**
	 * Expose specific variables to the client's browser
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	drones.doExposure = function doExposure(next, $result) {

		var name, expose = this.scope.variables.__expose;

		for (name in expose) {
			hawkejs._extendClientVar(name, expose[name], $result, null);
		}

		next();
	};

	/**
	 * Perform a resource request 
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	hawkejs.getResource = function getResource(name, data, callback) {

		
	};

	/**
	 * The asset style helper
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	asset.style = function style(path, options) {

		// Make sure the path is an array
		if (!Array.isArray(path)) {
			path = [path];
		}

		// Normalize all the entries
		for (i = 0; i < path.length; i++) {

			// Prepend the path prefix if it's relative
			if (path[i][0] !== '/') {
				path[i] = '/public/stylesheets/' + path[i];
			}

			if (path[i].indexOf('.css') < 0) {
				path[i] = path[i] + '.css';
			}
		}

		// Execute the hawkejs helper
		return this.style(path, options);
	};

	/**
	 * The asset script helper
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	asset.script = function script(path, options) {

		var i;

		// Make sure the path is an array
		if (!Array.isArray(path)) {
			path = [path];
		}

		// Normalize all the entries
		for (i = 0; i < path.length; i++) {

			// Prepend the path prefix if it's relative
			if (path[i][0] !== '/') {
				path[i] = '/public/scripts/' + path[i];
			}

			if (path[i].indexOf('.js') < 0) {
				path[i] = path[i] + '.js';
			}
		}

		// Execute the hawkejs helper
		return this.script(path, options);
	};

	/**
	 * Output errors
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.0.1
	 * @version       0.1.0
	 */
	helpers.errors = function errors() {

		var html = '<div class="alchemy-error wrapper" data-error data-age="' + Date.now() + '">';

		html += formatError(this.__error__);
		html += '</div>';

		this.echo(html);
	};

	/**
	 * Format errors for display
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.1.0
	 * @version       0.1.0
	 *
	 * @param   {Object}   errors
	 * @param   {Boolean}  dump     Just dump the errors as a JSON indented string
	 */
	formatError = function formatError(errors, dump) {

		var html = '',
		    item,
		    err,
		    key;

		if (dump) {
			if (errors) {
				return '<pre>' + JSON.stringify(this.__error__, undefined, 2) + '</pre>';
			}
		}

		if (errors) {

			for (key in errors) {
				item = errors[key];

				if (item.err) {
					err = item.err;

					html += '<div class="alchemy-error message">';
					html += err.message;
					html += '</div>';

					html += '<div class="alchemy-error stack" style="display:none">';
					html += '<span class="title">Stack trace:</span>';
					html += '<div class="content"><pre>'
					html += err.stack
					html += '</pre></div>';
					html += '</div>';
				}

			}
		}

		return html;
	};

	/**
	 * Log errors, this happens on the client side
	 *
	 * @author        Jelle De Loecker   <jelle@develry.be>
	 * @since         0.0.1
	 * @version       0.0.1
	 */
	hawkejs.event.on('ajaxdata', function dataInterceptor(id, variables) {

		var $elements,
		    $selected,
		    error = variables.__error__,
		    $el,
		    age,
		    i;

		// Clear all the existing errors
		$('div[data-error]:not(:empty)').html('');

		if (error) {

			// Get all the visible error elements
			$elements = $('div[data-error]:visible');

			age = 0;

			// Get the latest error element
			for (i = 0; i < $elements.length; i++) {
				$el = $($elements[i]);

				if ($el.attr('data-age') > age) {
					age = $el.attr('data-age');
					$selected = $el;
				}
			}

			if ($selected) {
				$selected.html(formatError(error));
			} else {
				if (console) {
					console.log(error);
				}
			}

			// Stop the render from happening
			this.stop();

			// Say the render has ended
			hawkejs.event.emit('renderend');
		}
	});

};
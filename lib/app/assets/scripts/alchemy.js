/**
 * The global client-side alchemy object
 *
 * @type   {Object}
 */
window.alchemy = {};

(function() {

var sent_subscriptions = [];

// Create the sceneid
hawkejs.scene.data();

// The last update is when this scene was made
alchemy.last_update = Date.now();

alchemy.server = new __Protoblast.Classes.ClientSocket();

/**
 * Automatically add json-dry decoding to jQuery libraries
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   0.2.0
 *
 * @param     {String}   name
 * @param     {String}   path
 */
hawkejs.scene.on('script', function newScriptLoaded(name, path) {

	// Make sure it's jQuery
	if (!window.jQuery || (name.toLowerCase() != 'jquery' && !path.match(/jquery-\d/i))) {
		return;
	}

	// Add the json-dry ajax setup
	jQuery.ajaxSetup({
		accepts: {
			jsondry: 'text/json-dry, application/json-dry'
		},
		contents: {
			// Make sure the regular json interpreter ignores it
			json: /(json)(?!.*dry.*)/,
			jsondry: /json-dry/
		},
		converters: {
			"text jsondry": function jsonDryParser(val) {
				return JSON.undry(val);
			}
		}
	});
});

/**
 * Mark links as active using breadcrumbs
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.3.0
 * @version   0.3.1
 *
 * @param     {Object}   variables
 * @param     {Object}   render_data
 */
hawkejs.scene.on('rendered', function markLinks(variables, render_data) {

	var page_breadcrumb,
	    el_breadcrumb,
	    placeholder,
	    elements,
	    element,
	    temp,
	    i;

	// Get the newly set breadcrumb
	page_breadcrumb = variables.__breadcrumb;

	// Get all the elements with a breadcrumb set
	elements = document.querySelectorAll('[data-breadcrumb]');

	for (i = 0; i < elements.length; i++) {
		element = elements[i];

		// Get the elemen's set breadcrumb
		el_breadcrumb = element.getAttribute('data-breadcrumb');

		if (el_breadcrumb == page_breadcrumb) {
			markLinkElement(element, 1);
		} else if (page_breadcrumb && page_breadcrumb.indexOf(el_breadcrumb) === 0) {
			markLinkElement(element, 2);
		} else {
			markLinkElement(element, false);
		}
	}

	// Update breadcrumbs in case of ajax
	if (render_data.request && render_data.request.ajax && variables.__breadcrumb_entries) {

		// Get all the breadcrumb elements
		elements = document.querySelectorAll('[data-template="breadcrumb/wrapper"]');

		if (elements.length) {

			// Use the original view renderer to render an extra element
			placeholder = render_data.print_element('breadcrumb/wrapper', null, {wrap: false});

			// We're kind of hacking hawkejs by doing a print_element after it's done,
			// this way we prevent a warning log
			placeholder.done = true;

			placeholder.getContent(function gotContent(err, html) {

				if (err) {
					return console.error('Error updating breadcrumb:', err);
				}

				for (i = 0; i < elements.length; i++) {
					element = elements[i];
					element.innerHTML = html;
				}
			});
		}
	}
});

/**
 * Mark element as active or not
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.3.0
 * @version   0.3.0
 *
 * @param     {Element}   element
 * @param     {Number}    active_nr
 */
function markLinkElement(element, active_nr) {

	var mark_wrapper;

	// Always remove the current classes
	element.classList.remove('active-link');
	element.classList.remove('active-sublink');

	if (element.parentElement && element.parentElement.classList.contains('js-he-link-wrapper')) {
		markLinkElement(element.parentElement, active_nr);
	}

	if (!active_nr) {
		return;
	}

	if (active_nr == 1) {
		element.classList.add('active-link');
	} else if (active_nr == 2) {
		element.classList.add('active-sublink');
	}
}

/**
 * Create a socket.io connection to the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.0.1
 * @version   0.2.0
 *
 * @param     {Function}   callback
 */
alchemy.connect = function connect(callback) {

	if (typeof window.io === 'undefined') {
		hawkejs.require(['socket.io.js', 'socket.io-stream'], function() {
			alchemy.server.connect(callback);
		});
	} else {
		alchemy.server.connect(callback);
	}
};

/**
 * Submit a message to the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.0.1
 * @version   0.0.1
 *
 * @param    {String}   type
 * @param    {Object}   data
 * @param    {Function} callback
 */
alchemy.submit = function submit(type, data, callback) {
	alchemy.server.submit(type, data, callback);
};

/**
 * Create a namespace and inform the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   0.2.0
 *
 * @param    {String}   type    The typename of link to create
 * @param    {Object}   data    The initial data to submit
 *
 * @return   {Linkup}
 */
alchemy.linkup = function linkup(type, data) {
	return alchemy.server.linkup(type, data);
};

/**
 * Listen for server messages
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.0.1
 * @version   0.0.1
 *
 * @param    {String}   type
 * @param    {Function} callback
 */
alchemy.listen = alchemy.on = function listen(type, callback) {
	return alchemy.server.on(type, callback);
};

/**
 * Send binding data to the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   0.3.0
 */
alchemy.sendBindingRequests = function sendBindingRequests() {

	var subscriptions = [],
	    elements,
	    data_id,
	    element,
	    i;

	// Look for all the non-bound elements that require an update event
	elements = document.querySelectorAll('[data-update-event]');

	// Iterate over them in order to register them
	for (i = 0; i < elements.length; i++) {
		element = elements[i];
		data_id = element.getAttribute('data-update-event');

		if (~sent_subscriptions.indexOf(data_id)) {
			continue;
		}

		sent_subscriptions.push(data_id);
		subscriptions.push(data_id);
	}

	for (data_id in hawkejs.scene.live_bindings) {

		if (~sent_subscriptions.indexOf(data_id)) {
			continue;
		}

		sent_subscriptions.push(data_id);
		subscriptions.push(data_id);
	}

	// Send data id subscriptions
	if (subscriptions.length) {
		alchemy.submit('subscribe-data', subscriptions);
	}
};

// Make the connection only if websockets are enabled
if (hawkejs.scene.exposed.enable_websockets) {

	// Connect to the server
	alchemy.connect(function onConnect() {
		alchemy.sendBindingRequests();
	});

	// Send binding requests again after each render
	hawkejs.scene.on('rendered', function onRendered(){
		alchemy.sendBindingRequests();
	});

	// Bind to elements with the data-server-event attribute
	hawkejs.constructor.onAttribute('data-server-event', function serverEvent(element, value, old_value, created) {

		var event_type;

		if (value == old_value || !value) {
			return;
		}

		event_type = element.getAttribute('data-listen-type');

		if (!event_type) {
			if (element.nodeName == 'A' || element.nodeName == 'BUTTON') {
				event_type = 'click';
			} else {
				event_type = 'change';
			}
		}

		// And the change event
		element.addEventListener(event_type, function sendToServer(e) {
			var get_form,
			    elements,
			    element,
			    e_val,
			    value,
			    data,
			    i;

			console.log('Sending to server...', e);

			if (this.hasAttribute('data-server-event-form')) {
				get_form = this.getAttribute('data-server-event-form');

				if (get_form) {
					get_form = document.querySelector(get_form);
				} else {
					get_form = this.closest('form');
				}

				if (get_form) {
					data = {};

					elements = get_form.querySelectorAll('[data-name]');

					for (i = 0; i < elements.length; i++) {
						element = elements[i];
						e_val = element.value;

						switch (element.getAttribute('type')) {
							case 'number':
								e_val = Number(e_val);
								break;
						}

						data[element.getAttribute('data-name')] = e_val;
					}
				}
			}

			// Get the event string
			value = this.getAttribute('data-server-event').split('|').map(function eachEntry(str) {
				var result = str.trim();

				return result;
			});

			if (this.getAttribute('data-send-value')) {

				if (!data) {
					data = {};
				}

				data.value = this.value;
			}

			if (data) {
				value.push(data);
			}

			alchemy.submit('data-server-event', value);
			e.preventDefault();
		});
	});

	// Listen to data updates
	alchemy.on('data-update', function gotDataUpdate(packet) {

		var data = packet.data,
		    id = packet.id;

		alchemy.last_update = Date.now();
		hawkejs.scene.updateData(id, data);
	});
}

/**
 * Fetch date from the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.4.0
 * @version   0.4.0
 */
alchemy.fetch = function fetch(href, options, callback) {

	var temp;

	if (typeof href == 'object' && !(href instanceof Blast.Classes.URL)) {
		callback = options;
		options = href;
		href = options.href;
	}

	// The href could be a resource name, try getting the url
	temp = hawkejs.scene.helpers.Router.routeUrl(href, options.parameters);

	if (temp) {
		href = temp;
	}

	return hawkejs.scene.fetch(href, options, callback);
};

__Protoblast.emit('alchemy-loaded');
}());
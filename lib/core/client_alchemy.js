/**
 * The Client Alchemy class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.5
 */
var Alchemy = Function.inherits('Alchemy.Client.Base', function Alchemy() {

	// Last update is when this scene was made?
	this.last_update = Date.now();

	this.hinders = {};

	// The current route
	this.current_route = null;
	this.current_url = null;
	this.current_url_params = null;
	this.settings = {};

	// Sent subscriptions
	this.sent_subscriptions = [];
});

/**
 * Called in the onScene static method of the Alchemy helper
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.5
 * @version   1.0.5
 */
Alchemy.setMethod(function initScene(scene) {

	var that = this;

	console.log('Inited scene in', Date.now() - this.last_update);

	// Store the scene
	this.scene = scene;

	// Create the scene id
	scene.data();

	// Add an error handler
	scene.errorHandler = this.handleError.bind(this);

	// Create server connection
	this.server = new Blast.Classes.ClientSocket();

	// Forward server messages
	this.server.forwardEvent(this);

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
	scene.on('script', function newScriptLoaded(name, path) {

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

	scene.on('rendered', function rendered(variables, render_data) {
		that.markLinks(variables, render_data);
	});

	Blast.emit('alchemy-loaded');

	Blast.setImmediate(function() {
		if (scene.exposed.enable_websockets) {
			that.enableWebsockets();
		}

		scene.status.after('online', function onOnline() {
			that.syncDataWithServer();
		});
	});
});

/**
 * Create an alias to the __ command
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.4.0
 * @version   1.0.5
 */
Alchemy.setMethod(function __(domain, key, parameters) {
	return hawkejs.scene.generalView.__(domain, key, parameters);
});

/**
 * Create an alias to the __d command
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.4.0
 * @version   1.0.5
 */
Alchemy.setMethod(function __d(domain, key, parameters) {
	return hawkejs.scene.generalView.__d(domain, key, parameters);
});

/**
 * Cast to an object id
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.5
 *
 * @param    {String|ObjectID}   str
 *
 * @return   {String}
 */
Alchemy.setMethod(function castObjectId(str) {
	if (str && str.isObjectId()) {
		return str;
	}
});

/**
 * Is the given parameter an object id (string or instance)
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.4
 * @version  1.0.5
 *
 * @param    {String|ObjectID}   obj
 *
 * @return   {Boolean}
 */
Alchemy.setMethod(function isObjectId(obj) {

	if (!obj) {
		return false;
	}

	let type = typeof obj;

	if (obj && type === 'object' && obj.constructor && obj.constructor.name === 'ObjectID') {
		return true;
	} else if (type === 'string' && obj.isObjectId()) {
		return true;
	}

	return false;
});

/**
 * Get validator class constructor
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.5
 * @version   1.0.5
 *
 * @param     {String}   name
 *
 * @return    {Function|null}
 */
Alchemy.setMethod(function getValidatorClass(name) {

	if (!name) {
		throw new Error('Unable to get Validator class with empty name');
	}

	name = name.classify();

	if (Blast.Classes.Alchemy.Validator && Blast.Classes.Alchemy.Validator[name]) {
		return Blast.Classes.Alchemy.Validator[name];
	}

	if (Blast.Classes.Alchemy.Client.Validator[name]) {
		return Blast.Classes.Alchemy.Client.Validator[name];
	}
});

// From here on, only client-side code is added
if (Blast.isBrowser) {
	window.alchemy = new Alchemy();
} else {
	return;
}

/**
 * Create a socket.io connection to the server
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.5
 *
 * @param    {Function}   callback
 */
Alchemy.setMethod(function connect(callback) {

	if (typeof window.io === 'undefined') {
		hawkejs.require(['socket.io.js', 'socket.io-stream'], function() {
			alchemy.server.connect(callback);
		});
	} else {
		alchemy.server.connect(callback);
	}
});

/**
 * Submit a message to the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.0.1
 * @version   1.0.5
 *
 * @param    {String}   type
 * @param    {Object}   data
 * @param    {Function} callback
 */
Alchemy.setMethod(function submit(type, data, callback) {
	this.server.submit(type, data, callback);
});

/**
 * Create a namespace and inform the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   1.0.5
 *
 * @param    {String}   type    The typename of link to create
 * @param    {Object}   data    The initial data to submit
 *
 * @return   {Linkup}
 */
Alchemy.setMethod(function linkup(type, data, cb) {
	return this.server.linkup(type, data, cb);
});

/**
 * Mark links as active using breadcrumbs
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.3.0
 * @version   1.0.5
 *
 * @param     {Object}   variables
 * @param     {Object}   render_data
 */
Alchemy.setMethod(function markLinks(variables, render_data) {

	var page_breadcrumb,
	    el_breadcrumbs,
	    el_breadcrumb,
	    placeholder,
	    elements,
	    element,
	    temp,
	    i;

	if (variables.__route) {
		alchemy.current_route = variables.__route;
		alchemy.current_url = variables.__url;
		alchemy.current_url_params = variables.__urlparams;
	}

	// Get the newly set breadcrumb
	page_breadcrumb = variables.__breadcrumb;

	// Get all the elements with a breadcrumb set
	elements = document.querySelectorAll('[data-breadcrumb],[data-breadcrumbs]');

	for (i = 0; i < elements.length; i++) {
		element = elements[i];

		// Create the breadcrumbs array
		el_breadcrumbs = [];

		// Get the element's set breadcrumb
		el_breadcrumb = element.getAttribute('data-breadcrumb');

		if (el_breadcrumb) {
			el_breadcrumbs.push(el_breadcrumb);
		}

		el_breadcrumb = element.getAttribute('data-breadcrumbs');

		if (el_breadcrumb) {
			el_breadcrumbs.include(el_breadcrumb.split('|'));
		}

		if (el_breadcrumbs.indexOf(page_breadcrumb) > -1) {
			markLinkElement(element, 1);
		} else if (page_breadcrumb && page_breadcrumb.startsWithAny(el_breadcrumbs)) {
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
 * Reload all stylesheets
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.0
 * @version   1.0.5
 */
Alchemy.setMethod(function reloadStylesheets() {

	var sheet,
	    url,
	    i;

	for (i = 0; i < document.styleSheets.length; i++) {
		sheet = document.styleSheets[i];

		if (!sheet.href) {
			continue;
		}

		url = new RURL(sheet.href);
		url.param('last_reload', Date.now());

		sheet.ownerNode.href = String(url);
	}
});

/**
 * Change the language
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.4.1
 * @version   1.0.5
 */
Alchemy.setMethod(function switchLanguage(prefix) {

	var config,
	    url,
	    key;

	if (prefix && typeof prefix != 'string') {
		prefix = prefix.value;
	}

	config = hawkejs.scene.helpers.Router.routeConfig(alchemy.current_route);

	if (!alchemy.current_route || !config) {
		// Unknown current route, defaulting to /prefix
		alchemy.openUrl('/' + prefix);
		return;
	}

	// Get the url string
	url = hawkejs.scene.helpers.Router.routeUrl(alchemy.current_route, alchemy.current_url_params, {locale: prefix});

	// Turn it into a url object
	url = URL.parse(url);

	if (url && url.pathname == '/') {
		url.pathname = '/' + prefix + url.pathname;
	}

	// Add the get queries
	if (alchemy.current_url && alchemy.current_url.search) {
		for (key in alchemy.current_url.query) {

			if (key == 'hajax' || key == 'h_diversion' || key == 'htop') {
				continue;
			}

			url.addQuery(key, alchemy.current_url.query[key]);
		}
	}

	url = String(url);

	window.location = url;
});

/**
 * Goto the given url
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.4.1
 * @version   1.0.6
 */
Alchemy.setMethod(function openUrl(href, options, callback) {

	var that = this,
	    is_rurl,
	    temp;

	if (typeof href == 'object') {
		if (href instanceof Blast.Classes.RURL) {
			is_rurl = true;
		} else {
			callback = options;
			options = href;
			href = options.href;
		}
	}

	if (!href) {
		throw new Error('Invalid url given, unable to open url');
	}

	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	if (!options) {
		options = {};
	}

	if (!is_rurl) {
		// The href could be a resource name, try getting the url
		temp = hawkejs.scene.helpers.Router.routeUrl(href, options.parameters);

		if (temp) {
			href = temp;
		}
	}

	hawkejs.scene.openUrl(href, options, function done(err, payload) {

		if (err) {
			return callback(err);
		}

		callback(null, payload);
	});
});

/**
 * Fetch data from the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.4.0
 * @version   1.0.5
 *
 * @param     {String}   href
 * @param     {Object}   options
 * @param     {Function} callback
 */
Alchemy.decorateMethod(Blast.Decorators.memoize({max_age: 10000, ignore_callbacks: true}), function fetch(href, options, callback) {

	var hinder,
	    temp;

	if (typeof href == 'object' && !(href instanceof Blast.Classes.RURL)) {
		callback = options;
		options = href;
		href = options.href;
	}

	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	if (!options) {
		options = {};
	}

	if (!callback) {
		callback = Function.thrower;
	}

	// The href could be a resource name, try getting the url
	temp = hawkejs.scene.helpers.Router.routeUrl(href, options.parameters);

	if (temp) {
		href = temp;
	}

	hawkejs.scene.fetch(href, options, callback);
});

/**
 * Send binding data to the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     0.2.0
 * @version   1.0.5
 */
Alchemy.setMethod(function sendBindingRequests() {

	var sent_subscriptions = this.sent_subscriptions,
	    subscriptions = [],
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
});

/**
 * Enable websockets
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.5
 * @version   1.0.5
 */
Alchemy.setMethod(function enableWebsockets() {

	var that = this;

	// Connect to the server
	this.connect(function onConnect() {
		that.sendBindingRequests();
	});

	// Send binding requests again after each render
	hawkejs.scene.on('rendered', function onRendered(){
		that.sendBindingRequests();
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
	this.on('data-update', function gotDataUpdate(packet) {

		var data = packet.data,
		    id = packet.id;

		that.last_update = Date.now();
		hawkejs.scene.updateData(id, data);
	});

	// Listen for css reload requests (devwatch mode)
	this.on('css_reload', function onReload() {
		that.reloadStylesheets();
	});
});

/**
 * Handle an error
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.5
 * @version   1.0.5
 *
 * @param     {Error}   err
 * @param     {Object}  config
 */
Alchemy.setMethod(function handleError(err, config) {

	var message;

	if (!config) {
		config = {};
	}

	if (config.type == 'openUrl') {
		message = 'Error opening URL "' + config.url + '":\n';
	} else {
		message = 'Unknown error:\n';
	}

	if (err) {
		if (err.message) {
			message += err.message + '\n\n';
		}

		if (err.stack) {
			message += 'Developer information:\n';
			message += err.stack;
		}
	}

	console.log('Handling error', err, config);

	alert(message);
});

/**
 * Sync data with the server
 *
 * @author    Jelle De Loecker   <jelle@develry.be>
 * @since     1.0.6
 * @version   1.0.6
 *
 * @return    {Pledge}
 */
Alchemy.setMethod(function syncDataWithServer() {

	var that = this,
	    models = Blast.Classes.Alchemy.Client.Model.Model.getAllChildren(),
	    tasks = [];

	models.forEach(function eachModel(model) {

		if (!model.hasServerAction('saveRecord')) {
			return;
		}

		tasks.push(async function doSave(next) {

			var instance = new model(),
			    records = await instance.getRecordsToBeSavedRemotely(),
			    i;

			for (i = 0; i < records.length; i++) {
				await records[i].save();
			}

			next(null, records);
		});
	});

	return Function.parallel(tasks);
});


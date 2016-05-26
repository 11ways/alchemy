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
 * @version   0.2.0
 */
alchemy.sendBindingRequests = function sendBindingRequests() {

	var subscriptions = [],
	    data_id;

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

__Protoblast.emit('alchemy-loaded');
}());
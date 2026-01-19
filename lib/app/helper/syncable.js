const SESSION_KEY = 'Syncables',
      UPDATE_ID = Symbol('update_id'),
      CLIENT_MAP = new Classes.WeakValueMap(),
      QUEUE_CALLBACKS = Symbol('queue_callbacks'),
      QUEUE_CALLBACK_ID = Symbol('queue_callback_id');

/**
 * The Syncable class
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {string}   type
 */
const Syncable = Function.inherits('Alchemy.Base', 'Alchemy.Syncable', function Syncable(type) {

	if (!type) {
		throw new Error('Each Syncable must have a type');
	}

	this.root = this;
	this.type = type;
	this.log = [];
	this.counter = 0;

	this.queues = new Map();

	if (Blast.isNode) {
		// Only used on the server
		this.s2c_links = new Map();
	} else {
		// Only used on the client
		this.c2s_link = null;
	}
});

if (Blast.isNode) {

	/**
	 * Handle an incoming linkup
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.3.10
	 * @version  1.4.0
	 *
	 * @param    {Conduit}
	 * @param    {Linkup}
	 * @param    {Object}
	 */
	Syncable.setStatic(async function handleLink(conduit, linkup, config) {

		let syncables = conduit.session(SESSION_KEY),
		    syncable;

		if (syncables) {
			let type_map = syncables.get(config.type);

			if (type_map) {
				syncable = type_map.get(config.id);
			}
		}

		// If syncable not found, try to recreate it
		if (!syncable) {
			syncable = await this.tryRecreate(conduit, config);
		}

		if (!syncable) {
			linkup.submit('error', {
				code: 'SYNCABLE_NOT_FOUND',
				message: 'No syncable found for type: ' + config.type + ', id: ' + config.id,
			});
			linkup.destroy();
			return;
		}

		syncable.attachClient(conduit, linkup, config);
	}, false);

	/**
	 * Try to recreate a syncable that wasn't found in the session.
	 * This is called when a client reconnects after a server restart.
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.4.0
	 * @version  1.4.0
	 *
	 * @param    {Conduit}   conduit
	 * @param    {Object}    config    Contains type, id, and version from the client
	 *
	 * @return   {Syncable}  The recreated syncable, or null if recreation failed
	 */
	Syncable.setStatic(async function tryRecreate(conduit, config) {

		// Find the Syncable class for this type.
		// For Specialized syncables, config.type is the class's type_path (includes namespace prefix).
		// For ad-hoc syncables, config.type is a custom string and won't match any class.
		let SyncableClass = this.getDescendant(config.type);

		if (!SyncableClass) {
			return null;
		}

		// Check if this class supports recreation
		if (typeof SyncableClass.recreate !== 'function') {
			return null;
		}

		try {
			let syncable = await SyncableClass.recreate(conduit, config);

			if (syncable) {
				// Make sure it's registered
				syncable.registerClient(conduit);
			}

			return syncable;
		} catch (err) {
			log.error('Failed to recreate syncable:', err);
			return null;
		}
	}, false);

	/**
	 * Recreate a syncable instance after server restart.
	 * Override this in subclasses to enable automatic recreation.
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.4.0
	 * @version  1.4.0
	 *
	 * @param    {Conduit}   conduit
	 * @param    {Object}    config    Contains type, id, and version from the client
	 *
	 * @return   {Syncable}  The recreated syncable, or null if recreation not possible
	 */
	// Base class does not implement recreate - subclasses must opt-in

	/**
	 * Attach a client
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.3.10
	 * @version  1.3.10
	 */
	Syncable.setMethod(function attachClient(scene_id, linkup, config) {

		if (!scene_id) {
			return;
		}

		if (!this.s2c_links) {
			this.s2c_links = new Map();
		}

		if (typeof scene_id == 'object') {
			scene_id = scene_id.scene_id;
		}

		if (!scene_id) {
			return;
		}

		this.s2c_links.set(scene_id, linkup);

		linkup.syncable_version = config.version || 0;

		linkup.on('destroyed', () => {
			this.s2c_links.delete(scene_id);
		});

		linkup.on('upstream-method', async (args, responder) => {

			try {
				// Get the value
				let result = await this.handleUpstreamMethodRequest(args[0], args[1]);

				// Make sure it's ready for the client-side
				result = JSON.clone(result, 'toHawkejs');

				// Send it to the client
				responder(null, result);
			} catch (err) {
				responder(err);
			}
		});

		// Send any updates that happened before the linkup was created
		this.sendUpdateToLink(linkup);

		this.emit('ready');
	});

	/**
	 * Handle an upstream method request
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.3.10
	 * @version  1.3.10
	 *
	 * @param    {string}   name
	 * @param    {Array}    args
	 */
	Syncable.setMethod(function handleUpstreamMethodRequest(name, args) {
		
		let method = this[name];

		if (!method) {
			throw new Error('No method found with name: ' + name);
		}

		if (!method.is_syncable_upstream) {
			throw new Error('Method is not syncable upstream: ' + name);
		}

		return method.apply(this, args);
	});

	/**
	 * Register a client by one of their conduits.
	 * Only clients that are registered can be synced.
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.3.10
	 * @version  1.3.10
	 *
	 * @type     {Conduit}
	 */
	Syncable.setMethod(function registerClient(conduit) {

		if (!conduit) {
			return;
		}

		let syncables = conduit.session(SESSION_KEY);

		if (!syncables) {
			syncables = new Map();
			conduit.session(SESSION_KEY, syncables);
		}

		let type_map = syncables.get(this.type);

		if (!type_map) {
			type_map = new Map();
			syncables.set(this.type, type_map);
		}

		type_map.set(this.id, this);
	});
}

if (Blast.isBrowser) {

	/**
	 * Start the sync link from the browser to the server
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.3.10
	 * @version  1.4.0
	 */
	Syncable.setMethod(function startSyncLink() {

		if (typeof hawkejs == 'undefined' || !hawkejs.scene) {
			Blast.setImmediate(this.startSyncLink.bind(this));
			return;
		}

		// Prevent concurrent connection attempts
		if (this._connecting) {
			return;
		}

		this._connecting = true;

		// Clean up existing broken link if any
		if (this.c2s_link) {
			if (!this.c2s_link.destroyed) {
				this.c2s_link.destroy();
			}
			this.c2s_link = null;
		}

		// Clear any pending reconnect
		if (this._reconnect_timeout) {
			clearTimeout(this._reconnect_timeout);
			this._reconnect_timeout = null;
		}

		alchemy.enableWebsockets();

		let data = {
			version : this.version,
			type    : this.type,
			id      : this.id,
		};

		let link = this.c2s_link = alchemy.linkup('syncablelink', data, () => {
			this._connecting = false;
			this._reconnect_attempts = 0; // Reset on successful connection
			this.emit('ready');
		});

		link.on('process_updates', (data) => {

			for (let update of data.updates) {
				this.processUpdate(update);
			}

			this.version = data.version;
		});

		// Handle socket disconnection
		link.on('close', () => {
			this._connecting = false;
			this.emit('disconnected');
			this._scheduleReconnect();
		});

		// Handle server errors
		link.on('error', (err) => {
			this._connecting = false;

			// Use error codes when available, fall back to string matching for backwards compatibility
			let code = err?.code;
			let message = err?.message || '';

			if (code === 'SYNCABLE_NOT_FOUND' || message.includes('No syncable found')) {
				// Server doesn't recognize us - stop trying to reconnect
				// This happens after server restart. The only recovery is a page reload
				// to get fresh syncables from the server.
				this._released = true;
				CLIENT_MAP.delete(this.id);
				this.emit('needs_resync');
			} else if (code === 'PERMISSION_DENIED' || message === 'Permission denied') {
				// User doesn't have permission - stop trying to reconnect
				this._released = true;
				this.emit('permission_denied', err?.required_permission);
			} else {
				// Unknown error - log it and emit for consumers
				console.warn('[Syncable] Link error:', err);
				this.emit('error', err);
			}
		});
	});

	/**
	 * Schedule a reconnection attempt with exponential backoff and jitter
	 *
	 * @author   Jelle De Loecker <jelle@elevenways.be>
	 * @since    1.4.0
	 * @version  1.4.0
	 */
	Syncable.setMethod(function _scheduleReconnect() {

		// Don't schedule if already pending
		if (this._reconnect_timeout) {
			return;
		}

		// Don't reconnect if explicitly released
		if (this._released) {
			return;
		}

		// Increment attempt counter
		this._reconnect_attempts = (this._reconnect_attempts || 0) + 1;

		// Calculate delay with exponential backoff: 5s, 7.5s, 11.25s, ... max 60s
		let base_delay = 5000;
		let delay = Math.min(base_delay * Math.pow(1.5, this._reconnect_attempts - 1), 60000);

		// Add jitter (0-1000ms) to prevent thundering herd
		delay += Math.random() * 1000;

		this._reconnect_timeout = setTimeout(() => {
			this._reconnect_timeout = null;
			this.startSyncLink();
		}, delay);
	});
}

/**
 * Add a syncable method.
 * The method itself should probably NOT trigger changes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {Object}   data
 *
 * @return   {Syncable}
 */
Syncable.setStatic(function setSyncMethod(types, method) {
	return this.setHandledMethod(types, method, function handler(method, args) {
		
		let result = method.apply(this, args);

		if (this.is_server) {
			this.addLog('call', [method.name, args]);
		}

		return result;
	});
});

/**
 * Add a method that will only be called on the client.
 * No response will be returned, since it is sent to multiple clients.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.22
 * @version  1.3.22
 *
 * @param    {Object}   data
 *
 * @return   {Syncable}
 */
Syncable.setStatic(function setClientMethod(types, method) {
	return this.setHandledMethod(types, method, function handler(method, args) {

		if (this.is_server) {
			this.addLog('call', [method.name, args]);
			return;
		}
		
		let result = method.apply(this, args);
		return result;
	});
});

/**
 * Add a method that fetches info from the server.
 * The response is always a promise.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {Object}   data
 *
 * @return   {Syncable}
 */
Syncable.setStatic(function setUpstreamMethod(types, method) {
	let result = this.setHandledMethod(types, method, function handler(method, args) {

		let result;

		if (this.is_server) {
			result = method.apply(this, args);
		} else {

			let pledge = new Pledge();

			let bomb = Function.timebomb(30*1000, (err) => {
				pledge.reject(err);
			});

			Pledge.done(this.c2s_link.demand('upstream-method', [method.name, args]), (err, result) => {

				bomb.defuse();

				if (err) {
					pledge.reject(err);
				} else {
					pledge.resolve(result);
				}
			});

			result = pledge;
		}

		return result;
	});

	result.is_syncable_upstream = true;

	return result;
});

/**
 * Add a method that may or may not use types
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {Array}     types     The optional types of the method
 * @param    {Function}  method    The main method implementation
 * @param    {Function}  handler   The handler
 *
 * @return   {Syncable}
 */
Syncable.setStatic(function setHandledMethod(types, method, handler) {

	let result;

	if (typeof types == 'function') {
		method = types;
		types = null;
	}

	function director(...args) {
		return handler.call(this, method, args);
	}

	if (types) {
		result = this.setTypedMethod(types, method.name, director);
	} else {
		result = this.setMethod(method.name, director);
	}

	return result;
});

/**
 * Add a property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {string}   name
 * @param    {Object}   options
 */
Syncable.setStatic(function setStateProperty(name, options) {

	if (!options) {
		options = {};
	}

	let has_default = !!options.default,
	    allow_set;

	if (Blast.isNode) {
		allow_set = options.allow_server_set ?? true;
	} else {
		allow_set = options.allow_client_set ?? false;
	}

	let getter;

	if (has_default) {
		let has_default_function = typeof options.default == 'function';

		if (has_default_function) {
			let default_function = options.default;

			getter = function getter() {
				let result = this.state[name];

				if (result == null) {
					this.state[name] = result = default_function.call(this);
				}

				return result;
			};

		} else {
			let default_value = options.default;

			getter = function getter() {

				let result = this.state[name];

				if (result == null) {
					this.state[name] = result = default_value;
				}

				return result;
			};
		}

	} else {
		getter = function getter() {
			return this.state[name];
		}
	}

	if (allow_set) {
		this.setProperty(name, getter, function setValue(value) {
			this.setProperty(name, value);
		});
	} else {
		this.setProperty(name, getter);
	}
});

/**
 * Undry this value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.4.0
 *
 * @param    {Object}   data
 *
 * @return   {Syncable}
 */
Syncable.setStatic(function unDry(data) {

	let result,
	    old_instance;

	// Try to reuse the same instance on the client side
	if (Blast.isBrowser) {
		result = CLIENT_MAP.get(data.id);

		if (result) {
			if (result.c2s_link && !result.c2s_link.destroyed) {
				// Server version is older - client has newer data, keep client instance
				if (data.version < result.version) {
					return result;
				}
				
				// Server version is same or newer - update client state from server
				// We update the state even if versions match because nested Syncables
				// may have changed (their unDry already ran and updated them)
				if (data.state) {
					result.state = data.state;
				}
				result.version = data.version;
				
				return result;
			}

			// Link is broken - need to replace the instance
			old_instance = result;
			CLIENT_MAP.delete(data.id);
		}
	}

	let clone = JSON.clone(data);

	result = new this(clone.type);

	result.id = clone.id;
	result.state = clone.state;
	result.version = clone.version;
	result.queues = clone.queues;

	if (Blast.isBrowser) {
		CLIENT_MAP.set(result.id, result);
		result.startSyncLink();

		// Now that the new instance is ready, clean up the old one
		if (old_instance) {
			// Mark the old instance as replaced
			old_instance._replaced = true;
			
			// Emit 'replaced' event with the new instance so listeners can switch
			old_instance.emit('replaced', result);
			
			// Release the old instance (cancels pending reconnects)
			old_instance.release();
		}
	}

	return result;
});

/**
 * Is this the server instance?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @type     {Conduit}
 */
Syncable.setProperty(function is_server() {
	return Blast.isNode;
});

/**
 * Enforce the ID property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @type     {string}
 */
Syncable.enforceProperty(function id(new_value) {

	if (!new_value) {
		new_value = Crypto.randomHex(16);
	}

	// Remember this instance for later
	if (Blast.isBrowser) {
		CLIENT_MAP.set(new_value, this);
	}

	return new_value;
});

/**
 * Enforce the queues property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @type     {Map}
 */
Syncable.enforceProperty(function queues(new_value) {

	if (!new_value) {
		new_value = new Map();
	} else {

		// Loop over every queue entry
		for (let [name, queue] of new_value) {

			let listeners = [];

			if (queue.listeners) {
				for (let listener of queue.listeners) {
					if (listener) {
						listeners.push(listener);
					}
				}
			}

			queue.listeners = listeners;
		}
	}

	return new_value;
});

/**
 * Enforce the state property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @type     {string}
 */
Syncable.enforceProperty(function state(new_value) {

	if (!new_value) {
		new_value = {};
	}

	return new_value;
});

/**
 * Enforce the version property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @type     {string}
 */
Syncable.enforceProperty(function version(new_value) {

	if (!new_value) {
		new_value = 0;
	}

	return new_value;
});

/**
 * Clone for hawkejs
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function toHawkejs() {
	return this.constructor.unDry(this.toDry().value);
});

/**
 * Serialize this syncable
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function toDry() {

	let queues = new Map();

	for (let [name, queue] of this.queues) {

		// Keep everything except the `listeners`
		let entry = {
			name      : name,
			listeners : [],
			messages  : queue.messages,
		};

		queues.set(name, entry);
	}

	let result = {
		version : this.version,
		queues  : queues,
		state   : this.state,
		type    : this.type,
		id      : this.id,
	};

	return {value: result};
});

/**
 * Process an update
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function processUpdate(update) {

	let type = update.type,
	    args = update.args;
	
	if (type == 'set') {
		this.setProperty(...args);
	} else if (type == 'call') {
		let name = args[0],
		    method_args = args[1];
		
		this[name](...method_args);
	} else if (type == 'push_queue') {
		let name = args[0],
		    method_args = args[1];

		this.pushQueue(name, ...method_args);
	} else if (type == 'clear_queue') {
		let name = args[0];
		this.clearQueue(name);
	} else {
		throw new Error('Unknown update type: ' + type);
	}
});

/**
 * Send the actual update
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function sendUpdates() {

	if (this[UPDATE_ID]) {
		clearTimeout(this[UPDATE_ID]);
		this[UPDATE_ID] = null;
	}

	for (let linkup of this.s2c_links.values()) {
		this.sendUpdateToLink(linkup);
	}
});

/**
 * Emit a change event for a certain property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.4.0
 *
 * @param    {string}   property
 */
Syncable.setMethod(function emitPropertyChange(property) {
	// Use state directly to support properties without explicit getters
	let value = this.state[property];
	this.emit('property_change_' + property, value, null);
});

/**
 * Listen for a change event for a certain property
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.4.0
 *
 * @param    {string}   property
 * @param    {Function} callback
 */
Syncable.setMethod(function watchProperty(property, callback) {
	this.on('property_change_' + property, callback);
	// Use state directly to support properties without explicit getters
	let value = this.state[property];
	callback(value);
});

/**
 * Watch a queue for changes
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {string}   name
 * @param    {Function} callback
 */
Syncable.setMethod(function watchQueue(name, callback) {

	let queue = this.queues.get(name);

	if (!queue) {
		queue = {
			name,
			listeners: [],
			messages : [],
		};

		this.queues.set(name, queue);
	}

	queue.listeners.push(callback);

	// Drain all the messages
	while (queue.messages.length) {
		this.scheduleQueueCallback(queue.messages.shift(), callback);
	}
});

/**
 * Clear all the entries in a queue
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {string}   name
 */
Syncable.setAfterMethod('ready', function clearQueue(name) {

	let queue = this.queues.get(name);

	if (queue) {
		queue.messages = [];
	}

	if (Blast.isNode) {
		this.addLog('clear_queue', [name]);
	}
});

/**
 * Schedule a queue callback
 * (This tries to keep events in different queues still use the same order)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setAfterMethod('ready', function scheduleQueueCallback(config, callback) {

	let args = config.args,
	    counter = config.counter;
	
	if (!this[QUEUE_CALLBACKS]) {
		this[QUEUE_CALLBACKS] = [];
	}

	this[QUEUE_CALLBACKS].push({args, counter, callback});

	if (this[QUEUE_CALLBACK_ID]) {
		clearTimeout(this[QUEUE_CALLBACK_ID]);
	}

	this[QUEUE_CALLBACK_ID] = setTimeout(() => {
		this[QUEUE_CALLBACK_ID] = null;
		this.processQueueCallbacks();
	}, 10);
});

/**
 * Actually do the queued callbacks
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setAfterMethod('ready', function processQueueCallbacks() {

	let callbacks = this[QUEUE_CALLBACKS];

	if (!callbacks) {
		return;
	}

	this[QUEUE_CALLBACKS] = [];

	callbacks.sort((a, b) => {
		return a.counter - b.counter;
	});

	for (let item of callbacks) {
		item.callback(...item.args);
	}
});

/**
 * Push something to a queue.
 * If there are listeners, they will be called immediately.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {string}   name
 */
Syncable.setAfterMethod('ready', function pushQueue(name, ...args) {

	let queue = this.queues.get(name);

	if (!queue) {
		queue = {
			name,
			listeners: [],
			messages : [],
		};

		this.queues.set(name, queue);
	}

	if (queue.listeners.length) {
		for (let listener of queue.listeners) {
			this.scheduleQueueCallback({args, counter: this.counter++}, listener);
		}
	} else if (!Blast.isNode) {
		queue.messages.push({
			counter : this.counter++,
			args
		});
	}

	if (Blast.isNode) {
		this.addLog('push_queue', [name, args]);
	}
});

/**
 * Send an update to the given link
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function sendUpdateToLink(link) {

	let link_version = link.syncable_version;

	if (link_version >= this.version) {
		return;
	}

	let updates = [];

	for (let i = link_version; i < this.version; i++) {
		let entry = this.log[i];

		if (entry) {
			updates.push(entry);
		}
	}

	if (updates.length) {
		link.submit('process_updates', {
			updates,
			version: this.version,
		});

		link.syncable_version = this.version;
	}
});

/**
 * Queue an update to all the listeners
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function queueUpdate() {

	let update_id = this[UPDATE_ID];

	if (update_id) {
		clearTimeout(update_id);
	}

	this[UPDATE_ID] = setTimeout(this.sendUpdates.bind(this), 30);
});

/**
 * Add something to the log
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function _addLog(type, args) {

	let entry = {
		version : this.version,
		type    : type,
		args    : args,
	};

	this.log.push(entry);
	this.queueUpdate();
});

/**
 * Add something to the log and increase the version
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function addLog(type, args) {
	this.version++;
	this._addLog(type, args);
});

/**
 * Set a property to a specific value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
Syncable.setMethod(function setProperty(key, value) {
	if (this.state[key] !== value) {
		this.state[key] = value;

		if (this.is_server) {
			this.addLog('set', [key, value]);
		}

		this.emitPropertyChange(key);
	}
});

/**
 * Release the syncable
 * (On your own side)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.4.0
 */
Syncable.setMethod(function release() {

	// Mark as released to prevent auto-reconnection
	this._released = true;

	// Cancel any pending reconnection
	if (this._reconnect_timeout) {
		clearTimeout(this._reconnect_timeout);
		this._reconnect_timeout = null;
	}

	// Cancel any pending update
	if (this[UPDATE_ID]) {
		clearTimeout(this[UPDATE_ID]);
		this[UPDATE_ID] = null;
	}

	if (this.c2s_link) {
		this.c2s_link.destroy();
		this.c2s_link = null;
	}

	if (Blast.isBrowser) {
		CLIENT_MAP.delete(this.id);
	}

	this.emit('released');
});

/**
 * The Specialized Syncable class:
 * A syncable subclass that automatically derives its type from the class's type_path or type_name.
 * Use this as the base class for syncables that need to support recreation after server restart.
 *
 * @constructor
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
const Specialized = Function.inherits('Alchemy.Syncable', function Specialized() {
	
	let type = this.constructor.type_path || this.constructor.type_name;

	if (!type) {
		throw new Error('Specialized Syncable subclasses must have a type_path or type_name (set automatically by Alchemy.Base)');
	}

	Specialized.super.call(this, type);
});

// Make it abstract - it should not be instantiated directly
Specialized.makeAbstractClass();
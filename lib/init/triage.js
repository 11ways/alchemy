/**
 * The State class, which belongs to a triage
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Triage}   triage
 * @param    {String}   name
 */
var State = function State (triage, name) {
	
	// The state name
	this.name = name;
	
	// The queued functions
	this.queue = {before: {}, after: {}};
	
	// Add the state to the id
	this.id = triage.orderedStates.push(state) - 1;
	
	// On how many callbacks this state needs to wait
	this.waiters = 0;
	
	// How many callbacks have actually called back
	this.callers = 0;
	
	// Has this state begun?
	this.begun = false;
	
	// Is this state still open, meaning:
	// are we still counting waiting functions?
	this.open = true;
	
	// Does this state have a go?
	this.finished = false;
	
	this.triage = triage;
	
	// Add the state to the triages object
	triage.states[name] = this;
	
}

State.prototype.begin = function begin () {
	if (!this.begun) {
		this.begun = true;
		
		// Set this state as the active one
		this.triage.currentState = this;
		
		// Execute all the before actions
		this.doQueue('before');
		
	} else {
		log.error('Tried to begin state ' + this.name + ' twice');
	}
}

State.prototype.waiter = function waiter () {
	if (this.open) this.waiters++;
}

State.prototype.caller = function caller () {
	this.callers++;
	this.evaluate();
	this.doQueue('after');
}

/**
 * Indicate we are no longer adding any more waiters
 */
State.prototype.end = function end () {
	this.open = false;
	this.doQueue('after');
}

/**
 * See if the state queue can be executed, and do so if it is
 */
State.prototype.evaluate = function evaluate () {
	if (!this.open && this.waiters <= this.callers) {
		this.finished = true;
	}
}

/**
 * Do the queue, if applicable
 */
State.prototype.doQueue = function doQueue (queueType) {
	
	// Get the before or after queue
	var queue = this.queue[queueType];
	
	// Get the order keys
	var keys = Object.keys(queue);
	
	// Sort them
	keys.sort();
	
	for (var i in keys) {
		var q = queue[keys[i]];
		
		for (var nr in q) {
			var p = q[nr];
			p.fnc(p.callback);
		}
		
		// now remove them
		delete queue[keys[i]];
	}
	
}

/**
 * Execute a function before or after this state
 */
State.prototype.when = function when (when, fnc, callback, order) {
	
	if (typeof callback == 'number') {
		order = callback;
		callback = null;
	}
	
	if (typeof order == 'undefined') order = 10;
	
	// If this state is finished, just do it
	if (this.finished) {
		fnc(callback);
	} else if (when == 'before' && this.begun) {
		log.verbose('Executed function meant before a state after it had already begun', {level: 1});
		fnc(callback);
	} else {
		var queue = this.queue[when];
		if (typeof queue[order] == 'undefined') queue[order] = [];
		queue[order].push({fnc: fnc, callback: callback});
	}
}

/**
 * The triaging class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   options
 */
var Triage = function Triage (options) {
	
	if (typeof options == 'undefined') options = {};
	
	if (typeof options.strict == 'undefined') options.strict = true;
	
	this.options = options;
	
	// The state we're currently triaging
	this.currentState = {};
	
	// All triages in order of appearance
	this.orderedStates = [];
	
	// All triages by name
	this.states = {};
	
}

/**
 * Begin a new state
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   name      The name of the new state
 *
 * @returns  {Boolean}            If the state has been made or not
 */
Triage.prototype.begin = function begin (name) {
	
	var state;
	
	if (typeof this.states[name] == 'undefined') {
		state = new State(this, name);
	} else {
		state = this.states[name];
	}
	
	// And begin the state (which fires the 'before' functions)
	state.begin();
	
	return true;
}

/**
 * End a state
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   name      The name of the state to end
 */
Triage.prototype.end = function end (name) {
	
	if (typeof this.states[name] == 'undefined') {
		return false;
	}
	
	var state = this.states[name];
	state.end();
	
	return true;
}

/**
 * Make a state wait on a certain function
 */
Triage.prototype.wait = function wait (stateName, fnc) {
	
	if (typeof fnc == 'undefined') {
		log.error('Tried to make state ' + stateName + ' wait on undefined function');
		return false;
	}
	
	if (typeof this.states[stateName] == 'undefined') {
		if (this.options.strict) {
			log.error('Tried to wait for state ' + stateName.bold + ' which has not been started', {level: 1});
			return false;
		} else {
			this.begin(stateName);
		}
	}
	
	var state = this.states[stateName], callback;
	
	if (!state.open) {
		log.error('Tried to wait for function ' + fnc.name + ' in already counted state: ' + stateName, {level: 1});
	} else {
		
		// Indicate this state needs to wait for 1 more callback
		state.waiter();
		
		// Bind the callback function
		callback = state.caller.bind(state);
		
		// Execute the function and provide the callback
		fnc(callback);
	}
	
	return true;
}

/**
 * Execute a function before starting a certain state
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   name      The name of the state this function should run before
 * @param    {Function} fnc       The function to execute
 * @param    {Function} callback  The callback to pass to the function
 * @param    {Integer}  order     The order in which to execute this function
 */
Triage.prototype.before = function before (stateName, fnc, callback, order) {
	var state = this.states[stateName];
	state.when('before', fnc, callback, order);
}

/**
 * Execute a function after a certain state
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String}   name      The name of the state this function should run before
 * @param    {Function} fnc       The function to execute
 * @param    {Function} callback  The callback to pass to the function
 * @param    {Integer}  order     The order in which to execute this function
 */
Triage.prototype.after = function after (stateName, fnc, callback, order) {
	var state = this.states[stateName];
	state.when('after', fnc, callback, order);
}

module.exports = Triage;

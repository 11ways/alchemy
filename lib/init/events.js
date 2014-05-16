// Require an eventflow emitter
var emitter = require('eventflow')(),
    seen    = {};

// Add all the properties of eventflow to the alchemy object
for (var key in emitter) {
	alchemy[key] = emitter[key];
}

alchemy._emit = emitter.emit;

/**
 * Intercept an emit to mark it as seen
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
alchemy.emit = function emit(name) {
	seen[name] = true;
	alchemy._emit.apply(alchemy, arguments);
};

/**
 * Intercept an emit to mark it as seen
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
alchemy.after = function after(name, callback) {
	if (seen[name]) {
		callback();
	} else {
		alchemy.once(name, callback);
	}
};

alchemy.setMaxListeners(0);
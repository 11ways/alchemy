/**
 * Require the base class Nuclei
 */
var Nuclei = require('nuclei');

/**
 * All classes will be stored here
 *
 * @type   object
 */
alchemy.classes = Nuclei.Classes;
alchemy.classes.BaseClass = Nuclei.Nuclei;
global.BaseClass = Nuclei.Nuclei;

var EventEmitter = require('events').EventEmitter;

// Add all the EventEmitter properties to the BaseClass
for (var i in EventEmitter.prototype) {
	BaseClass.prototype[i] = EventEmitter.prototype[i];
}

alchemy.Nuclei = Nuclei;

/**
 * Add an extended callback, which will go over the class
 * and compile methods meant for Continuation
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
Nuclei.extended = function applyContinuation(newClass) {

	var key,
	    name,
	    method,
	    options;

	for (key in newClass.prototype) {

		method = newClass.prototype[key];

		// Skip non-functions
		if (typeof method !== 'function') {
			continue;
		}

		name = method.name;

		if (name && name.endsWith('_cont_') && !method.__continuated__) {

			if (!options) {
				options = {
					callerInfo: log.getCallerInfo(6)
				};

				options.callerInfo.level = 4;
			}

			// Continuate the method
			newClass.prototype[key] = eval(alchemy.continuation(method, options));

			// Add the parent info properties from the original method
			alchemy.inject(newClass.prototype[key], method);

			// Set the 'already continuated'
			newClass.prototype[key].__continuated__ = true;
		}
	}
};
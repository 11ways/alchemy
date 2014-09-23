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
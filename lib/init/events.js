// Require an eventflow emitter
var emitter = require('eventflow')();

// Add all the properties of eventflow to the alchemy object
for (var key in emitter) {
	alchemy[key] = emitter[key];
}
/**
 * The Loopback Conduit Class
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Conduit}   parent_conduit
 */
var LoopConduit = Function.inherits('Conduit', function LoopbackConduit(parent_conduit) {

	LoopbackConduit.super.call(this);

	// Keep a reference to the parent conduit
	this.parent = parent_conduit;

	// The callback that should receive the end message
	this.callback = null;

	// Assign the parent properties to this loopback
	Object.assign(this, parent_conduit);
});

/**
 * Set a function that should receive the end message
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
LoopConduit.setMethod(function setCallback(callback) {
	this.callback = callback;

	if (this.end_message) {
		this.callback(null, this.end_message);
	}
});

/**
 * Pass along the message
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
LoopConduit.setMethod(function end(message) {
	return this._end(message);
});

/**
 * Call the actual end method
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
LoopConduit.setMethod(function _end(message) {
	if (this.callback) {
		this.callback(null, message);
	} else {
		this.end_message = message;
	}
});

/**
 * Catch errors
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
LoopConduit.setMethod(function error(status, message, print_error) {

	if (this.callback) {
		this.callback(status);
	} else {
		this.end(message);
	}
});
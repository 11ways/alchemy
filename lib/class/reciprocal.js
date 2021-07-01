/**
 * A Reciprocal instance creates a named channel on an IPC link.
 *
 * This link instance has to implement the `message` event and the `send` method,
 * this will most probably be a ChildProcess but can also be used for socket.io
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {ChildProcess}   link
 * @param    {string}         identifier
 */
const Reciprocal = Function.inherits('Alchemy.Base', 'Alchemy.Reciprocal', function Reciprocal(link, identifier) {

	// Reciprocal identifier
	this.identifier = identifier;

	// The requests we're waiting on an answer for
	this.requests = new Map();

	// The request counter
	this.counter = 0;

	// The actual link
	this.link = link;

	// Listen for messages
	this.init();
});

/**
 * Initialize the listeners
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Reciprocal.setMethod(function init() {

	const that = this;

	this.link.on('message', function onMessage(message) {

		if (!message.reciprocal || message.reciprocal != that.identifier) {
			that.emit('message', message);
			return;
		}

		if (message.method == 'send') {
			that.emit(message.type, message.data, null);
		} else if (message.method == 'ask') {
			that.emitAsk(message);
		} else if (message.method == 'response') {

			// Get the pledge
			let pledge = that.requests.get(message.response_to);

			if (!pledge) {
				throw new Error('Received Reciprocal response to unknown request');
			}

			// Delete the pledge
			that.requests.delete(message.response_to);

			if (message.error) {
				pledge.reject(message.error);
			} else {
				pledge.resolve(message.data);
			}
		}
	});
});

/**
 * Actually submit some data
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 */
Reciprocal.setMethod(function _submit(data) {
	this.link.send(data);
});

/**
 * Emit an ask message
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {Object}   message
 */
Reciprocal.setMethod(function emitAsk(message) {

	const that = this;

	this.emit(message.type, message.data, callback, null);

	function callback(err, response) {

		var id = ++that.counter;

		that._submit({
			id          : id,
			reciprocal  : that.identifier,
			method      : 'response',
			response_to : message.id,
			error       : err,
			data        : response
		});
	}
});

/**
 * Send a message to the other side without waiting for an answer
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   type
 * @param    {Object}   data
 */
Reciprocal.setMethod(function send(type, data) {

	var id = ++this.counter;

	this._submit({
		id         : id,
		reciprocal : this.identifier,
		method     : 'send',
		type       : type,
		data       : data
	});
});

/**
 * Send a message to the other side and wait for an answer
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {String}   type
 * @param    {Object}   data
 *
 * @return   {Pledge}
 */
Reciprocal.setMethod(function ask(type, data) {

	var pledge = new Blast.Classes.Pledge(),
	    id = ++this.counter;

	this.requests.set(id, pledge);

	this._submit({
		id         : id,
		reciprocal : this.identifier,
		method     : 'ask',
		type       : type,
		data       : data
	});

	return pledge;
});
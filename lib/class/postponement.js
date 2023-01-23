const QUEUE = [];

/**
 * The Postponement Class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Conduit}   conduit   The original conduit
 */
const Postponement = Function.inherits('Alchemy.Base', 'Alchemy.Conduit', function Postponement(conduit, id) {

	// The original conduit instance
	this.original_conduit = conduit;

	// The original response object of the conduit
	this.original_response = conduit.response;

	// Get the session
	this.session = conduit.getSession();

	// The identifier of this postponement
	this.id = id;

	// The URL where to get postponement info
	this.url = '/alchemy/postponed/' + id;
	
	// Also attach this postponement to the conduit
	conduit.postponement = this;
});

/**
 * Attempt to resume this postponement
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Conduit}   conduit   The new conduit
 */
Postponement.setMethod(function attemptResume(conduit) {

	// Let the conduit know the response is being requested now
	// (Certain postponements also delay the processing of the request)
	this.original_conduit.emit('get-postponed-response');

	// Once we're sure the postponed end has been reached,
	// actually send that to the browser
	this.original_conduit.afterOnce('after-postponed-end', () => {

		this.original_conduit.response = conduit.response;
		this.original_conduit._end(...this.original_conduit._end_arguments);
		
		this.remove();
	});
});

/**
 * Remove this postponement
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 */
Postponement.setMethod(function remove() {
	this.session.postponements.remove(this.id);
});

/**
 * Called when the session expires
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 */
Postponement.setMethod(function expired() {
	this.remove();
});
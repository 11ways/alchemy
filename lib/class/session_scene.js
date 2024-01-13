/**
 * The Session Scene class:
 * represents a specific scene/tab
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {Conduit}   conduit   The initializing conduit
 */
const SessionScene = Function.inherits('Alchemy.Base', function SessionScene(conduit, scene_id) {

	// Register the creation date
	this.created = new Date();

	// The scene id
	this.id = scene_id;

	// The conduit that created this scene
	this.conduit = conduit;

	// All the websocket connections
	this.connections = [];

	// Old-style live binding updates.
	this.updates = [];
});

/**
 * The edit action
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {Conduit}   conduit
 */
SessionScene.setMethod(function registerConnection(conduit) {

	if (!conduit) {
		return;
	}

	// Add the conduit to the list of connections
	this.connections.push(conduit);

	this.emit('connected');

	// When the conduit is closed, remove it from the list
	conduit.on('disconnect', () => {
		this.removeConnection(conduit);
	});
});

/**
 * Remove a connection
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 *
 * @param    {Conduit}   conduit
 */
SessionScene.setMethod(function removeConnection(conduit) {

	if (conduit) {
		let index = this.connections.indexOf(conduit);

		if (index > -1) {
			this.connections.splice(index, 1);
		}
	}

	if (this.connections.length == 0) {
		this.unsee('connected');
	}
});

/**
 * Destroy this scene
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.10
 * @version  1.3.10
 */
SessionScene.setMethod(function destroy() {

	let session = this.conduit.getSession();

	if (session) {
		delete session.expected[this.id];
	}

	this.emit('destroyed');
});
const QUEUE = [];
let queue_check_id,
    _total_postponement_counter = 0;

/**
 * The Postponement Class represents requests that will be handled later.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.2
 *
 * @param    {Conduit}   conduit   The original conduit
 */
const Postponement = Function.inherits('Alchemy.Base', 'Alchemy.Conduit', function Postponement(conduit, id, options) {

	// The original conduit instance
	this.original_conduit = conduit;

	// The original response object of the conduit
	this.original_response = conduit.response;

	// Get the session
	this.session = conduit.getSession();

	// The identifier of this postponement
	this.id = id;

	// The original path string
	this.original_path = conduit.path;

	// The URL where to get postponement info
	this.url = '/alchemy/postponed/' + id;

	// The last known position in the queue
	this.last_queue_position = null;

	// Postponement options
	this.options = options || {};

	// When did this postponement start
	this.started = Date.now();

	// When did this postponement end?
	this.ended = null;

	// Has this postponement expired?
	this.expired = false;

	// Has this postponement been released yet?
	this.released = false;

	// When was the last check made from the client?
	this.last_check = this.started;
	
	// Also attach this postponement to the conduit
	conduit.postponement = this;

	// Keep track of the total amount of postponements ever
	_total_postponement_counter++;
});

/**
 * The queued postponements
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {Postponement[]}
 */
Postponement.setStatic('queue', QUEUE);

/**
 * Get the total amount of postponements ever
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {number}
 */
Postponement.setStaticProperty(function total_postponement_counter() {
	return _total_postponement_counter;
});

/**
 * The current queue length
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {number}
 */
Postponement.queue_length = 0;

/**
 * How long has this been waiting?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {number}
 */
Postponement.setProperty(function time_waited() {

	if (!this.ended) {
		return Date.now() - this.started;
	}

	return this.ended - this.started;
});

/**
 * How long has this postponement been left unchecked?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {number}
 */
Postponement.setProperty(function time_unchecked() {
	return Date.now() - this.last_check;
});

/**
 * Has this postponement been abandoned?
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.2
 *
 * @return   {number}
 */
Postponement.setProperty(function has_been_abandoned() {

	// Postponements that haven't been checked in 3 minutes
	// are considered abandoned
	if (this.time_unchecked > 180_000) {
		return true;
	}

	return false;
});

/**
 * Get the current position in the queue
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @return   {number}
 */
Postponement.setProperty(function position_in_queue() {

	if (this.last_queue_position == null) {
		return null;
	}

	let index = QUEUE.indexOf(this);

	if (index == -1) {
		index = null;
	}

	this.last_queue_position = index;

	return index;
});

/**
 * Schedule a check of the queue
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Conduit}   conduit   The new conduit
 */
Postponement.setStatic(function scheduleQueueCheck() {

	if (queue_check_id) {
		return;
	}

	queue_check_id = setTimeout(() => {
		queue_check_id = null;
		Postponement.checkQueue();
	}, 5000);
});

/**
 * Check the (top of the) queue
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Conduit}   conduit   The new conduit
 */
Postponement.setStatic(function checkQueue() {

	let length = QUEUE.length;

	this.queue_length = length;

	if (!length) {
		return;
	}

	let to_remove = [],
	    postponement,
	    max = length,
	    i;
	
	if (max > 20) {
		max = 20;
	}

	for (i = 0; i < max; i++) {
		postponement = QUEUE[i];

		if (postponement.has_been_abandoned) {
			to_remove.push(postponement);
		}
	}

	for (i = 0; i < to_remove.length; i++) {
		postponement = to_remove[i];
		postponement.expire();
	}

	Postponement.scheduleQueueCheck();
});

/**
 * Handle a request
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.2
 *
 * @param    {Conduit}   conduit   The new conduit
 */
Postponement.setMethod(function handleRequest(conduit) {

	if (conduit.ajax) {
		let check_queue = conduit.param('check_queue');

		if (check_queue) {

			let data = {
				position : this.position_in_queue,
				allowed  : false,
				location : null,
			};

			if (this.released) {
				data.allowed = true;
				data.location = this.url;
			} else if (this.expired) {
				// If the request has expired, send them to the original url again
				data.allowed = true;
				data.location = this.original_path;
			} else if (this.attemptUnlock()) {
				data.allowed = true;
				data.location = this.url;
			}  else if (data.position == null) {
				// Something else has gone wrong?
				// Send them to the url anyway
				data.allowed = true;
				data.location = this.url;
			}

			conduit.end(data);

			return;
		}
	}

	let resumed = this.attemptResume(conduit);

	if (!resumed) {
		this.showPostponementMessage(conduit);
	}
});

/**
 * Attempt to unlock
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.2
 *
 * @return   {boolean}   True if the request is being resumed
 */
Postponement.setMethod(function attemptUnlock() {

	if (this.released) {
		return true;
	}

	this.last_check = Date.now();

	Postponement.scheduleQueueCheck();

	if (this.position_in_queue > 5) {
		return false;
	}

	if (alchemy.lagInMs() > 100) {
		return false;
	}

	this.released = true;

	return this.released;
});

/**
 * Attempt to resume this postponement.
 * If it's in a queue and it's not our turn yet, do nothing.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Conduit}   conduit   The new conduit
 *
 * @return   {boolean}   True if the request is being resumed
 */
Postponement.setMethod(function attemptResume(conduit) {

	if (!this.attemptUnlock()) {
		return false;
	}

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

	return true;
});

/**
 * Show the postponement message to the given conduit
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {Conduit}   conduit
 */
Postponement.setMethod(function showPostponementMessage(conduit) {

	if (!conduit) {
		conduit = this.original_conduit;
	}

	let response = conduit?.response || this.original_response;

	if (!response) {
		throw new Error('Failed to find a response instance, unable to show postponement message');
	}

	response.setHeader('X-Robots-Tag', 'none');

	let position_in_queue = this.position_in_queue;

	// Already set the cookies
	if (conduit.new_cookie_header.length) {
		response.setHeader('set-cookie', conduit.new_cookie_header);
	}

	// Set the location header where the client should look at later
	response.setHeader('Location', this.url);
	response.setHeader('Content-Type', 'text/html');

	if (this.options.expected_duration) {
		response.setHeader('Expected-Duration', Number(this.options.expected_duration / 1000).toFixed(2));
	}

	// Write the headers & status
	response.writeHead(this.options.status || 202);

	let end_message = this.options.end_message;

	// End the response if wanted
	if (end_message !== false) {
		if (!end_message) {
			if (position_in_queue != null) {
				end_message = this.getQueueHTML();
			} else {
				end_message = 'The response has been postponed, you can find it at <a href="' + this.url + '">' + this.url + '</a>';
			}
		}
	} else {
		end_message = '';
	}

	response.end(end_message);
});

/**
 * Remove this postponement
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 *
 * @param    {boolean}   expired   True if this is due to an expired session
 */
Postponement.setMethod(function remove(expired) {

	if (!expired) {
		const session = this.session;

		this.ended = Date.now();
		session.postponements.remove(this.id);

		session.addFinishedQueueDuration(this.time_waited);
	}

	let index = this.position_in_queue;

	if (index != null) {
		QUEUE.splice(index, 1);
	}
});

/**
 * Called when the session or the postponement expires
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 */
Postponement.setMethod(function expire() {
	this.remove(true);
	this.expired = true;
});

/**
 * Put this postponement in a queue
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 */
Postponement.setMethod(function putInQueue() {

	if (this.last_queue_position != null) {
		return;
	}

	let new_length = QUEUE.push(this) - 1;

	this.last_queue_position = new_length - 1;

	// Update the queue length
	Postponement.queue_length = new_length;

	return this.last_queue_position;
});

/**
 * Get the HTML message for in the queue
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.1
 * @version  1.3.1
 */
Postponement.setMethod(function getQueueHTML() {

	let position = this.last_queue_position + 1;

	let html = `<!DOCTYPE html>
	<html>
	<head>
	  <title>Please Wait...</title>
	  <style>
		body {
		  background-color: #F5F5F5;
		  display: flex;
		  justify-content: center;
		  align-items: center;
		  height: 100vh;
		  font-family: 'Open Sans', sans-serif;
		}
		.main-logo {
			max-width: 50vw;
			max-height: 50vw;
			object-fit: contain;
			min-width: 150px;
			max-width: 150px;
		}
		.container {
		  text-align: center;
		  background: #F0F8FF;
		  padding: 20px;
		  border-radius: 10px;
		  box-shadow: 5px 5px 10px #B0C4DE;
		}
		h1 {
		  font-size: 3em;
		  margin-bottom: 20px;
		}
		p {
		  font-size: 1.5em;
		  margin-bottom: 20px;
		}
		#queue {
		  font-size: 1.2em;
		  margin-bottom: 20px;
		}
		.loading {
		  display: flex;
		  justify-content: center;
		  align-items: center;
		  margin: 0 auto;
		  border: 6px solid #F5F5F5;
		  border-top: 6px solid #3498DB;
		  border-radius: 50%;
		  width: 60px;
		  height: 60px;
		  animation: spin 2s linear infinite;
		}
		@keyframes spin {
		  0% { transform: rotate(0deg); }
		  100% { transform: rotate(360deg); }
		}
	  </style>
	</head>
	<body>
		<div class="container">
	`

	if (alchemy.settings.frontend.ui.main_logo) {
		html += `<img src="${alchemy.settings.frontend.ui.main_logo}" class="main-logo">\n`;
	}

	html += `
		<h1>Server is busy</h1>
		<p id="queue">You are #${ position } in the queue.</p>
		<div class="loading">
			<div class="spinner"></div>
		</div>
	  </div>
	  <script>
		function checkQueue() {
			let xhr = new XMLHttpRequest();
			xhr.open('GET', '${ this.url }?check_queue=1', true);
			xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
			xhr.onreadystatechange = function() {
				if (xhr.readyState === 4) {
					let data = JSON.parse(xhr.responseText);
					let element = document.getElementById("queue");

					if (data.allowed && data.location) {
						element.innerHTML = "Redirecting!";
						window.location.href = data.location;
						return;
					}

					let queue = data.position;
					element.innerHTML = "You are #" + queue + " in the queue";

					setTimeout(checkQueue, 15000);
				}
			};
			xhr.send();
		};

		setTimeout(checkQueue, 5000);
	  </script>
	</body>
	</html>`;

	return html;
});
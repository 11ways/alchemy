/**
 * The Controller class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 */
global.Controller = Function.inherits('Informer', function Controller(conduit) {
	this.conduit = conduit;
	this.response = conduit.response;
});

/**
 * Render the given template
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {Number}   status
 * @param   {Array}    template
 */
Controller.setMethod(function render(status, template) {

	var that = this,
	    output;

	if (template == null) {
		template = status;
		status = this.conduit.status || 200;
	}

	this.conduit.status = status;
	template = Array.cast(template);

	Function.parallel(function rendering(next) {
		that.emit('rendering', next);
	}, function responding(next) {
		that.conduit.render(template, function afterRender(err, html) {

			if (err != null) {
				log.todo('Better error handling');
				return that.response.end('Error: ' + err);
			}

			output = html;

			that.emit('responding', next);
		});
	}, function respond(err) {

		if (err != null) {
			log.todo('Better error handling');
			return that.response.end('Error: ' + err);
		}

		that.response.end(output, 'utf-8');
	});
});

/**
 * Perform the wanted action and fire expected events
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {String}   name   The name of the action to execute
 * @param   {Array}    args   Arguments to apply to the action
 */
Controller.setMethod(function doAction(name, args) {

	var that = this;

	Function.series(function initializing(next) {
		that.emit('initializing', next);
	}, function filtering(next) {
		that.emit('filtering', next);
	}, function starting(next) {
		that.emit('starting', next);
	}, function actioning(err) {

		if (err != null) {
			log.todo('Better error handling');
			return that.response.end('Error: ' + err);
		}

		// Call the actual action
		switch (args.length) {
			case 1:
				return that[name](args[0]);

			case 2:
				return that[name](args[0], args[1]);

			case 3:
				return that[name](args[0], args[1], args[2]);

			case 4:
				return that[name](args[0], args[1], args[2], args[3]);

			default:
				return that[name].apply(that, args);
		}
	});
});

/**
 * Return a controller instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {String}   controllerName       The plural name of the controller
 *
 * @return  {Controller}
 */
Controller.get = function get(controllerName, conduit) {

	var className = String(controllerName).controllerClassName();

	if (alchemy.classes[className] == null) {
		return false;
	}

	return new alchemy.classes[className](conduit||false);
};
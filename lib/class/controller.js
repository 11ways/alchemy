/**
 * The Controller class
 *
 * @constructor
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 */
global.Controller = Function.inherits(function Controller() {

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
Controller.get = function get(controllerName) {

	var className = String(controllerName).controllerClassName();

	if (alchemy.classes[className] == null) {
		return false;
	}

	return new alchemy.classes[className]();
};
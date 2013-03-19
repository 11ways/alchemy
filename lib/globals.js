// Set the controller global
var Controller = global.Controller = {};

/**
 * Return a controller's instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.03.18
 * @version  2013.03.18
 *
 * @param   {string}   controllerName       The plural name of the controller
 */
Controller.get = function get (controllerName) {
	
	var camelName = alchemy.inflect.camelize(controllerName);
	var fullName = camelName + 'Controller';
	
	if (typeof alchemy.classes[fullName] == 'undefined') return false;
	
	if (typeof alchemy.instances.controllers[controllerName] == 'undefined') {
		alchemy.instances.controllers[controllerName] = new alchemy.classes[fullName]();
	}
	
	return alchemy.instances.controllers[controllerName];
}

// Set the model global
var Model = global.Model = {};

/**
 * Return a model instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    2013.03.18
 * @version  2013.03.18
 *
 * @param   {string}   modelName       The singular name of the model
 */
Model.get = function get (modelName) {
	
	var fullName = modelName + 'Model';
	
	if (typeof alchemy.classes[fullName] == 'undefined') return false;
	
	if (typeof alchemy.instances.models[modelName] == 'undefined') {
		alchemy.instances.models[modelName] = new alchemy.classes[fullName]();
	}
	
	return alchemy.instances.models[modelName];
}
// Set the controller global
var Controller = global.Controller = {};

/**
 * Return a controller's instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
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

/**
 * Extend the base controller
 * Uses the app controller by default, unless it doesn't exist
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}     name   The name of the class
 * @param   {function}   fnc    The extension
 *
 * @returns {function}
 */
Controller.extend = function extend (name, fnc) {
	
	// Normalize the parameters
	if (typeof name == 'function') {
		fnc = name;
		name = fnc.name;
	}
	
	if (typeof alchemy.classes.AppController == 'undefined') {
		return alchemy.classes.Controller.extend(fnc, {name: name});
	} else {
		return alchemy.classes.AppController.extend(fnc, {name: name});
	}
}

// Set the model global
var Model = global.Model = {};

/**
 * Return a model instance
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   modelName       The singular name of the model
 */
Model.get = function get (modelName) {

	var fullName = alchemy.inflect.camelize(modelName) + 'Model';
	
	if (typeof alchemy.classes[fullName] == 'undefined') return false;
	
	if (typeof alchemy.instances.models[modelName] == 'undefined') {
		alchemy.instances.models[modelName] = new alchemy.classes[fullName]();
	}
	
	var returnModel = alchemy.instances.models[modelName];
	
	return returnModel;
}

/**
 * Extend the base model
 * Uses the app model by default, unless it doesn't exist
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}     name   The name of the class
 * @param   {function}   fnc    The extension
 *
 * @returns {function}
 */
Model.extend = function extend (name, fnc) {
	
	// Normalize the parameters
	if (typeof name == 'function') {
		fnc = name;
		name = fnc.name;
	}
	
	if (typeof alchemy.classes.AppModel == 'undefined') {
		return alchemy.classes.Model.extend(fnc, {name: name});
	} else {
		return alchemy.classes.AppModel.extend(fnc, {name: name});
	}
}

/**
 * Pretty print debug option
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
global.pr = function pr (message) {
	console.log(message);
}
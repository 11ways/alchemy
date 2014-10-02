var instances = {};

/**
 * Datasource
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
global.Datasource = Function.inherits(function Datasource(name, options) {

	this.name = name;

	this.options = Object.assign(this.options, options);
});

/**
 * Create a new datasource
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.create = function create(type, name, options) {

	var className = type.classify() + 'Datasource',
	    instance;

	if (!alchemy.classes[className]) {
		throw new Error('Datasource type "' + type + '" does not exist');
	}

	instance = new alchemy.classes[className](name, options);
	instances[name] = instance;

	return instances;
};

/**
 * Get a datasource instance
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 */
Datasource.get = function get(name) {
	return instances[name];
};
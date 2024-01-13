/**
 * The DataProvider class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
const DataProvider = Function.inherits('Alchemy.Base', 'Alchemy.DataProvider', function DataProvider(config) {
	this.config = config || {};
});

/**
 * Undry
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 *
 * @param    {Object}           obj
 * @param    {boolean|string}   cloned
 *
 * @return   {DataProvider}
 */
DataProvider.setStatic(function unDry(obj) {
	let result = new this(obj.config);
	return result;
});

/**
 * Configure a new config
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
DataProvider.setStatic(function addConfig(name, default_value) {
	this.setProperty(name, function getValue() {

		if (this.config[name] != null) {
			return this.config[name];
		}

		return default_value;
	}, function setValue(value) {
		return this.config[name] = value;
	});
});

/**
 * Extra context
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.12
 * @version  1.3.12
 */
DataProvider.addConfig('context');

/**
 * The wanted page size
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
DataProvider.addConfig('page_size');

/**
 * Get all the data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
DataProvider.setAbstractMethod('getAll');

/**
 * Get the data for the given page (pages are 1-index based)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
DataProvider.setAbstractMethod('getPage');

/**
 * Get a single data by id (or other unique identifier)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
DataProvider.setAbstractMethod('getById');

/**
 * Return an object for json-drying this document
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 *
 * @return   {Object}
 */
DataProvider.setMethod(function toDry() {
	return {
		value : {
			config : this.config,
		}
	};
});

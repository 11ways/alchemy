/**
 * The Remote DataProvider class
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
const RemoteDataProvider = Function.inherits('Alchemy.DataProvider', 'Remote');

/**
 * The url to load
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.2.2
 */
RemoteDataProvider.addConfig('source');

/**
 * Do a fetch
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.13
 * @version  1.3.13
 *
 * @return   {Pledge|Array}
 */
RemoteDataProvider.setMethod(function performSourceRequest(type, options) {

	if (!this.source) {
		return [];
	}

	if (!options) {
		options = {};
	}

	if (!options.get) {
		options.get = {};
	}

	if (this.context) {
		options.get.context = this.context;
	}

	options.get.provider_method = type;

	return alchemy.fetch(this.source, options);
});

/**
 * Get all the data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.3.13
 */
RemoteDataProvider.setMethod(function getAll() {
	return this.performSourceRequest('all');
});

/**
 * Get a specific id
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.3.13
 */
RemoteDataProvider.setMethod(function getById(id) {
	return this.performSourceRequest('by_id', {
		get: {
			id: id,
		}
	});
});

/**
 * Get a specific page
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.3.13
 *
 * @param    {Number}   page   1-indexed page number
 */
RemoteDataProvider.setMethod(function getPage(page) {
	return this.performSourceRequest('page', {
		get: {
			page : page,
			page_size: this.page_size,
		}
	});
});
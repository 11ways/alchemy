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
 * Get all the data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.2.2
 * @version  1.3.12
 */
RemoteDataProvider.setMethod(async function getAll() {

	if (!this.source) {
		return [];
	}

	let options = {};

	if (this.context) {
		options.get = {
			context: this.context
		};
	}

	let result = await alchemy.fetch(this.source, options);

	return result;
});
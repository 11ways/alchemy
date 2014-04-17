/**
 * Add the defineProperty method if it doesn't exist yet,
 * this will only support .value setters
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.1.0
 * @version   0.1.0
 */
if (!Object.defineProperty || (typeof navigator !== 'undefined' && navigator.appVersion.indexOf('MSIE 8') > -1)) {
	Object.defineProperty = function defineProperty(obj, name, settings) {
		obj[name] = settings.value;
	};
}

/**
 * Define a non-enumerable property
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.1.0
 * @version   0.1.0
 *
 * @param     {Object}   target   The object to add the property to
 * @param     {String}   name     The name of the property
 * @param     {Object}   value    The value of the property
 */
Object.defineProperty(Object, 'defineValue', {
	value: function defineValue(target, name, value) {
		Object.defineProperty(target, name, {
			value: value,
			enumerable: false,
			configurable: false,
			writeable: false
		});
	}
});

(function() {

var defineProperty = Object.defineProperty,
    defineValue    = Object.defineValue;

/**
 * Get the shared value between the 2 arrays
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Array}     arr            The array to test agains
 * @param    {Function}  CastFunction   Function to use to cast values
 *
 * @return   {Array}
 */
defineValue(Array.prototype, 'shared', function shared(arr, CastFunction) {

	// Make sure the given value to match against is an array
	if (!Array.isArray(arr)) {
		arr = [arr];
	}
	
	// Go over every item in the array, and return the ones they have in common
	return this.filter(function(value) {

		var test, i;

		// Cast the value if a cast function is given
		value = CastFunction ? CastFunction(value) : value;

		// Go over every item in the second array
		for (i = 0; i < arr.length; i++) {

			// Also cast that value
			test = CastFunction ? CastFunction(arr[i]) : arr[i];

			// If the values match, add this value to the array
			if (value == test) {
				return true;
			}
		}

		return false;
	});
});

/**
 * Get the values from the first array that are not in the second array,
 * basically: remove all the values in the second array from the first one
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Array}     arr            The array to test agains
 * @param    {Function}  CastFunction   Function to use to cast values
 *
 * @return   {Array}
 */
defineValue(Array.prototype, 'difference', function difference(arr, CastFunction) {

	// Make sure the given value to match against is an array
	if (!Array.isArray(arr)) {
		arr = [arr];
	}
	
	// Go over every item in the array,
	// and return the ones that are not in the second array
	return this.filter(function(value, index) {

		var test, i;

		// Cast the value if a cast function is given
		value = CastFunction ? CastFunction(value) : value;

		// Go over every item in the second array
		for (i = 0; i < arr.length; i++) {

			// Also cast that value
			test = CastFunction ? CastFunction(arr[i]) : arr[i];

			// If the values match, we should NOT add this
			if (value == test) {
				return false;
			}
		}

		return true;
	});
});

/**
 * Get all the values that are either in the first or in the second array,
 * but not in both
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Array}     arr            The array to test agains
 * @param    {Function}  CastFunction   Function to use to cast values
 *
 * @return   {Array}
 */
defineValue(Array.prototype, 'exclusive', function exclusive(arr, CastFunction) {

	// Get all the shared values
	var shared = this.shared(arr);

	// Return the merged differences between the 2
	return this.difference(shared).concat(arr.difference(shared));
});

/**
 * Hash a (small) string very fast
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {Number}
 */
defineValue(String.prototype, 'numberHash', function hash() {

	var str = this,
	    res = 0,
	    len = str.length,
	    i   = -1;

	while (++i < len) {
		res = res * 31 + str.charCodeAt(i);
	}

	return res;
});

// Generate the crc32 table
var crc32table = (function() {
	var value, pos, i;
	var table = [];

	for (pos = 0; pos < 256; ++pos) {
		value = pos;
		for (i = 0; i < 8; ++i) {
			value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		}
		table[pos] = value >>> 0;
	}

	return table;
})();

/**
 * Generate a checksum (crc32 hash)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {String}
 */
defineValue(String.prototype, 'checksum', function checksum() {

	var str = this,
	    crc = 0 ^ (-1),
	    i;

	for (i = 0; i < str.length; i++ ) {
		crc = (crc >>> 8) ^ crc32table[(crc ^ str.charCodeAt(i)) & 0xFF];
	}

	return (crc ^ (-1)) >>> 0;
});

/**
 * Get all the placeholders inside a string
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {Array}
 */
defineValue(String.prototype, 'placeholders', function placeholders() {

	var regex  = /:(.*?)(?:\/|$)/g,
	    result = [],
	    match;

	while (match = regex.exec(this)) {
		if (typeof match[1] !== 'undefined') {
			result.push(match[1]);
		}
	}

	return result;
});

/**
 * Replace all the placeholders inside a string
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   values
 *
 * @return   {String}
 */
defineValue(String.prototype, 'fillPlaceholders', function fillPlaceholders(values) {

	var result = ''+this,
	    params,
	    value,
	    regex,
	    match,
	    repl,
	    ori,
	    i;

	if (values && typeof values == 'object') {
		params = this.placeholders();

		for (i = 0; i < params.length; i++) {

			regex = new RegExp('(:' + params[i] + ')(?:\\/|$)', 'g');
			value = Object.path(values, params[i]);

			if (value || value === 0) {

				while (match = regex.exec(result)) {

					// Get the original value
					ori = match[0];

					// Generate the replacement
					repl = ori.replace(match[1], value);

					// Replace the original with the replacement in the string
					result = result.replace(ori, repl);
				}
			}
		}
	}

	return result;
});

/**
 * Get the value of the given property path
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   obj
 * @param    {String}   path   The dot notation path
 *
 * @return   {Mixed}
 */
defineValue(Object, 'path', function path(obj, path) {

	var pieces,
	    result,
	    here,
	    key,
	    end,
	    i;

	if (typeof path !== 'string') {
		return;
	}

	pieces = path.split('.');

	here = obj;

	// Go over every piece in the path
	for (i = 0; i < pieces.length; i++) {

		// Get the current key
		key = pieces[i];

		if (here !== null && here !== undefined) {
			here = here[key];

			// Is this the final piece?
			end = ((i+1) == pieces.length);

			if (end) {
				result = here;
			}
		}
	}

	return result;
});

/**
 * See if the given path exists inside an object,
 * even if that value is undefined
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   obj
 * @param    {String}   path   The dot notation path
 *
 * @return   {Mixed}
 */
defineValue(Object, 'exists', function exists(obj, path) {

	var pieces = path.split('.'),
	    result = false,
	    hereType,
	    here,
	    key,
	    end,
	    i;

	// Set the object as the current position
	here = obj;

	// Go over every piece in the path
	for (i = 0; i < pieces.length; i++) {

		// Get the current key
		key = pieces[i];
		hereType = typeof here;

		if (here === null || here === undefined) {
			return false;
		}

		if (here !== null && here !== undefined) {
			
			// Is this the final piece?
			end = ((i+1) == pieces.length);

			if (end) {
				if (here[key] || ((hereType == 'object' || hereType == 'function') && key in here)) {
					result = true;
				}
				break;
			}

			here = here[key];
		}
	}

	return result;
});

/**
 * Determine if the object is empty
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   obj
 * @param    {Boolean}  includePrototype   If true, prototypal properties also count
 *
 * @return   {Boolean}
 */
defineValue(Object, 'isEmpty', function isEmpty(obj, includePrototype) {

	var key;

	if (!obj) {
		return true;
	}

	for(key in obj) {
		if (includePrototype || obj.hasOwnProperty(key)) {
			return false;
		}
	}

	return true;
});

/**
 * Cast a variable to an array.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Mixed}   variable
 */
defineValue(Array, 'cast', function cast(variable) {

	if (Array.isArray(variable)) {
		// Return the variable unmodified if it's already an array
		return variable;
	} else {
		// Return the variable wrapped in an array otherwise
		return [variable];
	}
});

/**
 * Iterate over an object's properties
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}     obj
 * @param    {Function}   fnc
 */
defineValue(Object, 'each', function each(obj, fnc) {

	var key;

	for (key in obj) {
		fnc(obj[key], key, obj);
	}
});

/**
 * Map an object
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}     obj
 * @param    {Function}   fnc
 *
 * @return   {Object}
 */
defineValue(Object, 'map', function map(obj, fnc) {

	var mapped = {};

	Object.each(obj, function mapEach(value, key) {
		mapped[key] = fnc(value, key, obj);
	});

	return mapped;
});

/**
 * Create a new date object
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
defineValue(Date, 'create', function create() {
	return new Date();
});

}());
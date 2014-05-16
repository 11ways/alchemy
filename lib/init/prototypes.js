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

/**
 * Define a shim (only set the value if it does not exist yet)
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.1.0
 * @version   0.1.0
 *
 * @param     {Object}   target   The object to add the property to
 * @param     {String}   name     The name of the property
 * @param     {Object}   value    The value of the property
 */
Object.defineValue(Object, 'defineShim', function defineShim(target, name, value) {
	if (!target[name]) {
		Object.defineValue(target, name, value);
	}
});

(function() {

var defineProperty = Object.defineProperty,
    defineValue    = Object.defineValue,
    defineShim     = Object.defineShim;

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
 * Get an array of the object values
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Object}   obj
 * @param    {Boolean}  includePrototype   If true, prototypal properties also count
 *
 * @return   {Array}
 */
defineShim(Object, 'values', function isEmpty(obj, includePrototype) {

	var result = [],
	    key;

	if (!obj) {
		return result;
	}

	for(key in obj) {
		if (includePrototype || obj.hasOwnProperty(key)) {
			result[result.length] = obj[key];
		}
	}

	return result;
});

/**
 * Cast a variable to an array.
 * Also turns array-like objects into real arrays, except String objects.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 *
 * @param    {Mixed}   variable
 *
 * @return   {Array}
 */
defineValue(Array, 'cast', function cast(variable) {

	var type;

	// Return the variable unmodified if it's already an array
	if (Array.isArray(variable)) {
		return variable;
	}

	type = typeof variable;

	// Convert array-like objects to regular arrays
	if (variable && type == 'object') {

		// If the variable has a 'length' property, it could be array-like
		if (variable.length || 'length' in variable) {

			// Skip it if it's a String object (not a string primitive)
			if (variable.constructor.name !== 'String') {
				return Array.prototype.slice.call(variable, 0);
			}
		}
	} else if (type == 'undefined') {
		return [];
	}

	// Return the variable wrapped in an array otherwise
	return [variable];
});

/**
 * Get the last value of an array
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
defineValue(Array.prototype, 'last', function last() {
	return this[this.length-1];
});

/**
 * Get the first value of an array
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 */
defineValue(Array.prototype, 'first', function first() {
	return this[0];
});

/**
 * Remove certain elements from an array
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.1.0
 */
defineValue(Array.prototype, 'clean', function clean(deleteValue) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] === deleteValue) {
			this.splice(i, 1);
			i--;
		}
	}
	return this;
});

/**
 * Convert an array to an object
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param    {Mixed}   source
 * @param    {Boolean} recursive
 * @param    {Mixed}   value
 *
 * @return   {Object}
 */
defineValue(Object, 'objectify', function objectify(source, recursive, value) {

	var result = {},
	    temp,
	    type,
	    key,
	    i;

	if (typeof value == 'undefined') {
		value = true;
	}

	if (Array.isArray(source)) {
		for (i = 0; i < source.length; i++) {

			if (typeof source[i] !== 'object') {
				result[source[i]] = value;
			} else if (Array.isArray(source[i])) {
				Object.assign(result, Object.objectify(source[i], recursive, value));
			} else {
				Object.assign(result, source[i]);
			}
		}
	} else {
		Object.assign(result, source);
	}

	for (key in result) {
		type = typeof result[key];

		if (type == 'object') {
			if (recursive) {
				result[key] = Object.objectify(result[key], true, value);
			}
		} else if (result[key] != value) {
			temp = {};
			temp[result[key]] = value;
			result[key] = temp;
		}
	}

	return result;
});

/**
 * Inject the properties of one object into another target object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.1.0
 * @version  0.1.0
 *
 * @param   {Object}   target     The object to inject the extension into
 * @param   {Object}   extension  The object to inject
 *
 * @returns {Object}   Returns the injected target (which it also modifies byref)
 */
defineShim(Object, 'assign', function assign(target, first, second) {
	
	var length = arguments.length, extension, key, i;
	
	// Go over every argument, other than the first
	for (i = 1; i <= length; i++) {
		extension = arguments[i];

		// If the given extension isn't valid, continue
		if (!extension) continue;
		
		// Go over every property of the current object
		for (key in extension) {
			target[key] = extension[key];
		}
	}
	
	return target;
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
 * Look for a value in an object or array
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.1.0
 * @version   0.1.0
 *
 * @param     {Object|Array}   target   The object to search in
 * @param     {Object}         value    The value to look for
 *
 * @return    {Boolean}
 */
defineValue(Object, 'hasValue', function hasValue(target, value) {
	return !(Object.getValueKey(target, value) === false);
});

/**
 * Get the key of a value in an array or object.
 * If the value is not found a false is returned (not -1 for arrays)
 *
 * @author    Jelle De Loecker   <jelle@codedor.be>
 * @since     0.1.0
 * @version   0.1.0
 *
 * @param     {Object|Array}   target   The object to search in
 * @param     {Object}         value    The value to look for
 *
 * @return    {String|Number|Boolean}
 */
defineValue(Object, 'getValueKey', function getValueKey(target, value) {

	var result, key;

	if (target) {

		if (Array.isArray(target)) {
			result = target.indexOf(value);

			if (result > -1) {
				return result;
			}
		} else {
			for (key in target) {
				if (target[key] == value) {
					return key;
				}
			}
		}
	}

	return false;
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

/*!
 * string_score.js: String Scoring Algorithm 0.1.20 
 *
 * http://joshaven.com/string_score
 * https://github.com/joshaven/string_score
 *
 * Copyright (C) 2009-2011 Joshaven Potter <yourtech@gmail.com>
 * Special thanks to all of the contributors listed here https://github.com/joshaven/string_score
 * MIT license: http://www.opensource.org/licenses/mit-license.php
 *
 * Date: Tue Mar 1 2011
 * Updated: Tue Jun 11 2013
*/

/**
 * Scores a string against another string.
 *  'Hello World'.score('he');     //=> 0.5931818181818181
 *  'Hello World'.score('Hello');  //=> 0.7318181818181818
 */
defineValue(String.prototype, 'score', function score(word, fuzziness) {

	// If the string is equal to the word, perfect match.
	if (this == word) return 1;

	//if it's not a perfect match and is empty return 0
	if (word == '') return 0;

	var runningScore = 0,
	    charScore,
	    finalScore,
	    string = this,
	    lString = string.toLowerCase(),
	    strLength = string.length,
	    lWord = word.toLowerCase(),
	    wordLength = word.length,
	    idxOf,
	    startAt = 0,
	    fuzzies = 1,
	    fuzzyFactor;
	
	// Cache fuzzyFactor for speed increase
	if (fuzziness) fuzzyFactor = 1 - fuzziness;

	// Walk through word and add up scores.
	// Code duplication occurs to prevent checking fuzziness inside for loop
	if (fuzziness) {
		for (var i = 0; i < wordLength; ++i) {

			// Find next first case-insensitive match of a character.
			idxOf = lString.indexOf(lWord[i], startAt);
			
			if (-1 === idxOf) {
				fuzzies += fuzzyFactor;
				continue;
			} else if (startAt === idxOf) {
				// Consecutive letter & start-of-string Bonus
				charScore = 0.7;
			} else {
				charScore = 0.1;

				// Acronym Bonus
				// Weighing Logic: Typing the first character of an acronym is as if you
				// preceded it with two perfect character matches.
				if (string[idxOf - 1] === ' ') charScore += 0.8;
			}
			
			// Same case bonus.
			if (string[idxOf] === word[i]) charScore += 0.1; 
			
			// Update scores and startAt position for next round of indexOf
			runningScore += charScore;
			startAt = idxOf + 1;
		}
	} else {
		for (var i = 0; i < wordLength; ++i) {
		
			idxOf = lString.indexOf(lWord[i], startAt);
			
			if (-1 === idxOf) {
				return 0;
			} else if (startAt === idxOf) {
				charScore = 0.7;
			} else {
				charScore = 0.1;
				if (string[idxOf - 1] === ' ') charScore += 0.8;
			}

			if (string[idxOf] === word[i]) charScore += 0.1; 
			
			runningScore += charScore;
			startAt = idxOf + 1;
		}
	}

	// Reduce penalty for longer strings.
	finalScore = 0.5 * (runningScore / strLength  + runningScore / wordLength) / fuzzies;
	
	if ((lWord[0] === lString[0]) && (finalScore < 0.85)) {
		finalScore += 0.15;
	}
	
	return finalScore;
});

}());
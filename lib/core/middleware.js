var middleware = [],
    named      = {},
    sorted     = [],
    sortedFnc  = [];

/**
 * Add a middleware function
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.addMiddleware = function addMiddleware(weight, name, fnc, sort) {

	var count = middleware.length+1;

	if (typeof weight === 'function') {
		sort = name;
		fnc = weight;
		weight = undefined;
	}

	if (typeof name === 'function') {
		sort = fnc;
		fnc = name;
		name = undefined;
	}

	// Weight is 200 by default
	if (typeof weight === 'undefined') weight = 200;

	// Find a default name
	if (typeof name === 'undefined') {
		if (fnc.name) {
			name = fnc.name;
		} else {
			name = 'unnamed';
		}

		name += '-' + count;
	}

	// Sort the array by default
	if (typeof sort === 'undefined') sort = true;

	// Add it to the named object
	named[name] = {
		name: name,
		weight: weight,
		number: count,
		function: fnc
	};

	// Now add it to the middleware array
	middleware.push(named[name]);

	// Re-sort the middleware if wanted
	if (sort) alchemy.sortMiddleware();

};

/**
 * The array sorter function
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
function array_sort_middleware(a, b) {

	// First see what the weight is like
	if (a.weight > b.weight) return 1;
	if (a.weight < b.weight) return -1;

	// If the weight is the same, sort on a first-come basis
	if (a.number > b.number) return 1;
	if (a.number < b.number) return -1;

	// If everything is equal, do nothing
	return 0;
}

/**
 * Sort the middleware functions
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.sortMiddleware = function sortMiddleware() {

	// Reset the array
	sorted.length = 0;
	sortedFnc.length = 0;

	// Add all the elements
	Array.prototype.push.apply(sorted, middleware);

	// Sort the array
	sorted.sort(array_sort_middleware);

	// Now add all the functions to the sortedFnc variable
	// which we need for async later on
	for (var i = 0; i < sorted.length; i++) {
		sortedFnc.push(sorted[i].function);
	}
};

/**
 * The callback creator for our middleware interceptor
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
function makeCallback(fncArray, beginWeight, endWeight, callback) {

	var callbacker,
	    length = 0,
	    done = 0,
	    i;

	if (typeof fncArray === 'number') {
		length = fncArray;
	} else {
		for (i = 0; i < fncArray.length; i++) {
			// If this middleware function's weight falls between these 2 numbers
			if (fncArray[i].weight > beginWeight && fncArray[i].weight < endWeight) {
				length++;
			}
		}
	}

	callbacker = function callbacker() {
		done++;

		if (done === length) {
			callback();
		}
	};

	// Indicate the amount of callbacks have to happen
	callbacker.amount = length;

	return callbacker;
};

/**
 * Execute the middleware functions (express)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.doMiddleware = function doMiddleware(req, res, next) {

	var newNext = makeCallback(sorted, 100, Infinity, next);

	// If there are no middlewares to execute, just call the next function
	if (newNext.amount == 0) {
		return next();
	}

	for (var i = 0; i < sorted.length; i++) {
		if (sorted[i].weight > 100 && sorted[i].weight < Infinity) {
			sorted[i].function(req, res, newNext);
		}
	}
};

/**
 * Execute the middleware functions (after express)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.doMiddlewareAfter = function doMiddlewareAfter(req, res, next) {

	var newNext = makeCallback(sorted, -Infinity, 100, next);

	// If there are no middlewares to execute, just call the next function
	if (newNext.amount == 0) {
		return next();
	}

	for (var i = 0; i < sorted.length; i++) {
		if (sorted[i].weight > -Infinity && sorted[i].weight < 100) {
			sorted[i].function(req, res, newNext);
		}
	}

};
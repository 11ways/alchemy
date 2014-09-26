var middleware = [],
    named      = {},
    sorted     = [],
    sortedFnc  = [];

var lessParser,
    scriptDirs = alchemy.shared('script.directories', new Deck()),
    styleDirs  = alchemy.shared('stylesheet.directories', new Deck()),
    assetMap   = {},
    fileCache  = {},
    libpath    = require('path'),
    temp = require('temp'),
    less = require('less'),
    fs = require('fs');

// Remove temporary files on exit
temp.track();

/**
 * Less middleware
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.2.0
 * @version  0.2.0
 */
alchemy.lessMiddleware = function lessMiddleware(req, res, next) {

	var sourcePath,
	    middlePath;

	Function.series(function getPath(next) {

		if (assetMap[req.url]) {
			sourcePath = assetMap[req.url];
			return next();
		}

		middlePath = req.middlePath.replace(/\.css$/, '.less');

		alchemy.findAssetPath(middlePath, styleDirs.getSorted(), function gotAssetPath(err, path) {

			// @todo: error stuff, 404
			assetMap[req.url] = path;
			sourcePath = path;

			next();
		});

	}, function done() {

		alchemy.getCompiledLessPath(sourcePath, {}, function gotLessPath(err, lessPath) {
			req.conduit.serveFile(lessPath);
		});
	});
};

/**
 * Look for assetFile in the given directories
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.2.0
 * @version  0.2.0
 */
alchemy.findAssetPath = function findAssetPath(assetFile, directories, callback) {

	var iter = new Iterator(directories),
	    found;

	if (assetFile[0] == '/') {
		assetFile = assetFile.slice(1);
	}

	Function.while(function test() {
		return !found && iter.hasNext();
	}, function task(next) {

		var dir = iter.next().value,
		    path;

		path = libpath.resolve(dir, assetFile);

		fs.exists(path, function doesFileExist(exists) {
			if (exists) {
				found = path;
			}

			next();
		});
	}, function done() {
		callback(null, found);
	});
};

/**
 * Callback with the compiled CSS filepath
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.2.0
 * @version  0.2.0
 */
alchemy.getCompiledLessPath = function getCompiledLessPath(lessPath, options, callback) {

	// If it has been compiled before, return that
	// @todo: check timestamps on dev. Not-founds are not cached
	if (fileCache[lessPath]) {
		return setImmediate(function lessCache(){callback(null, fileCache[lessPath])});
	}

	fs.readFile(lessPath, {encoding: 'utf8'}, function gotLessCode(err, source) {

		if (err) {
			return callback(err);
		}

		if (!lessParser) {
			lessParser = new (less.Parser)({
				paths: ['.'].concat(styleDirs.getSorted())
			});
		}

		// @todo: source maps. Compression. Everything
		lessParser.parse(source, function gotCss(err, cssTree) {

			var css;

			// @todo: add minify options
			css = cssTree.toCSS();

			temp.open({suffix: '.css'}, function getTempFile(err, info) {

				if (err) {
					return callback(err);
				}

				// Write the css
				fs.write(info.fd, css);

				// Close the file
				fs.close(info.fd, function closedFile(err) {
					fileCache[lessPath] = info.path;
					callback(null, info.path);
				});
			});
		});
	});
};

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
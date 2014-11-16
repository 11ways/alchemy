var publicDirs = alchemy.shared('public.directories', new Deck()),
    scriptDirs = alchemy.shared('script.directories', new Deck()),
    styleDirs  = alchemy.shared('stylesheet.directories', new Deck()),
    rootDirs   = alchemy.shared('root.directories', new Deck()),
    assetMap   = alchemy.shared('files.assetMap'),
    fileCache  = alchemy.shared('files.fileCache'),
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
 * @since    1.0.0
 * @version  1.0.0
 */
alchemy.lessMiddleware = function lessMiddleware(req, res, nextMiddleware) {

	var middlePath,
	    source;

	Function.series(function getPath(next) {

		if (assetMap[req.url]) {
			source = assetMap[req.url];
			return next();
		}

		middlePath = req.middlePath.replace(/\.css$/, '.less');

		alchemy.findAssetPath(middlePath, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			assetMap[req.url] = stats;
			source = stats;

			next();
		});

	}, function done() {

		if (!source) {
			return req.conduit.notFound();
		}

		alchemy.getCompiledLessPath(source.path, {}, function gotLessPath(err, cssPath) {

			var headers;

			if (err) {
				return req.conduit.error(err);
			}

			req.conduit.serveFile(cssPath);
		});
	});
};

/**
 * Script middleware
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
alchemy.scriptMiddleware = function scriptMiddleware(req, res, nextMiddleware) {

	var source;

	Function.series(function getPath(next) {

		if (assetMap[req.url]) {
			source = assetMap[req.url];
			return next();
		}

		alchemy.findAssetPath(req.middlePath, scriptDirs.getSorted(), function gotAssetPath(err, stats) {

			// @todo: error stuff, 404
			assetMap[req.url] = stats;
			source = stats;

			next();
		});

	}, function done() {

		if (!source || ! source.path) {
			return nextMiddleware();
		}

		req.conduit.serveFile(source.path);
	});
};

/**
 * Public files middleware
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
alchemy.publicMiddleware = function publicMiddleware(req, res, nextMiddleware) {

	var source;

	Function.series(function getPath(next) {

		if (assetMap[req.url]) {
			source = assetMap[req.url];
			return next();
		}

		alchemy.findAssetPath(req.middlePath, publicDirs.getSorted(), function gotAssetPath(err, stats) {

			// @todo: error stuff, 404
			assetMap[req.url] = stats;
			source = stats;

			next();
		});

	}, function done() {

		if (!source || ! source.path) {
			return nextMiddleware();
		}

		req.conduit.serveFile(source.path);
	});
};

/**
 * Root files middleware
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
alchemy.rootMiddleware = function rootMiddleware(req, res, nextMiddleware) {

	var source;

	Function.series(function getPath(next) {

		if (assetMap[req.url]) {
			source = assetMap[req.url];
			return next();
		}

		alchemy.findAssetPath(req.middlePath, rootDirs.getSorted(), function gotAssetPath(err, stats) {

			// @todo: error stuff, 404
			assetMap[req.url] = stats;
			source = stats;

			next();
		});

	}, function done() {

		if (!source || ! source.path) {
			return nextMiddleware();
		}

		req.conduit.serveFile(source.path);
	});
};

/**
 * Look for assetFile in the given directories
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
alchemy.findAssetPath = function findAssetPath(assetFile, directories, callback) {

	var iter,
	    found;

	if (typeof assetFile !== 'string') {
		return callback(new Error('File to look for is not a valid string'));
	}

	iter = new Iterator(directories);

	if (assetFile[0] == '/') {
		assetFile = assetFile.slice(1);
	}

	Function.while(function test() {
		return !found && iter.hasNext();
	}, function task(next) {

		var dir = iter.next().value,
		    path;

		path = libpath.resolve(dir, assetFile);

		// Remove query strings from the requested file
		path = path.split('?')[0];

		fs.stat(path, function gotFileStats(err, stats) {

			if (err == null && stats.isFile()) {
				stats.path = path;
				found = stats;
			}

			next();
		});
	}, function done() {

		// Return an empty object when nothing was found,
		// so we'll cache that in the assetMap
		// Otherwise it'll keep checking for every request
		if (found == null) {
			found = {};
		}

		callback(null, found);
	});
};

/**
 * Callback with the compiled CSS filepath
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
alchemy.getCompiledLessPath = function getCompiledLessPath(lessPath, options, callback) {

	// If it has been compiled before, return that
	// @todo: check timestamps on dev. Not-founds are not cached
	if (fileCache[lessPath]) {
		return setImmediate(function lessCache(){callback(null, fileCache[lessPath])});
	}

	if (!lessPath || typeof lessPath != 'string') {
		return setImmediate(function errCb(){callback(new Error('Invalid path given'))});
	}

	fs.readFile(lessPath, {encoding: 'utf8'}, function gotLessCode(err, source) {

		var lessParser;

		if (err) {
			return callback(err);
		}

		lessParser = new (less.Parser)({
			paths: ['.'].concat(styleDirs.getSorted()).concat(libpath.dirname(lessPath))
		});

		// @todo: source maps. Compression. Everything
		lessParser.parse(source, function gotCss(err, cssTree) {

			var css;

			if (err != null) {
				return callback(err);
			}

			if (cssTree == null) {
				return callback(new Error('No CSS tree was made for ' + lessPath));
			}

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

					if (err) {
						return callback(err);
					}

					fileCache[lessPath] = info.path;
					callback(null, info.path);
				});
			});
		});
	});
};
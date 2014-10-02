var lessParser,
    publicDirs = alchemy.shared('public.directories', new Deck()),
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
alchemy.lessMiddleware = function lessMiddleware(req, res, nextMiddleware) {

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
 * Script middleware
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.2.0
 * @version  0.2.0
 */
alchemy.scriptMiddleware = function scriptMiddleware(req, res, nextMiddleware) {

	var sourcePath;

	Function.series(function getPath(next) {

		if (assetMap[req.url]) {
			sourcePath = assetMap[req.url];
			return next();
		}

		alchemy.findAssetPath(req.middlePath, scriptDirs.getSorted(), function gotAssetPath(err, path) {

			// @todo: error stuff, 404
			assetMap[req.url] = path;
			sourcePath = path;

			next();
		});

	}, function done() {
		req.conduit.serveFile(sourcePath);
	});
};

/**
 * Public files middleware
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.2.0
 * @version  0.2.0
 */
alchemy.publicMiddleware = function publicMiddleware(req, res, nextMiddleware) {

	var sourcePath;

	Function.series(function getPath(next) {

		if (assetMap[req.url]) {
			sourcePath = assetMap[req.url];
			return next();
		}

		alchemy.findAssetPath(req.middlePath, publicDirs.getSorted(), function gotAssetPath(err, path) {

			// @todo: error stuff, 404
			assetMap[req.url] = path;
			sourcePath = path;

			next();
		});

	}, function done() {
		req.conduit.serveFile(sourcePath);
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

	if (!lessPath) {
		return setImmediate(function errCb(){callback(new Error('Invalid (empty) path given'))});
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
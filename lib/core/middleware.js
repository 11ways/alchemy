var publicDirs = alchemy.shared('public.directories', new Deck()),
    scriptDirs = alchemy.shared('script.directories', new Deck()),
    styleDirs  = alchemy.shared('stylesheet.directories', new Deck()),
    rootDirs   = alchemy.shared('root.directories', new Deck()),
    assetMap   = alchemy.shared('files.assetMap'),
    fileCache  = alchemy.shared('files.fileCache'),
    libpath    = require('path'),
    sass = require('node-sass'),
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
alchemy.styleMiddleware = function styleMiddleware(req, res, nextMiddleware) {

	var compiled;

	// If this file has already been found & compiled, serve it to the user
	if (assetMap[req.url]) {
		return req.conduit.serveFile(assetMap[req.url].path);
	}

	Function.series(function getCssPath(next) {
		// Look for a regular .css file
		alchemy.findAssetPath(req.middlePath, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			if (err || !stats || !stats.path) {
				return next();
			}

			compiled = stats;
			next();
		});
	}, function getLessPath(next) {

		var lessPath;

		if (compiled) {
			return next();
		}

		lessPath = req.middlePath.replace(/\.css$/, '.less')

		// Look through all the asset folders for the less style file
		alchemy.findAssetPath(lessPath, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			if (err || !stats || !stats.path) {
				return next();
			}

			// Compile this less file
			alchemy.getCompiledLessPath(stats.path, {}, function gotLessPath(err, cssInfo) {

				if (err) {
					return next();
				}

				compiled = cssInfo;
				next();
			});
		});

	}, function getScssPath(next) {

		var scssPath;

		if (compiled) {
			return next();
		}

		scssPath = req.middlePath.replace(/\.css$/, '.scss');

		// Look through all the asset folders for the scss style file
		alchemy.findAssetPath(scssPath, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			if (err || !stats || !stats.path) {
				return next();
			}

			// Compile this less file
			alchemy.getCompiledSassPath(stats.path, {}, function gotSassPath(err, cssInfo) {

				if (err) {
					return next();
				}

				compiled = cssInfo;
				next();
			});
		});

	}, function done(err) {

		if (err) {
			return req.conduit.error(err);
		}

		if (!compiled || !compiled.path) {
			return req.conduit.notFound();
		}

		return req.conduit.serveFile(compiled.path);
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

		Function.series(function checkOriginal(nextc) {

			// Look for the original file first
			fs.stat(path, function gotFileStats(err, stats) {

				if (found) {
					return nextc();
				}

				if (err == null && stats.isFile()) {
					stats.path = path;
					found = stats;
				}

				nextc();
			});

		}, function checkCss(nextc) {

			var cpath;

			// If it's not a less file, don't look for a css file
			if (found || !path.endsWith('.less')) {
				return nextc();
			}

			cpath = path.replace(/\.less$/, '.css');

			fs.stat(cpath, function gotFileStats(err, stats) {

				if (err == null && stats.isFile && stats.isFile()) {
					stats.servepath = cpath;
					stats.path = cpath;
					found = stats;
				}

				nextc();
			});

		}, function done() {
			return next();
		});
	}, function lastly() {

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
				console.log(''+err, err);
				return callback(err);
			}

			if (cssTree == null) {
				return callback(new Error('No CSS tree was made for ' + lessPath));
			}

			// @todo: add minify options
			css = cssTree.toCSS();

			temp.open({suffix: '.css'}, function getTempFile(err, info) {

				var cssBuffer;

				if (err) {
					return callback(err);
				}

				if (!info || !info.fd) {
					return callback(new Error('Problem opening target css file'));
				}

				cssBuffer = new Buffer(css);

				// Write the css
				fs.write(info.fd, cssBuffer, 0, cssBuffer.length, null, function afterWrite() {

					// Close the file
					fs.close(info.fd, function closedFile(err) {

						if (err) {
							return callback(err);
						}

						fileCache[lessPath] = info;
						callback(null, info);
					});
				});
			});
		});
	});
};

/**
 * Callback with the compiled CSS filepath
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    1.0.0
 * @version  1.0.0
 */
alchemy.getCompiledSassPath = function getCompiledSassPath(sassPath, options, callback) {

	// If it has been compiled before, return that
	// @todo: check timestamps on dev. Not-founds are not cached
	if (fileCache[sassPath]) {
		return setImmediate(function lessCache(){callback(null, fileCache[sassPath])});
	}

	if (!sassPath || typeof sassPath != 'string') {
		return setImmediate(function errCb(){callback(new Error('Invalid path given'))});
	}

	fs.readFile(sassPath, {encoding: 'utf8'}, function gotLessCode(err, source) {

		if (err) {
			return callback(err);
		}

		sass.render({
			data: source,
			includePaths: ['.'].concat(styleDirs.getSorted()).concat(libpath.dirname(sassPath)),
			success: function gotCss(result) {

				var css = result.css;

				temp.open({suffix: '.css'}, function getTempFile(err, info) {

					var cssBuffer;

					if (err) {
						return callback(err);
					}

					if (!info || !info.fd) {
						return callback(new Error('Problem opening target css file'));
					}

					cssBuffer = new Buffer(css);

					// Write the css
					fs.write(info.fd, cssBuffer, 0, cssBuffer.length, null, function afterWrite() {

						// Close the file
						fs.close(info.fd, function closedFile(err) {

							if (err) {
								return callback(err);
							}

							fileCache[sassPath] = info;
							callback(null, info);
						});
					});
				});
			},
			error: function onError(err) {
				console.log(''+err, err);
				callback(err);
			}
		});
	});
};
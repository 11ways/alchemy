'use strict';

var publicDirs = alchemy.shared('public.directories', new Deck()),
    scriptDirs = alchemy.shared('script.directories', new Deck()),
    assetDirs  = alchemy.shared('asset.directories', new Deck()),
    styleDirs  = alchemy.shared('stylesheet.directories', new Deck()),
    imageDirs  = alchemy.shared('images.directories', new Deck()),
    rootDirs   = alchemy.shared('root.directories', new Deck()),
    assetMap   = alchemy.shared('files.assetMap'),
    fileCache  = alchemy.shared('files.fileCache'),
    minifyMap  = alchemy.shared('files.minifyMap'),
    Nodent     = alchemy.use('nodent-compiler'),
    UglifyES   = alchemy.use('uglify-es'),
    libpath    = alchemy.use('path'),
    nodent_compiler,
    autoprefixer,
    postcss,
    sass,
    temp = alchemy.use('temp'),
    less,
    fs = alchemy.use('fs');

// Remove temporary files on exit
temp.track();

if (alchemy.settings.css_less !== false) {
	less = alchemy.use('less');
}

if (alchemy.settings.css_sass) {
	sass = alchemy.use('node-sass');
}

if (alchemy.settings.css_post !== false) {
	postcss = alchemy.use('postcss');
	autoprefixer = alchemy.use('autoprefixer');
}

/**
 * Get an array of paths, optionally replace text
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.3
 * @version  0.2.3
 */
function getMiddlePaths(paths, ext, new_ext) {

	if (Array.isArray(paths)) {
		return paths.map(function eachEntry(entry) {
			return getMiddlePaths(entry, ext, new_ext);
		});
	}

	if (ext && new_ext) {
		paths = paths.replace(ext, new_ext);
	}

	return paths;
}

/**
 * Less middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 */
Alchemy.setMethod(function styleMiddleware(req, res, nextMiddleware) {

	var warnings,
	    compiled,
	    o_stats,
	    path,
	    url;

	// Get the URL object
	url = req.conduit.url;

	// Get the path, including the query
	path = url.path;

	// If this file has already been found & compiled, serve it to the user
	if (assetMap[path]) {
		return req.conduit.serveFile(assetMap[path].path, {onError: function onError() {
			// Unset asset
			assetMap[path] = null;
			alchemy.styleMiddleware(req, res, nextMiddleware);
		}});
	}

	// Non-critical errors go here
	warnings = [];

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

		if (compiled || !less) {
			return next();
		}

		lessPath = getMiddlePaths(req.middlePath, /\.css$/, '.less');

		// Look through all the asset folders for the less style file
		alchemy.findAssetPath(lessPath, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			if (err || !stats || !stats.path) {
				return next();
			}

			o_stats = stats;

			// Compile this less file
			alchemy.getCompiledLessPath(stats.path, {}, function gotLessPath(err, cssInfo) {

				if (err) {
					warnings.push(err);
					return next();
				}

				compiled = cssInfo;
				next();
			});
		});

	}, function getScssPath(next) {

		var scssPath;

		if (compiled || !sass) {
			return next();
		}

		scssPath = getMiddlePaths(req.middlePath, /\.css$/, '.scss');

		// Look through all the asset folders for the scss style file
		alchemy.findAssetPath(scssPath, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			if (err || !stats || !stats.path) {
				return next();
			}

			o_stats = stats;

			// Compile this less file
			alchemy.getCompiledSassPath(stats.path, {}, function gotSassPath(err, cssInfo) {

				if (err) {
					warnings.push(err);
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

		// If there are warnings, use the first one
		if (warnings.length) {
			return req.conduit.error(warnings[0]);
		}

		if (!compiled || !compiled.path) {
			return req.conduit.notFound();
		}

		return req.conduit.serveFile(compiled.path, {onError: function onError(err) {
			if (fileCache[compiled.path]) {
				fileCache[compiled.path] = null;

				if (o_stats && fileCache[o_stats.path]) {
					fileCache[o_stats.path] = null;
				}

				alchemy.styleMiddleware(req, res, nextMiddleware);
			}
		}});
	});
});

/**
 * Minify the given path, return a temp path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.4
 *
 * @param    {String}   path
 * @param    {Object}   options
 * @param    {Function} callback
 */
Alchemy.setMethod(function minifyScript(path, options, callback) {

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	// Leave early if minify_js is false en nodent is falsy
	if (!alchemy.settings.minify_js && !options.add_async_support) {
		return callback();
	}

	// @TODO: take options.add_async_support into account
	if (minifyMap[path]) {
		return callback(null, minifyMap[path].path, minifyMap[path]);
	}

	fs.readFile(path, {encoding: 'utf8'}, function gotSource(err, data) {

		var minifyOptions,
		    result;

		if (err) {
			return callback(err);
		}

		// Use nodent if wanted to add async/await support
		if (options.add_async_support && Nodent && (data.indexOf('async function') > -1 || data.indexOf('await ') > -1)) {

			if (nodent_compiler == null) {
				nodent_compiler = new Nodent();
			}

			data = nodent_compiler.compile(data, '', {
				sourcemap : false,
				promises  : true,
				noRuntime : true
			}).code;
		}

		if (alchemy.settings.minify_js) {

			minifyOptions = {
				compress: {
					keep_fargs   : true,
					keep_fnames  : true,
					hoist_funs   : false,
					drop_console : true,
					global_defs  : {
						'Blast.isNode'    : false,
						'Blast.isBrowser' : true
					}
				},
				mangle: {
					keep_fnames  : true
				}
			};

			if (alchemy.settings.debug && alchemy.settings.source_map !== false) {
				minifyOptions.sourceMap = {
					url: 'inline'
				};
			}

			result = UglifyES.minify(data, minifyOptions);

			if (!result) {
				return callback(new Error('Unknown minifier error'));
			}

			if (result.error) {
				return callback(result.error);
			}

			if (!result.code && data.length) {
				return callback(new Error('Failed to minify javascript'));
			}

			result = result.code;
		} else {
			result = data;
		}

		// Open a temp js file
		temp.open({suffix: '.js'}, function getTempFile(err, info) {

			var jsBuffer;

			if (err) {
				return callback(err);
			}

			if (!info || !info.fd) {
				return callback(new Error('Could not find file'));
			}

			jsBuffer = Buffer.from(result);

			// Write the css
			fs.write(info.fd, jsBuffer, 0, jsBuffer.length, null, function afterWrite() {

				// Close the file
				fs.close(info.fd, function closedFile(err) {

					if (err) {
						return callback(err);
					}

					minifyMap[path] = info;

					// Callback with the path and the full info object
					// of the temporary file
					callback(null, info.path, info);
				});
			});
		});
	});
});

/**
 * Script middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.4
 */
Alchemy.setMethod(function scriptMiddleware(req, res, nextMiddleware) {

	var miniSource,
	    source;

	Function.series(function getPath(next) {

		if (fileCache[req.url]) {
			miniSource = fileCache[req.url];
			return next();
		}

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
	}, function minify(next) {

		// If this has already been minified, continue to the serving phase
		if (miniSource) {
			source = miniSource;
			return next();
		}

		// If no file was found, do nothing
		if (!source || !source.path) {
			return nextMiddleware();
		}

		let options = {};

		if (req.conduit && req.conduit.supports('async') === false) {
			options.add_async_support = true;
		}

		alchemy.minifyScript(source.path, options, function gotMinifiedFile(err, path, info) {

			if (err || !info || !info.fd) {
				return next();
			}

			fileCache[req.url] = info;
			source = info;
			next();
		});

	}, function done(err) {

		if (err) {
			return nextMiddleware();
		}

		req.conduit.serveFile(source.path, {onError: function onError() {
			// Unset asset
			if (fileCache[req.url]) {
				fileCache[req.url] = null;
			}

			if (assetMap[req.url]) {
				assetMap[req.url] = null;
			}

			if (source && minifyMap[source.path]) {
				minifyMap[source.path] = null;
			}

			alchemy.scriptMiddleware(req, res, nextMiddleware);
		}});
	});
});

/**
 * Public files middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Alchemy.setMethod(function publicMiddleware(req, res, nextMiddleware) {

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
});

/**
 * Root files middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.5.0
 */
Alchemy.setMethod(function rootMiddleware(req, res, nextMiddleware) {

	var source,
	    cached;

	Function.series(function getPath(next) {

		if (assetMap[req.url]) {
			source = assetMap[req.url];
			cached = true;
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

		req.conduit.serveFile(source.path, {onError: function onError() {

			if (cached) {
				assetMap[req.url] = null;
				alchemy.rootMiddleware(req, res, nextMiddleware);
				return;
			}

			nextMiddleware();
		}});
	});
});

/**
 * Look for assetFile in the given directories
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 */
Alchemy.setMethod(function findImagePath(image_path, callback) {

	if (!image_path) {
		return callback(new Error('Can not find image for empty path'));
	}

	let id = 'image-' + image_path;

	if (alchemy.settings.cache && assetMap[id]) {
		return callback(null, assetMap[id].path);
	}

	alchemy.findAssetPath(image_path, imageDirs.getSorted(), function gotImagePath(err, stats) {

		if (err) {
			return callback(err);
		}

		assetMap[id] = stats;

		return callback(null, stats.path);
	});
});

/**
 * Look for assetFile in the given directories
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.2
 *
 * @param    {String}       assetFile     The full filename to look for
 * @param    {Deck|String}  directories   The directories to look in (or subdir of "assets")
 * @param    {Function}     callback
 */
Alchemy.setMethod(function findAssetPath(assetFile, directories, callback) {

	var sub_path,
	    found,
	    iter;

	if (Array.isArray(assetFile)) {
		Function.forEach(assetFile, function checkFile(file, index, next) {
			alchemy.findAssetPath(file, directories, function checkedFile(err, found) {

				if (err) {
					return next(err);
				}

				if (found && found.path) {
					return callback(null, found);
				}

				return next();
			});
		}, function done(err) {

			if (err) {
				return callback(err);
			}

			// If there was no err, but we got this far,
			// then nothing was found.
			callback(null, {});
		});

		return;
	}

	if (typeof assetFile !== 'string') {
		return callback(new Error('File to look for is not a valid string'));
	}

	if (typeof directories == 'string') {
		sub_path = directories;
		directories = assetDirs.getSorted();
	}

	iter = new Iterator(directories);

	// Normalize the assetFile:
	// resolve .. now to prevent path traversal attacks
	assetFile = libpath.normalize(assetFile);

	// If the assetFile begins with a slash, remove it!
	// (Multiple slashes will have already been removed by normalize)
	if (assetFile[0] == '/') {
		assetFile = assetFile.slice(1);
	}

	Function.while(function test() {
		return !found && iter.hasNext();
	}, function task(next) {

		var dir = iter.next().value,
		    path;

		if (sub_path) {
			path = libpath.resolve(dir, sub_path, assetFile);
		} else {
			path = libpath.resolve(dir, assetFile);
		}

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
});

/**
 * Apply postCss
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.5.0
 * @version  1.0.5
 *
 * @param    {String}     css
 * @param    {Function}   callback
 */
function doPostCss(css, callback) {
	postcss([autoprefixer]).process(css, {from: undefined}).then(function gotCssResult(result) {
		callback(null, result.css);
	}).catch(function gotError(err) {
		callback(err);
	});
}

/**
 * Callback with the compiled CSS filepath
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Alchemy.setMethod(function getCompiledLessPath(lessPath, options, callback) {

	// If it has been compiled before, return that
	// @todo: check timestamps on dev. Not-founds are not cached
	if (alchemy.settings.cache && fileCache[lessPath]) {
		return setImmediate(function lessCache(){callback(null, fileCache[lessPath])});
	}

	if (!lessPath || typeof lessPath != 'string') {
		return setImmediate(function errCb(){callback(new Error('Invalid path given'))});
	}

	fs.readFile(lessPath, {encoding: 'utf8'}, function gotLessCode(err, source) {

		var render_options,
		    import_paths;

		if (err) {
			return callback(err);
		}

		import_paths = ['.'].concat(styleDirs.getSorted()).concat(libpath.dirname(lessPath));

		if (alchemy.settings.less_import_paths) {
			import_paths = import_paths.concat(alchemy.settings.less_import_paths);
		}

		render_options = {
			paths: import_paths,
			compress: alchemy.settings.minify_css
		};

		// @todo: source maps. Compression. Everything
		less.render(source, render_options, function gotCss(err, cssTree) {

			var css;

			if (err != null) {
				console.log(''+err, err);
				return callback(err);
			}

			if (cssTree == null) {
				return callback(new Error('No CSS tree was made for ' + lessPath));
			}

			// @todo: add minify options
			css = cssTree.css;

			temp.open({suffix: '.css'}, function getTempFile(err, info) {

				var cssBuffer;

				if (err) {
					return callback(err);
				}

				if (!info || !info.fd) {
					return callback(new Error('Problem opening target css file'));
				}

				if (!css && source.length) {
					return callback(new Error('LESS file failed to compile'));
				}

				doPostCss(css, function gotResult(err, css) {

					if (err) {
						return callback(err);
					}

					cssBuffer = Buffer.from(css);

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
	});
});

/**
 * Callback with the compiled CSS filepath
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Alchemy.setMethod(function getCompiledSassPath(sassPath, options, callback) {

	// If it has been compiled before, return that
	// @todo: check timestamps on dev. Not-founds are not cached
	if (alchemy.settings.cache && fileCache[sassPath]) {
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
		}, function gotCss(err, result) {

			if (err) {
				console.log(''+err, err);
				return callback(err);
			}

			var css = result.css;

			temp.open({suffix: '.css'}, function getTempFile(err, info) {

				var cssBuffer;

				if (err) {
					return callback(err);
				}

				if (!info || !info.fd) {
					return callback(new Error('Problem opening target css file'));
				}

				doPostCss(css, function gotPostCss(err, css) {

					if (err) {
						return callback(err);
					}

					cssBuffer = Buffer.from(css);

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
			});
		});
	});
});
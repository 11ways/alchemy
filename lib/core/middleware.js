'use strict';

var publicDirs = alchemy.shared('public.directories', new Deck()),
    scriptDirs = alchemy.shared('script.directories', new Deck()),
    assetDirs  = alchemy.shared('asset.directories', new Deck()),
    styleDirs  = alchemy.shared('stylesheet.directories', new Deck()),
    imageDirs  = alchemy.shared('images.directories', new Deck()),
    rootDirs   = alchemy.shared('root.directories', new Deck()),
    fontDirs   = alchemy.shared('font.directories', new Deck()),
    asset_cache= alchemy.getCache('files.assets'),
    fileCache  = alchemy.shared('files.fileCache'),
    minifyMap  = alchemy.shared('files.minifyMap'),
    Nodent     = alchemy.use('nodent-compiler'),
    Terser     = alchemy.use('terser'),
    libpath    = alchemy.use('path'),
    nodent_compiler,
    regenerator_runtime,
	sass_functions,
    babel_polyfill,
    babel_preset,
    babel_async,
    autoprefixer,
    postcss,
    babel,
    sass,
    less,
    fs = alchemy.use('fs');

if (alchemy.settings.css_less !== false) {
	less = alchemy.use('less');
}

if (alchemy.settings.css_sass) {

	// Try to use the embedded DART sass
	sass = alchemy.use('sass-embedded');

	if (!sass) {
		sass = alchemy.use('sass');
	}

	sass_functions = {
		'alchemy_settings($name)': function(name) {

			if (!(name instanceof sass.types.String)) {
				return sass.types.Null.NULL;
			}

			name = name.getValue();

			let value = Object.path(alchemy.settings, name);

			if (value == null) {
				value = Object.path(alchemy.plugins, name);
			}

			let type = typeof value,
			    result;

			switch (type) {
				case 'string':
					if (value) {
						result = new sass.types.String(value);
					} else {
						result = sass.types.Null.NULL;
					}
					break;
				
				case 'number':
					result = new sass.types.Number(value);
					break;
				
				case 'boolean':
					result = new sass.types.Boolean(value);
					break;
				
				default:
					if (value == null) {
						result = sass.types.Null.NULL;
					} else {
						result = new sass.types.String(''+value);
					}
					break;
			}

			return result;
		}
	};
}

if (alchemy.settings.css_post !== false) {
	postcss = alchemy.use('postcss');
	autoprefixer = alchemy.use('autoprefixer');
}

if (alchemy.settings.babel) {
	babel = alchemy.use('@babel/core');
	babel_polyfill = alchemy.use('@babel/polyfill');
	babel_preset = alchemy.use('@babel/preset-env');
	babel_async = alchemy.use('@babel/plugin-transform-async-to-generator');
	regenerator_runtime = alchemy.findModule('regenerator-runtime');
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
 * @version  1.3.0
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
	if (asset_cache.has(path)) {
		return req.conduit.serveFile(asset_cache.get(path).path, {onError: function onError() {
			// Unset asset
			asset_cache.remove(path);
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
			return nextMiddleware();
		}

		return req.conduit.serveFile(compiled.path, {
			mimetype: 'text/css',
			onError: function onError(err) {
				if (fileCache[compiled.path]) {
					fileCache[compiled.path] = null;

					if (o_stats && fileCache[o_stats.path]) {
						fileCache[o_stats.path] = null;
					}

					alchemy.styleMiddleware(req, res, nextMiddleware);
				}
			}
		});
	});
});

/**
 * Sourcemap middleware:
 * Serve the original source files
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.0
 */
Alchemy.setMethod(function sourcemapMiddleware(req, res, nextMiddleware) {

	if (!alchemy.settings.debug) {
		return nextMiddleware();
	}

	// Get the URL object
	let url = req.conduit.url;

	// Get the path, including the query
	let path = url.path.after('_sourcemaps/');

	if (path.indexOf('/stylesheets/') == -1) {
		return nextMiddleware();
	}

	path = path.after('app/assets/stylesheets/');

	if (!path) {
		return nextMiddleware();
	}

	// Look for a regular .css file
	alchemy.findAssetPath(path, styleDirs.getSorted(), function gotAssetPath(err, stats) {

		if (err || !stats || !stats.path) {
			return nextMiddleware();
		}

		req.conduit.serveFile(stats.path, {
			mimetype: 'application/json',
		});
	});
});

/**
 * Minify the given path, return a temp path
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.3
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

		if (err) {
			return callback(err);
		}

		// Use nodent if wanted to add async/await support
		if (options.add_async_support) {

			// If babel is enabled, it means we need to support some really old browsers,
			// so process it anyway!
			if (babel) {

				let plugins = [];

				if (babel_polyfill) {
					plugins.push(babel_polyfill);
				}

				if (babel_async) {
					plugins.push(babel_async);
				}

				let babel_options = {
					presets: [babel_preset],
					plugins: plugins
				};

				// Babel sucks and its code keeps returning a regeneratorRuntime error
				//data = applyNodent(data);

				babel.transform(data, babel_options, function(err, result) {

					if (err) {
						return callback(err);
					}

					let code = result.code;

					if (regenerator_runtime) {
						let runtime_code = fs.readFileSync(regenerator_runtime.module_path, 'utf8');
						code = runtime_code + code;
					}

					serveCode(code);
				});

				return;

			} else if (Nodent && (data.indexOf('async function') > -1 || data.indexOf('await ') > -1)) {
				data = applyNodent(data);
			}
		}

		serveCode(data);
	});

	function applyNodent(data) {
		if (nodent_compiler == null) {
			nodent_compiler = new Nodent();
		}

		data = nodent_compiler.compile(data, '', {
			sourcemap : false,
			promises  : true,
			noRuntime : true
		}).code;

		return data;
	}

	async function serveCode(data) {

		var result;

		if (alchemy.settings.minify_js) {

			// Force Blast.isNode & Blast.isBrowser to be replaced later
			data = data.replaceAll('Blast.isNode', '__BLAST_IS_NODE');
			data = data.replaceAll('Blast.isBrowser', '__BLAST_IS_BROWSER');

			let minify_options = {
				compress: {
					keep_fargs   : true,
					keep_fnames  : true,
					keep_classnames : true,
					hoist_funs   : false,
					drop_console : !alchemy.settings.debug,
					dead_code    : true,
					global_defs  : {
						'__BLAST_IS_NODE'    : false,
						'__BLAST_IS_BROWSER' : true
					}
				},
				mangle: {
					keep_fnames     : true,
					keep_classnames : true,
				}
			};

			if (alchemy.settings.debug && alchemy.settings.source_map) {
				minify_options.sourceMap = {
					url: 'inline'
				};
			}

			result = await Terser.minify(data, minify_options);

			if (!result) {
				return callback(new Error('Unknown minifier error'));
			}

			if (result.error) {
				return callback(result.error);
			}

			if (!result.code && data.length) {
				return callback(new Error('Failed to minify javascript'));
			}

			if (result.code.indexOf('__BLAST_IS_') > -1) {
				// Restore some instances in case these weren't removed by Terser
				// (Maybe because they're part of another variable or a string)
				result = result.code.replaceAll('__BLAST_IS_NODE', 'Blast.isNode');
				result = result.replaceAll('__BLAST_IS_BROWSER', 'Blast.isBrowser');
			} else {
				result = result.code;
			}

		} else {
			result = data;
		}

		// Open a temp js file
		Blast.openTempFile({suffix: '.js'}, function getTempFile(err, info) {

			var js_buffer;

			if (err) {
				return callback(err);
			}

			if (!info || !info.fd) {
				return callback(new Error('Could not find file'));
			}

			js_buffer = Buffer.from(result);

			// Write the css
			fs.write(info.fd, js_buffer, 0, js_buffer.length, null, function afterWrite() {

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
	}
});

/**
 * Script middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.0
 */
Alchemy.setMethod(function scriptMiddleware(req, res, nextMiddleware) {

	var miniSource,
	    source;

	Function.series(function getPath(next) {

		if (fileCache[req.url]) {
			miniSource = fileCache[req.url];
			return next();
		}

		if (asset_cache.has(req.url)) {
			source = asset_cache.get(req.url);
			return next();
		}

		alchemy.findAssetPath(req.middlePath, scriptDirs.getSorted(), function gotAssetPath(err, stats) {

			// @todo: error stuff, 404
			asset_cache.set(req.url, stats);
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

		req.conduit.serveFile(source.path, {
			mimetype: 'text/javascript',
			onError: function onError() {
				// Unset asset
				if (fileCache[req.url]) {
					fileCache[req.url] = null;
				}

				if (asset_cache.has(req.url)) {
					asset_cache.remove(req.url);
				}

				if (source && minifyMap[source.path]) {
					minifyMap[source.path] = null;
				}

				alchemy.scriptMiddleware(req, res, nextMiddleware);
			}
		});
	});
});

/**
 * Font middleware
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 */
Alchemy.setMethod(function fontMiddleware(req, res, nextMiddleware) {
	let directories = fontDirs.getSorted();
	return alchemy.assetInDirsMiddleware(req, res, directories, nextMiddleware);
});

/**
 * Public files middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.1.0
 */
Alchemy.setMethod(function publicMiddleware(req, res, nextMiddleware) {
	let directories = publicDirs.getSorted();
	return alchemy.assetInDirsMiddleware(req, res, directories, nextMiddleware);
});

/**
 * Generic asset middleware
 *
 * @author   Jelle De Loecker   <jelle@elevenways.be>
 * @since    1.1.3
 * @version  1.1.3
 */
Alchemy.setMethod(function assetInDirsMiddleware(req, res, directories, nextMiddleware) {

	var source;

	Function.series(function getPath(next) {

		if (asset_cache.has(req.url)) {
			source = asset_cache.get(req.url);
			return next();
		}

		alchemy.findAssetPath(req.middlePath, directories, function gotAssetPath(err, stats) {

			// @todo: error stuff, 404
			asset_cache.set(req.url, stats);
			source = stats;

			next();
		});

	}, function done() {

		if (!source || ! source.path) {
			return nextMiddleware();
		}

		req.conduit.serveFile(source.path, {
			filename: libpath.basename(source.path)
		});
	});

});

/**
 * Root files middleware
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.3.0
 */
Alchemy.setMethod(function rootMiddleware(req, res, nextMiddleware) {

	var source,
	    cached;

	Function.series(function getPath(next) {

		if (asset_cache.has(req.url)) {
			source = asset_cache.get(req.url);
			cached = true;
			return next();
		}

		alchemy.findAssetPath(req.middlePath, rootDirs.getSorted(), function gotAssetPath(err, stats) {

			// @todo: error stuff, 404
			if (stats?.path) {
				asset_cache.set(req.url, stats);
			}

			source = stats;

			next();
		});

	}, function done() {

		if (!source || ! source.path) {
			return nextMiddleware();
		}

		req.conduit.serveFile(source.path, {
			filename: libpath.basename(source.path),
			onError: function onError() {

			if (cached) {
				asset_cache.remove(req.url);
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
 * @version  1.3.0
 *
 * @param    {String}     image_path
 * @param    {Function}   callback
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function findImagePath(image_path, callback) {

	let pledge = new Pledge();

	pledge.done(callback);

	if (!image_path) {
		pledge.reject(new Error('Can not find image for empty path'));
	} else {

		let id = 'image-' + image_path;

		if (alchemy.settings.cache && asset_cache.has(id)) {
			pledge.resolve(asset_cache.get(id).path);
		} else {

			alchemy.findAssetPath(image_path, imageDirs.getSorted(), function gotImagePath(err, stats) {

				if (err) {
					pledge.reject(err);
				} else {
					asset_cache.set(id, stats);
					pledge.resolve(stats.path);
				}
			});
		}
	}

	return pledge;
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
		// so we'll cache that in the asset_cache
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

			Blast.openTempFile({suffix: '.css'}, function getTempFile(err, info) {

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
 * @version  1.2.5
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

		if (!source) {
			return writeToTemp(source);
		}

		const render_options = {
			includePaths   : ['.'].concat(styleDirs.getSorted()).concat(libpath.dirname(sassPath)),
			functions      : sass_functions,
		};

		if (alchemy.settings.debug) {
			render_options.file = sassPath;
			render_options.sourceMap      = 'out.css.map';
			render_options.sourceMapContents = true;
			render_options.sourceMapEmbed = true;
			render_options.sourceMapRoot  = '/_sourcemaps/';
		} else {
			render_options.data = source;
		}

		sass.render(render_options, function gotCss(err, result) {

			if (err) {
				console.log(''+err, err);
				return callback(err);
			}

			writeToTemp(result.css);
		});

		function writeToTemp(content) {
			Blast.openTempFile({suffix: '.css'}, function getTempFile(err, info) {

				if (err) {
					return callback(err);
				}

				if (!info || !info.fd) {
					return callback(new Error('Problem opening target css file'));
				}

				if (!content) {
					return writeToFile(info, content);
				}

				doPostCss(content, function gotPostCss(err, css) {

					if (err) {
						return callback(err);
					}

					writeToFile(info, css);
				});
			});
		}

		function writeToFile(file, content) {

			let buffer = Buffer.from(content);

			// Write the css
			fs.write(file.fd, buffer, 0, buffer.length, null, function afterWrite() {

				// Close the file
				fs.close(file.fd, function closedFile(err) {

					if (err) {
						return callback(err);
					}

					fileCache[sassPath] = file;
					callback(null, file);
				});
			});

		}
	});
});
let publicDirs = alchemy.shared('public.directories', new Deck()),
    scriptDirs = alchemy.shared('script.directories', new Deck()),
    assetDirs  = alchemy.shared('asset.directories', new Deck()),
    styleDirs  = alchemy.shared('stylesheet.directories', new Deck()),
    imageDirs  = alchemy.shared('images.directories', new Deck()),
    rootDirs   = alchemy.shared('root.directories', new Deck()),
    fontDirs   = alchemy.shared('font.directories', new Deck()),
    asset_cache= alchemy.getCache('files.assets'),
    fileCache  = alchemy.shared('files.fileCache'),
    minify_map = alchemy.shared('files.minifyMap', new Map()),
    Nodent     = alchemy.use('nodent-compiler'),
    Terser     = alchemy.use('terser'),
    libpath    = alchemy.use('path'),
    required_stylesheets = new Set(),
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

if (alchemy.settings.frontend.stylesheet.enable_less !== false) {
	less = alchemy.use('less');
}

if (alchemy.settings.frontend.stylesheet.enable_scss) {

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
		},
		'should_add_exports()': function() {
			return sass.types.Boolean.FALSE;
		},
	};
}

if (alchemy.settings.frontend.stylesheet.enable_post !== false) {
	postcss = alchemy.use('postcss');
	autoprefixer = alchemy.use('autoprefixer');
}

if (alchemy.settings.frontend.javascript.enable_babel) {
	babel = alchemy.use('@babel/core');
	babel_polyfill = alchemy.use('@babel/polyfill');
	babel_preset = alchemy.use('@babel/preset-env');
	babel_async = alchemy.use('@babel/plugin-transform-async-to-generator');
	regenerator_runtime = alchemy.findModule('regenerator-runtime');
}

/**
 * Get an array of paths, optionally replace text
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * Stylesheet middleware
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
 */
Alchemy.setMethod(function styleMiddleware(req, res, nextMiddleware) {

	// Get the URL object
	let url = req.conduit.url;

	// Get the path, including the query
	let path = url.path;

	// If this file has already been found & compiled, serve it to the user
	if (asset_cache.has(path)) {
		return req.conduit.serveFile(asset_cache.get(path).path, {onError: function onError() {
			// Unset asset
			asset_cache.remove(path);
			alchemy.styleMiddleware(req, res, nextMiddleware);
		}});
	}

	let css_path = req.middlePath;

	findStylesheet(css_path, {compile: true}).done((err, result) => {

		if (err) {
			return req.conduit.error(err);
		}

		let compiled_path = result?.compiled?.path;

		if (!compiled_path) {
			return nextMiddleware();
		}

		return req.conduit.serveFile(compiled_path, {
			mimetype: 'text/css',
			onError: function onError(err) {
				if (fileCache[compiled_path]) {
					fileCache[compiled_path] = null;

					let source_path = result.source?.path;

					if (stats && fileCache[source_path]) {
						fileCache[source_path] = null;
					}

					alchemy.styleMiddleware(req, res, nextMiddleware);
				}
			}
		});
	});
});

/**
 * Find a stylesheet
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   css_path   Relative path to the CSS source file
 * @param    {Object}   options
 *
 * @return   {Pledge<Object>}
 */
function findStylesheet(css_path, options) {

	let source_stats,
	    compiled,
	    warnings = [];

	if (css_path[0] != '/') {
		css_path = '/' + css_path;
	}

	if (!options) {
		options = {};
	}

	let do_compile = options.compile === true;

	if (!css_path.endsWith('.css')) {
		return Pledge.reject(new Error('Not a .css file'));
	}

	return Function.series(function getCssPath(next) {

		// Look for a regular .css file
		alchemy.findAssetPath(css_path, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			if (err || !stats || !stats.path) {
				return next();
			}

			source_stats = compiled = stats;
			next();
		});
	}, function getLessPath(next) {

		if (source_stats || !less) {
			return next();
		}

		let less_path = getMiddlePaths(css_path, /\.css$/, '.less');

		// Look through all the asset folders for the less style file
		alchemy.findAssetPath(less_path, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			if (err || !stats || !stats.path) {
				return next();
			}

			source_stats = stats;

			if (!do_compile) {
				return next();
			}

			// Compile this less file
			alchemy.getCompiledLessPath(stats.path, options, function gotLessPath(err, cssInfo) {

				if (err) {
					warnings.push(err);
					return next();
				}

				compiled = cssInfo;
				next();
			});
		});

	}, function getScssPath(next) {

		if (source_stats || !sass) {
			return next();
		}

		let scss_path = getMiddlePaths(css_path, /\.css$/, '.scss');

		// Look through all the asset folders for the scss style file
		alchemy.findAssetPath(scss_path, styleDirs.getSorted(), function gotAssetPath(err, stats) {

			if (err || !stats || !stats.path) {
				return next();
			}

			source_stats = stats;

			if (!do_compile) {
				return next();
			}

			// Compile this less file
			alchemy.getCompiledSassPath(stats.path, options, function gotSassPath(err, cssInfo) {

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
			throw err;
		}

		// If there are warnings, use the first one
		if (warnings.length) {
			throw warnings[0];
		}

		if (options?.post_css_only) {
			return compiled;
		}

		if (do_compile && (!compiled || !compiled.path)) {
			return false;
		}

		return {
			compiled : compiled,
			source   : source_stats,
		};
	});
}

/**
 * Sourcemap middleware:
 * Serve the original source files
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.0
 */
Alchemy.setMethod(function sourcemapMiddleware(req, res, nextMiddleware) {

	if (!alchemy.settings.debugging.debug) {
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 *
 * @param    {string}   path
 * @param    {Object}   options
 * @param    {Function} callback
 */
Alchemy.setMethod(function minifyScript(path, options, callback) {

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	// Leave early if minify_js is false en nodent is falsy
	if (!alchemy.settings.frontend.javascript.minify && !options.add_async_support) {
		return callback();
	}

	let cached = minify_map.get(path);

	// @TODO: take options.add_async_support into account
	if (cached) {
		return callback(null, cached.path, cached);
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
		try {
			await _serveCode(data);
		} catch (err) {
			return callback(err);
		}
	}

	async function _serveCode(data) {

		let result;
		let should_minify = false;

		if (alchemy.settings.frontend.javascript.minify) {
			let index = data.indexOf('@alchemy.minify.false');

			if (index == -1 || index > 50) {
				should_minify = true;
			}
		}

		if (should_minify && typeof Terser?.minify == 'function') {

			// Force Blast.isNode & Blast.isBrowser to be replaced later
			data = data.replaceAll('Blast.isServer', '__BLAST_IS_SERVER');
			data = data.replaceAll('Blast.isNode', '__BLAST_IS_NODE');
			data = data.replaceAll('Blast.isBrowser', '__BLAST_IS_BROWSER');

			let minify_options = {
				compress: {
					// Keep all function arguments
					keep_fargs      : true,

					// Keep function names
					keep_fnames     :  true,

					// Keep classnames
					keep_classnames : true,

					// Do not hoist function declarations
					hoist_funs      : false,

					// Only drop console calls when not debugging
					drop_console    : !alchemy.settings.debugging.debug,

					// Remove dead code
					dead_code       : true,

					// Remove symbol names
					unsafe_symbols  : true,

					// Provide it some info on global definitions
					global_defs     : {
						'__BLAST_IS_NODE'    : false,
						'__BLAST_IS_SERVER'  : false,
						'__BLAST_IS_BROWSER' : true
					}
				},
				mangle: {
					keep_fnames     : true,
					keep_classnames : true,
				},
				output: {
					// Do not wrap functions that are arguments in parenthesis
					wrap_func_args  : false,
				},
			};

			if (alchemy.settings.debugging.debug && alchemy.settings.debugging.create_source_map) {
				console.warn('Source maps have been disabled because alchemy.settings.frontend.javascript.minify is true');
				/*minify_options.sourceMap = {
					url: 'inline'
				};*/
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
				result = result.code.replaceAll('__BLAST_IS_SERVER', 'Blast.isServer');
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

					minify_map.set(path, info);

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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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

				if (source && minify_map.has(source.path)) {
					minify_map.delete(source.path);
				}

				alchemy.scriptMiddleware(req, res, nextMiddleware);
			}
		});
	});
});

/**
 * Font middleware
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {string}     image_path
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

		if (alchemy.settings.performance.cache && asset_cache.has(id)) {
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
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.4.2
 *
 * @param    {string}       assetFile     The full filename to look for
 * @param    {Deck|string}  directories   The directories to look in (or subdir of "assets")
 * @param    {Function}     callback
 */
Alchemy.setMethod(function findAssetPath(assetFile, directories, callback) {

	let found_asset_dir,
	    sub_path,
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
					found_asset_dir = dir;
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
					found_asset_dir = dir;
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

		if (found_asset_dir) {
			found.relative_path = libpath.relative(found_asset_dir, found.path);
		}

		callback(null, found);
	});
});

/**
 * Apply postCss
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.5.0
 * @version  1.4.0
 *
 * @param    {string}     css
 * @param    {Object}     options
 * @param    {Function}   callback
 */
function doPostCss(css, options, callback) {
	postcss([autoprefixer]).process(css, {from: undefined}).then(function gotCssResult(result) {

		if (options?.post_css_only) {
			return callback(null, result);
		}

		callback(null, result.css);
	}).catch(function gotError(err) {
		callback(err);
	});
}

/**
 * Callback with the compiled CSS filepath
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.0.0
 */
Alchemy.setMethod(function getCompiledLessPath(lessPath, options, callback) {

	let check_cache = !options?.post_css_only && options?.cache !== false && alchemy.settings.performance.cache;

	// If it has been compiled before, return that
	// @todo: check timestamps on dev. Not-founds are not cached
	if (check_cache && fileCache[lessPath]) {
		return setImmediate(() => callback(null, fileCache[lessPath]));
	}

	if (!lessPath || typeof lessPath != 'string') {
		return setImmediate(() => callback(new Error('Invalid path given')));
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
			compress: alchemy.settings.frontend.stylesheet.minify,
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

			if (options.post_css_only) {
				return doPostCss(css, options, callback);
			}

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

				doPostCss(css, options, function gotResult(err, css) {

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
 * Create the alchemy.scss content
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 */
async function createAlchemyScss() {

	let contents = '';

	for (let css_name of required_stylesheets) {
		if (!css_name.endsWith('.scss') && !css_name.endsWith('.css') && !css_name.endsWith('.less')) {
			css_name += '.css';
		}

		let result = await findStylesheet(css_name);

		if (!result?.source?.relative_path) {
			throw new Error('Could not find ' + css_name);
		}

		contents += '@use "' + result.source.relative_path + '";\n';
	}

	return {contents};
}

/**
 * Custom SCSS import logic
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   path_to_import      The requested path to import
 * @param    {string}   current_file_path   The path to the current file
 */
async function customScssImporter(path_to_import, current_file_path) {

	// The alchemy.scss file is a special case
	if (path_to_import === 'alchemy.scss' || path_to_import === 'alchemy') {
		return createAlchemyScss();
	}

	// Get the current directory this SCSS file is in
	let current_dir = libpath.dirname(current_file_path);

	// Get the dirname to import
	let dir_to_import = libpath.dirname(path_to_import);

	// Get the filename
	let filename_to_import = libpath.basename(path_to_import);

	// Get all the style dirs
	let style_dirs = styleDirs.getSorted();

	// Get the source style dir (the one this file is in)
	let source_style_dir;

	for (let style_dir of style_dirs) {
		if (current_dir.startsWith(style_dir)) {
			source_style_dir = style_dir;
			break;
		}
	}

	let include_paths = [
		current_dir,
		...style_dirs,
	];

	// If the dir this file was in is from one of the allowed style dirs,
	// we have to add possible overrides to the include paths
	if (source_style_dir) {
		let extra_path = current_dir.after(source_style_dir);

		if (extra_path.length > 2) {
			extra_path = libpath.resolve('/', extra_path);
			let new_path = libpath.join(PATH_APP, 'assets', 'stylesheets', extra_path);
			include_paths.unshift(new_path);
		}
	}

	for (let include_path of include_paths) {
		let test_path = libpath.join(include_path, path_to_import);

		let file = new Classes.Alchemy.Inode.File(test_path);

		if (await file.exists()) {
			return {file: test_path};
		}
	}

	// Look for files starting with an underscore
	if (filename_to_import[0] != '_') {
		let dashed_filename_to_import = '_' + filename_to_import;
		return customScssImporter(libpath.join(dir_to_import, dashed_filename_to_import), current_file_path);
	}

	let extension = libpath.extname(filename_to_import);

	// If no extension was given, look for that too
	if (!extension) {
		filename_to_import += '.scss';
		return customScssImporter(libpath.join(dir_to_import, filename_to_import), current_file_path);
	}

	if (path_to_import.startsWith('/overrides/')) {
		return {contents: '// Failed to find ' + path_to_import};
	}

	throw new Error('SCSS file not found');
};

function logSassWarning(message, options) {
	console.warn('Sass warning:', message, options);
}

function logSassDebug(message, options) {
	console.log('Sass debug:', message, options);
}

/**
 * Callback with the compiled CSS filepath
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.4.0
 */
Alchemy.setMethod(function getCompiledSassPath(sassPath, options, callback) {

	let check_cache = !options?.post_css_only && options?.cache !== false && alchemy.settings.performance.cache;

	// If it has been compiled before, return that
	// @todo: check timestamps on dev. Not-founds are not cached
	if (check_cache && fileCache[sassPath]) {
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

		let custom_functions = sass_functions;

		if (options.add_exports) {
			custom_functions = {
				...custom_functions,
				'should_add_exports()': function() {
					return sass.types.Boolean.TRUE;
				},
			};
		}

		const render_options = {
			includePaths   : styleDirs.getSorted(),
			functions      : custom_functions,
			importer       : customScssImporter,
			logger         : {
				warn  : logSassWarning,
				debug : logSassDebug,
			},
		};

		if (alchemy.settings.debugging.debug) {
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

			if (options?.post_css_only) {
				return doPostCss(content, options, callback);
			}

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

				doPostCss(content, options, function gotPostCss(err, css) {

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

/**
 * Register a style that should always be included in the output
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   css_path   Could be a path, could be a name
 */
Alchemy.setMethod(function registerRequiredStylesheet(css_path) {
	required_stylesheets.add(css_path);
});

/**
 * Extract CSS exports from a PostCSS result object
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {Object}   postcss_result
 */
function extractPostCSSExports(postcss_result) {

	const icss_import_rx = /^:import\(("[^"]*"|'[^']*'|[^"']+)\)$/;
	const icss_balanced_quotes = /^("[^"]*"|'[^']*'|[^"']+)$/;
	const remove_rules = true;
	const mode = 'auto';

	const getDeclsObject = (rule) => {
		const object = {};
	
		rule.walkDecls((decl) => {
			const before = decl.raws.before ? decl.raws.before.trim() : "";
			object[before + decl.prop] = decl.value;
		});
	
		return object;
	};

	const icss_imports = {};
	const icss_exports = {};

	function addImports(node, path) {
		const unquoted = path.replace(/'|"/g, "");
		icss_imports[unquoted] = Object.assign(
			icss_imports[unquoted] || {},
			getDeclsObject(node)
		);

		if (remove_rules) {
			node.remove();
		}
	}

	function addExports(node) {
		Object.assign(icss_exports, getDeclsObject(node));
		if (remove_rules) {
			node.remove();
		}
	}

	postcss_result.root.each((node) => {
		if (node.type === 'rule' && mode !== 'at-rule') {
			if (node.selector.slice(0, 7) === ':import') {
				const matches = icss_import_rx.exec(node.selector);

				if (matches) {
					addImports(node, matches[1]);
				}
			}

			if (node.selector === ':export') {
				addExports(node);
			}
		}

		if (node.type === 'atrule' && mode !== 'rule') {
			if (node.name === 'icss-import') {
				const matches = icss_balanced_quotes.exec(node.params);

				if (matches) {
					addImports(node, matches[1]);
				}
			}
			if (node.name === 'icss-export') {
				addExports(node);
			}
		}
	});

	return {
		imports : icss_imports,
		exports : icss_exports,
	};
}

/**
 * Extract CSS exports from a CSS file path
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.4.0
 * @version  1.4.0
 *
 * @param    {string}   css_path
 */
Alchemy.setMethod(async function extractCSSExports(css_path) {

	let result = await findStylesheet(css_path, {
		post_css_only: true,
		add_exports: true,
		compile: true
	});

	result = extractPostCSSExports(result);

	return result?.exports;
});
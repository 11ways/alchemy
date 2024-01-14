'use strict';

let mkdirp       = alchemy.use('mkdirp')?.mkdirp,
    ncp          = alchemy.use('ncp').ncp,
    fs           = alchemy.use('fs'),
    libpath      = alchemy.use('path'),
    child        = alchemy.use('child_process'),
    crypto       = alchemy.use('crypto'),
    mongo        = alchemy.use('mongodb'),
    queues       = {},
    timers       = {},
    lpQueue      = 0,
    moduledirs,
    spawnQueue;

const HAS_EXPOSED = Symbol('has_exposed');

// Create a queue for functions opening files
spawnQueue = Function.createQueue();

// Limit to 500 open files
spawnQueue.limit = 500;

// Start the queue
spawnQueue.start();

/**
 * Attach a conduit to a certain instance
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {Conduit}   conduit
 */
Informer.setMethod(function attachConduit(conduit) {
	this.conduit = conduit;
});

/**
 * Get a model, attach a conduit if possible
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.3.0
 * @version  1.1.8
 *
 * @param    {string}   name      The name of the model to get
 * @param    {boolean}  init      Initialize the class [true]
 * @param    {Object}   options
 *
 * @return   {Model}
 */
Informer.setMethod(function getModel(name, init, options) {
	return Blast.Classes.Alchemy.Base.prototype.getModel.apply(this, arguments);
});

/**
 * Create a debug entry
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {number}   verbosity
 */
Informer.setMethod(function debug(verbosity) {

	var duplicate,
	    options,
	    item,
	    args,
	    i = 0;

	if (typeof verbosity == 'object' && verbosity && (verbosity.label || verbosity.id || verbosity.unique)) {
		options = verbosity;
		verbosity = null;
		i = 1;
	}

	if (options == null) {
		options = {};
	}

	if (options.verbosity == null) {
		if (typeof verbosity == 'number') {
			i = 1;
			options.verbosity = verbosity;
		} else {
			options.verbosity = log.INFO;
		}
	}

	// Do nothing if debugging is off and verbosity is too high
	if (!alchemy.settings.debugging.debug && options.verbosity > log.ERROR) {
		return;
	}

	if (options.data == null) {
		args = [];

		for (; i < arguments.length; i++) {
			args.push(arguments[i]);
		}

		options.data = {args: args};
	}

	if (!options.namespace) {
		options.namespace = this.constructor.name;
	}

	if (options.unique) {
		// Generate fowler hash
		options.id = (options.data.args + '').fowler();
	}

	if (options.id) {
		if (!this._debug_seen_items) {
			this._debug_seen_items = {};
		}

		if (!this._debug_seen_items[options.id]) {
			this._debug_seen_items[options.id] = options;
			options.seen_count = 1;
		} else {
			// Do nothing if it has already been seen
			duplicate = this._debug_seen_items[options.id];
			duplicate.seen_count++;
		}
	}

	if (options.label) {
		if (this._debugObject) {
			item = this._debugObject.debug(options.label, options.data, options.verbosity);
		} else if (!this.conduit) {
			
		} else {
			item = new Debugger(this.conduit, options.label, options.verbosity);
			item.data = options.data;

			if (options.data && options.data.title) {
				item.title = options.data.title;
			}

			if (this.conduit.debuglog) this.conduit.debuglog.push(item);
		}

		return item;
	}

	if (!duplicate && alchemy.settings.debugging.debug && options.data && options.data.args) {
		if (typeof options.level != 'number') {
			options.level = 1;
		}

		alchemy.Janeway.print('debug', options.data.args, options);
	}

	return item;
});

/**
 * Create a debug mark
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param    {string}   message
 */
Informer.setMethod(function debugMark(message) {
	if (this._debugObject) {
		this._debugObject.mark(message);
	}
});

var Debugger = Function.inherits('Alchemy.Base', function Debugger(conduit, type, verbosity, level) {

	// Store the conduit
	this.conduit = conduit;

	// When this started during the request
	this.start = this.time();

	// The identifier of this debug line
	this.id = null;

	// The title of this line
	this.title = null;

	// Labels
	this.labels = [];

	// When this ended
	this.end = null;

	// The type of debug
	this.type = type;

	// Children
	this.children = [];

	// The active sub mark
	this.activeMark = null;

	if (typeof verbosity != 'number') {
		verbosity = alchemy.Janeway.LEVELS.INFO;
	}

	this.verbosity = verbosity;

	// The recursive level
	this.level = level || 0;
});

Debugger.setMethod(function toJSON() {
	return {
		id        : this.id,
		type: this.type,
		title: this.title,
		start: this.start,
		end: this.end || this._possible_end,
		duration: this.duration,
		labels: this.labels,
		children: this.children,
		level: this.level,
		data: this.data,
		verbosity: this.verbosity
	};
});

Debugger.setMethod(function time() {
	return this.conduit.time();
});

Debugger.setMethod(function mark(stop, message, id) {

	var temp,
	    i;

	if (typeof stop == 'string') {
		id = message;
		message = stop;
		stop = null;
	}

	if (!id) {
		id = message;
	}

	// If stop is false and a message has been supplied,
	// look for the original object with that title and
	// only stop that mark
	if (stop === false && (message || id)) {
		if (arguments.length == 2) {
			id = message;
		}

		for (i = 0; i < this.children.length; i++) {
			temp = this.children[i];

			if (temp.data.id == id) {
				return temp.stop();
			}
		}

		return;
	}

	if (this.activeMark != null) {
		this.activeMark.stop();
		this.activeMark._possible_end = this.time();
	}

	// If the message is false, we just wanted to end the previous mark
	if (!message) {
		return;
	}

	this.activeMark = this.debug('mark', {title: message, id: id});
});

Debugger.setMethod(function debug(type, data, verbosity) {

	var item;

	if (typeof verbosity != 'number') {
		verbosity = log.INFO;
	}

	if (!data) {
		data = {};
	}

	item = new Debugger(this.conduit, type, verbosity, this.level + 1);
	item.data = data;
	item.parent = this;

	if (!data.id) {
		data.id = data.title;
	}

	if (data.title) {
		item.title = data.title;
	}

	this.children.push(item);
	return item;
});

Debugger.setMethod(function stop(message) {

	// Don't end something twice
	if (this.end) {
		return;
	}

	if (!message) {
		message = 'end';
	}

	this.end = this.time();
	this.duration = this.end - this.start;
	this.labels.push({message: message, time: this.end});

	if (this.activeMark) {
		this.activeMark.stop('parent-end');
	}
});

/**
 * Schedule a function in a low priority queue
 * 
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {Function}   fnc
 * @param    {number}     wait   How long to wait before executing
 */
Alchemy.setMethod(function lowPriority(fnc, wait) {

	var start,
	    total,
	    exec,
	    lag  = alchemy.toobusy.lag();

	// Set the default wait to 20 ms
	if (!wait) {
		wait = 20;
	}

	// The function that will do the executing
	if (fnc.name == 'execLowPriority') {
		exec = fnc;
	} else {

		// Increase the low priority queue count
		lpQueue++;

		// When we queued the function
		start = Date.now();

		exec = function execLowPriority() {

			// Decrease the low priority queue count
			lpQueue--;

			// When we're executing the function
			total = Date.now() - start;
			fnc(total);
		};

		exec.rescheduled = 0;
	}

	if (lag > 0 || (lpQueue > 100 && exec.rescheduled < 3)) {

		exec.rescheduled++;

		wait = 500 + ~~(lpQueue/(4*exec.rescheduled));

		if (wait > 1000) {
			wait = 999;
		}

		if (exec.rescheduled > 3) {
			return exec();
		}

		setTimeout(function(){alchemy.lowPriority(exec)}, wait);
	} else {
		setTimeout(exec, wait);
	}
});

var _duplicateCheck = {};

/**
 * Copy a directory
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {string}   source     The source path
 * @param    {string}   target     The target path
 * @param    {Function} callback   The function to call when done
 */
Alchemy.setMethod(function copyDir(source, target, callback) {

	// Create the target directory if needed
	alchemy.createDir(target, function(err, made) {
		ncp(source, target, callback);
	});
});

/**
 * Create a directory
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.1.0
 *
 * @param    {string}   target     The target path
 * @param    {Function} callback   The function to call when done
 *
 * @return   {Promise}
 */
Alchemy.setMethod(function createDir(target, callback) {

	let promise = mkdirp(target);

	if (callback) {
		Pledge.done(promise, callback);
	}

	return promise;
});

/**
 * Return the key:items of the first object that are no longer in the second
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.3.22
 *
 * @param    {Object|Map}   first
 * @param    {Object|Map}   second
 *
 * @return   {Object}       The items in the first item that are not in the second
 */
Alchemy.setMethod(function getDifference(first, second) {

	let first_is_map = first instanceof Map,
	    second_is_map = second instanceof Map,
	    first_keys,
	    result = {},
	    first_val,
	    key,
	    val;

	if (first_is_map) {
		first_keys = [...first.keys()];
	} else {
		first_keys = Object.keys(first);
	}

	for (key of first_keys) {

		if (second_is_map) {
			val = second.get(key);
		} else {
			val = second[key];
		}

		// If the key in the first item doesn't show up in the second item,
		// add it to the result
		if (typeof val === 'undefined') {
			if (first_is_map) {
				first_val = first.get(key);
			} else {
				first_val = first[key];
			}

			result[key] = first_val;
		}
	}

	return result;
});

/**
 * Return the shared items
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.3.22
 *
 * @param    {Object|Map}   first
 * @param    {Object|Map}   second
 *
 * @return   {Object}   The items in the second item that are also in the first
 */
Alchemy.setMethod(function getShared(first, second) {

	let first_is_map = first instanceof Map,
	    second_is_map = second instanceof Map,
	    first_keys,
	    result = {},
	    key,
	    val;

	if (first_is_map) {
		first_keys = [...first.keys()];
	} else {
		first_keys = Object.keys(first);
	}

	for (key of first_keys) {

		if (second_is_map) {
			val = second.get(key);
		} else {
			val = second[key];
		}

		// If the key in the first item doesn't show up in the second item,
		// add it to the result
		if (typeof val !== 'undefined') {
			result[key] = val;
		}
	}

	return result;
});

/**
 * Make JSON-Dry handle ObjectIDs when drying
 * (Old class name)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
JSON.registerDrier('ObjectID', function dryOI(holder, key, value) {
	return ''+value;
}, {add_path: false});

/**
 * Correctly un-dry ObjectIDs
 * (Old class name)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  0.2.0
 */
JSON.registerUndrier('ObjectID', function undryOI(holder, key, value) {
	return alchemy.castObjectId(value);
});

/**
 * Make JSON-Dry handle ObjectIds when drying
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 */
JSON.registerDrier('ObjectId', function dryOI(holder, key, value) {
	return ''+value;
}, {add_path: false});

/**
 * Correctly un-dry ObjectIds
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 */
JSON.registerUndrier('ObjectId', function undryOI(holder, key, value) {
	return alchemy.castObjectId(value);
});

/**
 * Monkey-patch checksum support to the ObjectId class
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 */
if (typeof mongo?.ObjectId == 'function') {
	Function.setMethod(mongo.ObjectId, Blast.checksumSymbol, function checksum() {
		return this.toString();
	});
}

/**
 * Create a new ObjectId
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.16
 * @version  1.3.16
 *
 * @param    {*}   object_id
 *
 * @return   {ObjectId}
 */
Alchemy.setMethod(function ObjectId(object_id) {
	return new mongo.ObjectId(object_id);
});

/**
 * Get mimetype info of a file
 * 
 * @deprecated Use Classes.Alchemy.Inode.File.getMimetype(path)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.3.0
 *
 * @param    {string}   filepath   A path to the file
 * @param    {Function} callback
 *
 * @return   {Pledge<string>}
 */
Alchemy.setMethod(function getMimetype(filepath, callback) {
	const pledge = Classes.Alchemy.Inode.File.getMimetype(filepath);
	pledge.done(callback);
	return pledge;
});

/**
 * Get a medhash
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {string}    file_path   A path to the file
 * @param    {Object}    options
 */
Alchemy.setMethod(function getMedhash(file_path, options) {

	var do_full,
	    sample_size,
	    sample,
	    digest,
	    stat,
	    size,
	    fd;

	if (!options) {
		options = {};
	}

	if (!options.threshold) {
		options.threshold = 128 * 1024;
	}

	if (!options.sample) {
		options.sample = 16 * 1024;
	}

	sample_size = options.sample;

	return Function.series(function getStat(next) {

		if (options.stat) {
			if (options.stat.then) {
				options.stat.then(function gotValue(val) {
					stat = val;
					next();
				});
			} else {
				stat = options.stat;
				next();
			}

			return;
		}

		fs.stat(file_path, function gotStat(err, result) {

			if (err) {
				return doClose(next, err);
			}

			stat = result;
			next();
		});
	}, function gotSize(next) {

		// The size of the file
		size = stat.size;

		if (size < options.threshold || sample_size < 1) {
			do_full = true;
		}

		// Open the file descriptor
		fs.open(file_path, 'r', function gotFd(err, result) {

			if (err) {
				return doClose(next, err);
			}

			fd = result;
			next();
		});

	}, function firstSample(next) {

		if (do_full) {
			return alchemy.hashFile(fd).done(next);
		}

		sample = new Buffer(sample_size * 3);

		fs.read(fd, sample, 0, sample_size, 0, next);

	}, function secondSample(next, first) {

		if (do_full) {
			digest = first;
			return next();
		}

		fs.read(fd, sample, sample_size, sample_size, ~~(size / 2), next);

	}, function thirdSample(next) {

		if (do_full) {
			return next();
		}

		fs.read(fd, sample, sample_size, sample_size, size - sample_size, next);

	}, function doHash(next) {

		if (do_full) {
			return doClose(next);
		}

		alchemy.hashFile(sample).done(function gotResult(err, result) {

			if (err) {
				return doClose(next, err);
			}

			digest = result;

			doClose(next);
		});
	}, function done(err) {

		if (err) {
			return;
		}

		return size.toString(16) + digest;
	});

	// Function to close the descriptor
	function doClose(next, err) {
		if (fd > 0 && file_path !== fd) {
			fs.close(fd, function closed() {
				// Ignore errors
				next(err);
			});
		} else {
			next(err);
		}
	}
});

/**
 * Hash the given file_path using the given hash
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.7
 * @version  1.3.0
 *
 * @param    {string}   file_path
 * @param    {Object}   options
 */
Alchemy.setMethod(function hashFile(file_path, options) {

	var stream_options = {},
	    digest_type,
	    hash_algorithm;

	if (!options) {
		options = {};
	}

	if (typeof options == 'string') {
		options = {
			type : options
		};
	}

	hash_algorithm = options.algorithm || options.type || alchemy.settings.data_management.file_hash_algorithm || 'sha1';
	digest_type = options.digest_type || 'hex';

	let checksum = crypto.createHash(hash_algorithm),
	    pledge = new Pledge(),
	    stream;

	if (typeof file_path == 'number') {
		stream_options.fd = file_path;
		stream_options.autoClose = false;
		file_path = '';
	}

	if (Buffer.isBuffer(file_path)) {
		checksum.update(file_path);
		pledge.resolve(checksum.digest(digest_type));
	} else {
		// Start reading the file
		stream = fs.createReadStream(file_path, stream_options);

		// Update the checksum on data
		stream.on('data', function updateDigest(d) {
			checksum.update(d);
		});

		// When it's done, send the hexadecimal digest
		stream.on('end', function finalizeDigest() {
			pledge.resolve(checksum.digest(digest_type));
		});
	}

	return pledge;
});

/**
 * Get file statistics
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {string}   path      Path to stat
 * @param    {Object}   options
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function statPath(path, options) {

	if (options && options.stat && typeof options.stat == 'object') {
		return Pledge.resolve(options.stat);
	}

	let pledge = new Pledge();

	fs.stat(path, function gotStats(err, stats) {

		if (err) {
			return pledge.reject(err);
		}

		pledge.resolve(stats);
	});

	return pledge;
});

/**
 * Get basic file information
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.3.0
 *
 * @param    {string}   filePath   A path to the file
 * @param    {Object}   options
 * @param    {Function} callback
 */
Alchemy.setMethod(function getFileInfo(filePath, options, callback) {

	var tasks = {};

	if (typeof filePath !== 'string') {
		return callback(new Error('Unable to get file info: given path is empty'));
	}

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	// Use sha1 as hashing default
	if (typeof options.hash == 'undefined' || options.hash === true) {
		options.hash = alchemy.settings.data_management.file_hash_algorithm || 'sha1';
	}

	// Get basic file information
	tasks.stat = this.statPath(filePath);

	// Prepare a function to calculate the hash if it's wanted
	if (options.hash == 'medhash') {
		tasks.hash = function getMedHash(next) {
			alchemy.getMedhash(filePath, {stat: tasks.stat}).done(next);
		};
	} else if (options.hash) {
		tasks.hash = this.hashFile(filePath, options.hash);
	}

	// Get the filename
	tasks.filename = function getFilename(next) {
		var pieces = filePath.split('/');
		next(null, pieces[pieces.length-1]);
	};

	// Get the extension
	tasks.extension = function getExtension(next) {
		var pieces = filePath.split('.'),
		    extension = null;

		if (pieces.length > 1) {
			extension = pieces[pieces.length-1];
		}

		next(null, extension);
	};

	// Get the mime type
	tasks.mimetype = function getMimetype(next) {
		alchemy.getMimetype(filePath, next);
	};

	Function.parallel(tasks, function doneInfoTasks(err, result) {

		if (err) {
			return callback(err);
		}

		let pieces,
		    stat = result.stat;

		// Remove the stat object from the result object
		delete result.stat;

		// Set the size
		result.size = stat.size;

		// Uid
		result.uid = stat.uid;
		result.gid = stat.gid;

		// Dates
		result.atime = stat.atime;
		result.mtime = stat.mtime;
		result.ctime = stat.ctime;
		result.birthtime = stat.birthtime;

		// Get the name without extension
		pieces = result.filename.split('.');

		// Remove the last piece, the extension
		pieces.splice(pieces.length-1, 1);

		// Join again
		result.name = pieces.join('.');

		callback(null, result);
	});
});

/**
 * Move or copy a file
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.0.5
 *
 * @param    {string}   source     Origin path
 * @param    {string}   target     Target path
 * @param    {Function} cb
 */
function mcFile(type, source, target, cb) {

	var targetDir,
	    bin,
	    cmd;

	if (type == 'cp' || type == 'copy') {
		bin = '/bin/cp';
	} else if (type == 'mv' || type == 'move') {
		bin = '/bin/mv';
	}

	// We assume the last piece of the target is the file name
	// Split the string by slashes
	targetDir = target.split('/');

	// Remove the last piece
	targetDir.splice(targetDir.length-1, 1);

	// Join it again
	targetDir = targetDir.join('/');

	// Make sure the target directory exists
	alchemy.createDir(targetDir, function ensuredDir(err) {

		if (err) {
			return cb(err);
		}

		spawnQueue.add(function queuecp(done) {

			var options = [];

			if (process.platform == 'linux') {
				options = ['--no-target-directory', source, target];
			} else {
				if (source.endsWith('/')) {
					source = source.slice(0, -1);
				}

				if (target.endsWith('/')) {
					target = target.slice(0, -1);
				}

				options = [source, target];
			}

			cmd = child.execFile(bin, options);

			cmd.on('exit', function onExit(code, signal) {

				var message;

				done();

				if (code > 0) {
					message = 'File "' + type + '" operation failed:\n';
					message += bin + ' ' + options.join(' ');

					cb(new Error(message));
				} else {
					cb(null);
				}
			});
		});
	});
};

/**
 * Copy a file
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {string}   source     Origin path
 * @param    {string}   target     Target path
 * @param    {Function} cb
 */
Alchemy.setMethod(function copyFile(source, target, cb) {
	mcFile('cp', source, target, cb);
});

/**
 * Make an HTTP(S) request
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.2.0
 * @version  1.1.0
 *
 * @param    {string}   url       The url
 * @param    {Object}   options
 * @param    {Function} callback  Callback
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function request(url, options, callback) {

	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	if (url && options) {
		options.url = url;
	} else {
		if (typeof url == 'string' || url instanceof Classes.RURL) {
			options = {
				url : url
			};
		} else {
			options = url;
		}
	}

	url = Classes.RURL.parse(options.url);
	options.url = url;

	return Blast.fetch(options, callback);
});

/**
 * Download a file
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 *
 * @param    {string}   url
 *
 * @return   {Pledge<File>}
 */
Alchemy.setMethod(function download(url, options) {

	const pledge = new Pledge();

	// Get the file
	Blast.fetch({url, get_stream: true}, async function gotStream(err, res, output) {

		if (err) {
			return pledge.reject(err);
		}

		if (res.statusCode == 404) {
			err = new Error('Path "' + url + '" does not exist');
			err.number = 404;
			return pledge.reject(err);
		}

		if (options?.type && res.headers['content-type']) {
			if (res.headers['content-type'].indexOf(options.type) < 0) {

				err = new Error('Received unexpected filetype');
				err.number = 500;

				return pledge.reject(err);
			}
		}

		let name;

		if (res.headers['content-disposition']) {
			let disposition = res.headers['content-disposition'],
			    pieces = disposition.split(';'),
			    temp,
			    i;

			for (i = 0; i < pieces.length; i++) {
				temp = String.decodeAttributes(pieces[i], ',');

				if (temp && temp.filename) {
					name = temp.filename;
					break;
				}
			}
		}

		if (!name) {
			name = libpath.parse(url).base;

			if (name && name.indexOf('?') > -1) {
				name = name.before('?');
			}

			if (!name) {
				name = alchemy.ObjectId();
			}
		}

		if (name.indexOf('/') > -1) {
			name = name.replaceAll('/', '-');
		}

		let temp_dir = await Blast.createTempDir({prefix: 'aldl'}),
		    full_path = libpath.resolve(temp_dir, name);
		
		let write_stream = fs.createWriteStream(full_path);

		if (output) {
			// Pipe the response stream into the file
			output.pipe(write_stream);
		} else {
			write_stream.end('');
		}

		// Wait for it to finish writing to the temp file
		write_stream.on('finish', async function writeFinished() {

			try {
				let file = await Classes.Alchemy.Inode.Inode.from(full_path);
				pledge.resolve(file);
			} catch (err) {
				pledge.reject(err);
			}
		});
	});

	return pledge;
});

/**
 * Download a url to a temporary location
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  1.3.0
 * 
 * @deprecated   Use `download` instead
 *
 * @param    {string}   url       The url
 * @param    {Object}   options
 * @param    {Function} callback  Callback
 */
Alchemy.setMethod(function downloadFile(url, options, callback) {

	if (typeof options == 'function') {
		callback = options;
		options = null;
	}

	let pledge = this.download(url, options);
	pledge.done(callback);
	return pledge;
});

/**
 * Move a file
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {string}   source     Origin path
 * @param    {string}   target     Target path
 * @param    {Function} cb
 */
Alchemy.setMethod(function moveFile(source, target, cb) {
	mcFile('mv', source, target, cb);
});

/**
 * Return the first path that works
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.0.5
 * @version  1.0.7
 *
 * @param    {string}   name             The name of the binary
 * @param    {string}   preferred_path   The preferred path
 * @param    {Array}    fallbacks        Optional fallbacks
 *
 * @return   {string}
 */
Alchemy.setMethod(function findPathToBinarySync(name, preferred_path, fallbacks) {

	var temp,
	    i;

	if (preferred_path) {
		if (fs.existsSync(preferred_path)) {
			return preferred_path;
		}
	}

	fallbacks = Array.cast(fallbacks);

	temp = '/usr/local/bin/' + name;

	if (fallbacks.indexOf(temp) == -1) {
		fallbacks.push(temp);
	}

	temp = '/usr/bin/' + name;

	if (fallbacks.indexOf(temp) == -1) {
		fallbacks.push(temp);
	}

	temp = '/bin/' + name;

	if (fallbacks.indexOf(temp) == -1) {
		fallbacks.push(temp);
	}

	for (i = 0; i < fallbacks.length; i++) {
		if (fs.existsSync(fallbacks[i])) {
			return fallbacks[i];
		}
	}

	return false;
});

var shown_list_warning = false;

/**
 * Create a list, an array with extra methods
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  1.0.7
 * @deprecated
 */
Alchemy.setMethod(function List() {

	if (!shown_list_warning) {
		log.warn('Alchemy#List() is deprecated');
		shown_list_warning = true;
	}

	// Create a new array
	var result = Array.apply(Array, arguments);

	// Add our modified toString method
	result.toString = listToString;

	return result;
});

function listToString() {
	return this[0];
}

/**
 * Get the current time in nanoseconds
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @return   {number}
 */
Alchemy.setMethod(function nanotime() {
	var hrTime = process.hrtime();
	return hrTime[0] * 1000000000 + hrTime[1];
});

/**
 * Start a very precise timer
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @return   {string}   name
 */
Alchemy.setMethod(function time(name) {

	// Prepare the entry first, before starting the clock
	if (!timers[name]) {
		timers[name] = {
			total: 0,
			first: this.nanotime()
		};
	}

	// Start the timer
	timers[name].start = this.nanotime();
});

/**
 * End a very precise timer,
 * output the duration since the start to the console
 * and return the duration too.
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @return   {string}   name
 */
Alchemy.setMethod(function timeEnd(name, showNano, extra, iterated) {

	// Immediately stop the timer
	var stop   = this.nanotime(),
	    diff   = stop - timers[name].start,
	    extra  = extra || '';

	if (iterated) {
		diff = diff / iterated;
	}

	// Increase the total
	timers[name].total += diff;

	if (!showNano) {
		diff = ~~(diff / 1000);
		console.log('Timer ' + name + ' in ' + diff + ' µs ' + extra);
	} else {
		console.log('Timer ' + name + ' in ' + diff + ' ns ' + extra);
	}

	return diff;
});

/**
 * Get the total of all the registered durations for the given name
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @return   {string}   name
 */
Alchemy.setMethod(function timeTotal(name, showNano) {

	var total = timers[name].total;

	if (!showNano) {
		total = ~~(total / 1000);
		console.log('Timer ' + name + ' total spent ' + total + ' µs');
	} else {
		console.log('Timer ' + name + ' total spent ' + total + ' ns');
	}

	return total;
});

/**
 * Set some variable that should always be sent to the client.
 * (The value will be serialized once and then cached, so it should not change)
 * Alias method for Hawkejs#exposeStatic()
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}    name
 * @param    {Object}    value
 */
Alchemy.setMethod(function exposeStatic(name, value) {
	alchemy.hawkejs.exposeStatic(name, value);
});

/**
 * Expose the default static variables
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.3.1
 */
Alchemy.setMethod(function exposeDefaultStaticVariables() {

	let model_info = [],
	    model_code = '',
	    hawkejs = alchemy.hawkejs,
	    models = Model.getAllChildren(),
		info,
	    i;

	for (i = 0; i < models.length; i++) {
		info = models[i].getClientConfig();
		model_info.push(info);
	}

	// Sort the models by their ancestor count
	model_info.sortByPath(1, 'ancestors');

	model_code = `function inheritModel(parent, child) {
		return Classes.Hawkejs.Model.getClass(child, true, parent);
	}\n`;

	for (let info of model_info) {
		model_code += 'inheritModel(' + JSON.stringify(info.parent) + ', ' + JSON.stringify(info.name) + ')\n';
	}

	// Expose the model configuration
	hawkejs.exposeStatic('model_info', model_info);

	Blast.require('client_models', {
		after    : 'helper_model/model',
		resolver : async function getExportedFunction() {
			return model_code;
		},
		client : true,
		server : false,
	});

	this.exposeRouteData();

	// Expose breadcrumb info
	hawkejs.exposeStatic('breadcrumb_info', Router.getBreadcrumbInfo());

	// Expose prefixes
	hawkejs.exposeStatic('prefixes', Prefix.all());

	const websockets = alchemy.settings.network.use_websockets;

	// Are websockets enabled?
	if (!websockets || websockets == 'optional' || websockets == 'never') {
		hawkejs.exposeStatic('enable_websockets', false);
	} else {
		hawkejs.exposeStatic('enable_websockets', true);
	}

	// Expose the layout settings
	hawkejs.exposeStatic('alchemy_layout', alchemy.settings.frontend.ui.layout);

	let app_version = alchemy.package.version;

	// The current app version
	if (alchemy.environment == 'dev') {
		app_version = ''+Date.now();
	}

	hawkejs.exposeStatic('app_version', app_version);
	hawkejs.app_version = app_version;

	// Emit as a global event so plugins can also expose their data
	this.emit('generate_static_variables', hawkejs);

	this[HAS_EXPOSED] = true;
});

/**
 * Regenerate exposed route data
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Alchemy.setMethod(function exposeRouteData() {

	const hawkejs = alchemy.hawkejs;

	// Expose router options
	hawkejs.exposeStatic('router_options', Router.getOptions());

	// Expose basic HTTP routes
	hawkejs.exposeStatic('routes', Router.getRoutes());

	// Expose socket routes
	hawkejs.exposeStatic('socket_routes', Router.getSocketRoutes());
});


/**
 * Flush the exposed route data
 * (Will only regenerate if default static variables haven't been generated yet)
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.3.0
 * @version  1.3.0
 */
Alchemy.setMethod(function checkExposedRouteData() {

	if (!this[HAS_EXPOSED]) {
		return;
	}

	this.exposeRouteData();
});

/**
 * Read directory contents
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.0
 * @version  1.1.0
 *
 * @param    {string}   path
 * @param    {Object}   options
 *
 * @return   {Pledge}
 */
Alchemy.setMethod(function readDir(path, options) {

	var fs_config = {},
	    list;

	if (!options) {
		options = {};
	}

	if (options.encoding) {
		fs_config.encoding = options.encoding;
	}

	if (options.recursive === true) {
		options.recursive = Infinity;
	}

	if (options.recursive == null) {
		options.recursive = 0;
	}

	let pledge = Function.series(function getEntries(next) {
		fs.readdir(path, fs_config, next);
	}, function gotEntries(next, entries) {

		if (options.simple) {
			return next(null, entries);
		}

		let tasks = [];

		for (let name of entries) {
			tasks.push(function gotFileInfo(next) {
				Classes.Alchemy.Inode.Inode.process([path, name], null, next);
			});
		}

		Function.parallel(4, tasks, next);

	}, function gotInodes(next, inodes) {

		if (options.simple) {
			list = inodes;
			return next(null);
		}

		list = new Classes.Alchemy.Inode.List(inodes);

		if (!options.recursive) {
			return next(null);
		}

		list.loadDirContents({recursive: options.recursive}).then(function done() {
			next();
		}).catch(function caught(err) {
			next(err);
		});

	}, function done(err) {

		if (err) {
			return;
		}

		return list;
	});

	return pledge;
});

/**
 * Connect to another alchemy instance
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    0.1.0
 * @version  0.4.0
 */
Alchemy.setMethod(function callServer(address, data, callback) {

	var server = new Classes.ClientSocket();

	server.reconnect = false;

	server.connect(address, data, callback);

	return server;
});
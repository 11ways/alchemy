'use strict';

var mkdirp       = alchemy.use('mkdirp'),
    ncp          = alchemy.use('ncp').ncp,
    fs           = alchemy.use('fs'),
    path         = alchemy.use('path'),
    child        = alchemy.use('child_process'),
    crypto       = alchemy.use('crypto'),
    mongo        = alchemy.use('mongodb'),
    Url          = alchemy.use('url'),
    http         = alchemy.use('http'),
    https        = alchemy.use('https'),
    queues       = {},
    timers       = {},
    lpQueue      = 0,
    moduledirs,
    spawnQueue,
    Magic;

// Create a queue for functions opening files
spawnQueue = Function.createQueue();

// Limit to 500 open files
spawnQueue.limit = 500;

// Start the queue
spawnQueue.start();

/**
 * Attach a conduit to a certain instance
 * 
 * @author   Jelle De Loecker   <jelle@develry.be>
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param   {String}   modelName
 * @param   {Object}   options
 *
 * @return  {Model}
 */
Informer.setMethod(function getModel(modelName, options) {

	var instance;

	if (!this._modelInstances) {
		this._modelInstances = {};
	} else {
		instance = this._modelInstances[modelName];
	}

	// If an instance already exists on this item,
	// and it has the same conduit (or none), return that
	if (instance && (instance.conduit == this.conduit)) {
		return instance;
	}

	instance = Model.get(modelName, options);

	if (this.conduit) {
		instance.attachConduit(this.conduit);
	}

	if (this._debugObject) {
		instance._debugObject = this._debugObject;
	}

	this._modelInstances[modelName] = instance;

	return instance;
});

/**
 * Create a debug entry
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param   {Number}   verbosity
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
	if (!alchemy.settings.debug && options.verbosity > log.ERROR) {
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

	if (!duplicate && alchemy.settings.debug && options.data && options.data.args) {
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 *
 * @param   {String}   message
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
		//this.activeMark.stop();
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {Function}   fnc
 * @param    {Number}     wait   How long to wait before executing
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
 * Pick a translation
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.5.0
 *
 * @param    {String|Array}    prefix       The prefix to get
 * @param    {Object}          choices      The available choices
 * @param    {Boolean}         allow_empty  Empty strings are not allowed by default
 */
Alchemy.setMethod(function pickTranslation(_prefix, choices, allow_empty) {

	var prefixes,
	    result,
	    prefix,
	    i;

	if (!choices) {
		return {result: choices};
	}

	// You can't look for translations in a string
	if (typeof choices === 'string') {
		return {result: choices};
	}

	if (_prefix) {
		prefixes = Array.cast(_prefix);
	}

	if (!prefixes || !prefixes.length) {
		prefixes = Object.keys(choices);
	}

	for (i = 0; i < prefixes.length; i++) {
		prefix = prefixes[i];
		result = choices[prefix];

		if (result || (allow_empty && (result == '' || result == null))) {
			break;
		}
	}

	return {prefix, result};
});

/**
 * Copy a directory
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param   {String}   source     The source path
 * @param   {String}   target     The target path
 * @param   {Function} callback   The function to call when done
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param   {String}   target     The target path
 * @param   {Function} callback   The function to call when done
 */
Alchemy.setMethod(function createDir(target, callback) {

	if (!callback) {
		callback = function(){};
	}

	mkdirp(target, callback);
});

/**
 * Return the key:items of the first object that are no longer in the second
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {Object}
 * @param    {Object}
 *
 * @return   {Object}   The items in the first item that are not in the second
 */
Alchemy.setMethod(function getDifference(first, second) {

	var key,
	    result = {};

	for (key in first) {

		// If the key in the first item doesn't show up in the second item,
		// add it to the result
		if (typeof second[key] === 'undefined') {
			result[key] = first[key];
		}
	}

	return result;
});

/**
 * Return the shared items
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {Object}
 * @param    {Object}
 *
 * @return   {Object}   The items in the second item that are also in the first
 */
Alchemy.setMethod(function getShared(first, second) {

	var key,
	    result = {};

	for (key in first) {

		if (typeof second[key] !== 'undefined') {
			result[key] = second[key];
		}
	}

	return result;
});

/**
 * Make JSON-Dry handle ObjectIDs when drying
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
JSON.registerDrier('ObjectID', function dryOI(holder, key, value) {
	return ''+value;
}, {add_path: false});

/**
 * Correctly un-dry ObjectIDs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.2.0
 */
JSON.registerUndrier('ObjectID', function undryOI(holder, key, value) {
	return mongo.ObjectID(value);
});

alchemy.ObjectId = mongo.ObjectID;

/**
 * Get mimetype info of a file
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  0.4.0
 *
 * @param    {String}   filePath   A path to the file
 * @param    {Function} callback
 */
Alchemy.setMethod(function getMimetype(filePath, callback) {

	var magic,
	    mmm = alchemy.use('mmmagic');

	if (!mmm) {
		return callback(new Error('The mmmagic module is not available'));
	}

	magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
	magic.detectFile(filePath, callback);
});

/**
 * Get a medhash
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {String}    file_path   A path to the file
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
				return next(err);
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
				return next(err);
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
			return next();
		}

		alchemy.hashFile(sample).done(function gotResult(err, result) {

			if (err) {
				return next(err);
			}

			digest = result;

			next();
		});
	}, function done(err) {

		if (fd != null) {
			fs.close(fd, Function.dummy);
		}

		if (err) {
			return;
		}

		return size.toString(16) + digest;
	});
});

/**
 * Hash the given file_path using the given hash
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.7
 * @version  1.0.7
 *
 * @param    {String}   file_path
 * @param    {Object}   options
 */
Alchemy.setMethod(function hashFile(file_path, options) {

	var stream_options = {},
	    digest_type,
	    type;

	if (!options) {
		options = {};
	}

	if (typeof options == 'string') {
		options = {
			type : options
		};
	}

	type = options.type || 'sha1';
	digest_type = options.digest_type || 'hex';

	let checksum = crypto.createHash(type),
	    pledge = new Pledge(),
	    stream;

	if (typeof file_path == 'number') {
		stream_options.fd = file_path;
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
 * Get basic file information
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.7
 *
 * @param    {String}   filePath   A path to the file
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
		options.hash = 'sha1';
	}

	let stat_pledge = new Pledge();

	// Prepare a function to calculate the hash if it's wanted
	if (options.hash == 'medhash') {
		tasks.hash = function getMedHash(next) {
			alchemy.getMedhash(filePath, {stat: stat_pledge}).done(next);
		};
	} else if (options.hash) {
		tasks.hash = this.hashFile(filePath, options.hash);
	}

	// Prepare a function for the stat information
	tasks.stat = function getStat(next) {
		fs.stat(filePath, function returnStats(err, stats) {

			if (err) {
				return next(err);
			}

			stat_pledge.resolve(stats);
			next(null, stats);
		});
	};

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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  1.0.5
 *
 * @param    {String}   source     Origin path
 * @param    {String}   target     Target path
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {String}   source     Origin path
 * @param    {String}   target     Target path
 * @param    {Function} cb
 */
Alchemy.setMethod(function copyFile(source, target, cb) {
	mcFile('cp', source, target, cb);
});

/**
 * Make an HTTP(S) request
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.2.0
 * @version  1.0.0
 *
 * @param    {String}   url       The url
 * @param    {Object}   options
 * @param    {Function} callback  Callback
 */
Alchemy.setMethod(function request(url, options, callback) {

	var url_object,
	    protocol,
	    headers,
	    config,
	    req;

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	// Extract needed information from the URL
	url_object = RURL.parse(url);

	// Get the correct library to create the request
	if (url_object.protocol == 'https:') {
		protocol = https;
	} else {
		protocol = http;
	}

	headers = Object.assign({}, options.headers);

	// Create the config object for the request
	config = {
		headers: headers,
		host: url_object.hostname,
		path: url_object.pathname + url_object.search,
		port: url_object.port
	};

	req = protocol.request(config, function gotResponse(res) {

		// Set the request options on the response object
		res.request_options = options;

		// Follow redirects if there are any
		if (res.statusCode > 299 && res.statusCode < 400) {

			// Store this url as the first url, if it hasn't been set yet
			if (options.first_url == null) {
				options.first_url = url;
			}

			// Set the redirect count
			if (options.redirect_count == null) {
				options.redirect_count = 0;
			} else if (options.redirect_count > 10) {
				return callback(new Error('Too many redirects'));
			}

			// Increase the redirect count
			options.redirect_count++;

			// Add the previous url as the referrer
			options.headers.referrer = '' + url;

			return request(res.headers['location'], options, callback);
		}

		callback(null, res);
	});

	req.on('error', function gotRequestError(err) {
		callback(err);
	});

	// Initialize the request
	req.end();
});

/**
 * Download a url to a temporary location
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  0.4.1
 *
 * @param    {String}   url       The url
 * @param    {Object}   options
 * @param    {Function} callback  Callback
 */
Alchemy.setMethod(function downloadFile(url, options, callback) {

	var filepath,
	    options,
	    name,
	    file,
	    res;

	if (typeof options === 'function') {
		callback = options;
		options = {};
	} else if (!options && typeof options !== 'object') {
		options = {};
	}

	if (typeof callback !== 'function') {
		callback = Function.thrower;
	}

	// Get the file
	Blast.fetch({url, get_stream: true}, function gotStream(err, res, output) {

		if (err) {
			return callback(err);
		}

		if (res.headers['content-disposition']) {
			let disposition = res.headers['content-disposition'],
			    pieces = disposition.split(';'),
			    temp,
			    i;

			for (i = 0; i < pieces.length; i++) {
				temp = String.decodeAttributes(pieces[i]);

				if (temp && temp.filename) {
					name = temp.filename;
					break;
				}
			}
		}

		if (!name) {
			name = path.parse(url).base;

			if (name && name.indexOf('?') > -1) {
				name = name.before('?');
			}

			if (!name) {
				name = alchemy.ObjectId();
			}
		}

		// Construct a temporary file path
		filepath = '/tmp/alchemy_' + Crypto.pseudoHex(8) + '_' + name;

		// Open the temp file
		file = fs.createWriteStream(filepath);

		if (res.statusCode == 404) {
			err = new Error('Path does not exist');
			err.number = 404;

			return callback(err);
		}

		if (options.type && res.headers['content-type']) {
			if (res.headers['content-type'].indexOf(options.type) < 0) {

				err = new Error('Received unexpected filetype');
				err.number = 500;

				return callback(err);
			}
		}

		// @todo: maybe implement content-type for downloaded file, too?
		// Because webservers can lie about filetypes

		// Pipe the response stream into the file
		output.pipe(file);

		// Close the file when finished and callback
		file.on('finish', function writeFinished() {
			callback(null, filepath, name);
		});
	});
});

/**
 * Move a file
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @param    {String}   source     Origin path
 * @param    {String}   target     Target path
 * @param    {Function} cb
 */
Alchemy.setMethod(function moveFile(source, target, cb) {
	mcFile('mv', source, target, cb);
});

/**
 * Return the first path that works
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.5
 * @version  1.0.5
 *
 * @param    {String}   name             The name of the binary
 * @param    {String}   preferred_path   The preferred path
 * @param    {Array}    fallbacks        Optional fallbacks
 *
 * @return   {String}
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

	for (i = 0; i < fallbacks.length; i++) {
		if (fs.existsSync(fallbacks[i])) {
			return fallbacks[i];
		}
	}

	return false;
});

/**
 * Create a list, an array with extra methods
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 */
Alchemy.setMethod(function List() {

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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @return   {Number}
 */
Alchemy.setMethod(function nanotime() {
	var hrTime = process.hrtime();
	return hrTime[0] * 1000000000 + hrTime[1];
});

/**
 * Start a very precise timer
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @return   {String}   name
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @return   {String}   name
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
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.0.1
 * @version  0.4.0
 *
 * @return   {String}   name
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
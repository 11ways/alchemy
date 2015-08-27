var mkdirp       = alchemy.use('mkdirp'),
    ncp          = alchemy.use('ncp').ncp,
    fs           = alchemy.use('fs'),
    path         = alchemy.use('path'),
    child        = alchemy.use('child_process'),
    crypto       = alchemy.use('crypto'),
    mmm          = alchemy.use('mmmagic'),
    mongo        = alchemy.use('mongodb'),
    Url          = alchemy.use('url'),
    http         = alchemy.use('http'),
    https        = alchemy.use('https'),
    Blast        = __Protoblast,
    queues       = {},
    timers       = {},
    lpQueue      = 0,
    moduledirs,
    spawnQueue,
    Magic;

if (mmm != null) {
	Magic = mmm.Magic;
}

// Create a queue for functions opening files
spawnQueue = Function.createQueue();

// Limit to 500 open files
spawnQueue.limit = 500;

// Start the queue
spawnQueue.start();

/**
 * Attach a conduit to a certain instance
 * 
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Conduit}   conduit
 */
Informer.setMethod(function attachConduit(conduit) {
	this.conduit = conduit;
});

/**
 * Get a model, attach a conduit if possible
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
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
	if (!alchemy.settings.config.debug && options.verbosity > log.ERROR) {
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param   {String}   message
 */
Informer.setMethod(function debugMark(message) {
	if (this._debugObject) {
		this._debugObject.mark(message);
	}
});

var Debugger = Function.inherits(function Debugger(conduit, type, verbosity, level) {

	// Store the conduit
	this.conduit = conduit;

	// When this started during the request
	this.start = this.time();

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
		type: this.type,
		title: this.title,
		start: this.start,
		end: this.end,
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

Debugger.setMethod(function mark(message) {

	if (this.activeMark != null) {
		this.activeMark.stop();
	}

	// If the message is false, we just wanted to end the previous mark
	if (!message) {
		return;
	}

	this.activeMark = this.debug('mark', {title: message});
});

Debugger.setMethod(function debug(type, data, verbosity) {

	var item;

	if (typeof verbosity != 'number') {
		verbosity = log.INFO;
	}

	item = new Debugger(this.conduit, type, verbosity, this.level + 1);
	item.data = data;
	item.parent = this;

	if (data && data.title) {
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Function}   fnc
 * @param    {Number}     wait   How long to wait before executing
 */
alchemy.lowPriority = function lowPriority(fnc, wait) {

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
};

/**
 * Do something when alchemy is ready
 * Right now it just waits for db connections
 * 
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param   {Function} fnc   The function to execute
 *
 * @returns {Boolean}  If the function was executed immediately or not
 */
alchemy.ready = function ready (fnc) {
	alchemy.sputnik.after(['startServer', 'datasources', 'listening'], function() {
		fnc();
	});
};

var _duplicateCheck = {};

/**
 * Resolve the provided arguments to a useable path string.
 * Only used strings, discards objects.
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {string}   pathToDirs      The path containing the dirs to load
 */
alchemy.pathResolve = function pathResolve (pathToDirs) {
	
	var i, path = alchemy.use('path');
	
	// If there are multiple arguments, resolve them into one path
	if (arguments.length > 1) {
		
		pathArguments = [];
		
		for (i in arguments) {
			if (typeof arguments[i] == 'string') pathArguments.push(arguments[i]);
		}
		
		if (pathArguments.length > 1) {
			pathToDirs = path.resolve.apply(null, pathArguments);
		}
	}
	
	return pathToDirs;
}

/**
 * Start all the loaded plugins
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {String|Array}    prefix    The prefix to get
 * @param    {Object}          choices   The available choices
 * @param    {Boolean}         beStrict
 */
alchemy.pickTranslation = function pickTranslation(prefix, choices, beStrict) {

	var i, result;

	if (typeof prefix === 'function' && prefix.name == 'renderCallback') {
		prefix = Array.cast(prefix.prefix).concat(prefix.fallback);
	}

	if (typeof choices === 'string') {
		if (beStrict) {
			return;
		} else {
			return choices;
		}
	}

	if (Array.isArray(prefix)) {
		for (i = 0; i < prefix.length; i++) {
			
			result = this.pickTranslation(prefix[i], choices);

			// If the result has been found, and is filled in, use it
			if (result) {
				break;
			}
		}
	} else {
		result = choices[prefix];
	}

	return result;
};

/**
 * Copy a directory
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   source     The source path
 * @param   {String}   target     The target path
 * @param   {Function} callback   The function to call when done
 */
alchemy.copyDir = function copyDir(source, target, callback) {

	// Create the target directory if needed
	alchemy.createDir(target, function(err, made) {
		ncp(source, target, callback);
	});
};

/**
 * Create a directory
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   target     The target path
 * @param   {Function} callback   The function to call when done
 */
alchemy.createDir = function createDir(target, callback) {

	if (!callback) {
		callback = function(){};
	}

	mkdirp(target, callback);
};

var sharedObjects = {};

/**
 * Create a shared object
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param   {String}   name   The name of the object to get
 * @param   {String}   type   The type to create (array or object)
 *
 * @return  {Object|Array}
 */
alchemy.shared = function shared(name, type, value) {

	if (typeof type !== 'string') {
		value = type;
		type = 'object';
	}

	// Create it if it doesn't exist
	if (!sharedObjects[name]) {
		if (type === 'array' || type === 'Array') {
			sharedObjects[name] = value || [];
		} else {
			sharedObjects[name] = value || {};
		}
	}

	return sharedObjects[name];
};

/**
 * Return the key:items of the first object that are no longer in the second
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}
 * @param    {Object}
 *
 * @return   {Object}   The items in the first item that are not in the second
 */
alchemy.getDifference = function getDifference(first, second) {

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
};

/**
 * Return the shared items
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}
 * @param    {Object}
 *
 * @return   {Object}   The items in the second item that are also in the first
 */
alchemy.getShared = function getShared(first, second) {

	var key,
	    result = {};

	for (key in first) {

		if (typeof second[key] !== 'undefined') {
			result[key] = second[key];
		}
	}

	return result;
};

/**
 * Make JSON-Dry handle ObjectIDs when drying
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
JSON.registerDrier('ObjectID', function dryOI(holder, key, value) {
	return ''+value;
}, {add_path: false});

/**
 * Correctly un-dry ObjectIDs
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
JSON.registerUndrier('ObjectID', function undryOI(holder, key, value) {
	return mongo.ObjectID(value);
});

alchemy.ObjectId = mongo.ObjectID;

/**
 * Get an object id,
 * return false if no valid data was given (instead of throwing an error)
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.castObjectId = function castObjectId(obj) {

	var type = typeof obj;

	if (obj && type === 'object' && obj.constructor && obj.constructor.name === 'ObjectID') {
		return obj;
	} else if (type === 'string' && obj.isObjectId()) {
		return alchemy.ObjectId(obj);
	}

	return undefined;
};

/**
 * Get basic file information
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   filePath   A path to the file
 * @param    {Object}   options
 * @param    {Function} callback
 */
alchemy.getFileInfo = function getFileInfo(filePath, options, callback) {

	var tasks = {};

	if (typeof filePath !== 'string') {
		return callback(new Error('No valid file path given!'));
	}

	if (typeof options == 'function') {
		callback = options;
		options = {};
	}

	// Use sha1 as hashing default
	if (typeof options.hash == 'undefined') {
		options.hash = 'sha1';
	}

	// Prepare a function to calculate the hash if it's wanted
	if (options.hash) {
		tasks.hash = function getHash(next) {

			var checksum = crypto.createHash(options.hash),
			    stream;

			// Start reading the file
			stream = fs.ReadStream(filePath);

			// Update the checksum on data
			stream.on('data', function updateDigest(d) {
				checksum.update(d);
			});

			// When it's done, send the hexadecimal digest
			stream.on('end', function finalizeDigest() {
				next(null, checksum.digest('hex'));
			});
		};
	}

	// Prepare a function for the stat information
	tasks.stat = function getStat(next) {
		fs.stat(filePath, function returnStats(err, stats) {
			next(err, stats);
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

		var magic = new Magic(mmm.MAGIC_MIME_TYPE);

		magic.detectFile(filePath, function(err, result) {
			next(err, result);
		});
	};

	Function.parallel(tasks, function(err, result) {

		var pieces;

		if (err) {
			return callback(err);
		}

		// Set the size
		result.size = result.stat.size;

		// Remove the stat object
		delete result.stat;

		// Get the name without extension
		pieces = result.filename.split('.');

		// Remove the last piece, the extension
		pieces.splice(pieces.length-1, 1);

		// Join again
		result.name = pieces.join('.');

		callback(null, result);
	});
};

/**
 * Move or copy a file
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
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

			cmd = child.execFile(bin, ['--no-target-directory', source, target]);

			cmd.on('exit', function(code, signal) {

				done();

				if (code > 0) {
					cb(new Error('Failed to copy file'));
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
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   source     Origin path
 * @param    {String}   target     Target path
 * @param    {Function} cb
 */
alchemy.copyFile = function copyFile(source, target, cb) {
	mcFile('cp', source, target, cb);
};

/**
 * Download a url to a temporary location
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    0.1.0
 * @version  1.0.0
 *
 * @param    {String}   url       The url
 * @param    {Object}   options
 * @param    {Function} callback  Callback
 */
alchemy.downloadFile = function downloadFile(url, options, callback) {

	var filepath,
	    protocol,
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
		callback = function(){};
	}

	if (url.slice(0, 5) == 'https') {
		protocol = https;
	} else {
		protocol = http;
	}

	name = path.parse(url).base;

	if (name && name.indexOf('?') > -1) {
		name = name.before('?');
	}

	if (!name) {
		name = alchemy.ObjectId();
	}

	// Construct a temporary file path
	filepath = '/tmp/' + name;

	// Open the temp file
	file = fs.createWriteStream(filepath);

	// Initiate the get
	protocol.get(url, function gotResponse(res) {

		var e;

		if (res.statusCode == 404) {
			e = new Error('Path does not exist');
			e.number = 404;

			return callback(e);
		}

		if (options.type && res.headers['content-type']) {
			if (res.headers['content-type'].indexOf(options.type) < 0) {

				e = new Error('Received unexpected filetype');
				e.number = 500;

				return callback(e);
			}
		}

		// @todo: maybe implement content-type for downloaded file, too?
		// Because webservers can lie about filetypes

		// Pipe the response stream into the file
		res.pipe(file);

		// Close the file when finished and callback
		file.on('finish', function writeFinished() {
			callback(null, filepath);
		});
	});
};

/**
 * Move a file
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  1.0.0
 *
 * @param    {String}   source     Origin path
 * @param    {String}   target     Target path
 * @param    {Function} cb
 */
alchemy.moveFile = function moveFile(source, target, cb) {
	mcFile('mv', source, target, cb);
};

/**
 * Create a list, an array with extra methods
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 */
alchemy.List = function List() {

	// Create a new array
	var result = Array.apply(Array, arguments);

	// Add our modified toString method
	result.toString = listToString;

	return result;
};

function listToString() {
	return this[0];
}

/**
 * Create an object that can be diffed
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   obj
 */
alchemy.preDiff = function preDiff(obj) {

	var result,
	    key;

	if (Array.isArray(obj)) {
		result = [];
	} else {
		result = {};
	}

	for (key in obj) {
		// Only allow own properties
		if (obj.hasOwnProperty(key)) {

			if (typeof obj[key] === 'object' && obj[key]) {

				switch (obj[key].constructor.name) {

					// Recurse objects
					case 'Object':
					case 'Array':
						result[key] = preDiff(obj[key]);
						break;

					// Copy simple objects
					case 'RegExp':
					case 'Date':
						result[key] = obj[key];
						break;

					case 'ObjectID':
						result[key] = '__diff_ObjectID_' + String(obj[key]);
						break;

					default:
						result[key] = String(obj[key]);

				}
			} else {
				result[key] = obj[key];
			}
		}
	}

	return result;
};

/**
 * Transform a diff delta object that can be saved in the database
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @param    {Object}   obj
 */
alchemy.postDiff = function postDiff(obj) {

	var result,
	    key;

	if (Array.isArray(obj)) {
		result = [];
	} else {
		result = {};
	}

	for (key in obj) {
		
		if (typeof obj[key] === 'object' && obj[key]) {

			switch (obj[key].constructor.name) {

				// Recurse objects
				case 'Object':
				case 'Array':
					result[key] = postDiff(obj[key]);
					break;

				default:
					result[key] = obj[key];

			}
		} else if (typeof obj[key] === 'string') {

			if (obj[key].indexOf('__diff_ObjectID_') === 0) {
				result[key] = alchemy.castObjectId(obj[key].replace('__diff_ObjectID_', ''));
			} else {
				result[key] = obj[key];
			}
		} else {
			result[key] = obj[key];
		}
	}

	return result;
};

/**
 * Get the current time in nanoseconds
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {Number}
 */
alchemy.nanotime = function nanotime() {
	var hrTime = process.hrtime();
	return hrTime[0] * 1000000000 + hrTime[1];
};

/**
 * Start a very precise timer
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {String}   name
 */
alchemy.time = function time(name) {

	// Prepare the entry first, before starting the clock
	if (!timers[name]) {
		timers[name] = {
			total: 0,
			first: alchemy.nanotime()
		};
	}

	// Start the timer
	timers[name].start = alchemy.nanotime();
};

/**
 * End a very precise timer,
 * output the duration since the start to the console
 * and return the duration too.
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {String}   name
 */
alchemy.timeEnd = function timeEnd(name, showNano, extra, iterated) {

	// Immediately stop the timer
	var stop   = alchemy.nanotime(),
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
};

/**
 * Get the total of all the registered durations for the given name
 *
 * @author   Jelle De Loecker   <jelle@codedor.be>
 * @since    0.0.1
 * @version  0.0.1
 *
 * @return   {String}   name
 */
alchemy.timeTotal = function timeTotal(name, showNano) {

	var total = timers[name].total;

	if (!showNano) {
		total = ~~(total / 1000);
		console.log('Timer ' + name + ' total spent ' + total + ' µs');
	} else {
		console.log('Timer ' + name + ' total spent ' + total + ' ns');
	}

	return total;
};
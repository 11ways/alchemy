/**
 * Path definition parser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
var PathDefinition = Function.inherits('Alchemy.Base', function PathDefinition(path, options) {

	var tokens,
	    i;

	// Store the original path
	this.path = path;
	this.source = path;

	// Store the key tokens
	this.key_tokens = [];

	// Store the key names
	this.keys = [];

	// Path options
	this.options = options || {};

	// Get the tokens
	tokens = this.parse(path);

	if (!this.regex) {
		// Compile the regex
		this.regex = this.tokensToRegexp(tokens, this.key_tokens);

		for (i = 0; i < this.key_tokens.length; i++) {
			this.keys[i] = this.key_tokens[i].name;
		}
	}
});

/**
 * The main path matching regexp utility
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
PathDefinition.setStatic('path_regexp', RegExp([
	// Match escaped characters that would otherwise appear in future matches.
	// This allows the user to escape special characters that won't transform.
	'(\\\\.)',
	// Match Express-style parameters and un-named parameters with a prefix
	// and optional suffixes. Matches appear as:
	//
	// "/{test(\\d+)}?"    => ["{test(\\d+)}?",    undefined, undefined,    "test",    "\\d+", undefined, "?"]
	// "/route(\\d+)"      => ["(\\d+)",           undefined, undefined,    undefined, undefined, "\\d+", undefined]
	// "/{[ObjectId]test}" => ["{[ObjectId]test}", undefined, "ObjectId",   "test",    undefined, undefined, undefined]
	'(?:{(?:\\[((?:\\w+\\.?)+)\\])?(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))}?([+*?])?'
].join('|'), 'g'));

/**
 * Type definition testers
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 */
PathDefinition.setStatic('typedefs', {});

/**
 * Register a type (like ObjectId or Number)
 *
 * @param   {String}   name
 * @param   {Function} fnc
 */
PathDefinition.setStatic(function registerType(name, fnc) {

	if (typeof name == 'function') {
		fnc = name;
		name = fnc.name;
	}

	this.typedefs[name] = fnc;
});

/**
 * Escape a regular expression string.
 *
 * @param  {String}   group
 *
 * @return {String}
 */
PathDefinition.setStatic(function escapeGroup(group) {
	return group.replace(/([=!:$/()])/g, '\\$1')
});

/**
 * Escape the capturing group by escaping special characters and meaning.
 *
 * @param  {String}   str
 *
 * @return {String}
 */
PathDefinition.setStatic(function escapeString(str) {
	return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, '\\$1')
});

/**
 * Get the complete section identifier
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 */
PathDefinition.setMethod(function parse(str, options) {

	var default_delimiter = (options && options.delimiter) || '/',
	    path_escaped      = false,
	    delimiters        = (options && options.delimiters) || './',
	    delimiter,
	    modifier,
	    optional,
	    partial,
	    pattern,
	    capture,
	    escaped,
	    typedef,
	    repeat,
	    offset,
	    tokens            = [],
	    index             = 0,
	    token,
	    group,
	    match,
	    name,
	    next,
	    prev,
	    path              = '',
	    key               = 0,
	    res,
	    k;

	if (RegExp.isRegExp(str)) {
		this.regex = str;
		this.from_regex = true;
		return;
	}

	while ((res = PathDefinition.path_regexp.exec(str)) != null) {
		match   = res[0];
		escaped = res[1];
		typedef = res[2];
		offset  = res.index;

		// Add everything from the last found index to this found one
		path += str.slice(index, offset);

		// Increase the index with the matched length
		index = offset + match.length;

		if (escaped) {
			path += escaped[1];
			path_escaped = true;
			continue;
		}

		prev     = '';
		next     = str[index];
		name     = res[3];
		capture  = res[4];
		group    = res[5];
		modifier = res[6];

		if (!path_escaped && path.length) {
			k = path.length - 1;

			if (delimiters.indexOf(path[k]) > -1) {
				prev = path[k];
				path = path.slice(0, k);
			}
		}

		if (path) {
			tokens.push(path);
			path = '';
			path_escaped = false;
		}

		partial   = prev !== '' && next !== undefined && next !== prev;
		repeat    = modifier === '+' || modifier === '*';
		optional  = modifier === '?' || modifier === '*';
		delimiter = prev || default_delimiter;
		pattern   = capture || group;

		if (pattern) {
			pattern = PathDefinition.escapeGroup(pattern);
		} else {
			pattern = '[^' + PathDefinition.escapeString(delimiter) + ']+?';
		}

		if (typedef && typedef.indexOf('.') > -1) {
			typedef = typedef.split('.');
		}

		token = {
			name       : name || key++,
			prefix     : prev,
			delimiter  : delimiter,
			optional   : optional,
			typedef    : typedef,
			repeat     : repeat,
			partial    : partial,
			pattern    : pattern
		};

		tokens.push(token);
	}

	// Push any remaining characters
	if (path || index < str.length) {
		tokens.push(path + str.substr(index));
	}

	return tokens;
});

/**
 * Convert tokens to regular expression
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Array}   tokens
 * @param    {Array}   keys      The keys will be stored in here
 * @param    {Object}  options
 */
PathDefinition.setMethod(function tokensToRegexp(tokens, keys, options) {

	var is_end_delimited = false,
	    delimiters,
	    delimiter,
	    capture,
	    prefix,
	    strict,
	    route = '',
	    token,
	    end,
	    i;

	options = options || {};
	delimiters = options.delimiters || './';
	delimiter = PathDefinition.escapeString(options.delimiter || '/');

	if (options.end != null) {
		end = options.end;
	} else if (this.options.end != null) {
		end = this.options.end;
	} else {
		end = false;
	}

	// Iterate over the tokens and create the regexp
	for (i = 0; i < tokens.length; i++) {
		token = tokens[i];

		if (typeof token == 'string') {
			route += PathDefinition.escapeString(token);

			if (i === tokens.length - 1 && delimiter.indexOf(token[token.length - 1]) > -1) {
				is_end_delimited = true;
			} else {
				is_end_delimited = false;
			}
		} else {
			prefix = PathDefinition.escapeString(token.prefix);

			if (token.repeat) {
				capture = '(?:' + token.pattern + ')(?:' + prefix + '(?:' + token.pattern + '))*';
			} else {
				capture = token.pattern;
			}

			if (keys) {
				keys.push(token);
			}

			if (token.optional) {
				if (token.partial) {
					route += prefix + '(' + capture + ')?';
				} else {
					route += '(?:' + prefix + '(' + capture + '))?';
				}
			} else {
				route += prefix + '(' + capture + ')';
			}
		}
	}

	if (end) {
		if (!strict) {
			route += '(?:' + delimiter + ')?';
		}

		route += '$';
	} else {
		if (!strict) {
			route += '(?:' + delimiter + '(?=' + '$' + '))?';
		}

		if (!is_end_delimited) {
			route += '(?=' + delimiter + '|' + '$' + ')';
		}
	}

	return RegExp('^' + route, 'i');
});

/**
 * Get parameters object
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {Array}   values
 *
 * @return   {Object}
 */
PathDefinition.setMethod(function getParametersObject(values, all_info) {

	var result = {},
	    key,
	    i;

	// Paths made from a regex have no named parameters, just store them under their index
	if (this.from_regex) {
		for (i = 0; i < values.length; i++) {
			result[i] = values[i].value;
		}

		return result;
	}

	for (i = 0; i < this.keys.length; i++) {
		key = this.keys[i];

		if (all_info) {
			result[key] = values[i];
		} else {
			result[key] = values[i].value;
		}
	}

	return result;
});

/**
 * Test the given string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   path
 *
 * @return   {Array|Pledge}
 */
PathDefinition.setMethod(function test(path, conduit) {

	var that = this,
	    reject,
	    values,
	    result,
	    pledge,
	    tasks;

	// See if it matches & get the values
	values = this.regex.exec(path);

	if (!values) {
		return null;
	}

	// Remove the first part of the value, it's just the match
	values.shift();

	// Create a new array
	result = new Array(values.length);
	tasks = [];

	// Iterate over the rest of the found values
	values.forEach(function eachValue(value, index) {

		var type_check,
		    TypeChecker,
		    token,
		    entry;

		if (reject) {
			return;
		}

		token = that.key_tokens[index] || {};

		entry = {
			name   : token.name,
			value  : value
		};

		if (token.typedef) {
			type_check = that.checkType(value, token.typedef, token, conduit);

			if (typeof type_check === 'undefined') {
				reject = true;
				return;
			}

			entry.original_value = value;
			entry.value = type_check;

			if (type_check && type_check.then) {
				tasks.push(function waitForCheck(next) {
					type_check.then(function gotValue(value) {

						if (value == null) {
							// Returning with an error still fucks shit up
							//return next(new Error('Path definition type check returned null'));
							reject = true;
							return next();
						}

						entry.value = value;
						next();
					});

					type_check.catch(function onError(err) {
						next(err);
					});
				});
			}
		}

		result[index] = entry;
	});

	// Something made reject truthy,
	// so return null
	if (reject) {
		return null;
	}

	// If there are tasks, return the pledge
	if (tasks.length) {
		pledge = Function.parallel(tasks, function done(err) {

			if (err) {
				return null;
			}

			if (reject) {
				return null;
			}

			return result;
		});

		return pledge;
	}

	return result;
});

/**
 * Get the type checker
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.1.0
 *
 * @param    {String|Array}   typedef
 *
 * @return   {Function}
 */
PathDefinition.setMethod(function checkType(value, typedef, token, conduit) {

	var class_name,
	    field_name,
	    TypeClass,
	    is_string = typeof typedef === 'string',
	    result,
	    Model;

	if (is_string && PathDefinition.typedefs[typedef]) {
		result = PathDefinition.typedefs[typedef](value, token.name, conduit);
	} else {

		Model = Blast.Classes.Alchemy.Model || Blast.Classes.Alchemy.Client.Model;

		if (is_string) {
			class_name = typedef;
		} else {
			class_name = typedef[0];
			field_name = typedef[1];
		}

		TypeClass = Object.path(Model, class_name) || Object.path(Blast.Classes.Alchemy, class_name) || Object.path(Blast.Classes, class_name);

		if (TypeClass && TypeClass.checkPathValue) {
			result = TypeClass.checkPathValue(value, token.name, field_name, conduit);
		}
	}

	return result;
});

/**
 * Make sure it's a valid ObjectId string
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   value
 *
 * @return   {String}
 */
PathDefinition.registerType(function ObjectId(value) {
	if (value.isObjectId()) {
		return value;
	}
});

/**
 * Make sure it's a number
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.0.0
 *
 * @param    {String}   value
 *
 * @return   {Number}
 */
PathDefinition.registerType(function Number(value) {
	if (Classes.Number.isNumeric(value)) {
		return Classes.Number(value);
	}
});
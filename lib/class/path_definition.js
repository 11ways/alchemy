/**
 * Path definition parser
 *
 * @author   Jelle De Loecker   <jelle@develry.be>
 * @since    1.0.0
 * @version  1.3.0
 */
const PathDefinition = Function.inherits('Alchemy.Base', function PathDefinition(path, options) {

	// Store the original path
	this.path = path;
	this.source = path;

	// Store the key tokens
	this.key_tokens = [];

	// Store the param definitions
	this.param_definitions = null;

	// Store the key names
	this.keys = [];

	// Path options
	this.options = options || {};

	// The prefix of this path
	this.prefix = this.options.prefix;

	// Get the tokens
	let tokens = this.parse(path);

	if (!this.regex) {
		let i;

		// Compile the regex
		this.regex = this.tokensToRegexp(tokens, this.key_tokens);

		for (i = 0; i < this.key_tokens.length; i++) {
			this.keys[i] = this.key_tokens[i].name;
		}

		this.param_definitions = Classes.Alchemy.PathParamDefinition.from(this.key_tokens);
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
 * @version  1.1.0
 *
 * @param    {Array}   values
 * @param    {String}  info_type
 *
 * @return   {Object}
 */
PathDefinition.setMethod(function getParametersObject(values, info_type) {

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

	let all_info = info_type == 'all_info',
	    original_value = info_type == 'original_value';

	for (i = 0; i < this.keys.length; i++) {
		key = this.keys[i];

		if (all_info) {
			result[key] = values[i];
		} else if (original_value) {
			result[key] = values[i].original_value;
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
 * @version  1.3.0
 *
 * @param    {String}   path
 *
 * @return   {Array|Pledge}
 */
PathDefinition.setMethod(function test(path, conduit) {

	const values = this.regex.exec(path);

	if (!values) {
		return null;
	}

	// Remove the first part of the value, it's just the match
	values.shift();

	let result = new Array(values.length),
	    do_await = false;

	// Iterate over the rest of the found values
	for (let index = 0; index < values.length; index++) {

		let value = RURL.decodeUriSegment(values[index]);
		let param_def = this.param_definitions?.[index];

		// There will be no param definition for regex-style matching
		if (!param_def) {
			let token = this.key_tokens[index] || {};

			result[index] = {
				name           : token.name,
				value          : value,
				original_value : value
			};

			continue;
		}

		let entry = param_def.parsePathValue(value, conduit);

		// Return early when one of the checks fail
		if (!entry) {
			return null;
		}

		if (Pledge.isThenable(entry)) {
			do_await = true;
		} else if (entry.rejected) {
			return null;
		}

		result[index] = entry;
	}

	if (do_await) {

		return Function.parallel(result, (err, result) => {

			if (err) {
				return null;
			}

			let i;

			for (i = 0; i < result.length; i++) {
				if (result[i]?.rejected) {
					return null;
				}
			}

			return result;
		});
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
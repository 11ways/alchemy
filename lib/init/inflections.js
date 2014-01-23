/*
Copyright (c) 2010 Ryan Schuft (ryan.schuft@gmail.com)
Modified by Jelle De Loecker for Alchemy MVC (2013)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

/*
  This code is based in part on the work done in Ruby to support
  infection as part of Ruby on Rails in the ActiveSupport's Inflector
  and Inflections classes.  It was initally ported to Javascript by
  Ryan Schuft (ryan.schuft@gmail.com) in 2007.

  The code is available at http://code.google.com/p/inflection-js/

  The basic usage is:
    1. Include this script on your web page.
    2. Call functions on any String object in Javascript

  Currently implemented functions:

    String.pluralize(plural) == String
      renders a singular English language noun into its plural form
      normal results can be overridden by passing in an alternative

    String.singularize(singular) == String
      renders a plural English language noun into its singular form
      normal results can be overridden by passing in an alterative

    String.camelize(lowFirstLetter) == String
      renders a lower case underscored word into camel case
      the first letter of the result will be upper case unless you pass true
      also translates "/" into "::" (underscore does the opposite)

    String.underscore() == String
      renders a camel cased word into words seperated by underscores
      also translates "::" back into "/" (camelize does the opposite)

    String.humanize(lowFirstLetter) == String
      renders a lower case and underscored word into human readable form
      defaults to making the first letter capitalized unless you pass true

    String.capitalize() == String
      renders all characters to lower case and then makes the first upper

    String.dasherize() == String
      renders all underbars and spaces as dashes

    String.titleize() == String
      renders words into title casing (as for book titles)

    String.demodulize() == String
      renders class names that are prepended by modules into just the class

    String.tableize() == String
      renders camel cased singular words into their underscored plural form

    String.classify() == String
      renders an underscored plural word into its camel cased singular form

    String.foreign_key(dropIdUbar) == String
      renders a class name (camel cased singular noun) into a foreign key
      defaults to seperating the class from the id with an underbar unless
      you pass true

    String.ordinalize() == String
      renders all numbers found in the string into their sequence like "22nd"
*/

// We'll store the object.defineProperty function in here later on
var defineProperty = false;

/*
  This sets up a container for some constants in its own namespace
  We use the window (if available) to enable dynamic loading of this script
  Window won't necessarily exist for non-browsers.
*/
if (typeof window !== 'undefined' && !window.InflectionJS) {
	
  window.InflectionJS = null;
	
	// See if this browser supports Object.defineProperty propperly
	if(navigator.appName.indexOf("Internet Explorer")!=-1){
		
    var oldIE = (
      navigator.appVersion.indexOf("MSIE 9")==-1 &&   //v9 is ok
      navigator.appVersion.indexOf("MSIE 1")==-1      //v10, 11, 12, etc. is fine too
    );

    if(oldIE){
      defineProperty = function (obj, prop_name, settings) {
				// We only use value for now, not get or set
				obj[prop_name] = settings.value;
			}
    }
	}
}

// If defineProperty still isn't set, we can use the original Object.defineProperty
if (!defineProperty) {
	defineProperty = function defineProperty () {
		Object.defineProperty.apply(this, arguments);
	}
}

/*
  This sets up some constants for later use
  This should use the window namespace variable if available
*/
InflectionJS =
{
    /*
      This is a list of nouns that use the same form for both singular and plural.
      This list should remain entirely in lower case to correctly match Strings.
    */
    uncountable_words: [
        'equipment', 'information', 'rice', 'money', 'species', 'series',
        'fish', 'sheep', 'moose', 'deer', 'news'
    ],

    /*
      These rules translate from the singular form of a noun to its plural form.
    */
    plural_rules: [
        [new RegExp('(m)an$', 'gi'),                 '$1en'],
        [new RegExp('(pe)rson$', 'gi'),              '$1ople'],
        [new RegExp('(child)$', 'gi'),               '$1ren'],
        [new RegExp('^(ox)$', 'gi'),                 '$1en'],
        [new RegExp('(ax|test)is$', 'gi'),           '$1es'],
        [new RegExp('(octop|vir)us$', 'gi'),         '$1i'],
        [new RegExp('(alias|status)$', 'gi'),        '$1es'],
        [new RegExp('(bu)s$', 'gi'),                 '$1ses'],
        [new RegExp('(buffal|tomat|potat)o$', 'gi'), '$1oes'],
        [new RegExp('([ti])um$', 'gi'),              '$1a'],
        [new RegExp('sis$', 'gi'),                   'ses'],
        [new RegExp('(?:([^f])fe|([lr])f)$', 'gi'),  '$1$2ves'],
        [new RegExp('(hive)$', 'gi'),                '$1s'],
        [new RegExp('([^aeiouy]|qu)y$', 'gi'),       '$1ies'],
        [new RegExp('(x|ch|ss|sh)$', 'gi'),          '$1es'],
        [new RegExp('(matr|vert|ind)ix|ex$', 'gi'),  '$1ices'],
        [new RegExp('([m|l])ouse$', 'gi'),           '$1ice'],
        [new RegExp('(quiz)$', 'gi'),                '$1zes'],
        [new RegExp('s$', 'gi'),                     's'],
        [new RegExp('$', 'gi'),                      's']
    ],

    /*
      These rules translate from the plural form of a noun to its singular form.
    */
    singular_rules: [
        [new RegExp('(m)en$', 'gi'),                                                       '$1an'],
        [new RegExp('(pe)ople$', 'gi'),                                                    '$1rson'],
        [new RegExp('(child)ren$', 'gi'),                                                  '$1'],
        [new RegExp('([ti])a$', 'gi'),                                                     '$1um'],
        [new RegExp('((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$','gi'), '$1$2sis'],
        [new RegExp('(hive)s$', 'gi'),                                                     '$1'],
        [new RegExp('(tive)s$', 'gi'),                                                     '$1'],
        [new RegExp('(curve)s$', 'gi'),                                                    '$1'],
        [new RegExp('([lr])ves$', 'gi'),                                                   '$1f'],
        [new RegExp('([^fo])ves$', 'gi'),                                                  '$1fe'],
        [new RegExp('([^aeiouy]|qu)ies$', 'gi'),                                           '$1y'],
        [new RegExp('(s)eries$', 'gi'),                                                    '$1eries'],
        [new RegExp('(m)ovies$', 'gi'),                                                    '$1ovie'],
        [new RegExp('(x|ch|ss|sh)es$', 'gi'),                                              '$1'],
        [new RegExp('([m|l])ice$', 'gi'),                                                  '$1ouse'],
        [new RegExp('(bus)es$', 'gi'),                                                     '$1'],
        [new RegExp('(o)es$', 'gi'),                                                       '$1'],
        [new RegExp('(shoe)s$', 'gi'),                                                     '$1'],
        [new RegExp('(cris|ax|test)es$', 'gi'),                                            '$1is'],
        [new RegExp('(octop|vir)i$', 'gi'),                                                '$1us'],
        [new RegExp('(alias|status)es$', 'gi'),                                            '$1'],
        [new RegExp('^(ox)en', 'gi'),                                                      '$1'],
        [new RegExp('(vert|ind)ices$', 'gi'),                                              '$1ex'],
        [new RegExp('(matr)ices$', 'gi'),                                                  '$1ix'],
        [new RegExp('(quiz)zes$', 'gi'),                                                   '$1'],
        [new RegExp('s$', 'gi'),                                                           '']
    ],

    /*
      This is a list of words that should not be capitalized for title case
    */
    non_titlecased_words: [
        'and', 'or', 'nor', 'a', 'an', 'the', 'so', 'but', 'to', 'of', 'at',
        'by', 'from', 'into', 'on', 'onto', 'off', 'out', 'in', 'over',
        'with', 'for'
    ],

    /*
      These are regular expressions used for converting between String formats
    */
    id_suffix: new RegExp('(_ids|_id)$', 'g'),
    underbar: new RegExp('_', 'g'),
    space_or_underbar: new RegExp('[\ _]', 'g'),
    uppercase: new RegExp('([A-Z])', 'g'),
    underbar_prefix: new RegExp('^_'),
    
    /*
      This is a helper method that applies rules based replacement to a String
      Signature:
        InflectionJS.apply_rules(str, rules, skip, override) == String
      Arguments:
        str - String - String to modify and return based on the passed rules
        rules - Array: [RegExp, String] - Regexp to match paired with String to use for replacement
        skip - Array: [String] - Strings to skip if they match
        override - String (optional) - String to return as though this method succeeded (used to conform to APIs)
      Returns:
        String - passed String modified by passed rules
      Examples:
        InflectionJS.apply_rules("cows", InflectionJs.singular_rules) === 'cow'
    */
    apply_rules: function(str, rules, skip, override) {
			if (override) {
				str = override;
			} else {
				
				var ignore = (skip.indexOf(str.toLowerCase()) > -1);
				
				// Have we found a replacement?
				//var success = false;
				
				if (!ignore) {
					for (var x = 0; x < rules.length; x++) {
						if (str.match(rules[x][0])) {
							str = str.replace(rules[x][0], rules[x][1]);
							//success = true;
							break;
						}
					}
					
					// Make sure we return a useable string
					//if (!success) str = '' + str;
				}
			}

			// Make sure we return a useable string
			return '' + str;
    }
};

/**
 * Count the number of capital letters in the string
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 */
defineProperty(String.prototype, "capitals", {
	value: function capitals () {
		return this.replace(/[^A-Z]/g, '').length;
	},
	enumerable: false,
	configurable: false,
	writeable: false
});

/**
 * Add a postfix to a string if it isn't present yet
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 */
defineProperty(String.prototype, "postfix", {
	value: function postfix (postfix) {
		
		var str = this;
		
		// If the given postfix isn't a string, return
		if (typeof postfix != 'string') return str;
		
		// Append the postfix if it isn't present yet
		if (!str.endsWith(postfix)) str += postfix;
		
		return str;
	},
	enumerable: false,
	configurable: false,
	writeable: false
});

/**
 * Turn a string into a model name
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 */
defineProperty(String.prototype, "modelName", {
	value: function modelName (postfix) {
		
		if (this.toLowerCase == 'app') return 'App';
		if (postfix === true) postfix = 'Model';
		
		var str = this;
		var capitals = !!str.capitals();
		var underscores = !!(str.indexOf('_') > -1);
		
		// If there already are capitals, underscore the string
		if (capitals) {
			str = str.underscore();
			underscores = true;
		}
		
		// If there still are underscores, or there are no capitals,
		// we need to camelize the string
		if (underscores || !capitals) {
			str = str.camelize();
		}
		
		str = str.singularize();
		
		// Append the postfix
		if (postfix) {
			str = str.postfix(postfix);
		} else {
			// Do we need to strip "Model" away?
			if (str.endsWith('Model')) {
				str = str.slice(0, str.length-5);
			}
		}
		
		return str;
	},
	enumerable: false,
	configurable: false,
	writeable: false
});

/**
 * Turn a string into a controller name
 *
 * @author   Jelle De Loecker   <jelle@kipdola.be>
 * @since    0.0.1
 */
defineProperty(String.prototype, "controllerName", {
	value: function controllerName (postfix) {
		
		if (this.toLowerCase() === 'app') return 'App';
		else if (this.toLowerCase() == 'static') return 'Static';
		
		if (postfix === true) postfix = 'Controller';
		
		var str = this,
		    capitals = !!str.capitals(),
		    underscores = !!(str.indexOf('_') > -1);
		
		// If there already are capitals, underscore the string
		if (capitals) {
			str = str.underscore();
			underscores = true;
		}
		
		// If there still are underscores, or there are no capitals,
		// we need to camelize the string
		if (underscores || !capitals) {
			str = str.camelize();
		}

    // Do not pluralize 'static'
    if (!str.endsWith('Static')) {
		  str = str.pluralize();
    }
		
		// Append the postfix
		str = str.postfix(postfix);
		
		return str;
	},
	enumerable: false,
	configurable: false,
	writeable: false
});

/**
 * You can override this list for all Strings or just one depending on if you
 * set the new values on prototype or on a given String instance.
 */
defineProperty(String.prototype, "_uncountable_words", {
  value: InflectionJS.uncountable_words,
  configurable: true,
  enumerable: false,
  writeable: true
});


/**
 * You can override this list for all Strings or just one depending on if you
 * set the new values on prototype or on a given String instance.
 */
defineProperty(String.prototype, "_plural_rules", {
  value: InflectionJS.plural_rules,
  configurable: true,
  enumerable: false,
  writeable: true
});

/**
 * You can override this list for all Strings or just one depending on if you
 * set the new values on prototype or on a given String instance.
 */
defineProperty(String.prototype, "_singular_rules", {
  value: InflectionJS.singular_rules,
  configurable: true,
  enumerable: false,
  writeable: true
});

/**
 * You can override this list for all Strings or just one depending on if you
 * set the new values on prototype or on a given String instance.
 */
defineProperty(String.prototype, "_non_titlecased_words", {
  value: InflectionJS.non_titlecased_words,
  configurable: true,
  enumerable: false,
  writeable: true
});

/**
 * This function adds plurilization support to every String object
 *   Signature:
 *     String.pluralize(plural) == String
 *   Arguments:
 *     plural - String (optional) - overrides normal output with said String
 *   Returns:
 *     String - singular English language nouns are returned in plural form
 *   Examples:
 *     "person".pluralize() == "people"
 *     "octopus".pluralize() == "octopi"
 *     "Hat".pluralize() == "Hats"
 *     "person".pluralize("guys") == "guys"
 */
defineProperty(String.prototype, "pluralize", {
  value: function pluralize (plural) {
		return InflectionJS.apply_rules(
				this,
				this._plural_rules,
				this._uncountable_words,
				plural
		);
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds singularization support to every String object
    Signature:
      String.singularize(singular) == String
    Arguments:
      singular - String (optional) - overrides normal output with said String
    Returns:
      String - plural English language nouns are returned in singular form
    Examples:
      "people".singularize() == "person"
      "octopi".singularize() == "octopus"
      "Hats".singularize() == "Hat"
      "guys".singularize("person") == "person"
*/
defineProperty(String.prototype, "singularize", {
  value: function singularize (singular) {
		return InflectionJS.apply_rules(
				this,
				this._singular_rules,
				this._uncountable_words,
				singular
		);
  },
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds camelization support to every String object
    Signature:
      String.camelize(lowFirstLetter) == String
    Arguments:
      lowFirstLetter - boolean (optional) - default is to capitalize the first
        letter of the results... passing true will lowercase it
    Returns:
      String - lower case underscored words will be returned in camel case
        additionally '/' is translated to '::'
    Examples:
      "message_properties".camelize() == "MessageProperties"
      "message_properties".camelize(true) == "messageProperties"
*/
defineProperty(String.prototype, "camelize", {
  value: function camelize (lowFirstLetter) {

    var str = this;

    // If there are capitals, underscore this first
    if (str.capitals()) str = str.underscore();

		var str_path = str.split('/');
		for (var i = 0; i < str_path.length; i++)
		{
				var str_arr = str_path[i].split('_');
				var initX = ((lowFirstLetter && i + 1 === str_path.length) ? (1) : (0));
				for (var x = initX; x < str_arr.length; x++)
				{
						str_arr[x] = str_arr[x].charAt(0).toUpperCase() + str_arr[x].substring(1);
				}
				str_path[i] = str_arr.join('');
		}
		str = str_path.join('::');
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds underscore support to every String object
    Signature:
      String.underscore() == String
    Arguments:
      N/A
    Returns:
      String - camel cased words are returned as lower cased and underscored
        additionally '::' is translated to '/'
    Examples:
      "MessageProperties".camelize() == "message_properties"
      "messageProperties".underscore() == "message_properties"
*/
defineProperty(String.prototype, "underscore", {
  value: function underscore () {
		var str = this;
		var str_path = str.split('::');
		for (var i = 0; i < str_path.length; i++)
		{
				str_path[i] = str_path[i].replace(InflectionJS.uppercase, '_$1');
				str_path[i] = str_path[i].replace(InflectionJS.underbar_prefix, '');
		}
		str = str_path.join('/').toLowerCase();
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds humanize support to every String object
    Signature:
      String.humanize(lowFirstLetter) == String
    Arguments:
      lowFirstLetter - boolean (optional) - default is to capitalize the first
        letter of the results... passing true will lowercase it
    Returns:
      String - lower case underscored words will be returned in humanized form
    Examples:
      "message_properties".humanize() == "Message properties"
      "message_properties".humanize(true) == "message properties"
*/
defineProperty(String.prototype, "humanize", {
	value: function humanize (lowFirstLetter) {
		var str = this.toLowerCase(),
		    ori = str;

		str = str.replace(InflectionJS.id_suffix, '');

		if (!str) {
			str = ori;
		}

		str = str.replace(InflectionJS.underbar, ' ').trim();

		if (!lowFirstLetter) {
			str = str.capitalize();
		}

		return str;
	},
	configurable: true,
	enumerable: false,
	writeable: true
});

/*
  This function adds capitalization support to every String object
    Signature:
      String.capitalize() == String
    Arguments:
      N/A
    Returns:
      String - all characters will be lower case and the first will be upper
    Examples:
      "message_properties".capitalize() == "Message_properties"
      "message properties".capitalize() == "Message properties"
*/
defineProperty(String.prototype, "capitalize", {
  value: function capitalize () {
		var str = this.toLowerCase();
		str = str.substring(0, 1).toUpperCase() + str.substring(1);
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds dasherization support to every String object
    Signature:
      String.dasherize() == String
    Arguments:
      N/A
    Returns:
      String - replaces all spaces or underbars with dashes
    Examples:
      "message_properties".capitalize() == "message-properties"
      "Message Properties".capitalize() == "Message-Properties"
*/
defineProperty(String.prototype, "dasherize", {
  value: function dasherize () {
		var str = this;
		str = str.replace(InflectionJS.space_or_underbar, '-');
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds titleize support to every String object
    Signature:
      String.titleize() == String
    Arguments:
      N/A
    Returns:
      String - capitalizes words as you would for a book title
    Examples:
      "message_properties".titleize() == "Message Properties"
      "message properties to keep".titleize() == "Message Properties to Keep"
*/
defineProperty(String.prototype, "titleize", {
  value: function titleize () {
		var str = this.toLowerCase();
		str = str.replace(InflectionJS.underbar, ' ');
		var str_arr = str.split(' ');
		for (var x = 0; x < str_arr.length; x++)
		{
				var d = str_arr[x].split('-');
				for (var i = 0; i < d.length; i++)
				{
						if (this._non_titlecased_words.indexOf(d[i].toLowerCase()) < 0)
						{
								d[i] = d[i].capitalize();
						}
				}
				str_arr[x] = d.join('-');
		}
		str = str_arr.join(' ');
		str = str.substring(0, 1).toUpperCase() + str.substring(1);
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds demodulize support to every String object
    Signature:
      String.demodulize() == String
    Arguments:
      N/A
    Returns:
      String - removes module names leaving only class names (Ruby style)
    Examples:
      "Message::Bus::Properties".demodulize() == "Properties"
*/
defineProperty(String.prototype, "demodulize", {
  value: function demodulize () {
		var str = this;
		var str_arr = str.split('::');
		str = str_arr[str_arr.length - 1];
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds tableize support to every String object
    Signature:
      String.tableize() == String
    Arguments:
      N/A
    Returns:
      String - renders camel cased words into their underscored plural form
    Examples:
      "MessageBusProperty".tableize() == "message_bus_properties"
*/
defineProperty(String.prototype, "tableize", {
  value: function tableize () {
		var str = this;
		str = str.underscore().pluralize();
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds classification support to every String object
    Signature:
      String.classify() == String
    Arguments:
      N/A
    Returns:
      String - underscored plural nouns become the camel cased singular form
    Examples:
      "message_bus_properties".classify() == "MessageBusProperty"
*/
defineProperty(String.prototype, "classify", {
  value: function classify () {
		var str = this;
		str = str.camelize().singularize();
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds foreign key support to every String object
    Signature:
      String.foreign_key(dropIdUbar) == String
    Arguments:
      dropIdUbar - boolean (optional) - default is to seperate id with an
        underbar at the end of the class name, you can pass true to skip it
    Returns:
      String - camel cased singular class names become underscored with id
    Examples:
      "MessageBusProperty".foreign_key() == "message_bus_property_id"
      "MessageBusProperty".foreign_key(true) == "message_bus_propertyid"
*/
defineProperty(String.prototype, "foreign_key", {
  value: function foreign_key (dropIdUbar) {
		var str = this;
		str = str.demodulize().underscore() + ((dropIdUbar) ? ('') : ('_')) + 'id';
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/*
  This function adds ordinalize support to every String object
    Signature:
      String.ordinalize() == String
    Arguments:
      N/A
    Returns:
      String - renders all found numbers their sequence like "22nd"
    Examples:
      "the 1 pitch".ordinalize() == "the 1st pitch"
*/
defineProperty(String.prototype, "ordinalize", {
  value: function ordinalize () {
		var str = this;
		var str_arr = str.split(' ');
		for (var x = 0; x < str_arr.length; x++) {
			var i = parseInt(str_arr[x]);
			if (i === NaN)
			{
					var ltd = str_arr[x].substring(str_arr[x].length - 2);
					var ld = str_arr[x].substring(str_arr[x].length - 1);
					var suf = "th";
					if (ltd != "11" && ltd != "12" && ltd != "13")
					{
							if (ld === "1")
							{
									suf = "st";
							}
							else if (ld === "2")
							{
									suf = "nd";
							}
							else if (ld === "3")
							{
									suf = "rd";
							}
					}
					str_arr[x] += suf;
			}
		}
		str = str_arr.join(' ');
		return str;
	},
  configurable: true,
  enumerable: false,
  writeable: true
});

/**
 * Create a string without spaces
 */
defineProperty(String.prototype, "despace", {
  value: function despace() {
    var str = this;
    str = str.replace(/ /g, '_');
    return str;
  },
  configurable: true,
  enumerable: false,
  writeable: true
});

/**
 * See if a string is a valid hexadecimal number
 */
defineProperty(String.prototype, "isHex", {
  value: function isHex() {
    return !isNaN(Number('0x'+this));
  },
  configurable: false,
  enumerable: false,
  writeable: false
});

/**
 * See if a string is an objectid
 */
defineProperty(String.prototype, "isObjectId", {
  value: function isHex() {
    return this.length == 24 && !isNaN(Number('0x'+this));
  },
  configurable: false,
  enumerable: false,
  writeable: false
});

/**
 * See if a string starts with the given word
 */
defineProperty(String.prototype, "startsWith", {
  value: function startsWith (str) {
    return this.slice(0, str.length) == str;
  },
  configurable: false,
  enumerable: false,
  writeable: false
});

/**
 * See if a string ends with the given word
 */
defineProperty(String.prototype, "endsWith", {
  value: function endsWith (str) {
    return this.slice(-str.length) == str;
  },
  configurable: false,
  enumerable: false,
  writeable: false
});

/**
 * De-pluginify a string, returns an array
 */
defineProperty(String.prototype, "deplugin", {
  value: function deplugin (str) {
    var s = this.split('.');
		var any = false;
		var obj = {plugin: '', item: '', model: '', field: '', name: ''};
		
		if (typeof s[1] != 'undefined') {
			obj.plugin = obj.model = obj.name = s[0];
			obj.item = obj.field = s[1];
		} else {
			obj.item = obj.field = s[0];
		}
		
		return obj;
  },
  configurable: false,
  enumerable: false,
  writeable: false
});
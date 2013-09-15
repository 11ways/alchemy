module.exports = function alchemyFormHelpers (hawkejs) {
	
	// References
	var helpers = hawkejs.helpers;
	var form = helpers.form = {};

	/**
	 * Create the opening tag for a form
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}    modelName    The name of the model
	 * @param    {Object}    options      Extra options
	 */
	form.create = function(modelName, options) {
		
		var newAction = false;
		var actionType = '';
		var extraAttributes = '';
		
		// Create a link to the temporary object
		var t = this.scope.temp;
		
		// Create a link to the origin data
		var o = this.scope.variables.hawkejs;
		
		// Make sure the options object exists
		if (typeof options === 'undefined') options = {};
		
		// Set the default method (post)
		if (typeof options.method === 'undefined') options.method = 'post';

		// Enable ajax by default
		if (typeof options.ajax === 'undefined') options.ajax = true;
		
		if (options.method === 'file') {
			extraAttributes += ' enctype="multipart/form-data"';
			options.method = 'post';
		}
		
		t.form_data = false;
		
		if (modelName) {

			// Conform the modelName
			modelName = modelName.modelName();

			if (typeof options.data !== 'undefined') {
				t.form_data = options.data;
				this.scope.variables.__current__[modelName] = options.data;
			}	else if (typeof this.scope.variables.__current__[modelName] === 'object') {
				t.form_data = this.scope.variables.__current__[modelName];
			}
			
			// If we've been given model data, this is an edit form
			if (t.form_data	&& t.form_data['_id']) {
				actionType = 'edit';
			} else {
				actionType = 'add';
			}
			
			newAction = '/' + modelName.pluralize().underscore() + '/' + actionType;

		} else {
			// Take the current url as action
			newAction = o.originalUrl;
		}
		
		// If no action was set in the options, use this one
		if (typeof options.action === 'undefined') options.action = newAction;
		
		if (typeof options.prefix !== 'undefined') options.action = options.prefix + options.action;
		
		// If no id was given in the options, create one
		if (typeof options.id === 'undefined') options.id = modelName + actionType.capitalize() + 'Form';
		
		if (typeof t.form_helper === 'undefined') t.form_helper = {};
		
		// Indicate a form has been opened
		t.form_open = true;
		t.form_name = modelName;
		t.form_action = options.action;
		t.form_action_type = actionType;
		
		var html = '<form ';
		
		if (modelName) html += ' data-model-name="' + modelName + '" ';
		if (extraAttributes) html += extraAttributes;
		if (options.id) html += ' id="' + options.id + '"';
		if (options.method) html += ' method="' + options.method + '"';
		if (options.action) html += ' action="' + options.action + '"';
		if (options.ajax) html += ' data-hawkejs="form"';
		
		html += '>';
		
		this.scope.buf.push(html);
	}
	
	/**
	 * Create a form input
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {string}    inputName    The name for the optional submit button
	 * @param    {object}    options      Extra options
	 */
	form.input = function form_input (inputName, options) {
		
		// Create a link to the temporary object
		var t = this.scope.temp;
		
		var html = '';
		
		html += '<input type="text" data-field-name="' + inputName + '"';
		
		if (t.form_name) {
			html += ' name="data[' + t.form_name + '][' + inputName + ']"';
		} else {
			html += ' name="data[' + inputName + ']"';
		}
		
		if (t.form_open && t.form_name && t.form_data && typeof t.form_data[inputName] != 'undefined') {
			html += ' value="' + t.form_data[inputName] + '"';
		}
		
		html += '>';
		
		this.scope.buf.push(html);
	}
	
	
	/**
	 * Create the closing tag for a form
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {string}    buttonName   The name for the optional submit button
	 * @param    {object}    options      Extra options
	 */
	form.end = function form_end (buttonName, options) {
		
		var html = '';
		
		if (buttonName) html += '<input type="submit" value="' + buttonName + '" />';
		
		html += '</form>';
		
		this.scope.buf.push(html);
	}
	
	/**
	 * Generate an admin field (old style)
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.06
	 * @version  2013.02.13
	 *
	 * @param    {string}    name     The name of the field
	 * @param    {object}    options  The options
	 */
	form.adminField = function (name, options) {
		
		var modelBlueprint = options.blueprint;
		var blueprint = modelBlueprint[name];

		var selects = options.selects;
		
		options.field = name;
		
		var title = name;
		
		if (options.title) {
			title = options.title;
		}
		
		var value = '';
		var html = '<div class="control-group">';
		var linked_value_attributes = '';
		
		if (options.label == 1) {
			html += '<label class="control-label" for="' + name + '">' + title + '</label>';
		}
		
		html += '<div class="controls">';
		
		if (options.items && options.ofItem && options.field) {
			options.item = options.items[options.ofItem];
		}
		
		if (options.item && options.ofItem2) {
			if (options.item[options.ofItem2] !== undefined) {
				options.item = options.item[options.ofItem2];
			} else {
				options.item = false;
			}
		}
		
		if (options.item && options.field) {
			var item = options.item;
			var field = options.field;
			
			if (item[field] === undefined) {
				value = '';
			} else {
				value = item[field];
			}
		}
		
		// Do we need to get the value from somewhere?
		if (typeof blueprint.value != 'undefined') {
			linked_value_attributes += 'data-linked-value-change-type="' + blueprint.value.on.type + '" ';
			linked_value_attributes += 'data-linked-value-change-name="' + blueprint.value.on.name + '" ';
			linked_value_attributes += 'data-linked-value-path="' + escape(JSON.stringify(blueprint.value.path)) + '" ';
		}
		
		var selected = '';
		
		switch (blueprint.fieldType.toLowerCase()) {
			
			case 'select':
				html += '<select name="' + name + '" ' + linked_value_attributes + '>';
				var s = selects[blueprint.source.name];
				
				// Add an empty value if the field is not required
				if (!blueprint.required) {
					html += '<option value=""></option>';
				}

				if (blueprint.source.type == 'model') {
					for (var i in s) {
						
						selected = '';
						if (s[i]['_id'] == value) selected = 'selected';
						
						var oname = '';
						
						if (s[i]['title']) {
							oname = s[i]['title'];
						} else if (s[i]['name']) {
							oname = s[i]['name'];
						} else {
							oname = 'Nameless: ' + s[i]['_id'];
						}
						
						html += '<option value="' + s[i]['_id'] + '" ' + selected + '>' + helpers.encode(oname) + '</option>';
					}
				} else if (blueprint.source.type == 'memobject') {
					for (var i in s) {
						
						selected = '';
						if (s[i]['name'] == value) selected = 'selected';
						
						var iopt = '<option value="' + s[i]['name'] + '" ' + selected + '>' + s[i]['title'] + '</option>';

						html += iopt;
					}
				}
				html += '</select>';
				break;
			
			case 'json':
				html += '<input type="text" name="' + name + '" placeholder="' + title + '" value="' + helpers.encode(JSON.stringify(value)) + '" ' + linked_value_attributes + ' />';
				break;
			
			default:
				html += '<input type="text" name="' + name + '" placeholder="' + title + '" value="' + helpers.encode(value) + '" '  + linked_value_attributes + ' />';
				break;
		}
		
		html += '</div></div>';
		
		this.scope.buf.push(html);
	}
	
	/**
	 * Create a field based on blueprint settings
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {Object}    blueprint   The field blueprint
	 *
	 * @returns  {String}    The html
	 */
	form.blueprintField = function blueprintField (name, options) {

		if (typeof options.blueprint === 'undefined') return '';
		if (typeof options.return === 'undefined') options.return = false;
		
		var html      = '',
		    blueprint = options.blueprint,
		    construct = {},
		    t         = this.scope.temp;
		
		construct.return = true;
		construct.attributes = {};
		
		// Add source info, for where to get the elements of this field
		if (blueprint.source) {
			construct.sourceType = blueprint.source.type;
			construct.sourceName = blueprint.source.name;
		}

		construct.objectOf = blueprint.objectOf;
		construct.arrayOf  = blueprint.arrayOf;
		
		// Add custom attributes
		if (options.attributes) construct.attributes = options.attributes;
		
		// Add an id
		if (typeof construct.attributes.id === 'undefined') {
			construct.attributes.id = name + '-c' + 1/*hawkejs.helpers.getCount()*/;
		}
		
		if (typeof options.value !== 'undefined') {
			construct.value = options.value;
		} else if (t.form_data) {
			construct.value = t.form_data[name];
		} else if (options.item) {
			construct.value = options.item[name];
		}
		
		html = this.form.fieldInput(name, construct);

		if (options.return) return html;

		// We did not have to return it, so push it to the buffer
		this.scope.buf.push(html);

		// And emit an event
		//this.events.custom.push({name: 'create:element[blueprintField]', params: [options.attributes.id]});
	}
	
	/**
	 * Get an option for a select field
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.23
	 * @version  2013.02.23
	 *
	 * @param    {Object}    options  The options
	 *
	 * @returns  {String}    The html
	 */
	helpers.selectOption = function selectOption (element, options) {
		
		// Do nothing if the options isn't defined
		if (typeof options == 'undefined') options = {};
		
		// Set the _id as default value field
		if (typeof options.valueField == 'undefined') options.valueField = '_id';
		
		// Set the name as default name field
		if (typeof options.titleField == 'undefined') options.titleField = 'title';
		
		var cur_option_value;
		var html = '';
		
		if (options.valueField) {
			cur_option_value = element[options.valueField]
		} else {
			// If valueField is explicitly false, the value is the key
			cur_option_value = options._value;
		}
		
		// Reset the selected attribute
		selected = '';
		
		// Check given value?
		if (options.value !== false) {
			if (cur_option_value == options.value) selected = 'selected';
		}
		
		opttitle = '';
		
		if (options.titleField) {
			if (typeof element[options.titleField] != 'undefined') {
				opttitle = element[options.titleField];
			} else if (typeof element['name'] != 'undefined') {
				opttitle = element['name'];
			} else if (typeof element['title'] != 'undefined') {
				opttitle = element['title'];
			} else {
				opttitle = element[options.valueField];
			}
		} else {
			// If titleField is explicitly false, the title is the value
			opttitle = element;
		}

		html += '<option value="'
			+ cur_option_value
			+ '" ' + selected + '>'
			+ opttitle + '</option>\n';
			
		return html;
	}
	
	/**
	 * Create a select field
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.06
	 * @version  2013.02.23
	 *
	 * @param    {string}    name     The name of the field
	 * @param    {object}    options  The options
	 */
	form.fieldSelect = function fieldSelect (name, options) {
		
		var html = '';
		var title = false;
		var selected = '';
		var option = false;
		var opttitle = false;
		
		// Do nothing if the options isn't defined
		if (typeof options == 'undefined') return;
		
		// There is no select without elements
		if (typeof options.elements == 'undefined'
		    && typeof options.sourceName == 'undefined') return;
		
		// Add control group wrappers by default
		if (typeof options.wrapper == 'undefined') options.wrapper = true;
		
		// Do not return, but print out by default
		if (typeof options.return == 'undefined') options.return = false;
		
		// Enable a null parameter by default
		if (typeof options.null == 'undefined') options.null = true;
		
		// Check for value to select
		if (typeof options.value == 'undefined') options.value = false;
		
		// Don't add a label by default
		if (typeof options.label == 'undefined') options.label = false;
		
		// Enable a title by default
		if (typeof options.title == 'undefined') options.title = true;
		
		// There are no extra attributes by default
		if (typeof options.attributes == 'undefined') options.attributes = {};
		
		// There is no grouping by default
		if (typeof options.group == 'undefined') options.group = false;
		
		// This is a select field by default (select2 used hidden inputs)
		var elementType = 'select';
		
		// If no elements are given, but we do have a sourceName,
		// then we'll get the data via ajax.
		if (!options.elements && options.sourceName) {
			
			if (typeof options.sourceType == 'undefined') {
				options.sourceType = 'model';
			}
			
			// We're going to use select2, so the source element is an input
			elementType = 'input';
			
			options.elements = [];
			options.attributes['data-source-type'] = options.sourceType;
			options.attributes['data-source-name'] = options.sourceName;
			options.attributes['data-plugin'] = 'select2';
			options.attributes['type'] = 'hidden';
			
			if (options.null && options.null !== true) {
				options.attributes['placeholder'] = options.null;
			}
			
			if (options.value) options.attributes['value'] = hawkejs.helpers.encode(options.value);
		}
		
		// See what title to add
		if (options.title) {
			if (options.title !== true) {
				title = options.title;
			} else {
				title = name;
			}
		}
		
		// Start creating the select
		html = '<' + elementType + ' name="' + name + '" '
		
		for (var attribute_name in options.attributes) {
			html += attribute_name + '="' + hawkejs.helpers.encode(options.attributes[attribute_name]) + '" ';
		}
		
		html += '>\n';
		
		// If we want to group items together, we have to make sure they're propperly sorted
		if (options.group) {
			var original_elements = options.elements;
			var grouping = {};
			
			// first we add everything to their own groups
			for (var i in original_elements) {
				var element = original_elements[i];
				
				if (grouping[element[options.group]] == undefined) grouping[element[options.group]] = {};
				
				grouping[element[options.group]][i] = element;
			}
			
			// Reset the original elements
			options.elements = {};
			
			// Now we go over these groups again
			for (var group_name in grouping) {
				// Now go over every entry in this group
				for (var element_id in grouping[group_name]) {
					var gel = grouping[group_name][element_id];
					options.elements[element_id] = gel;
				}
			}
		}
		
		if (options.null && elementType == 'select') {
		
			if (options.null == true) {
				html += '<option value=""></option>';
			} else {
				html += '<option value="">' + options.null + '</option>';
			}
			
		}
		
		var current_group = false;
		
		// Add the options
		for (var i in options.elements) {
			
			option = options.elements[i];
			
			if (options.group) {
				if (current_group != option[options.group]) {
					current_group = option[options.group];
					
					// Close the previous optgroup, but only if it isn't the first time
					if (current_group !== false) html += '</optgroup>';
					html += '<optgroup label="' + option[options.group] + '">';
				}
			}
			
			if (options.valueField == false) {
				options._value = i;
			}
			
			html += hawkejs.helpers.selectOption(option, options);
			
		}
		
		// Make sure the last optgroup is closed
		if (options.group) html += '</optgroup>';
		
		html += '</' + elementType + '>\n';
		
		if (options.label) {
			
			var label = title;
			
			if (options.label !== true && options.label !== false) label = options.label;
			
			html = '<label class="control-label" for="' + name + '">' + label + '</label>\n' + html;
		}
		
		// If a wrapper is wanted, add it
		if (options.wrapper) html = '<div class="control-group">\n' + html + '\n</div>\n';
		
		// Return the html if wanted
		if (options.return) return html;
		
		// If not, push it to the buffer
		this.scope.buf.push(html);
	}

	function ofInput(name, options) {

		// Get the keys inside the object
		var keys    = [],
		    html    = '<div data-ofInput="' + name + '">',
		    count   = 0,
		    keyname,
		    value,
		    config;

		if (typeof options.value === 'object') {
			keys = Object.keys(options.value);
		}

		config = {
			return     : true,
			wrapper    : false,
			name       : false,
			attributes : {}
		};

		do {

			count++;

			html += '<div data-of-entry>';
			keyname = keys.shift();
			
			// Get the first entry
			if (keyname) {
				value = options.value[keyname];
				config.value = keyname;
			}

			config.ghost = 'Key';
			config.attributes = {'data-of-key': true};
			html += this.form.fieldInput(name, config) + ' ';

			if (value) {
				config.value = value;
			}

			config.ghost = 'Value';
			config.attributes = {'data-of-value': true};
			html += this.form.fieldInput(name, config);

			html += '</div>';

		} while (keys.length);

		// Add a button to add more entries
		html += '<button data-add-ofInput="' + name + '">Add entry</button>';

		html += '</div>';

		this.emit({element: 'ofinput', name: name}, options);

		// Return the html if wanted
		if (options.return) return html;
		
		// If not, push it to the buffer
		this.scope.buf.push(html);
	}
	
	/**
	 * Create an input field
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    0.0.1
	 * @version  0.0.1
	 *
	 * @param    {String}    name     The name of the field
	 * @param    {Object}    options  The options
	 */
	form.fieldInput = function fieldInput (name, options) {
		
		if (options.objectOf) {
			return ofInput.call(this, name, options);
		}

		var html       = '',
		    pendclass  = '',
		    prepend    = '',
		    append     = '',
		    ghost      = '',
		    title      = false,
		    nameOnForm = '',
		    t          = this.scope.temp;

		// Do nothing if the options isn't defined
		if (typeof options === 'undefined') return;
		
		// Add control group wrappers by default
		if (typeof options.wrapper === 'undefined') options.wrapper = true;
		
		// Do not return, but print out by default
		if (typeof options.return === 'undefined') options.return = false;
		
		// Enable a null parameter by default
		if (typeof options.ghost === 'undefined') options.ghost = true;
		
		// Don't add a label by default
		if (typeof options.label === 'undefined') options.label = false;
		
		// Enable a title by default
		if (typeof options.title === 'undefined') options.title = true;
		
		// Default type is text
		if (typeof options.type === 'undefined') options.type = 'text';
		
		// Is there a starting value?
		if (typeof options.value === 'undefined') options.value = '';
		
		// See what title to add
		if (options.title) {
			if (options.title !== true) {
				title = options.title;
			} else {
				title = name;
			}
		}
		
		if (options.prepend) {
			prepend = '<span class="add-on prepend">' + options.prepend + '</span>';
			pendclass = 'input-prepend ';
		}
		
		if (options.append) {
			append = '<span class="add-on append">' + options.append + '</span>';
			pendclass += 'input-append';
		}
		
		if (options.append || options.prepend) {
			prepend = '<div class="' + pendclass + '">' + prepend;
			append += '</div>';
		}
		
		if (options.ghost) {
			if (options.ghost === true) {
				ghost = title;
			} else {
				ghost = options.ghost;
			}
		}

		if (t.form_name) {
			nameOnForm = 'data[' + t.form_name + '][' + name + ']"';
		} else {
			nameOnForm = 'data[' + name + ']';
		}
		
		html = prepend;
		html += '<input type="' + options.type + '" ';

		if (options.name !== false) {
			html += 'name="' + nameOnForm + '" ';
		}

		if (options.attributes) {
			html += this.serialize(options.attributes);
		}

		html += 'placeholder="' + ghost + '" ';
		html += 'value="' + options.value + '" />';
		html += append;
		
		if (options.label) {
			html = '<label class="control-label" for="' + nameOnForm + '">' + title + '</label>\n' + html;
		}
		
		// If a wrapper is wanted, add it
		if (options.wrapper) html = '<div class="control-group">\n' + html + '\n</div>\n';
		
		// Return the html if wanted
		if (options.return) return html;
		
		// If not, push it to the buffer
		this.scope.buf.push(html);
	}

	/**
	 * Create dropdown field for creating doek elements
	 *
	 * @author   Jelle De Loecker   <jelle@kipdola.be>
	 * @since    2013.02.06
	 * @version  2013.02.06
	 *
	 * @param    {object}    elementTypes    All the available element types
	 */
	helpers.doekETMenu = function (elementTypes) {
		var html = '';
		
		for (var typename in elementTypes) {
			var type = elementTypes[typename];
			
			html += '<li><a href="#" data-target="addElementType" data-elementType="' + typename + '">Add ' + type.title + '</a></li>';
		}
		
		this.scope.buf.push(html);
	}

}
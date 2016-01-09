module.exports = function HawkejsForm(Hawkejs, Blast) {

	/**
	 * The form helper
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {ViewRender}    view
	 */
	var Form = Hawkejs.Helper.extend(function FormHelper(view) {
		Hawkejs.Helper.call(this, view);

		// The current form
		this.current_form = null;

		// The current form data
		this.data = null;

		// Current form errors
		this.errors = null;
	});

	/**
	 * The default options for a new form
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @type    {Object}
	 */
	Form.setProperty('form_defaults', {
		ajax         : true,
		attributes   : {},
		method       : 'post'
	});

	/**
	 * The default options for a new select
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @type    {Object}
	 */
	Form.setProperty('select_defaults', {
		attributes   : {},
		create       : false,
		create_text  : ' -- Create new option --',
		depends_on   : false,
		group        : false,
		label        : false,
		null         : true,
		title        : true,
		title_field  : 'title',
		value        : false,
		value_field  : '_id',
		wrapper      : true
	});

	/**
	 * The default options for a new input
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @type    {Object}
	 */
	Form.setProperty('input_defaults', {
		append      : '',
		attributes  : {},
		disabled    : false,
		label       : false,
		placeholder : true,
		prepend     : '',
		title       : true,
		type        : 'text',
		value       : '',
		wrapper     : true
	});

	/**
	 * The default options for a submit input
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @type    {Object}
	 */
	Form.setProperty('submit_defaults', {
		attributes  : {},
		disabled    : false,
		label       : 'Submit',
		title       : true,
		wrapper     : true
	});

	/**
	 * The default options for a spam trap
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @type    {Object}
	 */
	Form.setProperty('spam_trap_defaults', {
		name        : 'liegebeest',
		wrapper     : false,
		attributes  : {
			tabindex: -1,
			style   : 'position:fixed!important;right:200vw;'
		}
	});

	/**
	 * Construct an input name
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    input_name
	 *
	 * @return   {String}
	 */
	Form.setMethod(function getName(input_name) {

		var result;

		result = 'data';

		if (this.current_form) {
			result += '[' + this.current_form + ']';
		}

		result += '[' + input_name + ']';

		return result;
	});

	/**
	 * Get specific form internal data
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {String}    name
	 *
	 * @return   {Mixed}
	 */
	Form.setMethod(function getData(name) {

		var obj = this.view.internal('form_' + name);

		if (obj) {
			return obj[this.current_form];
		}
	});

	/**
	 * Create the opening tag for a form
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {Object}    options
	 */
	Form.setMethod(function create(name, options) {

		var that = this,
		    element,
		    errors,
		    error,
		    data,
		    key;

		if (name && typeof name == 'object') {
			options = name;
			name = null;
		}

		if (!options) {
			options = {};
		}

		if (name) {
			options.name = name;
		}

		// Get the default options
		options = Object.merge({}, this.form_defaults, options);

		// Current form name
		this.current_form = options.name;

		// Current options
		this.current_options = options;

		// Saving individual fields
		options.field_options = [];

		errors = this.getData('errors') || [];
		data = this.getData('data');

		// Reset the fields object
		this.data = {};

		for (key in data) {
			this.data[key] = {
				name: key,
				value: data[key],
				errors: []
			};
		}

		for (key = 0; key < errors.length; key++) {
			error = errors[key];

			if (!this.data[error.main_field]) {
				this.data[error.main_field] = {
					name: error.main_field,
					errors: []
				};
			}

			this.data[error.main_field].errors.push(error);
		}

		// Disable history
		if (options.history === false) {
			options.attributes['data-no-history'] = 'no-history';
		}

		// @todo: get edit variables

		// Create the new form element
		element = Hawkejs.ElementBuilder.create('form');

		return this.placeholder(function formResolver(callback) {

			var action,
			    field,
			    type,
			    i;

			// Look for a file field
			for (i = 0; i < options.field_options.length; i++) {
				field = options.field_options[i];

				if (field.options.type == 'file') {
					options.method = 'file';
					break;
				}
			}

			// File form
			if (options.method == 'file') {
				options.method = 'post';

				options.attributes.enctype = 'multipart/form-data';
			}

			// Set the method attribute
			element.setAttribute('method', options.method);

			// Set the other attributes
			element.setAttribute(options.attributes);

			// Look for classname
			if (options['class'] || options.className) {
				element.setAttribute('class', options['class'] || options.className);
			}

			element.appendAttribute('class', 'js-he-form');

			// Look for the action attribute
			if (options.action) {
				action = that.view.helpers.Router.routeUrl(options.action);

				if (!action) {
					aciton = options.action;
				}

				element.setAttribute('action', action);
			}

			callback(null, element.getOpenTagString());
		});
	});

	/**
	 * Add a submit button
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}    options
	 */
	Form.setMethod(function submit(options) {

		var options,
		    element;

		options = Object.assign({}, this.submit_defaults, options);

		// Create the element
		element = Hawkejs.ElementBuilder.create('button');

		// Set the button type
		element.setAttribute('type', 'submit');

		element.setAttribute(options);

		element.setContent(options.label || options.title || '');

		this.current_options.field_options.push({element: element, options: options});

		return element;
	});

	/**
	 * Close the open form
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {Object}    options
	 */
	Form.setMethod(function end(options) {

		if (!this.current_form) {
			return;
		}

		this.current_form = null;
		this.current_options = null;
		return '</form>';
	});

	/**
	 * Create a select field
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}    options
	 */
	Form.setMethod(function select(_name, _options) {

		var options_html = '',
		    elements,
		    wrapper,
		    element,
		    options,
		    entry,
		    name,
		    i;

		if (typeof _name === 'object') {
			options = _name;
			name = null;
		} else {
			options = _options;
			name = _name;
		}

		options = Object.assign({}, this.select_defaults, options);

		if (name) {
			options.name = name;
		}

		// See what title to add
		if (options.title) {
			if (options.title !== true) {
				title = options.title;
			} else {
				title = options.name;
			}
		}

		if (options.placeholder) {
			options.null = options.placeholder;
		}

		// Create the select element
		element = Hawkejs.ElementBuilder.create('select');

		// Set the name of the element
		element.setAttribute('name', this.getName(options.name));

		// Set the simple name, too
		element.setAttribute('data-name', options.name);

		// Set extra attributes
		element.setAttribute(options.attributes);

		// Look for class & classname options
		element.setAttribute('class', options.className || options.class);

		if (options.null === true) {
			options_html += '<option class="js-null" value=""></option>';
		} else if (options.null) {
			options_html += '<option class="js-null" value="">' + options.null + '</option>';
		}

		if (options.create) {
			element.setAttribute('data-create-url', options.create);
			options_html += '<option class="js-null js-create" value="">' + options.create_text + '</option>'
		}

		if (typeof options.elements == 'string') {
			element.setAttribute('data-options-source', options.elements);

			if (options.depends_on) {
				element.setAttribute('data-depends-on', options.depends_on);
			}
		} else if (options.elements) {
			elements = Blast.Bound.Object.dissect(options.elements);

			for (i = 0; i < elements.length; i++) {
				entry = elements[i];
				options_html += this.selectOption(entry.key, entry.value, options);
			}
		}

		element.appendAttribute('class', 'al-input');
		element.setContent(options_html);

		if (options.wrapper !== false) {
			wrapper = Hawkejs.ElementBuilder.create('div');
			wrapper.setAttribute('class', 'al-input-wrapper');
			element.wrapper = wrapper;
		}

		this.current_options.field_options.push({element: element, options: options});

		return element;
	});

	/**
	 * Get an option for a select field
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}    key
	 * @param    {Object}    entry
	 * @param    {Object}    options
	 *
	 * @returns  {String}
	 */
	Form.setMethod(function selectOption(key, entry, options) {

		var value_field,
		    title_field,
		    element,
		    value,
		    title,
		    html;

		options = Blast.Bound.Object.merge({}, this.select_defaults, options);

		value_field = options.value_field;
		title_field = options.title_field;

		// Get the value of the select
		if (value_field) {
			value = entry[value_field];
		}

		// If the found value was null, default to the key
		if (value == null) {
			value = key;
		}

		// Create the option element
		element = Hawkejs.ElementBuilder.create('option');

		// Set the value
		element.setAttribute('value', value);

		// See if this value has been selected
		if (value === options.value) {
			element.setAttribute('selected', 'selected');
		}

		if (title_field) {
			title = entry[title_field];
		}

		if (!title) {
			if (entry['title'] != null) {
				title = entry['title'];
			} else if (entry['name'] != null) {
				title = entry['name'];
			}
		}

		if (!title) {
			title = element;
		}

		element.setContent(title);

		return element;
	});

	/**
	 * Create a spam trap
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    1.0.0
	 * @version  1.0.0
	 *
	 * @param    {Object}   options
	 */
	Form.setMethod(function spamtrap(options) {

		var element;

		options = Blast.Bound.Object.assign({spamtrap: true}, this.spam_trap_defaults, options);

		return this.input(options.name, options);
	});

	/**
	 * Create an input field
	 *
	 * @author   Jelle De Loecker   <jelle@develry.be>
	 * @since    0.0.1
	 * @version  1.0.0
	 *
	 * @param    {String}    name     The name of the field
	 * @param    {Object}    options  The options
	 */
	Form.setMethod(function input(name, options) {

		var name_on_form,
		    tag_name,
		    element,
		    wrapper,
		    title,
		    data,
		    html,
		    i;

		// Get the default options
		options = Blast.Bound.Object.assign({}, this.input_defaults, options);

		if (options.type == 'textarea') {
			tag_name = 'textarea';
		} else {
			tag_name = 'input';
		}

		// Create the element
		element = Hawkejs.ElementBuilder.create(tag_name);

		// Set the type of the input
		if (tag_name != 'textarea') {
			element.setAttribute('type', options.type);
		}

		// Set the simple name
		element.setAttribute('data-name', name);

		if (options.spamtrap) {
			name_on_form = name;
		} else {
			// Get the name of the element in the form
			name_on_form = this.getName(name);
		}

		element.setAttribute('name', name_on_form);

		// Get the value of this field if there is an open form
		if (this.data && this.data[name]) {
			data = this.data[name];
			options.value = data.value;
		}

		// Set the value of the input
		element.setAttribute('value', options.value);

		// Set the title
		if (options.title === true) {
			options.title = name;
		}

		if (options.title) {
			element.setAttribute('title', options.title);
		}

		// Set the ghost placeholder
		if (options.placeholder === true) {
			options.placeholder = options.title;
		}

		if (options.placeholder) {
			element.setAttribute('placeholder', options.placeholder);
		}

		if (options.disabled) {
			element.setAttribute('disabled', true);
		}

		// See if this input needs to be wrapped
		if (options.wrapper !== false || options.prepend || options.append) {
			wrapper = Hawkejs.ElementBuilder.create('div');
			wrapper.setAttribute('class', 'al-input-wrapper');
			element.wrapper = wrapper;
		}

		// Add optional attributes & css classnames
		element.setAttribute(options);

		if (options.required) {
			element.setAttribute('required', 'required');
		}

		if (options.prepend) {
			element.prepend_html = '<span class="al-prepend">' + options.prepend + '</span>';
			wrapper.appendAttribute('class', 'al-has-prepend');
		}

		if (options.append) {
			element.append_html = '<span class="al-append">' + options.append + '</span>';
			wrapper.appendAttribute('class', 'al-has-append');
		}

		if (options.label) {
			if (!element.prepend_html) element.prepend_html = '';
			element.prepend_html += '<label class="al-input-label" for="' + name_on_form + '">' + title + '</label>';
		}

		if (data && data.errors.length) {
			element.appendAttribute('class', 'al-input-error');

			if (wrapper) {
				wrapper.appendAttribute('class', 'al-wrapper-error');
			}

			html = '';

			for (i = 0; i < data.errors.length; i++) {
				html += '<div class="al-message-error">' + data.errors[i].message + '</div>\n';
			}

			element.append_html += html;
		}

		// Add the generic input class
		element.appendAttribute('class', 'al-input');

		// Add the name input class
		element.appendAttribute('class', 'al-input-' + name);

		// Add a class to the wrapper
		if (wrapper) {
			wrapper.appendAttribute('class', 'al-wrapper-' + name);
		}

		this.current_options.field_options.push({element: element, options: options});

		return element;
	});
};
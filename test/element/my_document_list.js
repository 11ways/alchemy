/**
 * My-button custom element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.7
 * @version  1.1.7
 */
const MyDocumentList = Blast.Bound.Function.inherits('Alchemy.Element', 'MyDocumentList');

/**
 * The template to use for the content of this element
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.7
 * @version  1.1.7
 */
MyDocumentList.setTemplateFile('elements/my_document_list');

/**
 * The model attribute: which model to use
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.7
 * @version  1.1.7
 */
MyDocumentList.setAttribute('model');

/**
 * Assigned value
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.5
 * @version  1.1.5
 */
MyDocumentList.setAssignedProperty('value');

/**
 * Prepare variables
 *
 * @author   Jelle De Loecker <jelle@elevenways.be>
 * @since    1.1.7
 * @version  1.1.7
 */
MyDocumentList.setMethod(async function prepareRenderVariables() {

	if (!this.model) {
		return;
	}

	let model = this.getModel(this.model);

	let promise = model.find('all');

	let records = await promise;

	return {
		records : records
	};
});
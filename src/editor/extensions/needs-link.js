/**
 * Whether a button block has text but goes nowhere (button-link.js). Apart
 * from the editor's packages so it can be unit tested.
 *
 * @param {string} name       Block name.
 * @param {Object} attributes Block attributes.
 * @return {boolean} Whether it needs a link.
 */
export function needsLink(name, attributes) {
	if ('core/button' !== name || 'button' === attributes.tagName) {
		return false;
	}

	if (attributes.url || attributes.metadata?.bindings?.url) {
		return false;
	}

	// `text` is rich text (a RichTextData object in recent WordPress).
	const text = String(attributes.text ?? '')
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;|\s/g, '');

	return text.length > 0;
}

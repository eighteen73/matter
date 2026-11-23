/**
 * The results count in the editor: sample words. On the front end it's the
 * list's own count.
 */

/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

export default function Edit() {
	return (
		<p {...useBlockProps()}>{__('Showing 1–12 of 48 results', 'matter')}</p>
	);
}

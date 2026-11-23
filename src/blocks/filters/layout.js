/**
 * The filters' layout inline (their variant's `layout`): `sidebar`, a column
 * of filters, or `bar`, a row of buttons each opening a filter's options.
 *
 * @param {string} className The filters block's classes (`is-style-{variant}`).
 * @return {'sidebar'|'bar'} Layout.
 */
export function filtersLayout(className = '') {
	const slug = className.match(/(?:^|\s)is-style-([\w-]+)/)?.[1] ?? 'default';
	const variants = window.matterEditor?.variants?.['matter/filters'] ?? {};

	return { ...variants.default, ...variants[slug] }.layout === 'bar'
		? 'bar'
		: 'sidebar';
}

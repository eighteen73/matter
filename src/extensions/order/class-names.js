/**
 * Strip generated column-order utilities from a className string.
 *
 * @param {string} className Block className attribute.
 * @return {string} Class name without generated order utilities.
 */
export function stripOrderClasses(className) {
	if (!className) {
		return '';
	}

	return className
		.split(/\s+/)
		.filter(
			(token) =>
				token &&
				token !== 'has-order-states' &&
				!/^is-order-(default|at-tablet|at-mobile)-\d+$/.test(token)
		)
		.join(' ');
}

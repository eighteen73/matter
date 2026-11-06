/**
 * Archives known to the editor, with their bound values (title, description,
 * count), from the page data and the "Shows on" panel's requests.
 */

const targets = new Map();

const initial = window.matterEditor?.archive;

if (initial) {
	targets.set(initial.value, initial);
}

/**
 * Remember an archive.
 *
 * @param {Object} target Target from the REST API.
 */
export const rememberTarget = (target) => targets.set(target.value, target);

/**
 * A remembered archive.
 *
 * @param {string} value Stored target.
 * @return {Object|undefined} Target.
 */
export const getTarget = (value) => targets.get(value);

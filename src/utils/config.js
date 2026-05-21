import colors from '../../config/colors.json';

const configs = {
	colors,
};

/**
 * Get a config object by name.
 *
 * @param {string} name Config name.
 * @return {Object} Config object.
 */
export function getConfig(name) {
	return configs[name] || {};
}

/**
 * Get a top-level value from a config object.
 *
 * @param {string} name     Config name.
 * @param {string} key      Top-level config key.
 * @param {Object} fallback Fallback value.
 * @return {Object} Config value.
 */
export function getConfigValue(name, key, fallback = {}) {
	return getConfig(name)[key] || fallback;
}

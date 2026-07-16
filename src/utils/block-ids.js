const ID_ALPHABET =
	'0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DEFAULT_ID_PREFIX = 'matter-block';
const ID_LENGTH = 11;

const sanitizeIdPart = (value) =>
	String(value)
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/g, '');

const getRandomIndex = () => {
	const crypto = typeof window !== 'undefined' ? window.crypto : null;

	if (crypto?.getRandomValues) {
		const values = new Uint32Array(1);
		crypto.getRandomValues(values);

		return values[0] % ID_ALPHABET.length;
	}

	return Math.floor(Math.random() * ID_ALPHABET.length);
};

const generateSuffix = () => {
	let suffix = '';

	for (let index = 0; index < ID_LENGTH; index++) {
		suffix += ID_ALPHABET[getRandomIndex()];
	}

	return suffix;
};

export const generateBlockId = (prefix = DEFAULT_ID_PREFIX) => {
	const safePrefix = sanitizeIdPart(prefix) || DEFAULT_ID_PREFIX;

	return `${safePrefix}-${generateSuffix()}`;
};

export const flattenBlocks = (blocks = []) =>
	blocks.reduce((accumulator, block) => {
		accumulator.push(block);

		if (block.innerBlocks?.length) {
			accumulator.push(...flattenBlocks(block.innerBlocks));
		}

		return accumulator;
	}, []);

export const hasDuplicateAttributeValue = (
	blocks,
	currentClientId,
	blockName,
	attributeName,
	value
) => {
	if (!value) {
		return false;
	}

	return flattenBlocks(blocks).some(
		(block) =>
			block.name === blockName &&
			block.clientId !== currentClientId &&
			block.attributes?.[attributeName] === value
	);
};

/**
 * Matter blocks that expose a stable public ID for programmatic control.
 */
export const PUBLIC_ID_BLOCK_NAMES = [
	'matter/modal',
	'matter/drawer',
	'matter/collapsible',
	'matter/carousel',
	'matter/tabs',
	'matter/gallery',
	'matter/accordion',
];

/**
 * Resolve the public ID used by a Matter block instance.
 *
 * Priority matches PHP BlockId: anchor → generatedId.
 *
 * @param {Object} block Block object from the editor.
 * @return {string} Public ID or empty string.
 */
export const getBlockPublicId = (block) => {
	const attributes = block?.attributes || {};

	return attributes.anchor || attributes.generatedId || '';
};

/**
 * Whether another Matter public-ID block already uses this ID.
 *
 * @param {Array}  blocks          Editor blocks tree.
 * @param {string} currentClientId Current block client ID.
 * @param {string} value           Candidate public ID.
 * @return {boolean} Whether a duplicate exists.
 */
export const hasDuplicatePublicId = (blocks, currentClientId, value) => {
	if (!value) {
		return false;
	}

	return flattenBlocks(blocks).some((block) => {
		if (
			!PUBLIC_ID_BLOCK_NAMES.includes(block.name) ||
			block.clientId === currentClientId
		) {
			return false;
		}

		return getBlockPublicId(block) === value;
	});
};

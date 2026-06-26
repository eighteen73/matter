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

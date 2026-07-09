import metadata from './block.json';

const v1 = {
	attributes: {
		...metadata.attributes,
		targetId: {
			type: 'string',
		},
	},
	isEligible: (attributes) =>
		Object.prototype.hasOwnProperty.call(attributes, 'targetId'),
	migrate: ({ targetId, ...attributes }) => ({
		...attributes,
		generatedId: attributes.generatedId || targetId,
	}),
};

export default [v1];

/**
 * A query of posts (of a type) whose items become slides.
 *
 * @param {string} postType Post type.
 * @return {Array} Block template.
 */
export const queryTemplate = (postType) => [
	'core/query',
	{ query: { perPage: 9, postType, inherit: false } },
	[
		[
			'core/post-template',
			{},
			[
				['core/post-featured-image'],
				['core/post-title', { isLink: true }],
			],
		],
	],
];

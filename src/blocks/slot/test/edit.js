/**
 * What the slot editor selects from the store on every change.
 */

const mockNameTree = jest.fn(() => []);
let mockSlotName = '';

jest.mock('../template', () => ({
	nameTree: (...args) => mockNameTree(...args),
	templateKeepsBlocks: () => true,
}));

jest.mock(
	'@wordpress/blocks',
	() => ({
		getBlockType: () => ({
			supports: {
				matter: {
					slots: {
						locked: { templateLock: 'all', template: [] },
						free: {},
					},
				},
			},
		}),
		store: 'core/blocks',
	}),
	{ virtual: true }
);

jest.mock(
	'@wordpress/block-editor',
	() => ({
		InnerBlocks: { ButtonBlockAppender: () => null },
		Warning: () => null,
		store: 'core/block-editor',
		useBlockProps: (props) => props,
		useInnerBlocksProps: (props) => ({ ...props, children: null }),
	}),
	{ virtual: true }
);

jest.mock('@wordpress/components', () => ({ Button: () => null }), {
	virtual: true,
});

jest.mock(
	'@wordpress/data',
	() => ({
		useDispatch: () => ({ replaceInnerBlocks: jest.fn() }),
		useRegistry: () => ({}),
		// Runs the selector against a store with one slot of one block.
		useSelect: (selector) =>
			selector(() => ({
				getBlockRootClientId: () => 'section',
				getBlockName: () => 'matter/section',
				getBlocks: () => [{ name: 'core/paragraph', innerBlocks: [] }],
				getBlockOrder: () => ['slot'],
				getBlockAttributes: () => ({ name: mockSlotName }),
				getBlockTypes: () => [],
			})),
	}),
	{ virtual: true }
);

jest.mock('@wordpress/element', () => ({ useMemo: (factory) => factory() }), {
	virtual: true,
});

jest.mock('@wordpress/i18n', () => ({ __: (text) => text }));

import Edit from '../edit';

describe('the slot editor', () => {
	beforeEach(() => mockNameTree.mockClear());

	it("doesn't serialise the block tree for a slot that isn't locked", () => {
		mockSlotName = 'free';
		Edit({ attributes: { name: 'free' }, clientId: 'slot' });

		expect(mockNameTree).not.toHaveBeenCalled();
	});

	it('serialises it for a locked one, to keep its template in step', () => {
		mockSlotName = 'locked';
		Edit({ attributes: { name: 'locked' }, clientId: 'slot' });

		expect(mockNameTree).toHaveBeenCalled();
	});
});

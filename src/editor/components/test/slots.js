/**
 * Internal dependencies
 */
import { getSlotAliases, reconcileSlots } from '../slots';

const slot = (name, content = []) => ({
	name: 'matter/slot',
	clientId: `${name}-${content.length}-${Math.random()}`,
	attributes: { name },
	innerBlocks: content.map((text) => ({
		name: 'core/paragraph',
		attributes: { content: text },
		innerBlocks: [],
	})),
});

const created = (name) => ({ ...slot(name), created: true });

const summary = (blocks) =>
	blocks.map(
		(block) =>
			`${block.attributes.name}${block.created ? '+' : ''}:${block.innerBlocks
				.map((inner) => inner.attributes.content)
				.join(',')}`
	);

describe('reconcileSlots', () => {
	it('leaves matching slots alone', () => {
		const blocks = [slot('content', ['a']), slot('media', ['b'])];

		expect(
			reconcileSlots(blocks, { content: {}, media: {} }, created)
		).toBeNull();
	});

	it('creates missing slots, including a new first slot', () => {
		const blocks = [slot('content', ['a']), slot('media', ['b'])];

		expect(
			summary(
				reconcileSlots(
					blocks,
					{ eyebrow: {}, content: {}, media: {} },
					created
				)
			)
		).toEqual(['eyebrow+:', 'content:a', 'media:b']);
	});

	it('keeps content of a removed middle slot, after the declared ones', () => {
		const blocks = [
			slot('content', ['a']),
			slot('media', ['b']),
			slot('footer', ['c']),
		];

		expect(
			summary(
				reconcileSlots(blocks, { content: {}, footer: {} }, created)
			)
		).toEqual(['content:a', 'footer:c', 'media:b']);
	});

	it('follows a rename through `previously`', () => {
		const blocks = [slot('content', ['a']), slot('media', ['b'])];

		expect(
			summary(
				reconcileSlots(
					blocks,
					{ content: {}, image: { previously: ['media'] } },
					created
				)
			)
		).toEqual(['content:a', 'image:b']);
	});

	it('prefers an old slot with content over an empty new one', () => {
		const blocks = [slot('image'), slot('media', ['b'])];

		expect(
			summary(
				reconcileSlots(
					blocks,
					{ image: { previously: ['media'] } },
					created
				)
			)
		).toEqual(['image:b', 'image:']);
	});

	it('keeps a filled new slot and leaves the old one as orphaned', () => {
		const blocks = [slot('image', ['new']), slot('media', ['old'])];

		// Already in order: nothing to change, and `media` shows as orphaned.
		expect(
			reconcileSlots(
				blocks,
				{ image: { previously: ['media'] } },
				created
			)
		).toBeNull();
	});

	it('keeps the first of two slots with a name', () => {
		const blocks = [slot('media', ['first']), slot('media', ['second'])];

		// Already in order: nothing to change, and the second shows as orphaned.
		expect(reconcileSlots(blocks, { media: {} }, created)).toBeNull();

		expect(
			summary(
				reconcileSlots(
					[slot('media', ['second']), ...blocks.slice(0, 1)],
					{ content: {}, media: {} },
					created
				)
			)
		).toEqual(['content+:', 'media:second', 'media:first']);
	});

	it('puts reordered slots in declared order', () => {
		const blocks = [slot('media', ['b']), slot('content', ['a'])];

		expect(
			summary(reconcileSlots(blocks, { content: {}, media: {} }, created))
		).toEqual(['content:a', 'media:b']);
	});
});

describe('getSlotAliases', () => {
	it('ignores an old name that is declared again', () => {
		expect([
			...getSlotAliases({
				media: {},
				image: { previously: ['media', 'picture'] },
			}),
		]).toEqual([['picture', 'image']]);
	});
});

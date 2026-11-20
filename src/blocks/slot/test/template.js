/**
 * Internal dependencies
 */
import { nameTree, templateKeepsBlocks } from '../template';

const group = (...inner) => ['core/group', inner];

describe('templateKeepsBlocks', () => {
	it('passes when nothing is saved or there is no template', () => {
		expect(templateKeepsBlocks([], [['core/image']])).toBe(true);
		expect(templateKeepsBlocks([group()], undefined)).toBe(true);
	});

	it('passes a template that only adds blocks, at any depth', () => {
		const saved = [group(['core/paragraph', []])];

		expect(
			templateKeepsBlocks(saved, [
				['core/group', {}, [['core/paragraph'], ['core/heading']]],
				['core/image'],
			])
		).toBe(true);
	});

	it('fails when a saved block would be replaced', () => {
		expect(
			templateKeepsBlocks([['core/image', []]], [['core/video']])
		).toBe(false);
	});

	it('fails when saved blocks are past the template', () => {
		expect(
			templateKeepsBlocks(
				[
					['core/image', []],
					['core/image', []],
				],
				[['core/image']]
			)
		).toBe(false);
	});

	it('fails when an inner template would replace or drop inner blocks', () => {
		const saved = [group(['core/heading', []], ['core/paragraph', []])];

		expect(
			templateKeepsBlocks(saved, [
				['core/group', {}, [['core/paragraph']]],
			])
		).toBe(false);
		expect(
			templateKeepsBlocks(saved, [['core/group', {}, [['core/heading']]]])
		).toBe(false);
		expect(templateKeepsBlocks(saved, [['core/group', {}, []]])).toBe(
			false
		);
	});

	it('lets a template block with no inner template keep any inner blocks', () => {
		expect(
			templateKeepsBlocks(
				[group(['core/heading', []], ['core/paragraph', []])],
				[['core/group']]
			)
		).toBe(true);
	});

	it('checks the levels below a matching inner template', () => {
		const saved = [group(group(['core/heading', []]))];

		expect(
			templateKeepsBlocks(saved, [
				['core/group', {}, [['core/group', {}, [['core/heading']]]]],
			])
		).toBe(true);
		expect(
			templateKeepsBlocks(saved, [
				['core/group', {}, [['core/group', {}, [['core/image']]]]],
			])
		).toBe(false);
	});
});

describe('nameTree', () => {
	it('is the names of the blocks and their inner blocks', () => {
		expect(
			nameTree([
				{
					name: 'core/group',
					innerBlocks: [{ name: 'core/image', innerBlocks: [] }],
				},
			])
		).toEqual([['core/group', [['core/image', []]]]]);
	});
});

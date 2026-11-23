/**
 * Looking an icon up in the registry's list, so one the theme no longer has is
 * known to be missing without a request for it (a 404 in the console).
 */
import { findIcon } from '../find-icon';

const icons = [
	{ name: 'pulsar/arrow-right', content: '<svg/>' },
	{ name: 'pulsar/lock', content: '<svg/>' },
];

describe('findIcon', () => {
	it('finds an icon by name', () => {
		expect(findIcon(icons, true, 'pulsar/lock')).toEqual({
			icon: icons[1],
			isMissing: false,
		});
	});

	it('says an icon the list lacks is missing', () => {
		expect(findIcon(icons, true, 'pulsar/gone')).toEqual({
			icon: undefined,
			isMissing: true,
		});
		expect(findIcon(undefined, true, 'pulsar/gone').isMissing).toBe(true);
	});

	it("doesn't call an icon missing before the list has loaded", () => {
		expect(findIcon(undefined, false, 'pulsar/lock')).toEqual({
			icon: undefined,
			isMissing: false,
		});
	});

	it('has nothing to find without a name', () => {
		expect(findIcon(icons, true, undefined)).toEqual({
			icon: undefined,
			isMissing: false,
		});
		expect(findIcon(icons, true, '').isMissing).toBe(false);
	});
});

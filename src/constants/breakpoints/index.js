import { mobile, tablet, desktop } from '@wordpress/icons';

import breakpointsData, {
	breakpointTokens,
	emblaMinWidthQuery,
} from './data';

export { breakpointTokens, emblaMinWidthQuery };

const breakpoints = {
	xs: { ...breakpointsData.xs, icon: mobile },
	sm: { ...breakpointsData.sm, icon: tablet },
	md: { ...breakpointsData.md, icon: tablet },
	lg: { ...breakpointsData.lg, icon: desktop },
	xl: { ...breakpointsData.xl, icon: desktop },
};

export default breakpoints;

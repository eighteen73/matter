import {
	mobile,
	largeMobile,
	tablet,
	laptop,
	desktop,
} from '../../components/icons/breakpoints';

import breakpointsData, { breakpointTokens, minWidthQuery } from './data';

export { breakpointTokens, minWidthQuery };

const breakpoints = {
	xs: { ...breakpointsData.xs, icon: mobile },
	sm: { ...breakpointsData.sm, icon: largeMobile },
	md: { ...breakpointsData.md, icon: tablet },
	lg: { ...breakpointsData.lg, icon: laptop },
	xl: { ...breakpointsData.xl, icon: desktop },
};

export default breakpoints;

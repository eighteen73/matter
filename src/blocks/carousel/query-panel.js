/**
 * The carousel's "Posts" / "Products" panel: edits the query inside the
 * carousel (Query Loop or Product Collection) from the carousel's own
 * inspector, so clients never need to select the query block.
 */

/**
 * WordPress dependencies
 */
import {
	InspectorControls,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import {
	FormTokenField,
	PanelBody,
	RangeControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { decodeEntities } from '@wordpress/html-entities';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { PRODUCTS, QUERY_BLOCKS } from './templates';

const MAX_ITEMS = 24;
const EMPTY = {};

const POST_ORDERS = [
	{ label: __('Newest first', 'matter'), value: 'date/desc' },
	{ label: __('Oldest first', 'matter'), value: 'date/asc' },
	{ label: __('Title A–Z', 'matter'), value: 'title/asc' },
	{ label: __('Title Z–A', 'matter'), value: 'title/desc' },
];

// WooCommerce's orderBy values (Product Collection's QueryBuilder).
const PRODUCT_ORDERS = [
	{ label: __('Newest first', 'matter'), value: 'date/desc' },
	{ label: __('Price, low to high', 'matter'), value: 'price/asc' },
	{ label: __('Price, high to low', 'matter'), value: 'price/desc' },
	{ label: __('Most popular', 'matter'), value: 'sales/desc' },
	{ label: __('Title A–Z', 'matter'), value: 'title/asc' },
];

/**
 * The carousel's query block.
 *
 * @param {string} clientId Carousel client ID.
 * @return {Object} `queryId`, `name` and `query` (its query attribute).
 */
export function useCarouselQuery(clientId) {
	return useSelect(
		(select) => {
			const block = select(blockEditorStore)
				.getBlocks(clientId)
				.find(({ name }) => QUERY_BLOCKS.includes(name));

			return {
				queryId: block?.clientId,
				name: block?.name,
				query: block?.attributes.query ?? EMPTY,
			};
		},
		[clientId]
	);
}

/**
 * Order options, plus the current order if it's one we don't offer (e.g. set
 * on the query block before), so it isn't changed by showing the panel.
 *
 * @param {Array}  options Order options.
 * @param {string} value   Current `orderBy/order`.
 * @return {Array} Options.
 */
const withCurrent = (options, value) =>
	options.some((option) => option.value === value)
		? options
		: [
				...options,
				{ label: __('Custom', 'matter'), value, disabled: true },
			];

/**
 * Pick terms by name. Shown once the taxonomy's terms have loaded, so terms
 * already chosen are never dropped.
 *
 * @param {Object}   props
 * @param {string}   props.taxonomy Taxonomy slug.
 * @param {string}   props.label    Field label.
 * @param {Array}    props.value    Chosen term IDs.
 * @param {Function} props.onChange Called with term IDs.
 * @return {Element|null} Field.
 */
function TermsControl({ taxonomy, label, value, onChange }) {
	const terms = useSelect(
		(select) =>
			select(coreStore).getEntityRecords('taxonomy', taxonomy, {
				per_page: -1,
				orderby: 'name',
				order: 'asc',
				context: 'view',
				_fields: 'id,name',
			}),
		[taxonomy]
	);

	if (!terms?.length) {
		return null;
	}

	const nameOf = (term) => decodeEntities(term.name);
	const chosen = terms.filter((term) => value.includes(term.id));

	return (
		<FormTokenField
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			__experimentalExpandOnFocus
			label={label}
			value={chosen.map(nameOf)}
			suggestions={terms.map(nameOf)}
			onChange={(tokens) =>
				onChange([
					...new Set(
						tokens
							.map((token) => token?.value ?? token)
							.map(
								(name) =>
									terms.find((term) => nameOf(term) === name)
										?.id
							)
							.filter(Boolean)
					),
				])
			}
		/>
	);
}

/**
 * The number of items.
 *
 * @param {Object}   props
 * @param {Object}   props.query  Query attribute.
 * @param {Function} props.update Query updater.
 * @return {Element} Field.
 */
function CountControl({ query, update }) {
	return (
		<RangeControl
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			label={__('Number of items', 'matter')}
			min={1}
			max={MAX_ITEMS}
			value={parseInt(query.perPage, 10) || 9}
			onChange={(perPage) => update({ perPage: perPage || 1 })}
		/>
	);
}

// core/query's taxQuery is { include: { taxonomy: [ids] }, exclude: {...} }
// (older blocks: { taxonomy: [ids] }, migrated by core on load).
const isNestedTaxQuery = (taxQuery) =>
	Object.keys(taxQuery ?? {}).every((key) =>
		['include', 'exclude'].includes(key)
	);

const includedTerms = (taxQuery, taxonomy) =>
	(isNestedTaxQuery(taxQuery)
		? taxQuery?.include?.[taxonomy]
		: taxQuery?.[taxonomy]) ?? [];

/**
 * core/query's taxQuery with a taxonomy's included terms set.
 *
 * @param {Object|undefined} taxQuery Current taxQuery.
 * @param {string}           taxonomy Taxonomy slug.
 * @param {Array}            ids      Term IDs.
 * @return {Object|undefined} New taxQuery (undefined when empty).
 */
function withIncludedTerms(taxQuery, taxonomy, ids) {
	const { include = {}, exclude } = isNestedTaxQuery(taxQuery)
		? (taxQuery ?? {})
		: { include: taxQuery };
	const { [taxonomy]: _previous, ...others } = include;
	const nextInclude = ids.length ? { ...others, [taxonomy]: ids } : others;
	const next = {};

	if (Object.keys(nextInclude).length) {
		next.include = nextInclude;
	}

	if (exclude && Object.keys(exclude).length) {
		next.exclude = exclude;
	}

	return Object.keys(next).length ? next : undefined;
}

/**
 * Keep only a post type's taxonomies in core/query's taxQuery.
 *
 * @param {Object|undefined} taxQuery   Current taxQuery.
 * @param {Array}            taxonomies Taxonomy slugs to keep.
 * @return {Object|undefined} New taxQuery (undefined when empty).
 */
function taxQueryFor(taxQuery, taxonomies) {
	const { include, exclude } = isNestedTaxQuery(taxQuery)
		? (taxQuery ?? {})
		: { include: taxQuery };
	const pick = (terms) =>
		Object.fromEntries(
			Object.entries(terms ?? {}).filter(
				([taxonomy, ids]) =>
					taxonomies.includes(taxonomy) && ids?.length
			)
		);
	const next = { include: pick(include), exclude: pick(exclude) };

	Object.keys(next).forEach(
		(key) => !Object.keys(next[key]).length && delete next[key]
	);

	return Object.keys(next).length ? next : undefined;
}

/**
 * Controls for a Query Loop.
 *
 * @param {Object}   props
 * @param {Object}   props.query  Query attribute.
 * @param {Function} props.update Query updater.
 * @return {Element} Controls.
 */
function PostsControls({ query, update }) {
	const postType = query.postType || 'post';
	const { postTypes, taxonomy } = useSelect(
		(select) => {
			const { getPostTypes, getTaxonomies } = select(coreStore);

			return {
				postTypes: (getPostTypes({ per_page: -1 }) ?? []).filter(
					(type) => type.viewable && type.slug !== 'attachment'
				),
				taxonomy: (
					getTaxonomies({
						type: postType,
						per_page: -1,
						context: 'view',
					}) ?? []
				).find(
					(tax) =>
						tax.hierarchical && tax.visibility?.publicly_queryable
				),
			};
		},
		[postType]
	);

	const order = `${query.orderBy || 'date'}/${query.order || 'desc'}`;

	const changePostType = (newType) => {
		const changes = {
			postType: newType,
			taxQuery: taxQueryFor(
				query.taxQuery,
				postTypes.find((type) => type.slug === newType)?.taxonomies ??
					[]
			),
			parents: [],
		};

		// As core's Query Loop does: sticky posts and formats are post-only.
		if (newType !== 'post') {
			changes.sticky = '';
			changes.format = [];
		}

		update(changes);
	};

	return (
		<>
			{postTypes.length > 1 && (
				<SelectControl
					__nextHasNoMarginBottom
					__next40pxDefaultSize
					label={__('Show', 'matter')}
					value={postType}
					options={postTypes.map((type) => ({
						label: decodeEntities(type.name),
						value: type.slug,
					}))}
					onChange={changePostType}
				/>
			)}
			<CountControl query={query} update={update} />
			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={__('Order', 'matter')}
				value={order}
				options={withCurrent(POST_ORDERS, order)}
				onChange={(value) => {
					const [orderBy, newOrder] = value.split('/');
					update({ orderBy, order: newOrder });
				}}
			/>
			{taxonomy && (
				<TermsControl
					taxonomy={taxonomy.slug}
					label={decodeEntities(taxonomy.name)}
					value={includedTerms(query.taxQuery, taxonomy.slug)}
					onChange={(ids) =>
						update({
							taxQuery: withIncludedTerms(
								query.taxQuery,
								taxonomy.slug,
								ids
							),
						})
					}
				/>
			)}
		</>
	);
}

/**
 * Controls for a Product Collection. Its taxQuery is { product_cat: [ids] }.
 *
 * @param {Object}   props
 * @param {Object}   props.query  Query attribute.
 * @param {Function} props.update Query updater.
 * @return {Element} Controls.
 */
function ProductsControls({ query, update }) {
	// WooCommerce treats the older "popularity" as sales.
	const orderBy = query.orderBy === 'popularity' ? 'sales' : query.orderBy;
	const order = query.order ? `${orderBy}/${query.order}` : orderBy;

	return (
		<>
			<CountControl query={query} update={update} />
			<SelectControl
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				label={__('Order', 'matter')}
				value={order}
				options={withCurrent(PRODUCT_ORDERS, order)}
				onChange={(value) => {
					const [newOrderBy, newOrder] = value.split('/');
					update({ orderBy: newOrderBy, order: newOrder });
				}}
			/>
			<TermsControl
				taxonomy="product_cat"
				label={__('Categories', 'matter')}
				value={query.taxQuery?.product_cat ?? []}
				onChange={(ids) => {
					const { product_cat: _previous, ...taxQuery } =
						query.taxQuery ?? {};

					update({
						taxQuery: ids.length
							? { ...taxQuery, product_cat: ids }
							: taxQuery,
					});
				}}
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={__('On sale only', 'matter')}
				checked={!!query.woocommerceOnSale}
				onChange={(woocommerceOnSale) => update({ woocommerceOnSale })}
			/>
			<ToggleControl
				__nextHasNoMarginBottom
				label={__('Featured only', 'matter')}
				checked={!!query.featured}
				onChange={(featured) => update({ featured })}
			/>
		</>
	);
}

/**
 * @param {Object} props
 * @param {string} props.clientId Carousel client ID.
 * @return {Element|null} Inspector panel.
 */
export default function QueryPanel({ clientId }) {
	const { queryId, name, query } = useCarouselQuery(clientId);
	const { updateBlockAttributes } = useDispatch(blockEditorStore);

	if (!queryId) {
		return null;
	}

	const update = (changes) =>
		updateBlockAttributes(queryId, { query: { ...query, ...changes } });
	const isProducts = name === PRODUCTS;
	const Controls = isProducts ? ProductsControls : PostsControls;

	return (
		<InspectorControls>
			<PanelBody
				title={
					isProducts
						? __('Products', 'matter')
						: __('Posts', 'matter')
				}
			>
				<Controls query={query} update={update} />
			</PanelBody>
		</InspectorControls>
	);
}

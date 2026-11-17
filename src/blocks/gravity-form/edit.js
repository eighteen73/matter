import {
	store as blockEditorStore,
	useBlockProps,
} from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { Disabled, Notice, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { GravityForm as GravityFormIcon } from '../../components/icons/gravity-form';
import { useServerSideRender } from '@wordpress/server-side-render';
import GravityFormBlockControls from './components/block-controls';
import GravityFormInspectorControls from './components/inspector-controls';
import GravityFormPlaceholder from './components/placeholder';

/**
 * Forms localized from PHP for the block editor.
 *
 * @return {Array<{id: number|string, title: string}>} Active forms list.
 */
function getForms() {
	return window.matterGravityForm?.forms ?? [];
}

/**
 * Build SelectControl options from the forms list.
 *
 * @param {Array<{id: number|string, title: string}>} forms Forms list.
 * @return {Array<{label: string, value: string}>} Select options.
 */
function getFormOptions(forms) {
	return [
		{
			label: __('Select a Form', 'matter'),
			value: '',
		},
		...forms.map((form) => ({
			label: form.title,
			value: String(form.id),
		})),
	];
}

/**
 * A sample form for the inserter's preview, in Gravity Forms' markup so the
 * theme's form styles apply.
 *
 * @return {Element} Sample form.
 */
function ExampleForm() {
	const fields = [
		[__('Name', 'matter'), 'input'],
		[__('Email', 'matter'), 'input'],
		[__('Message', 'matter'), 'textarea'],
	];

	return (
		<Disabled>
			<div className="gform_wrapper gravity-theme">
				<form>
					<div className="gform_body">
						<div className="gform_fields">
							{fields.map(([label, Field], index) => (
								<div className="gfield" key={label}>
									<label
										className="gfield_label"
										htmlFor={`matter-example-field-${index}`}
									>
										{label}
									</label>
									<div className="ginput_container">
										<Field
											id={`matter-example-field-${index}`}
										/>
									</div>
								</div>
							))}
						</div>
					</div>
					<div className="gform_footer">
						<input
							type="submit"
							className="gform_button button"
							value={__('Send', 'matter')}
						/>
					</div>
				</form>
			</div>
		</Disabled>
	);
}

/**
 * @param {Object}   props               Block props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Update attributes.
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const {
		formId = '',
		displayTitle,
		displayDescription,
		ajaxSubmission,
		tabindex,
		fieldValues,
		anchor,
	} = attributes;
	const blockProps = useBlockProps();
	const isPreview = useSelect(
		(select) => !!select(blockEditorStore).getSettings().isPreviewMode,
		[]
	);
	const forms = getForms();
	const formOptions = getFormOptions(forms);
	const selectedForm = forms.find(
		(form) => String(form.id) === String(formId)
	);
	const hasInvalidFormId = Boolean(formId) && !selectedForm;
	const blockIcon = GravityFormIcon;

	const { content: previewHtml = '', status: previewStatus } =
		useServerSideRender({
			block: 'matter/gravity-form',
			attributes: {
				formId,
				displayTitle,
				displayDescription,
				ajaxSubmission,
				tabindex,
				fieldValues,
				anchor,
			},
			skipBlockSupportAttributes: true,
		});

	// The inserter's preview: a sample, not the form picker.
	if (isPreview && !formId) {
		return (
			<div {...blockProps}>
				<ExampleForm />
			</div>
		);
	}

	const inspectorControls = (
		<GravityFormInspectorControls
			attributes={attributes}
			setAttributes={setAttributes}
			formOptions={formOptions}
		/>
	);

	const blockControls = (
		<GravityFormBlockControls
			formId={formId}
			setAttributes={setAttributes}
		/>
	);

	return (
		<>
			{blockControls}

			{inspectorControls}

			<div {...blockProps}>
				<GravityFormPlaceholder
					forms={forms}
					blockIcon={blockIcon}
					formId={formId}
					hasInvalidFormId={hasInvalidFormId}
					attributes={attributes}
					setAttributes={setAttributes}
					formOptions={formOptions}
					previewHtml={previewHtml}
				/>

				{previewStatus === 'loading' && <Spinner />}

				{previewStatus === 'error' && (
					<Notice status="error" isDismissible={false}>
						{__(
							'Unable to preview this form in the editor.',
							'matter'
						)}
					</Notice>
				)}

				{previewStatus !== 'loading' &&
					previewStatus !== 'error' &&
					previewHtml && (
						<Disabled>
							<div
								dangerouslySetInnerHTML={{
									__html: previewHtml,
								}}
							/>
						</Disabled>
					)}
			</div>
		</>
	);
}

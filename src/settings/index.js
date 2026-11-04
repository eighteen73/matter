/**
 * Site settings page.
 *
 * Renders the theme-declared settings fields (see Settings.php) and saves them
 * through the `matter/v1/settings` REST route.
 */

/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	SnackbarList,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import domReady from '@wordpress/dom-ready';
import { createRoot, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { store as noticesStore } from '@wordpress/notices';

/**
 * Internal dependencies
 */
import Field from './components/field';
import './index.scss';

const { sections, values: initialValues, media, path } = window.matterSettings;

function Notices() {
	const notices = useSelect(
		(select) =>
			select(noticesStore)
				.getNotices()
				.filter((notice) => notice.type === 'snackbar'),
		[]
	);
	const { removeNotice } = useDispatch(noticesStore);

	return <SnackbarList notices={notices} onRemove={removeNotice} />;
}

function SettingsPage() {
	const [values, setValues] = useState(initialValues);
	const [isDirty, setIsDirty] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const { createSuccessNotice, createErrorNotice } =
		useDispatch(noticesStore);

	const setValue = (sectionKey, fieldKey, next) => {
		setValues((current) => ({
			...current,
			[sectionKey]: { ...current[sectionKey], [fieldKey]: next },
		}));
		setIsDirty(true);
	};

	const save = async (event) => {
		event.preventDefault();
		setIsSaving(true);

		try {
			const saved = await apiFetch({
				path,
				method: 'POST',
				data: { values },
			});
			setValues(saved);
			setIsDirty(false);
			createSuccessNotice(__('Settings saved.', 'matter'), {
				type: 'snackbar',
			});
		} catch (error) {
			createErrorNotice(
				error?.message ?? __('Settings could not be saved.', 'matter'),
				{ type: 'snackbar' }
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<form className="matter-settings" onSubmit={save}>
			<div className="matter-settings__sections">
				{Object.entries(sections).map(([sectionKey, section]) => (
					<Card key={sectionKey}>
						<CardHeader>
							<div>
								<h2 className="matter-settings__title">
									{section.title}
								</h2>
								{section.description && (
									<p className="matter-settings__description">
										{section.description}
									</p>
								)}
							</div>
						</CardHeader>
						<CardBody>
							<div className="matter-settings__fields">
								{Object.entries(section.fields).map(
									([fieldKey, field]) => (
										<Field
											key={fieldKey}
											field={field}
											media={media}
											value={
												values[sectionKey]?.[fieldKey]
											}
											onChange={(next) =>
												setValue(
													sectionKey,
													fieldKey,
													next
												)
											}
										/>
									)
								)}
							</div>
						</CardBody>
					</Card>
				))}
				<div>
					<Button
						variant="primary"
						type="submit"
						isBusy={isSaving}
						disabled={isSaving || !isDirty}
						__next40pxDefaultSize
					>
						{__('Save settings', 'matter')}
					</Button>
				</div>
			</div>
			<Notices />
		</form>
	);
}

domReady(() => {
	const container = document.getElementById('matter-settings');

	if (container) {
		createRoot(container).render(<SettingsPage />);
	}
});

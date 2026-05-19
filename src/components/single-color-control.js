/**
 * WordPress dependencies
 */
import { __experimentalColorGradientControl as ColorGradientControl } from '@wordpress/block-editor';
import {
	Button,
	ColorIndicator,
	Dropdown,
	Flex,
	FlexItem,
	__experimentalDropdownContentWrapper as DropdownContentWrapper,
	__experimentalHStack as HStack,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { reset as resetIcon } from '@wordpress/icons';

function LabeledColorIndicator( { indicatorColor, indicatorLabel } ) {
	return (
		<HStack justify="flex-start">
			<Flex expanded={ false }>
				<ColorIndicator colorValue={ indicatorColor } />
			</Flex>
			<FlexItem className="block-editor-panel-color-gradient-settings__color-name">
				{ indicatorLabel }
			</FlexItem>
		</HStack>
	);
}

const SingleColorControl = ( {
	label,
	colorValue,
	setValue,
	clientId,
	colorGradientSettings,
	resetAllFilter,
} ) => {
	const dropdownButtonRef = useRef();

	if ( ! colorGradientSettings?.hasColorsOrGradients ) {
		return null;
	}

	const inheritedValue = colorValue?.color ?? '';
	const hasValue = () => Boolean( colorValue?.color );
	const resetValue = () => setValue();

	return (
		<ToolsPanelItem
			className="block-editor-tools-panel-color-gradient-settings__item"
			hasValue={ hasValue }
			label={ label }
			onDeselect={ resetValue }
			resetAllFilter={ resetAllFilter || resetValue }
			isShownByDefault
			panelId={ clientId }
		>
			<Dropdown
				className="block-editor-tools-panel-color-gradient-settings__dropdown"
				popoverProps={ {
					placement: 'left-start',
					offset: 36,
					shift: true,
				} }
				renderToggle={ ( { onToggle, isOpen } ) => {
					const toggleClassName = [
						'block-editor-panel-color-gradient-settings__dropdown',
						isOpen ? 'is-open' : '',
					]
						.filter( Boolean )
						.join( ' ' );

					return (
						<>
							<Button
								onClick={ onToggle }
								className={ toggleClassName }
								aria-expanded={ isOpen }
								ref={ dropdownButtonRef }
								__next40pxDefaultSize
							>
								<LabeledColorIndicator
									indicatorColor={ inheritedValue }
									indicatorLabel={ label }
								/>
							</Button>
							{ hasValue() && (
								<Button
									__next40pxDefaultSize
									icon={ resetIcon }
									className="block-editor-panel-color-gradient-settings__reset"
									size="small"
									label={ __( 'Reset', 'eighteen73-blocks' ) }
									onClick={ () => {
										resetValue();
										if ( isOpen ) {
											onToggle();
										}
										dropdownButtonRef.current?.focus();
									} }
								/>
							) }
						</>
					);
				} }
				renderContent={ () => (
					<DropdownContentWrapper paddingSize="none">
						<div className="block-editor-panel-color-gradient-settings__dropdown-content">
							<ColorGradientControl
								{ ...colorGradientSettings }
								showTitle={ false }
								enableAlpha
								__experimentalIsRenderedInSidebar
								colorValue={ inheritedValue }
								onColorChange={ setValue }
								clearable={ inheritedValue === inheritedValue }
								headingLevel={ 3 }
							/>
						</div>
					</DropdownContentWrapper>
				) }
			/>
		</ToolsPanelItem>
	);
};

export default SingleColorControl;

<?php
// This file is generated. Do not modify it manually.
return array(
	'accordion' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/accordion',
		'version' => '0.1.0',
		'title' => 'Accordion',
		'description' => 'Displays a foldable layout that groups content in collapsible sections.',
		'keywords' => array(
			'accordion',
			'toggle',
			'faq',
			'collapse'
		),
		'category' => 'widgets',
		'textdomain' => 'matter',
		'allowedBlocks' => array(
			'matter/accordion-item',
			'core/query'
		),
		'attributes' => array(
			'generatedId' => array(
				'type' => 'string',
				'default' => ''
			),
			'iconPosition' => array(
				'type' => 'string',
				'default' => 'right'
			),
			'showIcon' => array(
				'type' => 'boolean',
				'default' => true
			),
			'autoclose' => array(
				'type' => 'boolean',
				'default' => true
			),
			'openFirstItem' => array(
				'type' => 'boolean',
				'default' => false
			),
			'headingLevel' => array(
				'type' => 'number',
				'default' => 3,
				'role' => 'content'
			),
			'isQueryMode' => array(
				'type' => 'boolean',
				'default' => false
			),
			'hasSchema' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'providesContext' => array(
			'matter/accordion-icon-position' => 'iconPosition',
			'matter/accordion-show-icon' => 'showIcon',
			'matter/accordion-heading-level' => 'headingLevel',
			'matter/accordion-isQueryMode' => 'isQueryMode'
		),
		'supports' => array(
			'align' => true,
			'anchor' => true,
			'html' => false,
			'interactivity' => true,
			'contentRole' => true,
			'listView' => true,
			'color' => array(
				'background' => true,
				'gradients' => true,
				'text' => true,
				'link' => false
			),
			'layout' => array(
				'default' => array(
					'type' => 'flex',
					'flexWrap' => 'nowrap',
					'justifyContent' => 'stretch',
					'verticalAlignment' => 'stretch',
					'orientation' => 'vertical'
				),
				'allowEditing' => false
			),
			'spacing' => array(
				'padding' => true,
				'margin' => true,
				'blockGap' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			),
			'typography' => array(
				'fontSize' => true,
				'__experimentalSkipSerialization' => array(
					'fontSize'
				)
			),
			'ariaLabel' => true,
			'renaming' => true
		),
		'selectors' => array(
			'root' => '.wp-block-matter-accordion',
			'typography' => array(
				'root' => '.wp-block-matter-accordion .wp-block-matter-accordion-heading__toggle-title',
				'fontSize' => '.wp-block-matter-accordion .wp-block-matter-accordion-heading__toggle-title'
			)
		),
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js',
		'render' => 'file:./render.php'
	),
	'accordion-heading' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/accordion-heading',
		'version' => '0.1.0',
		'title' => 'Accordion Heading',
		'description' => 'Displays a heading that toggles the accordion panel.',
		'category' => 'widgets',
		'textdomain' => 'matter',
		'parent' => array(
			'matter/accordion-item'
		),
		'attributes' => array(
			'title' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'usesContext' => array(
			'matter/accordion-id',
			'matter/accordion-item-id',
			'matter/accordion-icon-position',
			'matter/accordion-show-icon',
			'matter/accordion-heading-level',
			'matter/accordion-isQueryMode',
			'matter/accordion-open-by-default',
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'html' => false,
			'reusable' => false,
			'anchor' => true,
			'interactivity' => true,
			'lock' => false,
			'contentRole' => true,
			'listView' => true,
			'color' => array(
				'background' => true,
				'gradients' => true,
				'text' => true
			),
			'spacing' => array(
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'padding' => true
				)
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			),
			'typography' => array(
				'fontSize' => true
			),
			'renaming' => false
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'accordion-item' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/accordion-item',
		'version' => '0.1.0',
		'title' => 'Accordion Item',
		'description' => 'Wraps the heading and panel in one unit.',
		'category' => 'widgets',
		'textdomain' => 'matter',
		'parent' => array(
			'matter/accordion',
			'core/post-template'
		),
		'ancestor' => array(
			'matter/accordion'
		),
		'allowedBlocks' => array(
			'matter/accordion-heading',
			'matter/accordion-panel'
		),
		'attributes' => array(
			'openByDefault' => array(
				'type' => 'boolean',
				'default' => false
			),
			'inQueryLoop' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'providesContext' => array(
			'matter/accordion-open-by-default' => 'openByDefault'
		),
		'usesContext' => array(
			'matter/accordion-id',
			'matter/accordion-isQueryMode',
			'matter/accordion-heading-level',
			'matter/accordion-icon-position',
			'matter/accordion-show-icon',
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'html' => false,
			'reusable' => false,
			'interactivity' => true,
			'contentRole' => true,
			'listView' => true,
			'color' => array(
				'background' => true,
				'gradients' => true,
				'text' => true
			),
			'layout' => array(
				'default' => array(
					'type' => 'flex',
					'flexWrap' => 'nowrap',
					'justifyContent' => 'stretch',
					'verticalAlignment' => 'stretch',
					'orientation' => 'vertical'
				),
				'allowEditing' => false
			),
			'spacing' => array(
				'margin' => false,
				'padding' => true,
				'blockGap' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			),
			'renaming' => true
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'accordion-panel' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/accordion-panel',
		'version' => '0.1.0',
		'title' => 'Accordion Panel',
		'description' => 'Contains the hidden or revealed content beneath the heading.',
		'category' => 'widgets',
		'textdomain' => 'matter',
		'parent' => array(
			'matter/accordion-item'
		),
		'attributes' => array(
			'templateLock' => array(
				'type' => array(
					'string',
					'boolean'
				),
				'enum' => array(
					'all',
					'insert',
					'contentOnly',
					false
				),
				'default' => false
			)
		),
		'usesContext' => array(
			'matter/accordion-id',
			'matter/accordion-item-id',
			'matter/accordion-open-by-default',
			'matter/accordion-isQueryMode'
		),
		'supports' => array(
			'lock' => false,
			'html' => false,
			'reusable' => false,
			'interactivity' => true,
			'allowedBlocks' => true,
			'contentRole' => true,
			'listView' => true,
			'color' => array(
				'background' => true,
				'gradients' => true,
				'text' => true
			),
			'spacing' => array(
				'padding' => true,
				'blockGap' => true,
				'__experimentalDefaultControls' => array(
					'padding' => true,
					'blockGap' => true
				)
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			),
			'typography' => array(
				'fontSize' => true
			),
			'layout' => array(
				'allowEditing' => false
			),
			'renaming' => false
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'carousel' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/carousel',
		'version' => '0.1.0',
		'title' => 'Carousel',
		'category' => 'design',
		'icon' => 'images-alt',
		'description' => 'Carousel',
		'allowedBlocks' => array(
			'matter/carousel-viewport',
			'matter/carousel-thumbnails',
			'matter/carousel-dots',
			'matter/carousel-progress',
			'matter/carousel-previous-button',
			'matter/carousel-next-button',
			'core/group'
		),
		'attributes' => array(
			'generatedId' => array(
				'type' => 'string',
				'default' => ''
			),
			'emblaConfig' => array(
				'type' => 'object',
				'default' => array(
					'options' => array(
						'loop' => false,
						'axis' => 'x',
						'slidesToScroll' => 1,
						'active' => true,
						'slidesToShow' => 1,
						'slideGap' => ''
					),
					'plugins' => array(
						'fade' => array(
							'active' => false
						),
						'autoplay' => array(
							'active' => false,
							'type' => 'slide',
							'speed' => 1
						)
					),
					'breakpointLayers' => array(
						
					)
				)
			),
			'advancedEmblaConfig' => array(
				'type' => 'object',
				'default' => null
			),
			'advancedEmblaConfigMerge' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'supports' => array(
			'inserter' => true,
			'anchor' => true,
			'align' => array(
				'wide',
				'full'
			),
			'interactivity' => true,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => false,
					'padding' => false
				)
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => 'file:./view.js'
	),
	'carousel-dots' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/carousel-dots',
		'version' => '0.1.0',
		'title' => 'Dots',
		'category' => 'design',
		'icon' => 'ellipsis',
		'description' => 'Displays pagination dots to navigate between slides.',
		'ancestor' => array(
			'matter/carousel'
		),
		'attributes' => array(
			'dotColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'dotActiveColor' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'color' => array(
				'text' => false,
				'background' => true,
				'gradients' => false,
				'link' => false
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => true,
					'padding' => true
				)
			),
			'__experimentalBorder' => array(
				'radius' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'carousel-next-button' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/carousel-next-button',
		'version' => '0.1.0',
		'title' => 'Next Button',
		'category' => 'design',
		'icon' => 'arrow-right-alt',
		'description' => 'Moves the carousel to the next slide.',
		'ancestor' => array(
			'matter/carousel'
		),
		'attributes' => array(
			'iconColor' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'color' => array(
				'text' => false,
				'background' => true,
				'gradients' => false,
				'link' => false
			),
			'dimensions' => array(
				'aspectRatio' => true,
				'width' => true,
				'height' => true,
				'__experimentalDefaultControls' => array(
					'aspectRatio' => false,
					'width' => false,
					'height' => false
				)
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => true,
					'padding' => true
				)
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	),
	'carousel-previous-button' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/carousel-previous-button',
		'version' => '0.1.0',
		'title' => 'Previous Button',
		'category' => 'design',
		'icon' => 'arrow-left-alt',
		'description' => 'Moves the carousel to the previous slide.',
		'ancestor' => array(
			'matter/carousel'
		),
		'attributes' => array(
			'iconColor' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'color' => array(
				'text' => false,
				'background' => true,
				'gradients' => false,
				'link' => false
			),
			'dimensions' => array(
				'aspectRatio' => true,
				'width' => true,
				'height' => true,
				'__experimentalDefaultControls' => array(
					'aspectRatio' => false,
					'width' => false,
					'height' => false
				)
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => true,
					'padding' => true
				)
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	),
	'carousel-progress' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/carousel-progress',
		'version' => '0.1.0',
		'title' => 'Progress',
		'category' => 'design',
		'icon' => 'minus',
		'description' => 'Shows the progress of the carousel.',
		'ancestor' => array(
			'matter/carousel'
		),
		'attributes' => array(
			'indicateCurrentPosition' => array(
				'type' => 'boolean',
				'default' => false
			),
			'barColor' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'color' => array(
				'text' => false,
				'background' => true,
				'gradients' => false,
				'link' => false
			),
			'dimensions' => array(
				'height' => true
			),
			'__experimentalBorder' => array(
				'radius' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'carousel-thumbnails' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/carousel-thumbnails',
		'version' => '0.1.0',
		'title' => 'Thumbnails',
		'category' => 'design',
		'description' => 'Displays thumbnail blocks to navigate between carousel slides.',
		'ancestor' => array(
			'matter/carousel'
		),
		'attributes' => array(
			'syncWithCarousel' => array(
				'type' => 'boolean',
				'default' => true
			),
			'activeThumbnailColor' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'lock' => false,
			'layout' => array(
				'default' => array(
					'type' => 'flex'
				),
				'allowSwitching' => false,
				'allowInheriting' => false,
				'allowVerticalAlignment' => true,
				'allowSizingOnChildren' => true
			),
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'blockGap' => true,
				'__experimentalDefaultControls' => array(
					'margin' => false,
					'padding' => false,
					'blockGap' => false
				)
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'carousel-viewport' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/carousel-viewport',
		'version' => '0.1.0',
		'title' => 'Viewport',
		'category' => 'design',
		'icon' => 'images-alt',
		'description' => 'Carousel Viewport',
		'ancestor' => array(
			'matter/carousel'
		),
		'supports' => array(
			'lock' => true
		),
		'attributes' => array(
			'allowedBlocks' => array(
				'type' => 'array'
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'render' => 'file:./render.php'
	),
	'close' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/close',
		'version' => '0.1.0',
		'title' => 'Close',
		'keywords' => array(
			'close',
			'dismiss',
			'button'
		),
		'category' => 'widgets',
		'description' => 'A close button for modal and drawer content.',
		'ancestor' => array(
			'matter/drawer-content',
			'matter/modal-content'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => 'Close',
				'role' => 'content'
			),
			'showLabel' => array(
				'type' => 'boolean',
				'default' => false
			),
			'position' => array(
				'type' => 'string',
				'enum' => array(
					'inline',
					'top-left',
					'top-right'
				),
				'default' => 'inline'
			),
			'positionOffset' => array(
				'type' => 'string',
				'default' => '0'
			)
		),
		'supports' => array(
			'border' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true
			),
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => true
			),
			'html' => false,
			'reusable' => false,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => false,
					'padding' => true
				)
			),
			'dimensions' => array(
				'width' => false,
				'height' => false,
				'aspectRatio' => false,
				'minHeight' => false
			),
			'typography' => array(
				'fontSize' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'usesContext' => array(
			'matter/drawer-id',
			'matter/modal-id'
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'collapsible' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/collapsible',
		'version' => '0.1.0',
		'title' => 'Collapsible',
		'keywords' => array(
			'accordion',
			'collapsible',
			'toggle'
		),
		'category' => 'widgets',
		'description' => 'An interactive section which reveals content when triggered.',
		'allowedBlocks' => array(
			'matter/trigger',
			'matter/trigger-hamburger',
			'matter/collapsible-content'
		),
		'attributes' => array(
			'generatedId' => array(
				'type' => 'string',
				'default' => ''
			),
			'type' => array(
				'type' => 'string',
				'enum' => array(
					'popover',
					'inline'
				),
				'default' => 'popover'
			),
			'editorIsOpen' => array(
				'type' => 'boolean',
				'default' => false,
				'role' => 'local'
			)
		),
		'providesContext' => array(
			'matter/collapsible-is-open' => 'editorIsOpen'
		),
		'usesContext' => array(
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'interactivity' => true,
			'contentRole' => true,
			'listView' => true
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => 'matter/overlay-store'
	),
	'collapsible-content' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/collapsible-content',
		'version' => '0.1.0',
		'title' => 'Collapsible Content',
		'category' => 'widgets',
		'description' => 'The content panel revealed by a collapsible trigger.',
		'parent' => array(
			'matter/collapsible'
		),
		'supports' => array(
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => true,
				'link' => false
			),
			'contentRole' => true,
			'html' => false,
			'lock' => false,
			'reusable' => false,
			'spacing' => array(
				'margin' => true,
				'padding' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'usesContext' => array(
			'matter/collapsible-id',
			'matter/collapsible-is-open'
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'drawer' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/drawer',
		'version' => '0.1.0',
		'title' => 'Drawer',
		'keywords' => array(
			'drawer',
			'sidebar'
		),
		'category' => 'widgets',
		'description' => 'An interactive drawer to display content without leaving the page.',
		'allowedBlocks' => array(
			'matter/trigger',
			'matter/trigger-hamburger',
			'matter/drawer-content'
		),
		'attributes' => array(
			'generatedId' => array(
				'type' => 'string',
				'default' => ''
			),
			'editorIsOpen' => array(
				'type' => 'boolean',
				'default' => false,
				'role' => 'local'
			)
		),
		'providesContext' => array(
			'matter/drawer-is-open' => 'editorIsOpen'
		),
		'usesContext' => array(
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'interactivity' => true,
			'contentRole' => true,
			'listView' => true
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => 'matter/overlay-store'
	),
	'drawer-content' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/drawer-content',
		'version' => '0.1.0',
		'title' => 'Drawer Content',
		'category' => 'widgets',
		'description' => 'The content displayed inside a drawer.',
		'parent' => array(
			'matter/drawer'
		),
		'attributes' => array(
			'backdropColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'backdropOpacity' => array(
				'type' => 'number',
				'default' => 50
			),
			'backdropBlur' => array(
				'type' => 'number',
				'default' => 0
			),
			'position' => array(
				'type' => 'string',
				'enum' => array(
					'left',
					'right',
					'top',
					'bottom'
				),
				'default' => 'left'
			),
			'width' => array(
				'type' => 'string',
				'default' => ''
			),
			'height' => array(
				'type' => 'string',
				'default' => ''
			),
			'layout' => array(
				'type' => 'object',
				'default' => array(
					'type' => 'flex',
					'orientation' => 'vertical',
					'flexWrap' => false
				)
			)
		),
		'supports' => array(
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => true,
				'link' => false
			),
			'contentRole' => true,
			'html' => false,
			'layout' => array(
				'default' => array(
					'type' => 'flex',
					'orientation' => 'vertical'
				),
				'allowSizingOnChildren' => true,
				'allowWrap' => false,
				'allowVerticalAlignment' => true,
				'allowJustification' => true,
				'allowOrientation' => false
			),
			'lock' => false,
			'reusable' => false,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'blockGap' => true,
				'__experimentalDefaultControls' => array(
					'blockGap' => false,
					'margin' => false,
					'padding' => true
				)
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'usesContext' => array(
			'matter/drawer-id',
			'matter/drawer-is-open',
			'postId',
			'queryId'
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'gallery' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/gallery',
		'version' => '0.1.0',
		'title' => 'Gallery',
		'category' => 'media',
		'icon' => 'format-gallery',
		'description' => 'A gallery of images with grid or carousel display and an optional lightbox.',
		'keywords' => array(
			'gallery',
			'images',
			'carousel',
			'lightbox'
		),
		'allowedBlocks' => array(
			'core/image'
		),
		'attributes' => array(
			'generatedId' => array(
				'type' => 'string',
				'default' => ''
			),
			'type' => array(
				'type' => 'string',
				'default' => 'grid',
				'enum' => array(
					'grid',
					'carousel'
				)
			),
			'aspectRatio' => array(
				'type' => 'string',
				'default' => 'auto'
			),
			'sizeSlug' => array(
				'type' => 'string',
				'default' => 'large'
			),
			'thumbnailSizeSlug' => array(
				'type' => 'string',
				'default' => 'thumbnail'
			),
			'lightbox' => array(
				'type' => 'boolean',
				'default' => true
			),
			'lightboxSizeSlug' => array(
				'type' => 'string',
				'default' => 'large'
			),
			'lightboxThumbnails' => array(
				'type' => 'boolean',
				'default' => true
			),
			'lightboxThumbnailSizeSlug' => array(
				'type' => 'string',
				'default' => 'thumbnail'
			),
			'lightboxThumbnailAspectRatio' => array(
				'type' => 'string',
				'default' => '1'
			),
			'lightboxThumbnailFocalPoint' => array(
				'type' => 'object',
				'default' => array(
					'x' => 0.5,
					'y' => 0.5
				)
			),
			'lightboxThumbnailGap' => array(
				'type' => 'string',
				'default' => ''
			),
			'lightboxBackdropColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'lightboxBackdropOpacity' => array(
				'type' => 'number',
				'default' => 85
			),
			'lightboxBackdropBlur' => array(
				'type' => 'number',
				'default' => 0
			),
			'showCaptions' => array(
				'type' => 'boolean',
				'default' => true
			),
			'imageLimit' => array(
				'type' => 'number',
				'default' => 0
			),
			'includeThumbnails' => array(
				'type' => 'boolean',
				'default' => false
			),
			'thumbnailAspectRatio' => array(
				'type' => 'string',
				'default' => '1'
			),
			'thumbnailsVisible' => array(
				'type' => 'number',
				'default' => 0
			),
			'thumbnailGap' => array(
				'type' => 'string',
				'default' => ''
			),
			'imageCrop' => array(
				'type' => 'boolean',
				'default' => true
			),
			'allowResize' => array(
				'type' => 'boolean',
				'default' => false
			),
			'viewAllText' => array(
				'type' => 'string',
				'default' => 'View Gallery',
				'role' => 'content'
			),
			'carouselConfig' => array(
				'type' => 'object',
				'default' => array(
					'options' => array(
						'loop' => false,
						'axis' => 'x',
						'slidesToScroll' => 1,
						'slidesToShow' => 1,
						'slideGap' => '',
						'active' => true
					),
					'plugins' => array(
						'fade' => array(
							'active' => false
						),
						'autoplay' => array(
							'active' => false,
							'type' => 'slide',
							'delay' => 4000
						)
					),
					'breakpointLayers' => array(
						
					)
				)
			),
			'advancedCarouselConfig' => array(
				'type' => 'object',
				'default' => null
			),
			'advancedCarouselConfigMerge' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'providesContext' => array(
			'allowResize' => 'allowResize',
			'imageCrop' => 'imageCrop'
		),
		'supports' => array(
			'anchor' => true,
			'align' => array(
				'wide',
				'full'
			),
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => true,
				'link' => false
			),
			'contentRole' => true,
			'html' => false,
			'interactivity' => true,
			'listView' => true,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'blockGap' => true,
				'__experimentalDefaultControls' => array(
					'margin' => true,
					'padding' => true,
					'blockGap' => true
				)
			),
			'layout' => array(
				'allowSwitching' => false,
				'allowInheriting' => false,
				'allowEditing' => true,
				'allowSizingOnChildren' => true,
				'default' => array(
					'type' => 'grid',
					'columnCount' => 3
				)
			),
			'dimensions' => array(
				'width' => false,
				'height' => false,
				'aspectRatio' => false,
				'minHeight' => false
			)
		),
		'selectors' => array(
			'root' => '.wp-block-matter-gallery',
			'spacing' => array(
				'blockGap' => '.wp-block-matter-gallery.wp-block-matter-gallery--grid.is-layout-grid, .wp-block-matter-gallery.wp-block-matter-gallery--grid .block-editor-block-list__layout.is-layout-grid, .wp-block-matter-gallery.wp-block-matter-gallery--carousel .wp-block-matter-gallery__carousel'
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js',
		'render' => 'file:./render.php'
	),
	'modal' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/modal',
		'version' => '0.1.0',
		'title' => 'Modal',
		'keywords' => array(
			'dialog',
			'modal',
			'popup'
		),
		'category' => 'widgets',
		'description' => 'An interactive modal dialog to display content without leaving the page.',
		'allowedBlocks' => array(
			'matter/trigger',
			'matter/trigger-hamburger',
			'matter/modal-content'
		),
		'attributes' => array(
			'generatedId' => array(
				'type' => 'string',
				'default' => ''
			),
			'editorIsOpen' => array(
				'type' => 'boolean',
				'default' => false,
				'role' => 'local'
			),
			'dismissedDuration' => array(
				'type' => 'string'
			),
			'triggerOnLoad' => array(
				'type' => 'boolean',
				'default' => false
			),
			'triggerDelay' => array(
				'type' => 'string'
			),
			'triggerOnScroll' => array(
				'type' => 'boolean',
				'default' => false
			),
			'scrollSelector' => array(
				'type' => 'string'
			),
			'scrollThreshold' => array(
				'type' => 'string',
				'default' => '10'
			),
			'urlTriggers' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'groupId' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'providesContext' => array(
			'matter/modal-is-open' => 'editorIsOpen'
		),
		'usesContext' => array(
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'interactivity' => true,
			'contentRole' => true,
			'listView' => true
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php',
		'viewScriptModule' => 'matter/overlay-store'
	),
	'modal-content' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/modal-content',
		'version' => '0.1.0',
		'title' => 'Modal Content',
		'category' => 'widgets',
		'description' => 'The content displayed inside a modal.',
		'parent' => array(
			'matter/modal'
		),
		'attributes' => array(
			'backdropColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'backdropOpacity' => array(
				'type' => 'number',
				'default' => 50
			),
			'backdropBlur' => array(
				'type' => 'number',
				'default' => 0
			),
			'width' => array(
				'type' => 'string',
				'default' => ''
			),
			'height' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => true,
				'link' => false
			),
			'contentRole' => true,
			'html' => false,
			'lock' => false,
			'reusable' => false,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'blockGap' => true,
				'__experimentalDefaultControls' => array(
					'blockGap' => false,
					'margin' => false,
					'padding' => true
				)
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'usesContext' => array(
			'matter/modal-id',
			'matter/modal-is-open',
			'postId',
			'queryId'
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'modal-navigation' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/modal-navigation',
		'version' => '0.1.0',
		'title' => 'Modal Navigation',
		'keywords' => array(
			'modal',
			'previous',
			'next',
			'navigation'
		),
		'category' => 'widgets',
		'description' => 'A previous or next button for grouped modals.',
		'ancestor' => array(
			'matter/modal-content'
		),
		'attributes' => array(
			'direction' => array(
				'type' => 'string',
				'enum' => array(
					'previous',
					'next'
				),
				'default' => 'next'
			),
			'label' => array(
				'type' => 'string',
				'default' => 'Next',
				'role' => 'content'
			),
			'showLabel' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'supports' => array(
			'border' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true
			),
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => true
			),
			'html' => false,
			'reusable' => false,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => false,
					'padding' => true
				)
			),
			'dimensions' => array(
				'width' => false,
				'height' => false,
				'aspectRatio' => false,
				'minHeight' => false
			),
			'typography' => array(
				'fontSize' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'usesContext' => array(
			'matter/modal-id'
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'navigation' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/navigation',
		'version' => '0.1.0',
		'title' => 'Navigation',
		'category' => 'theme',
		'description' => 'Select and render an existing Navigation menu as a simplified, read-only block.',
		'attributes' => array(
			'ref' => array(
				'type' => 'number',
				'default' => 0
			),
			'type' => array(
				'type' => 'string',
				'default' => 'simple',
				'enum' => array(
					'simple',
					'accordion',
					'drill-down'
				)
			),
			'submenuOpensOnClick' => array(
				'type' => 'boolean',
				'default' => false
			),
			'showSubmenuLabel' => array(
				'type' => 'boolean',
				'default' => false
			),
			'showSubmenuViewAll' => array(
				'type' => 'boolean',
				'default' => false
			),
			'layout' => array(
				'type' => 'object',
				'default' => array(
					'type' => 'flex',
					'orientation' => 'vertical'
				)
			),
			'iconColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'accentColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'submenuTextColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'submenuBackgroundColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'submenuIconColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'backTextColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'backBackgroundColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'backIconColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'submenuDividerColor' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'interactivity' => true,
			'html' => false,
			'anchor' => true,
			'align' => array(
				'wide',
				'full'
			),
			'contentRole' => true,
			'listView' => true,
			'lock' => false,
			'layout' => array(
				'default' => array(
					'type' => 'flex',
					'flexWrap' => 'wrap',
					'justifyContent' => 'left',
					'verticalAlignment' => 'center',
					'orientation' => 'vertical'
				),
				'allowSwitching' => false,
				'allowInheriting' => false,
				'allowVerticalAlignment' => true,
				'allowSizingOnChildren' => true,
				'allowOrientation' => true,
				'allowWrap' => true,
				'allowJustification' => true
			),
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => false,
				'link' => false
			),
			'typography' => array(
				'textAlign' => true,
				'fontSize' => true,
				'__experimentalDefaultControls' => array(
					'fontSize' => false
				)
			),
			'spacing' => array(
				'blockGap' => true,
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'blockGap' => false,
					'margin' => false,
					'padding' => false
				)
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'viewScriptModule' => 'file:./view.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'tab-button' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/tab-button',
		'version' => '0.1.0',
		'title' => 'Tab Button',
		'description' => 'A tab label button in a tabbed interface.',
		'category' => 'widgets',
		'textdomain' => 'matter',
		'parent' => array(
			'matter/tab-list'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'tabPanelClientId' => array(
				'type' => 'string'
			),
			'mediaId' => array(
				'type' => 'number',
				'role' => 'content'
			),
			'mediaType' => array(
				'type' => 'string',
				'role' => 'content'
			),
			'posterId' => array(
				'type' => 'number',
				'role' => 'content'
			),
			'focalPoint' => array(
				'type' => 'object',
				'role' => 'content'
			)
		),
		'usesContext' => array(
			'matter/tabs-activeTabIndex',
			'matter/tabs-editorActiveTabIndex'
		),
		'supports' => array(
			'html' => false,
			'reusable' => false,
			'lock' => false,
			'inserter' => false,
			'color' => array(
				'background' => true,
				'text' => true,
				'gradients' => true,
				'link' => false
			),
			'spacing' => array(
				'padding' => true,
				'margin' => false
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'editorScript' => 'file:./index.js'
	),
	'tab-list' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/tab-list',
		'version' => '0.1.0',
		'title' => 'Tab List',
		'description' => 'Display the tab buttons for a tabbed interface.',
		'category' => 'widgets',
		'textdomain' => 'matter',
		'parent' => array(
			'matter/tabs'
		),
		'allowedBlocks' => array(
			'matter/tab-button'
		),
		'usesContext' => array(
			'matter/tabs-id',
			'matter/tabs-list',
			'matter/tabs-collapses',
			'matter/tabs-collapsesOn',
			'matter/tabs-isQueryMode',
			'matter/tabs-editorActiveTabIndex',
			'matter/tabs-activeTabIndex'
		),
		'attributes' => array(
			'tabBackgroundColor' => array(
				'type' => 'string',
				'default' => ''
			),
			'tabActiveColor' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'align' => true,
			'html' => false,
			'reusable' => false,
			'visibility' => false,
			'lock' => false,
			'contentRole' => true,
			'color' => array(
				'background' => true,
				'text' => true,
				'gradients' => true,
				'link' => false
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			),
			'layout' => array(
				'default' => array(
					'type' => 'flex',
					'flexWrap' => 'nowrap',
					'justifyContent' => 'left',
					'verticalAlignment' => 'center',
					'orientation' => 'horizontal'
				),
				'allowSwitching' => false,
				'allowVerticalAlignment' => false,
				'allowJustification' => true,
				'allowOrientation' => true,
				'allowWrap' => false
			),
			'spacing' => array(
				'padding' => true,
				'margin' => true,
				'blockGap' => true
			)
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'tab-panel' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/tab-panel',
		'version' => '0.1.0',
		'title' => 'Tab Panel',
		'description' => 'Content for a tab in a tabbed interface.',
		'category' => 'widgets',
		'textdomain' => 'matter',
		'attributes' => array(
			'inQueryLoop' => array(
				'type' => 'boolean',
				'default' => false
			),
			'label' => array(
				'type' => 'string',
				'role' => 'content'
			)
		),
		'parent' => array(
			'matter/tab-panels',
			'core/post-template'
		),
		'ancestor' => array(
			'matter/tabs'
		),
		'usesContext' => array(
			'matter/tabs-activeTabIndex',
			'matter/tabs-editorActiveTabIndex',
			'matter/tabs-id',
			'matter/tabs-list',
			'matter/tabs-isQueryMode',
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'anchor' => true,
			'html' => false,
			'reusable' => false,
			'contentRole' => true,
			'color' => array(
				'background' => true,
				'text' => true,
				'gradients' => true,
				'link' => false
			),
			'spacing' => array(
				'blockGap' => true,
				'padding' => true,
				'margin' => false
			),
			'layout' => array(
				'default' => array(
					'type' => 'default'
				),
				'allowSwitching' => false
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			),
			'renaming' => true,
			'visibility' => false
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'tab-panels' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/tab-panels',
		'version' => '0.1.0',
		'title' => 'Tab Panels',
		'description' => 'Container for tab panel content in a tabbed interface.',
		'category' => 'widgets',
		'textdomain' => 'matter',
		'parent' => array(
			'matter/tabs'
		),
		'allowedBlocks' => array(
			'matter/tab-panel',
			'core/query'
		),
		'usesContext' => array(
			'matter/tabs-isQueryMode'
		),
		'attributes' => array(
			'tabPanelActiveColor' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'anchor' => false,
			'html' => false,
			'reusable' => false,
			'visibility' => false,
			'lock' => false,
			'contentRole' => true,
			'color' => array(
				'background' => true,
				'text' => true,
				'gradients' => true,
				'link' => false
			),
			'spacing' => array(
				'blockGap' => false,
				'padding' => true,
				'margin' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'tabs' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/tabs',
		'version' => '0.1.0',
		'title' => 'Tabs',
		'description' => 'Display content in a tabbed interface to help users navigate detailed content with ease.',
		'category' => 'widgets',
		'textdomain' => 'matter',
		'allowedBlocks' => array(
			'matter/tab-list',
			'matter/tab-panels'
		),
		'attributes' => array(
			'generatedId' => array(
				'type' => 'string',
				'default' => ''
			),
			'activeTabIndex' => array(
				'type' => 'number',
				'default' => 0
			),
			'editorActiveTabIndex' => array(
				'type' => 'number',
				'role' => 'local'
			),
			'deepLinking' => array(
				'type' => 'boolean',
				'default' => false
			),
			'deepLinkingUpdateHistory' => array(
				'type' => 'boolean',
				'default' => false
			),
			'collapses' => array(
				'type' => 'boolean',
				'default' => false
			),
			'collapsesOn' => array(
				'type' => 'string',
				'default' => 'lg'
			),
			'isQueryMode' => array(
				'type' => 'boolean',
				'default' => false
			),
			'stackOnMobile' => array(
				'type' => 'boolean',
				'default' => false
			),
			'stackedBreakpoint' => array(
				'type' => 'string',
				'default' => 'lg'
			)
		),
		'supports' => array(
			'align' => true,
			'anchor' => true,
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => true,
				'link' => false
			),
			'layout' => array(
				'default' => array(
					'type' => 'flex',
					'flexWrap' => 'nowrap',
					'justifyContent' => 'stretch',
					'verticalAlignment' => 'stretch',
					'orientation' => 'vertical'
				),
				'allowSwitching' => false,
				'allowVerticalAlignment' => true,
				'allowJustification' => false,
				'allowOrientation' => true,
				'allowWrap' => false,
				'allowSizingOnChildren' => true
			),
			'html' => false,
			'interactivity' => true,
			'contentRole' => true,
			'spacing' => array(
				'blockGap' => true,
				'margin' => true,
				'padding' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			),
			'renaming' => true
		),
		'providesContext' => array(
			'matter/tabs-activeTabIndex' => 'activeTabIndex',
			'matter/tabs-editorActiveTabIndex' => 'editorActiveTabIndex',
			'matter/tabs-collapses' => 'collapses',
			'matter/tabs-collapsesOn' => 'collapsesOn',
			'matter/tabs-isQueryMode' => 'isQueryMode'
		),
		'usesContext' => array(
			'matter/tabs-list',
			'matter/tabs-id'
		),
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js',
		'render' => 'file:./render.php'
	),
	'trigger' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/trigger',
		'version' => '0.1.0',
		'title' => 'Trigger',
		'keywords' => array(
			'trigger',
			'button'
		),
		'category' => 'widgets',
		'description' => 'An interactive trigger to open a modal, drawer or collapsible block.',
		'allowedBlocks' => array(
			'core/buttons',
			'core/group'
		),
		'attributes' => array(
			'targetId' => array(
				'type' => 'string',
				'default' => ''
			),
			'triggerType' => array(
				'type' => 'string',
				'enum' => array(
					'button',
					'content'
				),
				'default' => 'button'
			),
			'accessibleLabel' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'overlayContext' => array(
				'type' => 'object',
				'default' => array(
					
				)
			)
		),
		'supports' => array(
			'html' => false,
			'interactivity' => true,
			'contentRole' => true,
			'listView' => true,
			'lock' => false,
			'reusable' => false
		),
		'usesContext' => array(
			'matter/modal-id',
			'matter/drawer-id',
			'matter/collapsible-id'
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'trigger-hamburger' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/trigger-hamburger',
		'version' => '0.1.0',
		'title' => 'Hamburger Trigger',
		'keywords' => array(
			'menu',
			'navigation',
			'hamburger',
			'trigger'
		),
		'category' => 'widgets',
		'description' => 'A hamburger icon trigger to open a modal, drawer or collapsible block.',
		'attributes' => array(
			'targetId' => array(
				'type' => 'string',
				'default' => ''
			),
			'label' => array(
				'type' => 'string',
				'default' => 'Open menu',
				'role' => 'content'
			),
			'showLabel' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'styles' => array(
			array(
				'name' => 'squeeze',
				'label' => 'Squeeze',
				'isDefault' => false
			),
			array(
				'name' => 'spin',
				'label' => 'Spin',
				'isDefault' => false
			)
		),
		'supports' => array(
			'border' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true
			),
			'color' => array(
				'text' => true,
				'background' => true,
				'gradients' => true
			),
			'html' => false,
			'interactivity' => true,
			'contentRole' => true,
			'listView' => true,
			'lock' => false,
			'reusable' => false,
			'spacing' => array(
				'margin' => true,
				'padding' => true,
				'__experimentalDefaultControls' => array(
					'margin' => false,
					'padding' => true
				)
			),
			'typography' => array(
				'fontSize' => true
			),
			'__experimentalBorder' => array(
				'color' => true,
				'radius' => true,
				'style' => true,
				'width' => true,
				'__experimentalDefaultControls' => array(
					'color' => false,
					'radius' => false,
					'style' => false,
					'width' => false
				)
			)
		),
		'usesContext' => array(
			'matter/modal-id',
			'matter/drawer-id',
			'matter/collapsible-id'
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	)
);

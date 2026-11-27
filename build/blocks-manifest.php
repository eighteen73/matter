<?php
// This file is generated. Do not modify it manually.
return array(
	'accordion' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/accordion',
		'version' => '1.0.0',
		'title' => 'Accordion',
		'category' => 'widgets',
		'description' => 'Expandable items you write here. To list FAQs or other posts automatically, use Posts accordion.',
		'keywords' => array(
			'faq',
			'toggle',
			'expand',
			'collapse'
		),
		'attributes' => array(
			'matterId' => array(
				'type' => 'string'
			),
			'headingLevel' => array(
				'type' => 'number',
				'default' => 3
			),
			'autoclose' => array(
				'type' => 'boolean',
				'default' => false
			),
			'openFirst' => array(
				'type' => 'boolean',
				'default' => false
			),
			'faqSchema' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'providesContext' => array(
			'matter/headingLevel' => 'headingLevel',
			'matter/autoclose' => 'autoclose',
			'matter/openFirst' => 'openFirst'
		),
		'example' => array(
			'attributes' => array(
				'openFirst' => true
			),
			'innerBlocks' => array(
				array(
					'name' => 'matter/accordion-item',
					'attributes' => array(
						'title' => 'What\'s included?'
					),
					'innerBlocks' => array(
						array(
							'name' => 'core/paragraph',
							'attributes' => array(
								'content' => 'Everything you need to get started, delivered together.'
							)
						)
					)
				),
				array(
					'name' => 'matter/accordion-item',
					'attributes' => array(
						'title' => 'How long does it take?'
					),
					'innerBlocks' => array(
						array(
							'name' => 'core/paragraph',
							'attributes' => array(
								'content' => 'Most orders arrive within a week.'
							)
						)
					)
				),
				array(
					'name' => 'matter/accordion-item',
					'attributes' => array(
						'title' => 'Can I change my order?'
					),
					'innerBlocks' => array(
						array(
							'name' => 'core/paragraph',
							'attributes' => array(
								'content' => 'Yes, until it\'s dispatched.'
							)
						)
					)
				)
			)
		),
		'supports' => array(
			'html' => false,
			'anchor' => true,
			'align' => array(
				'wide',
				'full'
			),
			'interactivity' => true,
			'matter' => array(
				'scheme' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js',
		'render' => 'file:./render.php'
	),
	'accordion-item' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/accordion-item',
		'version' => '1.0.0',
		'title' => 'Accordion item',
		'category' => 'widgets',
		'description' => 'A title and the content it reveals.',
		'parent' => array(
			'matter/accordion',
			'core/post-template'
		),
		'attributes' => array(
			'title' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'open' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'usesContext' => array(
			'matter/headingLevel',
			'matter/autoclose',
			'matter/openFirst',
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'html' => false,
			'reusable' => false
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	),
	'active-filters' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/active-filters',
		'version' => '1.0.0',
		'title' => 'Active filters',
		'category' => 'matter-filters',
		'description' => 'The filters applied to the list, each removable, and Clear all.',
		'usesContext' => array(
			'queryId',
			'query'
		),
		'attributes' => array(
			
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'renaming' => false,
			'interactivity' => array(
				'clientNavigation' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'matter/filters',
		'render' => 'file:./render.php'
	),
	'archive-content' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/archive-content',
		'version' => '1.0.0',
		'title' => 'Archive content',
		'category' => 'theme',
		'description' => 'For archive templates: wrap the list of posts or products. Editors add content above and below it in Appearance › Archives.',
		'supports' => array(
			'html' => false,
			'inserter' => false,
			'reusable' => false,
			'customClassName' => false,
			'renaming' => false,
			'layout' => array(
				'default' => array(
					'type' => 'constrained'
				),
				'allowSwitching' => false,
				'allowInheriting' => false,
				'allowEditing' => false
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	),
	'archive-loop' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/archive-loop',
		'version' => '1.0.0',
		'title' => 'Archive list',
		'category' => 'theme',
		'description' => 'The archive\'s posts or products, as the theme lists them. Add content above and below it.',
		'attributes' => array(
			'lock' => array(
				'type' => 'object',
				'default' => array(
					'remove' => true
				)
			)
		),
		'supports' => array(
			'html' => false,
			'inserter' => true,
			'multiple' => false,
			'reusable' => false,
			'lock' => false,
			'renaming' => false
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'render' => 'file:./render.php'
	),
	'carousel' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/carousel',
		'version' => '1.0.0',
		'title' => 'Carousel',
		'category' => 'widgets',
		'description' => 'Slides that scroll horizontally: each block inside is a slide. To show posts, products or terms automatically, use Posts, Products or Terms carousel.',
		'keywords' => array(
			'slider',
			'slideshow',
			'gallery'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'aspectRatio' => array(
				'type' => 'string',
				'default' => ''
			),
			'allowResize' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'providesContext' => array(
			'allowResize' => 'allowResize'
		),
		'example' => array(
			'viewportWidth' => 1200,
			'innerBlocks' => array(
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				),
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				),
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				),
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				)
			)
		),
		'supports' => array(
			'html' => false,
			'anchor' => true,
			'align' => array(
				'wide',
				'full'
			),
			'interactivity' => true,
			'matter' => array(
				'scheme' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js',
		'render' => 'file:./render.php'
	),
	'collapsible' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/collapsible',
		'version' => '1.0.0',
		'title' => 'Collapsible',
		'category' => 'widgets',
		'description' => 'Content that stays hidden until a button or link reveals it.',
		'keywords' => array(
			'toggle',
			'disclosure',
			'reveal',
			'show more'
		),
		'attributes' => array(
			'overlayId' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'html' => false,
			'reusable' => false,
			'interactivity' => true,
			'matter' => array(
				'scheme' => true,
				'section' => false,
				'slots' => array(
					'trigger' => array(
						
					),
					'content' => array(
						'template' => array(
							array(
								'core/heading',
								array(
									'level' => 2,
									'placeholder' => 'Heading'
								)
							),
							array(
								'core/paragraph',
								array(
									'placeholder' => 'Content…'
								)
							)
						)
					)
				)
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'matter/overlay',
		'render' => 'file:./render.php',
		'usesContext' => array(
			'postId'
		)
	),
	'drawer' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/drawer',
		'version' => '1.0.0',
		'title' => 'Drawer',
		'category' => 'widgets',
		'description' => 'Content that slides in from the edge of the screen, opened by a button or link.',
		'keywords' => array(
			'offcanvas',
			'sidebar',
			'panel'
		),
		'attributes' => array(
			'overlayId' => array(
				'type' => 'string',
				'default' => ''
			),
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'position' => array(
				'type' => 'string',
				'enum' => array(
					'end',
					'start'
				),
				'default' => 'end'
			),
			'openOnLoad' => array(
				'type' => 'boolean',
				'default' => false
			),
			'openDelay' => array(
				'type' => 'number',
				'default' => 0
			),
			'openOnScroll' => array(
				'type' => 'boolean',
				'default' => false
			),
			'scrollThreshold' => array(
				'type' => 'number',
				'default' => 50
			),
			'urlTriggers' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'dismissDays' => array(
				'type' => 'number',
				'default' => 0
			),
			'dismissible' => array(
				'type' => 'boolean',
				'default' => true
			)
		),
		'supports' => array(
			'html' => false,
			'reusable' => false,
			'interactivity' => true,
			'matter' => array(
				'scheme' => true,
				'section' => false,
				'slots' => array(
					'trigger' => array(
						
					),
					'content' => array(
						'template' => array(
							array(
								'core/heading',
								array(
									'level' => 2,
									'placeholder' => 'Heading'
								)
							),
							array(
								'core/paragraph',
								array(
									'placeholder' => 'Content…'
								)
							)
						)
					)
				)
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'matter/overlay',
		'render' => 'file:./render.php',
		'usesContext' => array(
			'postId'
		)
	),
	'filter' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/filter',
		'version' => '1.0.0',
		'title' => 'Filter',
		'category' => 'matter-filters',
		'description' => 'Filter the list by a category, tag, attribute or other choice, with how many results each option has.',
		'parent' => array(
			'matter/filters'
		),
		'usesContext' => array(
			'queryId',
			'query'
		),
		'attributes' => array(
			'source' => array(
				'type' => 'string',
				'default' => ''
			),
			'display' => array(
				'type' => 'string',
				'enum' => array(
					'checkboxes',
					'radio',
					'chips',
					'dropdown',
					'swatches',
					'stars',
					'range'
				),
				'default' => 'checkboxes'
			),
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'showCounts' => array(
				'type' => 'boolean',
				'default' => true
			),
			'operator' => array(
				'type' => 'string',
				'enum' => array(
					'or',
					'and'
				),
				'default' => 'or'
			),
			'limit' => array(
				'type' => 'number',
				'default' => 0
			),
			'atLeast' => array(
				'type' => 'boolean',
				'default' => false
			),
			'collapsible' => array(
				'type' => 'boolean',
				'default' => false
			),
			'open' => array(
				'type' => 'boolean',
				'default' => true
			),
			'slider' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'supports' => array(
			'html' => false,
			'reusable' => false,
			'renaming' => false,
			'interactivity' => array(
				'clientNavigation' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'matter/filters',
		'render' => 'file:./render.php'
	),
	'filters' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/filters',
		'version' => '1.0.0',
		'title' => 'Filters',
		'category' => 'matter-filters',
		'description' => 'Filters for the list they\'re in: a sidebar on larger screens, and below the theme\'s breakpoint a panel opened by the Filters button.',
		'keywords' => array(
			'facet',
			'filter',
			'refine',
			'sidebar'
		),
		'usesContext' => array(
			'queryId',
			'query'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			)
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'renaming' => false,
			'interactivity' => array(
				'clientNavigation' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'matter/filters',
		'render' => 'file:./render.php'
	),
	'filters-toggle' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/filters-toggle',
		'version' => '1.0.0',
		'title' => 'Filters button',
		'category' => 'matter-filters',
		'description' => 'Opens the list\'s filters on small screens, with how many are applied. Hidden while the filters show inline.',
		'usesContext' => array(
			'queryId',
			'query'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			)
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'renaming' => false,
			'interactivity' => array(
				'clientNavigation' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'matter/filters',
		'render' => 'file:./render.php'
	),
	'gallery' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/gallery',
		'version' => '1.0.0',
		'title' => 'Gallery',
		'category' => 'media',
		'description' => 'Images in a grid or carousel that open in a lightbox, cropped to one aspect ratio.',
		'keywords' => array(
			'images',
			'photos',
			'lightbox'
		),
		'attributes' => array(
			'layout' => array(
				'type' => 'string',
				'enum' => array(
					'grid',
					'carousel'
				),
				'default' => 'grid'
			),
			'limit' => array(
				'type' => 'number',
				'default' => 0
			),
			'lightbox' => array(
				'type' => 'boolean',
				'default' => true
			),
			'captions' => array(
				'type' => 'string',
				'enum' => array(
					'',
					'tooltip',
					'overlay',
					'hidden'
				),
				'default' => ''
			),
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'columns' => array(
				'type' => 'number',
				'default' => 0
			),
			'aspectRatio' => array(
				'type' => 'string',
				'default' => ''
			),
			'allowResize' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'providesContext' => array(
			'allowResize' => 'allowResize'
		),
		'example' => array(
			'viewportWidth' => 1200,
			'innerBlocks' => array(
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				),
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				),
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				),
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				),
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				),
				array(
					'name' => 'core/image',
					'attributes' => array(
						'url' => 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 600 400\'><rect width=\'600\' height=\'400\' fill=\'%23dcdcde\'/><circle cx=\'440\' cy=\'120\' r=\'40\' fill=\'%23c3c4c7\'/><path d=\'M0 400 210 170l120 140 80-80 190 170z\' fill=\'%23a7aaad\'/></svg>',
						'alt' => ''
					)
				)
			)
		),
		'supports' => array(
			'html' => false,
			'anchor' => true,
			'align' => array(
				'wide',
				'full'
			),
			'interactivity' => true
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js',
		'render' => 'file:./render.php'
	),
	'gravity-form' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/gravity-form',
		'version' => '1.0.0',
		'title' => 'Gravity Form',
		'category' => 'widgets',
		'description' => 'Displays a Gravity Form',
		'keywords' => array(
			'form',
			'forms',
			'contact'
		),
		'attributes' => array(
			'formId' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'displayTitle' => array(
				'type' => 'boolean',
				'default' => false
			),
			'displayDescription' => array(
				'type' => 'boolean',
				'default' => false
			),
			'ajaxSubmission' => array(
				'type' => 'boolean',
				'default' => true
			),
			'tabindex' => array(
				'type' => 'number',
				'default' => 0
			),
			'fieldValues' => array(
				'type' => 'object',
				'default' => null
			)
		),
		'example' => array(
			
		),
		'supports' => array(
			'html' => false,
			'anchor' => true,
			'renaming' => false,
			'customCSS' => false
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'style' => 'file:./style-index.css',
		'render' => 'file:./render.php'
	),
	'loop-item' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/loop-item',
		'version' => '1.0.0',
		'title' => 'Loop item',
		'category' => 'theme',
		'description' => 'The theme\'s design for the current item in a loop (a post, or a term in a Terms Query). The design lives in the theme, so every loop and carousel shows the same thing.',
		'keywords' => array(
			'loop',
			'item',
			'post',
			'product',
			'term'
		),
		'usesContext' => array(
			'postId',
			'postType',
			'termId',
			'taxonomy',
			'matter/display'
		),
		'attributes' => array(
			'itemLabel' => array(
				'type' => 'string',
				'role' => 'local'
			)
		),
		'supports' => array(
			'html' => false,
			'inserter' => false,
			'reusable' => false,
			'lock' => false,
			'renaming' => false,
			'customCSS' => false,
			'interactivity' => array(
				'clientNavigation' => true
			)
		),
		'textdomain' => 'matter',
		'viewScriptModule' => 'matter/loop-items',
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	),
	'modal' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/modal',
		'version' => '1.0.0',
		'title' => 'Modal',
		'category' => 'widgets',
		'description' => 'Content shown in a box over the page, opened by a button or link.',
		'keywords' => array(
			'dialog',
			'popup',
			'lightbox'
		),
		'attributes' => array(
			'overlayId' => array(
				'type' => 'string',
				'default' => ''
			),
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'openOnLoad' => array(
				'type' => 'boolean',
				'default' => false
			),
			'openDelay' => array(
				'type' => 'number',
				'default' => 0
			),
			'openOnScroll' => array(
				'type' => 'boolean',
				'default' => false
			),
			'scrollThreshold' => array(
				'type' => 'number',
				'default' => 50
			),
			'urlTriggers' => array(
				'type' => 'array',
				'default' => array(
					
				)
			),
			'dismissDays' => array(
				'type' => 'number',
				'default' => 0
			),
			'dismissible' => array(
				'type' => 'boolean',
				'default' => true
			),
			'group' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'supports' => array(
			'html' => false,
			'reusable' => false,
			'interactivity' => true,
			'matter' => array(
				'scheme' => true,
				'section' => false,
				'slots' => array(
					'trigger' => array(
						
					),
					'content' => array(
						'template' => array(
							array(
								'core/heading',
								array(
									'level' => 2,
									'placeholder' => 'Heading'
								)
							),
							array(
								'core/paragraph',
								array(
									'placeholder' => 'Content…'
								)
							)
						)
					)
				)
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'matter/overlay',
		'render' => 'file:./render.php',
		'usesContext' => array(
			'postId'
		)
	),
	'results-count' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/results-count',
		'version' => '1.0.0',
		'title' => 'Results count',
		'category' => 'matter-filters',
		'description' => 'How many results the list has, e.g. "Showing 1–12 of 48 results".',
		'usesContext' => array(
			'queryId',
			'query'
		),
		'attributes' => array(
			
		),
		'supports' => array(
			'html' => false,
			'multiple' => false,
			'reusable' => false,
			'renaming' => false,
			'interactivity' => array(
				'clientNavigation' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'viewScriptModule' => 'matter/filters',
		'render' => 'file:./render.php'
	),
	'slot' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/slot',
		'version' => '1.0.0',
		'title' => 'Slot',
		'category' => 'design',
		'description' => 'A named content area inside a section. Added automatically by sections.',
		'attributes' => array(
			'name' => array(
				'type' => 'string'
			)
		),
		'supports' => array(
			'html' => false,
			'inserter' => false,
			'reusable' => false,
			'className' => false,
			'customClassName' => false,
			'lock' => false,
			'renaming' => false
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	),
	'tab' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/tab',
		'version' => '1.0.0',
		'title' => 'Tab',
		'category' => 'widgets',
		'description' => 'A tab\'s label and content.',
		'parent' => array(
			'matter/tabs',
			'core/post-template'
		),
		'attributes' => array(
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'icon' => array(
				'type' => 'string',
				'default' => ''
			)
		),
		'usesContext' => array(
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'html' => false,
			'reusable' => false
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	),
	'tabs' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/tabs',
		'version' => '1.0.0',
		'title' => 'Tabs',
		'category' => 'widgets',
		'description' => 'Content split into tabs you write here. To show posts as tabs automatically, use Posts tabs.',
		'attributes' => array(
			'matterId' => array(
				'type' => 'string'
			),
			'label' => array(
				'type' => 'string',
				'default' => '',
				'role' => 'content'
			),
			'deepLink' => array(
				'type' => 'boolean',
				'default' => false
			),
			'orientation' => array(
				'type' => 'string',
				'enum' => array(
					'horizontal',
					'vertical'
				),
				'default' => 'horizontal'
			),
			'dropdown' => array(
				'type' => 'boolean',
				'default' => false
			)
		),
		'example' => array(
			'innerBlocks' => array(
				array(
					'name' => 'matter/tab',
					'attributes' => array(
						'label' => 'Overview'
					),
					'innerBlocks' => array(
						array(
							'name' => 'core/paragraph',
							'attributes' => array(
								'content' => 'A short introduction, shown first.'
							)
						)
					)
				),
				array(
					'name' => 'matter/tab',
					'attributes' => array(
						'label' => 'Details'
					),
					'innerBlocks' => array(
						array(
							'name' => 'core/paragraph',
							'attributes' => array(
								'content' => 'More about it.'
							)
						)
					)
				),
				array(
					'name' => 'matter/tab',
					'attributes' => array(
						'label' => 'Delivery'
					),
					'innerBlocks' => array(
						array(
							'name' => 'core/paragraph',
							'attributes' => array(
								'content' => 'How and when it arrives.'
							)
						)
					)
				)
			)
		),
		'supports' => array(
			'html' => false,
			'anchor' => true,
			'align' => array(
				'wide',
				'full'
			),
			'interactivity' => true,
			'matter' => array(
				'scheme' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'editorStyle' => 'file:./index.css',
		'style' => 'file:./style-index.css',
		'viewScriptModule' => 'file:./view.js',
		'render' => 'file:./render.php'
	),
	'template-part' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'matter/template-part',
		'version' => '1.0.0',
		'title' => 'Theme template part',
		'category' => 'theme',
		'description' => 'Renders a version-controlled PHP file from the theme\'s template-parts folder, such as the site header or footer.',
		'attributes' => array(
			'slug' => array(
				'type' => 'string'
			),
			'lock' => array(
				'type' => 'object',
				'default' => array(
					'move' => true,
					'remove' => true
				)
			)
		),
		'usesContext' => array(
			'postId',
			'postType',
			'queryId'
		),
		'supports' => array(
			'html' => false,
			'inserter' => false,
			'reusable' => false,
			'renaming' => false,
			'customCSS' => false,
			'interactivity' => array(
				'clientNavigation' => true
			)
		),
		'textdomain' => 'matter',
		'editorScript' => 'file:./index.js',
		'render' => 'file:./render.php'
	)
);

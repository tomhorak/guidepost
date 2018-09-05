/**
 * BLOCK: sbb/guidepost
 *
 * Registering the Guidepost block with Gutenberg.
 */

//  Import CSS.
import './style.scss';
import './editor.scss';

const { __ } = wp.i18n;
const { registerBlockType } = wp.blocks;
const { subscribe } = wp.data;
const el = wp.element.createElement;

const iconEl = el( 'svg', { width: 24, height: 24 },
	el( 'path', { d: 'M21.71,11.29l-9-9c-0.39-0.39-1.02-0.39-1.41,0l-9,9c-0.39,0.39-0.39,1.02,0,1.41l9,9c0.39,0.39,1.02,0.39,1.41,0l9-9C22.1,12.32,22.1,11.69,21.71,11.29z M14,14.5V12h-4v2c0,0.55-0.45,1-1,1h0c-0.55,0-1-0.45-1-1v-3c0-0.55,0.45-1,1-1h5V7.5l3.15,3.15c0.2,0.2,0.2,0.51,0,0.71L14,14.5z' } )
);

const linearToNestedList = function( array ) {
	const returnValue = [];

	array.forEach( function( heading, key ) {
		if ( typeof heading.attributes.content === 'undefined' ) {
			return;
		}

		// Make sure we are only working with the same level as the first iteration in our set.
		if ( heading.attributes.level === array[ 0 ].attributes.level ) {
			// Check that the next iteration will return a value.
			// If it does and the next level is greater than the current level,
			// the next iteration becomes a child of the current interation.
			if (
				( typeof array[ key + 1 ] !== 'undefined' ) &&
				( array[ key + 1 ].attributes.level > heading.attributes.level )
			) {
				// We need to calculate the last index before the next iteration that has the same level (siblings).
				// We then use this last index to slice the array for use in recursion.
				// This prevents duplicate nodes.
				let endOfSlice = array.length;
				for ( let i = ( key + 1 ); i < array.length; i++ ) {
					if ( array[ i ].attributes.level === heading.attributes.level ) {
						endOfSlice = i;
						break;
					}
				}

				// We found a child node: Push a new node onto the return array with children.
				returnValue.push( {
					block: heading,
					children: linearToNestedList( array.slice( key + 1, endOfSlice ) ),
				} );
			} else {
				// No child node: Push a new node onto the return array.
				returnValue.push( {
					block: heading,
					children: null,
				} );
			}
		}
	} );

	return returnValue;
};

const getHeadingBlocks = function() {
	const editor = wp.data.select( 'core/editor' );
	const headingBlocks = editor.getBlocks().filter( block => block.name === 'core/heading' );

	// Add anchors to any headings that don't have one.
	headingBlocks.forEach( function( heading, key ) {
		if ( typeof heading.attributes.anchor === 'undefined' && typeof heading.attributes.content !== 'undefined' ) {
			heading.attributes.anchor = key + '-' + heading.attributes.content.toString().toLowerCase().replace( ' ', '-' );
		}
	} );

	return headingBlocks;
};

class Guidepost extends React.Component {
	constructor( props ) {
		super( props );

		this.state = {
			headings: props.headings,
		};
	}

	componentDidMount() {
		const unsubscribe = subscribe( () => {
			this.setState( {
				headings: linearToNestedList( getHeadingBlocks() ),
			} );
		} );
	}

	render() {
		if ( this.state.headings.length === 0 ) {
			return ( <p>Add some Headings to generate the Guidepost.</p> );
		}

		const nodes = this.state.headings.map( function( heading ) {
			return (
				<Node key={ heading.block.attributes.anchor } node={ heading.block } children={ heading.children } />
			);
		} );

		return (
			<ul>
				{ nodes }
			</ul>
		);
	}
}

class Node extends React.Component {
	render() {
		let childnodes = null;

		if ( this.props.children ) {
			childnodes = this.props.children.map( function( childnode ) {
				return (
					<Node key={ childnode.block.attributes.anchor } node={ childnode.block } children={ childnode.children } />
				);
			} );
		}

		const nodeText = this.props.node.attributes.content[ 0 ] || '';

		return (
			<li key={ this.props.node.attributes.anchor }>
				<a href={ '#' + this.props.node.attributes.anchor } data-level={ this.props.node.attributes.level }>{ nodeText.toString() }</a>
				{ childnodes ? <ul>{ childnodes }</ul> : null }
			</li>
		);
	}
}

/**
 * Register our Gutenberg block.
 */
registerBlockType( 'sbb/guidepost', {
	title: __( 'Guidepost' ),
	description: __( 'Add a list of internal links allowing your readers to quickly navigate around.' ),
	icon: iconEl,
	category: 'common',
	keywords: [
		__( 'Guidepost' ),
		__( 'Table of Contents' ),
		__( 'Sorta Brilliant' ),
	],

	attributes: {
		headings: {
			source: 'query',
			selector: 'a',
			query: {
				content: { source: 'text' },
				anchor: { source: 'attribute', attribute: 'href' },
				level: { source: 'attribute', attribute: 'data-level' },
			},
		},
	},

	edit: function( props ) {
		const hierarchy = linearToNestedList( getHeadingBlocks() );

		return (
			<div className={ props.className }>
				<Guidepost headings={ hierarchy } />
			</div>
		);
	},

	save: function( props ) {
		const hierarchy = linearToNestedList( getHeadingBlocks() );

		return (
		return props.attributes.headings.length === 0 ? null : (
			<div className={ props.className }>
				<Guidepost headings={ hierarchy } />
			</div>
		);
	},
} );

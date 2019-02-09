import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

import './collapsible-container.scss';

/**
 * A HTML container that can collapse to nothing.
 *
 * @extends {PureComponent}
 */
class CollapsibleContainer extends PureComponent {
    static displayName = 'CollapsibleContainer';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLDivElement,
            contents: HTMLDivElement,
        });
        this.state = {
            contents: null,
            contentHeight: undefined,
            renderedAsClosed: false,
        };
    }

    static getDerivedStateFromProps(props, state) {
        // save contents in state if open = true, so that we don't need them
        // when show become false
        let { open, children } = props;
        if (open || children) {
            return { contents: children };
        } else {
            return { renderedAsClosed: true };
        }
        return null;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { open, children } = this.props;
        let { contentHeight, contents, renderedAsClosed } = this.state;
        let { setters } = this.components;

        let style = {};
        if (open) {
            if (contentHeight !== undefined) {
                style.height = contentHeight;
            } else if (renderedAsClosed) {
                // set the height to 0 initially, until we determine the
                // height in componentDidUpdate(), doing so only if the
                // component was rendered as closed previously
                style.height = 0;
            }
        } else {
            style.height = 0;
        }
        let className = 'collapsible-container';
        return (
            <div ref={setters.container} className={className} style={style}>
                <div ref={setters.contents} className="collapsible-contents">
                    {contents}
                </div>
            </div>
        );
    }

    /**
     * Update height when component draws for the first time
     */
    componentDidMount() {
        let { open } = this.props;
        if (open) {
            this.updateHeight();
            // sometimes height of the scrollbar isn't accounted for initially
            this.updateTimeout = setTimeout(this.updateHeight, 10);
        }
    }

    /**
     * Update height on redraw
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        this.updateHeight();
        this.updateTimeout = setTimeout(this.updateHeight, 10);
    }

    /**
     * Clear timeout on unmount
     */
    componentWillUnmount() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
    }

    /**
     * Get the height of the contents, saving it if it's different
     */
    updateHeight = () => {
        let { contentHeight } = this.state;
        let { contents } = this.components;
        if (contents) {
            let contentHeightAfter = getContentHeight(contents);
            if (contentHeightAfter !== contentHeight) {
                this.setState({ contentHeight: contentHeightAfter });
            }
        }
    }
}

function getContentHeight(div) {
    let height = div.offsetHeight;
    // find nexted collapsible containers
    let others = div.getElementsByClassName('collapsible-container');
    for (let other of others) {
        // remove the container's current height
        height -= other.offsetHeight;
        // then add its eventual height when transition completes
        // (zero or height of its contents)
        if (parseInt(other.style.height) > 0) {
            let contents = other.children[0];
            height += contents.offsetHeight;
        }
    }
    return height;
}

export {
    CollapsibleContainer as default,
    CollapsibleContainer,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    CollapsibleContainer.propTypes = {
        open: PropTypes.bool,
    };
}

import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

import './collapsible-container.scss';

class CollapsibleContainer extends PureComponent {
    static displayName = 'CollapsibleContainer';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLDivElement,
            contents: HTMLDivElement,
        });
        this.state = {
            contentHeight: undefined,
            collapsing: false,
            expanding: false,
        };
    }

    /**
     * Change state.hidden when props.open changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { open } = this.props;
        if (nextProps.open !== open) {
            if (nextProps.open) {
                this.setState({ collapsing: false, expanding: true });
            } else {
                this.setState({ collapsing: true, expanding: false });
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { open, children } = this.props;
        let { contentHeight, expanding, collapsing } = this.state;
        let { setters } = this.components;

        let style = {};
        if (open) {
            style.height = contentHeight;
        } else {
            style.height = 0;
        }
        let className = 'collapsible-container';
        if (expanding) {
            className += ' expanding';
        } else if (collapsing) {
            className += ' collapsing';
        }
        return (
            <div ref={setters.container} className={className} style={style}>
                <div ref={setters.contents} className="collapsible-contents">
                    {children}
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
        let { contents } = this.components;
        if (contents) {
            let contentHeight = getContentHeight(contents);
            if (this.state.contentHeight !== contentHeight) {
                this.setState({ contentHeight });
            }
        }
    }
}

function getContentHeight(div) {
    let height = div.offsetHeight;
    // find nexted collapsible containers
    let others = div.getElementsByClassName('collapsible-container');
    _.each(others, (other) => {
        // remove the container's current height
        height -= other.offsetHeight;
        // then add its eventual height when transition completes
        // (zero or height of its contents)
        if (parseInt(other.style.height) > 0) {
            let contents = other.children[0];
            height += contents.offsetHeight;
        }
    });
    return height;
}

export {
    CollapsibleContainer as default,
    CollapsibleContainer,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    CollapsibleContainer.propTypes = {
        open: React.PropTypes.bool,
    };
}

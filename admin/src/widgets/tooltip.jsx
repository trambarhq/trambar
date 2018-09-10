import _ from 'lodash';
import React, { PureComponent, Children } from 'react';
import ComponentRefs from 'utils/component-refs';

import './tooltip.scss';

class Tooltip extends PureComponent {
    static displayName = 'Tooltip';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLElement,
        });
        this.state = {
            open: false,
            live: hasContents(this.props),
        };
    }

    /**
     * Update state when props change
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { disabled } = this.props;
        let { live, open } = this.state;
        let liveAfter = hasContents(nextProps);
        if (liveAfter !== live || nextProps.disabled !== disabled) {
            let openAfter = open && liveAfter && !nextProps.disabled;
            this.setState({ live: liveAfter, open: openAfter });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { upward, leftward, disabled, className } = this.props;
        let { live } = this.state;
        let { setters } = this.components;
        let classNames = [ 'tooltip' ];
        if (live && !disabled) {
            classNames.push('live');
        }
        if (upward) {
            classNames.push('upward');
        }
        if (leftward) {
            classNames.push('leftward');
        }
        if (className) {
            classNames.push(className);
        }
        return (
            <div ref={setters.container} className={classNames.join(' ')}>
                {this.renderLabel()}
                {this.renderWindow()}
            </div>
        );
    }

    /**
     * Render label
     *
     * @return {ReactElement}
     */
    renderLabel() {
        let inline = this.findElement('inline');
        return (
            <span className="label" onClick={this.handleLabelClick}>
                {inline.props.children}
            </span>
        );
    }

    /**
     * Render pop-up
     *
     * @return {ReactElement|null}
     */
    renderWindow() {
        let { open } = this.state;
        if (!open) {
            return null;
        }
        let win = this.findElement('window');
        return (
            <div className="window-container" onClick={this.handleWindowClick}>
                <div className="window">
                    {win.props.children}
                </div>
            </div>
        );
    }

    /**
     * Add/remove handlers depending on whether the tooltip is shown
     */
    componentDidUpdate(prevProps, prevState) {
        let { open } = this.state;
        if (prevState.open !== open) {
            if (open) {
                document.addEventListener('mousedown', this.handleMouseDown);
                document.addEventListener('keydown', this.handleKeyDown);
            } else {
                document.removeEventListener('mousedown', this.handleMouseDown);
                document.removeEventListener('keydown', this.handleKeyDown);
            }
        }
    }

    /**
     * Remove handlers on unmount
     */
    componentWillUnmount() {
        let { open } = this.state;
        if (open) {
            document.removeEventListener('mousedown', this.handleMouseDown);
            document.removeEventListener('keydown', this.handleKeyDown);
        }
    }

    /**
     * Look for child by tag name
     *
     * @param  {String} tagName
     *
     * @return {ReactElement}
     */
    findElement(tagName) {
        let { children } = this.props;
        children = Children.toArray(children);
        return _.find(children, { type: tagName });
    }

    /**
     * Called when a label is clicked
     *
     * @param  {Event} evt
     */
    handleLabelClick = (evt) => {
        let { disabled } = this.props;
        let { live, open } = this.state;
        if (live && !disabled) {
            this.setState({ open: !open });
        }
    }

    /**
     * Called when a mouse button is pressed
     *
     * @param  {Event} evt
     */
    handleMouseDown = (evt) => {
        if (!isInside(evt.target, this.components.container)) {
            this.setState({ open: false });
        }
    }

    /**
     * Called when a key is pressed
     *
     * @param  {Event} evt
     */
    handleKeyDown = (evt) => {
        if (evt.keyCode === 27) {
            this.setState({ open: false });
        }
    }
}

function hasContents(props) {
    let children = Children.toArray(props.children);
    let win = _.find(children, { type: 'window' });
    if (win) {
        if (Children.count(win.props.children) > 0) {
            return true;
        }
    }
    return false;
}

function isInside(element, container) {
    for (let n = element; n; n = n.parentNode) {
        if (n === container) {
            return true;
        }
    }
    return false;
}

export {
    Tooltip as default,
    Tooltip,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    Tooltip.propTypes = {
        upward: PropTypes.bool,
        leftward: PropTypes.bool,
        disabled: PropTypes.bool,
    };
}

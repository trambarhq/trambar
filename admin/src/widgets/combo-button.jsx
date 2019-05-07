import _ from 'lodash';
import React, { PureComponent, Children } from 'react';
import ReactDOM from 'react-dom';

import './combo-button.scss';

/**
 * A push button with a drop-down menu.
 *
 * @extends PureComponent
 */
class ComboButton extends PureComponent {
    static displayName = 'ComboButton';

    constructor(props) {
        super(props);
        let { preselected } = this.props;
        this.state = {
            open: false,
            selected: preselected,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="combo-button">
                {this.renderMainButton()}
                {this.renderSideButton()}
                {this.renderMenu()}
            </div>
        );
    }

    /**
     * Render main button
     *
     * @return {ReactElement}
     */
    renderMainButton() {
        let { alert, children } = this.props;
        let { selected } = this.state;
        let options = Children.toArray(children);
        let selectedOption = _.find(options, (option) => {
            return option.props.name === selected;
        });
        if (!selectedOption) {
            selectedOption = _.first(options);
        }
        let props = _.omit(selectedOption.props, 'separator');
        props.className = props.className ? `main ${props.className}`: 'main';
        if (alert) {
            props.className += ' alert';
        }
        if (!props.onClick) {
            props.onClick = this.handleSideButtonClick;
        }
        return (
            <button {...props}>
                {selectedOption.props.children}
            </button>
        );
    }

    /**
     * Render side button
     *
     * @return {ReactElement}
     */
    renderSideButton() {
        return (
            <button className="side" onClick={this.handleSideButtonClick}>
                <i className="fa fa-angle-down" />
            </button>
        );
    }

    /**
     * Render pop-up menu
     *
     * @return {ReactElement|null}
     */
    renderMenu() {
        let { children } = this.props;
        let { open } = this.state;
        if (!open) {
            return null;
        }
        let options = Children.toArray(children);
        return (
            <div className="container">
                <div className="menu">
                {
                    _.map(options, (option, i) => {
                        return this.renderOption(option, i);
                    })
                }
                </div>
            </div>
        );
    }

    /**
     * Render a menu item
     *
     * @param  {ReactElement} option
     * @param  {Number} i
     *
     * @return {ReactElement|null}
     */
    renderOption(option, i) {
        let { name, separator, hidden, disabled } = option.props;
        if (!name || hidden) {
            return null;
        }
        let itemProps = {
            'data-name': name,
            className: 'option',
            onClick: this.handleItemClick,
        };
        let linkProps = _.omit(option.props, 'name', 'separator', 'disabled');
        if (disabled) {
            itemProps.className += ' disabled';
            itemProps.onClick = null;
            linkProps.onClick = null;
        }
        if (separator) {
            itemProps.className += ' separator';
        }
        return (
            <div key={i} {...itemProps}>
                <div {...linkProps}>
                    {option.props.children}
                </div>
            </div>
        );
    }

    /**
     * Add/remove document-level mousedown handler when menu opens and closes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { preselected } = this.props;
        let { open } = this.state;
        if (prevProps.preselected !== preselected) {
            this.setState({ selected: preselected });
        }

        let appContainer = document.getElementById('react-container');
        if (!prevState.open && open) {
            appContainer.addEventListener('mousedown', this.handleBodyMouseDown);
        } else if (prevState.open && !open) {
            appContainer.removeEventListener('mousedown', this.handleBodyMouseDown);
        }
    }

    /**
     * Called when user click the side button
     *
     * @param  {Object} evt
     */
    handleSideButtonClick = (evt) => {
        let { open } = this.state;
        this.setState({ open: !open });
    }

    /**
     * Called when user closes the menu
     *
     * @param  {Object} evt
     */
    handleItemClick = (evt) => {
        let name = evt.currentTarget.getAttribute('data-name');
        this.setState({ selected: name, open: false });
    }

    /**
     * Called when user clicks on the page somewhere
     *
     * @param  {Event} evt
     */
    handleBodyMouseDown = (evt) => {
        let containerNode = ReactDOM.findDOMNode(this);
        let insideMenu = isInside(evt.target, containerNode);
        if (!insideMenu) {
            this.setState({ open: false });
        }
    }
}

function isInside(node, container) {
    for (let n = node; n !== document.body.parentNode; n = n.parentNode) {
        if (n === container) {
            return true;
        }
    }
    return false;
}

ComboButton.defaultProps = {
    preselected: undefined,
    alert: false,
};

export {
    ComboButton as default,
    ComboButton,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ComboButton.propType = {
        preselected: PropTypes.string,
        alert: PropTypes.bool,
    };
}

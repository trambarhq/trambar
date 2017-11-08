var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

require('./combo-button.scss');

module.exports = React.createClass({
    displayName: 'ComboButton',
    propType: {
        preselected: PropTypes.string,
        alert: PropTypes.bool,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            preselected: undefined,
            alert: false,
        };
    },

    /**
     * Return intial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            open: false,
            selected: this.props.preselected,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="combo-button">
                {this.renderMainButton()}
                {this.renderSideButton()}
                {this.renderMenu()}
            </div>
        );
    },

    /**
     * Render main button
     *
     * @return {ReactElement}
     */
    renderMainButton: function() {
        var options = React.Children.toArray(this.props.children);
        var selectedOption = _.find(options, (option) => {
            return option.props.name === this.state.selected;
        });
        if (!selectedOption) {
            selectedOption = _.first(options);
        }
        var props = _.omit(selectedOption.props, 'separator');
        props.className = props.className ? `main ${props.className}`: 'main';
        if (this.props.alert) {
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
    },

    /**
     * Render side button
     *
     * @return {ReactElement}
     */
    renderSideButton: function() {
        return (
            <button className="side" onClick={this.handleSideButtonClick}>
                <i className="fa fa-angle-down" />
            </button>
        );
    },

    /**
     * Render pop-up menu
     *
     * @return {ReactElement|null}
     */
    renderMenu: function() {
        if (!this.state.open) {
            return null;
        }
        var options = React.Children.toArray(this.props.children);
        return (
            <div className="container">
                <div className="menu">
                    {_.map(options, this.renderOption)}
                </div>
            </div>
        );
    },

    /**
     * Render a menu item
     *
     * @param  {ReactElement} option
     * @param  {Number} i
     *
     * @return {ReactElement|null}
     */
    renderOption: function(option, i) {
        if (!option.props.name) {
            return null;
        }
        var itemProps = {
            'data-name': option.props.name,
            className: 'option',
            onClick: this.handleItemClick,
        };
        var linkProps = _.omit(option.props, 'name', 'separator', 'disabled');
        if (option.props.disabled) {
            itemProps.className += ' disabled';
            itemProps.onClick = null;
            linkProps.onClick = null;
        }
        if (option.props.separator) {
            itemProps.className += ' separator';
        }
        return (
            <div key={i} {...itemProps}>
                <div {...linkProps}>
                    {option.props.children}
                </div>
            </div>
        );
    },

    /**
     * Add/remove document-level mousedown handler when menu opens and closes
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        var appContainer = document.getElementById('app-container');
        if (!prevState.open && this.state.open) {
            appContainer.addEventListener('mousedown', this.handleBodyMouseDown);
        } else if (prevState.open && !this.state.open) {
            appContainer.removeEventListener('mousedown', this.handleBodyMouseDown);
        }
    },

    /**
     * Called when user click the side button
     *
     * @param  {Object} evt
     */
    handleSideButtonClick: function(evt) {
        this.setState({ open: !this.state.open });
    },

    /**
     * Called when user closes the menu
     *
     * @param  {Object} evt
     */
    handleItemClick: function(evt) {
        var name = evt.currentTarget.getAttribute('data-name');
        this.setState({ selected: name, open: false });
    },

    /**
     * Called when user clicks on the page somewhere
     *
     * @param  {Event} evt
     */
    handleBodyMouseDown: function(evt) {
        var containerNode = ReactDOM.findDOMNode(this);
        var insideMenu = isInside(evt.target, containerNode);
        if (!insideMenu) {
            this.setState({ open: false });
        }
    },
});

function isInside(node, container) {
    for (var n = node; n !== document.body.parentNode; n = n.parentNode) {
        if (n === container) {
            return true;
        }
    }
    return false;
}

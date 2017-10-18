var React = require('react'), PropTypes = React.PropTypes;

require('./corner-pop-up.scss');

module.exports = React.createClass({
    displayName: 'CornerPopUp',

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            open: false,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <span ref="container" className="corner-pop-up">
                {this.renderIcon()}
                {this.renderMenu()}
            </span>
        );
    },

    /**
     * Render button for opening the menu
     *
     * @return {ReactElement}
     */
    renderIcon: function() {
        var iconclassNames = [ 'fa' ];
        if (this.state.open) {
            iconclassNames.push('fa-chevron-circle-left');
        } else {
            iconclassNames.push('fa-chevron-circle-down');
        }
        return (
            <span className="button" onClick={this.handleButtonClick}>
                <i className={iconclassNames.join(' ')}  />
            </span>
        );
    },

    /**
     * Render the menu if it's open
     *
     * @return {ReactElement}
     */
    renderMenu: function() {
        if (!this.state.open) {
            return null;
        }
        return (
            <div className="container">
                <div className="menu" onClick={this.handleMenuClick}>
                    {this.props.children}
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
     * Remove mousedown handler on unmount
     */
    componentWillUnmount: function() {
        var appContainer = document.getElementById('app-container');
        appContainer.removeEventListener('mousedown', this.handleBodyMouseDown);
    },

    /**
     * Called when user clicks the corner button
     *
     * @param  {Event} evt
     */
    handleButtonClick: function(evt) {
        this.setState({ open: !this.state.open });
    },

    /**
     * Called when user clicks on an item in the menu
     *
     * @param  {Event} evt
     */
    handleMenuClick: function(evt) {
        this.setState({ open: false });
    },

    /**
     * Called when user clicks on the page somewhere
     *
     * @param  {Event} evt
     */
    handleBodyMouseDown: function(evt) {
        var containerNode = this.refs.container;
        var insideMenu = false;
        for (var n = evt.target; n !== document.body.parentNode; n = n.parentNode) {
            if (n === containerNode) {
                insideMenu = true;
                break;
            }
        }
        if (!insideMenu) {
            this.setState({ open: false });
        }
    },
});

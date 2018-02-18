var React = require('react'), PropTypes = React.PropTypes;
var ComponentRefs = require('utils/component-refs');

// widgets
var PopUpMenu = require('widgets/pop-up-menu');

require('./corner-pop-up.scss');

module.exports = React.createClass({
    displayName: 'CornerPopUp',
    propType: {
        onOpen: PropTypes.func,
        onClose: PropTypes.func,
    },

    /**
     * Return intial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            popUpMenu: PopUpMenu,
        });
        return {
            open: false
        };
    },

    /**
     * Close the pop-up menu
     */
    close: function() {
        this.setState({ open: false });
        this.components.popUpMenu.close();
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var setters = this.components.setters;
        var handlers = {
            onOpen: this.handleOpen,
            onClose: this.handleClose,
        };
        var dir = (this.state.open) ? 'left' : 'down';
        return (
            <PopUpMenu ref={setters.popUpMenu} className="corner-pop-up" {...handlers} >
                <button>
                    <i className={`fa fa-chevron-circle-${dir}`} />
                </button>
                <menu>
                    {this.props.children}
                </menu>
            </PopUpMenu>
        );
    },

    /**
     * Called when user opens the menu
     *
     * @param  {Object} evt
     */
    handleOpen: function(evt) {
        this.setState({ open: true });
        if (this.props.onOpen) {
            this.props.onOpen({
                type: open,
                target: this,
            });
        }
    },

    /**
     * Called when user closes the menu
     *
     * @param  {Object} evt
     */
    handleClose: function(evt) {
        this.setState({ open: false });
        if (this.props.onClose) {
            this.props.onClose({
                type: open,
                target: this,
            });
        }
    },
});

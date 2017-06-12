var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var UserSelectionList = require('user-selection-list');

require('./user-selection-dialog.scss');

module.exports = React.createClass({
    displayName: 'UserSelectionDialogBox',
    propTypes: {
        show: PropTypes.bool,
        selection: PropTypes.arrayOf(PropTypes.number).isRequired,
        disabled: PropTypes.arrayOf(PropTypes.number),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
        onCancel: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            selection: this.props.selection,
        };
    },

    /**
     * Update selection in state if necessary
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.selection !== nextProps.selection) {
            this.setState({ selection: this.props.selection });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="user-selection-dialog">
                    {this.renderList()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    /**
     * Render list of users
     *
     * @return {ReactElement}
     */
    renderList: function() {
        var listProps = {
            selection: this.state.selection,
            disabled: this.props.disabled,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onChange: this.handleListChange,
        };
        return <UserSelectionList {...listProps} />
    },

    /**
     * Render cancel and OK buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        return (
            <div className="buttons">
                <button>{t('selection-cancel')}</button>
                <button>{t('selection-ok')}</button>
            </div>
        );
    },

    /**
     * Called when user select or unselect another user
     *
     * @param  {Object} evt
     */
    handleListChange: function(evt) {
        var selection = evt.selection;
        if (_.isEqual(selection, this.props.selection)) {
            selection = this.props.selection;
        }
        this.setState({ selection });
    },

    /**
     * Called when user click OK button
     *
     * @param  {Event} evt
     */
    handleOKClick: function(evt) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                selection: this.state.selection,
            })
        }
    },

    /**
     * Called when user click cancel button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },
});

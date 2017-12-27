var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var DeviceManager = require('media/device-manager');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var HeaderButton = require('widgets/header-button');
var UserSelectionDialogBox = require('dialogs/user-selection-dialog-box');

require('./coauthoring-button.scss');

module.exports = React.createClass({
    displayName: 'CoauthoringButton',
    propTypes: {
        coauthoring: PropTypes.bool,
        story: PropTypes.object.isRequired,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSelect: PropTypes.func,
        onRemove: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            selecting: false,
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var icon, label;
        if (this.props.coauthoring) {
            icon = 'minus-square';
            label = t('story-remove-yourself');
        } else {
            icon = 'plus-square';
            if (this.props.story.user_ids.length > 1) {
                label = t('story-add-remove-coauthor');
            } else {
                label = t('story-add-coauthor');
            }
        }
        return (
            <span className="coauthoring-button" onClick={this.handleClick}>
                <i className={`fa fa-${icon}`} />
                <span className="label">{label}</span>
                {this.renderDialogBox()}
            </span>
        );
    },

    /**
     * Render dialog box for selecting co-authors
     *
     * @return {ReactElement}
     */
    renderDialogBox: function() {
        var props = {
            show: this.state.selecting,
            selection: this.props.story.user_ids,
            disabled: _.slice(this.props.story.user_ids, 0, 1),
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onSelect: this.handleSelect,
            onCancel: this.handleCancel,
        };
        return <UserSelectionDialogBox {...props} />;
    },

    /**
     * Called when user clicks the button
     *
     * @param  {Event} evt
     */
    handleClick: function(evt) {
        if (this.props.coauthoring) {
            if (this.props.onRemove) {
                this.props.onRemove({
                    type: 'remove',
                    target: this,
                });
            }
        } else {
            this.setState({ selecting: true });
        }
    },

    /**
     * Called when user clicks the x or outside the modal
     *
     * @param  {Event} evt
     */
    handleCancel: function(evt) {
        this.setState({ selecting: false });
    },

    /**
     * Called when user selects a user from the list
     *
     * @param  {Object} evt
     */
    handleSelect: function(evt) {
        if (this.props.onSelect) {
            this.props.onSelect({
                type: 'select',
                target: this,
                selection: evt.selection
            });
        }
        this.setState({ selecting: false });
    },
})

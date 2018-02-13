var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var NotificationTypes = require('objects/types/notification-types');
var UserUtils = require('objects/utils/user-utils');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var OptionButton = require('widgets/option-button');

require('./notification-panel.scss');

module.exports = React.createClass({
    displayName: 'NotificationPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,
        repos: PropTypes.arrayOf(PropTypes.object),
        locale: PropTypes.instanceOf(Locale).isRequired,
        onChange: PropTypes.func,
    },

    /**
     * Change a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty: function(path, value) {
        if (!this.props.currentUser) {
            return;
        }
        var userAfter = _.decoupleSet(this.props.currentUser, path, value);
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <SettingsPanel className="notification">
                <header>
                    <i className="fa fa-exclamation-circle" /> {t('settings-notification')}
                </header>
                <body>
                    {this.renderOptions()}
                </body>
            </SettingsPanel>
        );
    },

    /**
     * Render notification options
     *
     * @return {Array<ReactElement>}
     */
    renderOptions: function() {
        var types = NotificationTypes;
        var userType = _.get(this.props.currentUser, 'type');
        if (userType !== 'admin') {
            types = _.without(types, NotificationTypes.admin);
        }
        return _.map(types, this.renderOption);
    },

    /**
     * Render notification option button
     *
     * @param  {String} type
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderOption: function(type, index) {
        var t = this.props.locale.translate;
        var optionName = _.snakeCase(type);
        var settings = _.get(this.props.currentUser, 'settings', {});
        var enabled = !!_.get(settings, `notification.${optionName}`);
        var canReceive = UserUtils.canReceiveNotification(this.props.currentUser, this.props.repos, type);
        console.log(canReceive)
        var buttonProps = {
            label: t(`notification-option-${type}`),
            selected: enabled,
            hidden: !canReceive,
            onClick: this.handleOptionClick,
            id: optionName,
        };
        return <OptionButton key={index} {...buttonProps} />
    },

    /**
     * Called when an option is clicked
     */
    handleOptionClick: function(evt) {
        var optionName = evt.currentTarget.id;
        var settings = _.clone(_.get(this.props.currentUser, 'settings', {}));
        var enabled = !!_.get(settings, `notification.${optionName}`);
        if (enabled) {
            _.unset(settings, `notification.${optionName}`);
            _.unset(settings, `web_alert.${optionName}`);
            _.unset(settings, `mobile_alert.${optionName}`);
        } else {
            _.set(settings, `notification.${optionName}`, (optionName === 'merge') ? 'master' : true);
            _.set(settings, `web_alert.${optionName}`, true);
            _.set(settings, `mobile_alert.${optionName}`, true);
        }
        console.log(enabled, settings);
        this.setUserProperty('settings', settings);
    },
});

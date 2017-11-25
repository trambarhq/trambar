var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var NotificationTypes = require('data/notification-types');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsSection = require('widgets/settings-section');
var OptionButton = require('widgets/option-button');

require('./mobile-alert-panel.scss');

module.exports = React.createClass({
    displayName: 'WebAlertPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,
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
            <SettingsSection className="mobile-alert">
                <header>
                    <i className="fa fa-tablet" /> {t('settings-mobile-alert')}
                </header>
                <body>
                    {this.renderOptions()}
                </body>
            </SettingsSection>
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
        types = _.concat(types, 'web-session');
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
        var notificationEnabled = !!_.get(settings, `notification.${optionName}`);
        var alertEnabled = !!_.get(settings, `mobile_alert.${optionName}`);
        var buttonProps = {
            label: t(`notification-option-${type}`),
            selected: alertEnabled && (notificationEnabled || type === 'web-session'),
            disabled: !(notificationEnabled || type === 'web-session'),
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
        var alertEnabled = !!_.get(settings, `mobile_alert.${optionName}`);
        if (alertEnabled) {
            _.unset(settings, `mobile_alert.${optionName}`);
        } else {
            _.set(settings, `mobile_alert.${optionName}`, true);
        }
        this.setUserProperty('settings', settings);
    },
});

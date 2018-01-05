var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var NotificationTypes = require('objects/types/notification-types');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var OptionButton = require('widgets/option-button');

require('./web-alert-panel.scss');

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
        var browserIcon = getBrowserIcon();
        return (
            <SettingsPanel className="web-alert">
                <header>
                    <div className="icon">
                        <i className={`fa fa-${browserIcon}`} />
                        <i className="fa fa-exclamation-circle icon-overlay" />
                    </div>
                    {' '}
                    {t('settings-web-alert')}
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
        var notificationEnabled = !!_.get(settings, `notification.${optionName}`);
        var alertEnabled = !!_.get(settings, `web_alert.${optionName}`);
        var buttonProps = {
            label: t(`notification-option-${type}`),
            selected: alertEnabled && notificationEnabled,
            disabled: !notificationEnabled,
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
        var alertEnabled = !!_.get(settings, `web_alert.${optionName}`);
        if (alertEnabled) {
            _.unset(settings, `web_alert.${optionName}`);
        } else {
            _.set(settings, `web_alert.${optionName}`, true);
        }
        this.setUserProperty('settings', settings);
    },
});

var userAgentRegExps = {
    'edge': /(Edge|Internet Explorer)/,
    'chrome': /Chrome/,
    'safari': /Safari/,
    'firefox': /Firefox/,
};

function getBrowserIcon() {
    var ua = navigator.userAgent;
    for (var key in userAgentRegExps) {
        var re = userAgentRegExps[key];
        if (re.test(ua)) {
            return key;
        }
    }
    return 'globe';
}

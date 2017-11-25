var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsSection = require('widgets/settings-section');
var PushButton = require('widgets/push-button');
var TextField = require('widgets/text-field');

require('./user-info-panel.scss');

module.exports = React.createClass({
    displayName: 'UserInfoPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,
        locale: PropTypes.instanceOf(Locale).isRequired,
        onChange: PropTypes.func,
    },

    /**
     * Return a property of the user object
     *
     * @param  {String} path
     *
     * @return {*}
     */
    getUserProperty: function(path) {
        return _.get(this.props.currentUser, path);
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
            <SettingsSection className="user-info">
                <header>
                    <i className="fa fa-user-circle" /> {t('settings-user-information')}
                </header>
                <body>
                    {this.renderNameInput()}
                    {this.renderEmailInput()}
                    {this.renderPhoneInput()}
                    {this.renderGenderSelector()}
                </body>
            </SettingsSection>
        );
    },

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = this.getUserProperty('details.name')
        var props = {
            id: 'name',
            value: p(name),
            locale: this.props.locale,
            onChange: this.handleNameChange,
        };
        return <TextField {...props}>{t('user-info-name')}</TextField>;
    },

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderEmailInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'email',
            value: this.getUserProperty('details.email'),
            locale: this.props.locale,
            onChange: this.handleEmailChange,
        };
        return <TextField {...props}>{t('user-info-email')}</TextField>;
    },

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderPhoneInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'email',
            value: this.getUserProperty('details.phone'),
            locale: this.props.locale,
            onChange: this.handlePhoneChange,
        };
        return <TextField {...props}>{t('user-info-phone')}</TextField>;
    },

    /**
     * Render gender select box
     *
     * @return {ReactElement}
     */
    renderGenderSelector: function() {
        var t = this.props.locale.translate;
        var selectProps = {
            id: 'gender',
            value: this.getUserProperty('details.gender') || '',
            size: 3,
            onChange: this.handleGenderChange,
        };
        return (
            <div className="gender-selector">
                <label htmlFor="gender">{t('user-info-gender')}</label>
                <select {...selectProps}>
                    <option value="male">{t('user-info-gender-male')}</option>
                    <option value="female">{t('user-info-gender-female')}</option>
                    <option value="">{t('user-info-gender-unspecified')}</option>
                </select>
            </div>
        );
    },

    /**
     * Called when user changes his name
     *
     * @param  {Event} evt
     */
    handleNameChange: function(evt) {
        var text = evt.target.value;
        this.setUserProperty(`details.name`, text);
    },

    /**
     * Called when user changes his email
     *
     * @param  {Event} evt
     */
    handleEmailChange: function(evt) {
        var text = evt.target.value;
        this.setUserProperty(`details.email`, text);
    },

    /**
     * Called when user changes his email
     *
     * @param  {Event} evt
     */
    handlePhoneChange: function(evt) {
        var text = evt.target.value;
        this.setUserProperty(`details.phone`, text);
    },

    /**
     * Called when user changes his gender
     *
     * @param  {Event} evt
     */
    handleGenderChange: function(evt) {
        var text = evt.target.value;
        this.setUserProperty(`details.gender`, text || undefined);
    },
});

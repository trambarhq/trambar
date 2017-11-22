var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsSection = require('widgets/settings-section');
var PushButton = require('widgets/push-button');
var TextField = require('widgets/text-field');

require('./user-panel.scss');

module.exports = React.createClass({
    displayName: 'UserPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentUser: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
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
            <SettingsSection className="user">
                <header>
                    <i className="fa fa-globe" /> {t('settings-social-networks')}
                </header>
                <body>
                    {this.renderSkypeNameInput()}
                    {this.renderSlackTeamInput()}
                    {this.renderSlackIdInput()}
                    {this.renderIChatInput()}
                    {this.renderTwitterInput()}
                    {this.renderGithubUrlInput()}
                    {this.renderGitlabUrlInput()}
                    {this.renderLinkedInUrlInput()}
                    {this.renderStackoverflowUrlInput()}
                </body>
            </SettingsSection>
        );
    },

    /**
     * Render input for Skype username
     *
     * @return {ReactElement}
     */
    renderSkypeNameInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'skype',
            value: this.getUserProperty('details.skype_username'),
            locale: this.props.locale,
            onChange: this.handleSkypeUsernameChange,
        };
        return <TextField {...props}>{t('social-network-skype')}</TextField>;
    },

    /**
     * Render input for Slack team name
     *
     * @return {ReactElement}
     */
    renderSlackTeamInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'slack-team',
            value: this.getUserProperty('details.slack_team_id'),
            locale: this.props.locale,
            onChange: this.handleSlackTeamIDChange,
        };
        return <TextField {...props}>{t('social-network-slack-team')}</TextField>;
    },

    /**
     * Render input for Slack userid
     *
     * @return {ReactElement}
     */
    renderSlackIdInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'slack-user',
            value: this.getUserProperty('details.slack_user_id'),
            locale: this.props.locale,
            onChange: this.handleSlackUserIDChange,
        };
        return <TextField {...props}>{t('social-network-slack')}</TextField>;
    },

    /**
     * Render input for iChat username
     *
     * @return {ReactElement}
     */
    renderIChatInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'ichat',
            value: this.getUserProperty('details.ichat_username'),
            locale: this.props.locale,
            onChange: this.handleIchatUsernameChange,
        };
        return <TextField {...props}>{t('social-network-ichat')}</TextField>;
    },

    /**
     * Render input for Twitter username
     *
     * @return {ReactElement}
     */
    renderTwitterInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'twitter',
            value: this.getUserProperty('details.twitter_username'),
            locale: this.props.locale,
            onChange: this.handleTwitterUsernameChange,
        };
        return <TextField {...props}>{t('social-network-twitter')}</TextField>;
    },

    /**
     * Render input for Github URL
     *
     * @return {ReactElement}
     */
    renderGithubUrlInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'github',
            value: this.getUserProperty('details.github_url'),
            locale: this.props.locale,
            onChange: this.handleGitHubUrlChange,
        };
        return <TextField {...props}>{t('social-network-github')}</TextField>;
    },

    /**
     * Render input for Gitlab URL
     *
     * @return {ReactElement}
     */
    renderGitlabUrlInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'github',
            value: this.getUserProperty('details.gitlab_url'),
            locale: this.props.locale,
            onChange: this.handleGitlabUrlChange,
        };
        return <TextField {...props}>{t('social-network-gitlab')}</TextField>;
    },

    /**
     * Render input for Linkedin URL
     *
     * @return {ReactElement}
     */
    renderLinkedInUrlInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'linkedin',
            value: this.getUserProperty('details.linkedin_url'),
            locale: this.props.locale,
            onChange: this.handleLinkedinUrlChange,
        };
        return <TextField {...props}>{t('social-network-linkedin')}</TextField>;
    },

    /**
     * Render input for Stackoverflow URL
     *
     * @return {ReactElement}
     */
    renderStackoverflowUrlInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'stackoverflow',
            value: this.getUserProperty('details.stackoverflow_url'),
            locale: this.props.locale,
            onChange: this.handleStackoverflowUrlChange,
        };
        return <TextField {...props}>{t('social-network-stackoverflow')}</TextField>;
    },

    /**
     * Called when user changes Skype username
     *
     * @param  {Event} evt
     */
    handleSkypeUsernameChange: function(evt) {
        var username = _.trim(evt.target.value);
        this.setUserProperty(`details.skype_username`, username);
    },

    /**
     * Called when user changes Slack user id
     *
     * @param  {Event} evt
     */
    handleSlackUserIDChange: function(evt) {
        var username = _.trim(evt.target.value);
        this.setUserProperty(`details.slack_user_id`, username);
    },

    /**
     * Called when user changes Slack team id
     *
     * @param  {Event} evt
     */
    handleSlackTeamIDChange: function(evt) {
        var username = _.trim(evt.target.value);
        this.setUserProperty(`details.slack_team_id`, username);
    },

    /**
     * Called when user changes iChat username
     *
     * @param  {Event} evt
     */
    handleIchatUsernameChange: function(evt) {
        var username = _.trim(evt.target.value);
        this.setUserProperty(`details.ichat_username`, username);
    },

    /**
     * Called when user changes Twitter username
     *
     * @param  {Event} evt
     */
    handleTwitterUsernameChange: function(evt) {
        var username = extractUsername(evt.target.value);
        this.setUserProperty(`details.twitter_username`, username);
    },

    /**
     * Called when user changes Linkedin username
     *
     * @param  {Event} evt
     */
    handleLinkedinUrlChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.linkedin_url`, url);
    },

    /**
     * Called when user changes Github username
     *
     * @param  {Event} evt
     */
    handleGitHubUrlChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.github_url`, url);
    },

    /**
     * Called when user changes Gitlab username
     *
     * @param  {Event} evt
     */
    handleGitlabUrlChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.gitlab_url`, url);
    },

    /**
     * Called when user changes StackOverflow username
     *
     * @param  {Event} evt
     */
    handleStackoverflowUrlChange: function(evt) {
        var url = _.trim(evt.target.value);
        this.setUserProperty(`details.stackoverflow_url`, url);
    },
});

function extractUsername(text, type) {
    if (/https?:/.test(text)) {
        // remove query string
        text = _.trim(text.replace(/\?.*/, ''));
        var parts = _.filter(text.split('/'));
        return parts[parts.length - 1];
    }
    return text;
}

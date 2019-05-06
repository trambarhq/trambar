import _ from 'lodash';
import React, { PureComponent } from 'react';

// widgets
import SettingsPanel from '../widgets/settings-panel.jsx';
import PushButton from '../widgets/push-button.jsx';
import TextField from '../widgets/text-field.jsx';

import './social-network-panel.scss';

/**
 * Panel for entering links to social network accounts.
 *
 * @extends PureComponent
 */
class SocialNetworkPanel extends PureComponent {
    static displayName = 'SocialNetworkPanel';

    /**
     * Return a property of the user object
     *
     * @param  {String} path
     *
     * @return {*}
     */
    getUserProperty(path) {
        let { currentUser } = this.props;
        return _.get(currentUser, path);
    }

    /**
     * Change a property of the user object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setUserProperty(path, value) {
        let { currentUser, onChange } = this.props;
        if (!currentUser) {
            return;
        }
        let userAfter = _.decoupleSet(currentUser, path, value);
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        let { t } = env.locale;
        return (
            <SettingsPanel className="user">
                <header>
                    <i className="fa fa-handshake-o" /> {t('settings-social-networks')}
                </header>
                <body>
                    {this.renderSkypeNameInput()}
                    {this.renderIChatInput()}
                    {this.renderTwitterInput()}
                    {this.renderGithubURLInput()}
                    {this.renderGitlabURLInput()}
                    {this.renderLinkedInURLInput()}
                    {this.renderStackoverflowURLInput()}
                </body>
            </SettingsPanel>
        );
    }

    /**
     * Render input for Skype username
     *
     * @return {ReactElement}
     */
    renderSkypeNameInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'skype',
            value: this.getUserProperty('details.skype_username'),
            env,
            onChange: this.handleSkypeUsernameChange,
        };
        return <TextField {...props}>{t('social-network-skype')}</TextField>;
    }

    /**
     * Render input for iChat username
     *
     * @return {ReactElement}
     */
    renderIChatInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'ichat',
            value: this.getUserProperty('details.ichat_username'),
            env,
            onChange: this.handleIchatUsernameChange,
        };
        return <TextField {...props}>{t('social-network-ichat')}</TextField>;
    }

    /**
     * Render input for Twitter username
     *
     * @return {ReactElement}
     */
    renderTwitterInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'twitter',
            value: this.getUserProperty('details.twitter_username'),
            env,
            onChange: this.handleTwitterUsernameChange,
        };
        return <TextField {...props}>{t('social-network-twitter')}</TextField>;
    }

    /**
     * Render input for Github URL
     *
     * @return {ReactElement}
     */
    renderGithubURLInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'github',
            value: this.getUserProperty('details.github_url'),
            env,
            onChange: this.handleGitHubURLChange,
        };
        return <TextField {...props}>{t('social-network-github')}</TextField>;
    }

    /**
     * Render input for Gitlab URL
     *
     * @return {ReactElement}
     */
    renderGitlabURLInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'github',
            value: this.getUserProperty('details.gitlab_url'),
            env,
            onChange: this.handleGitlabURLChange,
        };
        return <TextField {...props}>{t('social-network-gitlab')}</TextField>;
    }

    /**
     * Render input for Linkedin URL
     *
     * @return {ReactElement}
     */
    renderLinkedInURLInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'linkedin',
            value: this.getUserProperty('details.linkedin_url'),
            env,
            onChange: this.handleLinkedinURLChange,
        };
        return <TextField {...props}>{t('social-network-linkedin')}</TextField>;
    }

    /**
     * Render input for Stackoverflow URL
     *
     * @return {ReactElement}
     */
    renderStackoverflowURLInput() {
        let { env } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'stackoverflow',
            value: this.getUserProperty('details.stackoverflow_url'),
            env,
            onChange: this.handleStackoverflowURLChange,
        };
        return <TextField {...props}>{t('social-network-stackoverflow')}</TextField>;
    }

    /**
     * Called when user changes Skype username
     *
     * @param  {Event} evt
     */
    handleSkypeUsernameChange = (evt) => {
        let username = _.trim(evt.target.value);
        this.setUserProperty(`details.skype_username`, username);
    }

    /**
     * Called when user changes iChat username
     *
     * @param  {Event} evt
     */
    handleIchatUsernameChange = (evt) => {
        let username = _.trim(evt.target.value);
        this.setUserProperty(`details.ichat_username`, username);
    }

    /**
     * Called when user changes Twitter username
     *
     * @param  {Event} evt
     */
    handleTwitterUsernameChange = (evt) => {
        let username = extractUsername(evt.target.value);
        this.setUserProperty(`details.twitter_username`, username);
    }

    /**
     * Called when user changes Linkedin username
     *
     * @param  {Event} evt
     */
    handleLinkedinURLChange = (evt) => {
        let url = _.trim(evt.target.value);
        this.setUserProperty(`details.linkedin_url`, url);
    }

    /**
     * Called when user changes Github username
     *
     * @param  {Event} evt
     */
    handleGitHubURLChange = (evt) => {
        let url = _.trim(evt.target.value);
        this.setUserProperty(`details.github_url`, url);
    }

    /**
     * Called when user changes Gitlab username
     *
     * @param  {Event} evt
     */
    handleGitlabURLChange = (evt) => {
        let url = _.trim(evt.target.value);
        this.setUserProperty(`details.gitlab_url`, url);
    }

    /**
     * Called when user changes StackOverflow username
     *
     * @param  {Event} evt
     */
    handleStackoverflowURLChange = (evt) => {
        let url = _.trim(evt.target.value);
        this.setUserProperty(`details.stackoverflow_url`, url);
    }
}

function extractUsername(text, type) {
    if (/https?:/.test(text)) {
        // remove query string
        text = _.trim(text.replace(/\?.*/, ''));
        let parts = _.filter(text.split('/'));
        return parts[parts.length - 1];
    }
    return text;
}

export {
    SocialNetworkPanel as default,
    SocialNetworkPanel,
};

import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SocialNetworkPanel.propTypes = {
        currentUser: PropTypes.object,
        env: PropTypes.instanceOf(Environment).isRequired,
        onChange: PropTypes.func,
    };
}

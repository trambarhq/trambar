import _ from 'lodash';
import React from 'react';
import { useListener } from 'relaks';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { TextField } from '../widgets/text-field.jsx';

import './social-network-panel.scss';

/**
 * Panel for entering links to social network accounts.
 */
function SocialNetworkPanel(props) {
    const { env, userDraft } = props;
    const { t } = env.locale;

    const handleSkypeUsernameChange = useListener((evt) => {
        const username = _.trim(evt.target.value);
        userDraft.set('details.skype_username', username);
    });
    const handleIchatUsernameChange = useListener((evt) => {
        const username = _.trim(evt.target.value);
        userDraft.set('details.ichat_username', username);
    });
    const handleTwitterUsernameChange = useListener((evt) => {
        const username = extractUsername(evt.target.value);
        userDraft.set('details.twitter_username', username);
    });
    const handleLinkedinURLChange = useListener((evt) => {
        const url = _.trim(evt.target.value);
        userDraft.set('details.linkedin_url', url);
    })
    const handleGitHubURLChange = useListener((evt) => {
        const url = _.trim(evt.target.value);
        userDraft.set('details.github_url', url);
    });
    const handleGitlabURLChange = useListener((evt) => {
        let url = _.trim(evt.target.value);
        userDraft.set('details.gitlab_url', url);
    });
    const handleStackoverflowURLChange = useListener((evt) => {
        let url = _.trim(evt.target.value);
        userDraft.set('details.stackoverflow_url', url);
    });

    return (
        <SettingsPanel className="user">
            <header>
                <i className="fa fa-handshake-o" /> {t('settings-social-networks')}
            </header>
            <body>
                {renderSkypeNameInput()}
                {renderIChatInput()}
                {renderTwitterInput()}
                {renderGithubURLInput()}
                {renderGitlabURLInput()}
                {renderLinkedInURLInput()}
                {renderStackoverflowURLInput()}
            </body>
        </SettingsPanel>
    );

    function renderSkypeNameInput() {
        const props = {
            id: 'skype',
            value: userDraft.get('details.skype_username'),
            env,
            onChange: handleSkypeUsernameChange,
        };
        return <TextField {...props}>{t('social-network-skype')}</TextField>;
    }

    function renderIChatInput() {
        const props = {
            id: 'ichat',
            value: userDraft.get('details.ichat_username'),
            env,
            onChange: handleIchatUsernameChange,
        };
        return <TextField {...props}>{t('social-network-ichat')}</TextField>;
    }

    function renderTwitterInput() {
        const props = {
            id: 'twitter',
            value: userDraft.get('details.twitter_username'),
            env,
            onChange: handleTwitterUsernameChange,
        };
        return <TextField {...props}>{t('social-network-twitter')}</TextField>;
    }

    function renderGithubURLInput() {
        const props = {
            id: 'github',
            value: userDraft.get('details.github_url'),
            env,
            onChange: handleGitHubURLChange,
        };
        return <TextField {...props}>{t('social-network-github')}</TextField>;
    }

    function renderGitlabURLInput() {
        const props = {
            id: 'github',
            value: userDraft.get('details.gitlab_url'),
            env,
            onChange: handleGitlabURLChange,
        };
        return <TextField {...props}>{t('social-network-gitlab')}</TextField>;
    }

    function renderLinkedInURLInput() {
        const props = {
            id: 'linkedin',
            value: userDraft.get('details.linkedin_url'),
            env,
            onChange: handleLinkedinURLChange,
        };
        return <TextField {...props}>{t('social-network-linkedin')}</TextField>;
    }

    function renderStackoverflowURLInput() {
        const props = {
            id: 'stackoverflow',
            value: userDraft.get('details.stackoverflow_url'),
            env,
            onChange: handleStackoverflowURLChange,
        };
        return <TextField {...props}>{t('social-network-stackoverflow')}</TextField>;
    }
}

function extractUsername(text, type) {
    if (/https?:/.test(text)) {
        // remove query string
        text = _.trim(text.replace(/\?.*/, ''));
        const parts = _.filter(text.split('/'));
        return parts[parts.length - 1];
    }
    return text;
}

export {
    SocialNetworkPanel as default,
    SocialNetworkPanel,
};

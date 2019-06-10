import _ from 'lodash';
import React, { useEffect } from 'react';
import Relaks, { useProgress, useListener, useSaveBuffer, useAutoSave } from 'relaks';
import * as KonamiCode from 'common/utils/konami-code.mjs';
import * as DeviceFinder from 'common/objects/finders/device-finder.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectLinkFinder from 'common/objects/finders/project-link-finder.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as UserSaver from 'common/objects/savers/user-saver.mjs';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import { PageContainer } from '../widgets/page-container.jsx';
import { DevelopmentPanel } from '../panels/development-panel.jsx';
import { ProjectPanel } from '../panels/project-panel.jsx';
import { DevicePanel } from '../panels/device-panel.jsx';
import { UserInfoPanel } from '../panels/user-info-panel.jsx';
import { UserImagePanel } from '../panels/user-image-panel.jsx';
import { NotificationPanel } from '../panels/notification-panel.jsx';
import { WebAlertPanel } from '../panels/web-alert-panel.jsx';
import { MobileAlertPanel } from '../panels/mobile-alert-panel.jsx';
import { SocialNetworkPanel } from '../panels/social-network-panel.jsx';
import { LanguagePanel } from '../panels/language-panel.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

// custom hooks
import {
    useDraftBuffer,
} from '../hooks.mjs';

import './settings-page.scss';

const autosave = 2000;

async function SettingsPage(props) {
    const { database } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const currentUser = await UserFinder.findUser(database, currentUserID);
    const projectLinks = await ProjectLinkFinder.findActiveLinks(database);
    const currentProject = await ProjectFinder.findCurrentProject(database);
    render();
    const devices = await DeviceFinder.findUserDevices(database, currentUser, 1);
    render();
    const repos = await RepoFinder.findProjectRepos(database, currentProject);
    render();
    const system = await SystemFinder.findSystem(database);
    render();

    function render() {
        const sprops = {
            currentUser,
            currentProject,
            projectLinks,
            devices,
            repos,
            system,
            ...props
        };
        show(<SettingsPageSync {...sprops} />);
    }
}

function SettingsPageSync(props) {
    const { database, route, env, payloads } = props;
    const { currentUser, currentProject, projectLinks, devices, repos, system } = props;
    const userDraft = useDraftBuffer({
        original: currentUser || {},
    });

    useAutoSave(userDraft, autosave, () => {
        const userAfter = UserSaver.saveUser(database, userDraft.current);
        payloads.dispatch(userAfter);
    });
    useEffect(() => {
        const handleKonamiCode = (evt) => {
            userDraft.set('settings.development.show_panel', true);
        };
        KonamiCode.addListener(handleKonamiCode);
        return () => {
            KonamiCode.removeListener(handleKonamiCode);
        };
    }, []);

    return (
        <PageContainer className="settings-page">
            <div className="panels">
                <ErrorBoundary env={env}>
                    {renderDevelopmentPanel()}
                    {renderProjectPanel()}
                    {renderDevicePanel()}
                    {renderNotificationPanel()}
                    {renderWebAlertPanel()}
                    {renderMobileAlertPanel()}
                    {renderUserInfoPanel()}
                    {renderUserImagePanel()}
                    {renderSocialNetworkPanel()}
                    {renderLanguagePanel()}
                </ErrorBoundary>
            </div>
        </PageContainer>
    );

    function renderDevelopmentPanel() {
        const enabled = userDraft.get('settings.development.show_panel', false);
        if (!enabled) {
            return null;
        }
        const props = {
            userDraft,
            currentUser,
            route,
            env,
        };
        return <DevelopmentPanel {...props} />;
    }

    function renderProjectPanel() {
        const props = {
            userDraft,
            system,
            project: currentProject,
            projectLinks,
            database,
            route,
            env,
        };
        return <ProjectPanel {...props} />;
    }

    function renderDevicePanel() {
        if (env.platform === 'cordova' || _.isEmpty(devices)) {
            return null;
        }
        const props = {
            devices,
            database,
            route,
            env,
        };
        return <DevicePanel {...props} />;
    }

    function renderUserInfoPanel() {
        const props = {
            userDraft,
            currentUser,
            env,
        };
        return <UserInfoPanel {...props} />;
    }

    function renderUserImagePanel() {
        const props = {
            userDraft,
            currentUser,
            payloads,
            env,
        };
        return <UserImagePanel {...props} />;
    }

    function renderSocialNetworkPanel() {
        const props = {
            userDraft,
            currentUser,
            env,
        };
        return <SocialNetworkPanel {...props} />;
    }

    function renderNotificationPanel() {
        let props = {
            userDraft,
            currentUser,
            repos,
            env,
        };
        return <NotificationPanel {...props} />;
    }

    function renderWebAlertPanel() {
        if (env.platform === 'cordova') {
            return null;
        }
        const props = {
            userDraft,
            currentUser,
            repos,
            env,
        };
        return <WebAlertPanel {...props} />;
    }

    function renderMobileAlertPanel() {
        if (_.isEmpty(devices)) {
            return null;
        }
        const props = {
            userDraft,
            currentUser,
            repos,
            env,
        };
        return <MobileAlertPanel {...props} />;
    }

    function renderLanguagePanel() {
        const props = { env };
        return <LanguagePanel {...props} />;
    }
}

const component = Relaks.memo(SettingsPage);

export {
    component as default,
    component as SettingsPage,
    SettingsPageSync,
};

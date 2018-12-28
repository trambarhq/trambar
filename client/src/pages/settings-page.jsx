import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as KonamiCode from 'utils/konami-code';
import * as DeviceFinder from 'objects/finders/device-finder';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as ProjectLinkFinder from 'objects/finders/project-link-finder';
import * as RepoFinder from 'objects/finders/repo-finder';
import * as SystemFinder from 'objects/finders/system-finder';
import * as UserFinder from 'objects/finders/user-finder';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import PageContainer from 'widgets/page-container';
import DevelopmentPanel from 'panels/development-panel';
import ProjectPanel from 'panels/project-panel';
import DevicePanel from 'panels/device-panel';
import UserInfoPanel from 'panels/user-info-panel';
import UserImagePanel from 'panels/user-image-panel';
import NotificationPanel from 'panels/notification-panel';
import WebAlertPanel from 'panels/web-alert-panel';
import MobileAlertPanel from 'panels/mobile-alert-panel';
import SocialNetworkPanel from 'panels/social-network-panel';
import LanguagePanel from 'panels/language-panel';
import ErrorBoundary  from 'widgets/error-boundary';

import './settings-page.scss';

let AUTOSAVE_DURATION = 2000;

/**
 * Asynchronous component that retrieves data needed by the Settings Page.
 *
 * @extends AsyncComponent
 */
class SettingsPage extends AsyncComponent {
    static displayName = 'SettingsPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, payloads, env } = this.props;
        let db = database.use({ by: this });
        let props = {
            database,
            payloads,
            route,
            env,
        };
        meanwhile.show(<SettingsPageSync {...props} />);
        let currentUserID = await db.start();
        props.currentUser = await UserFinder.findUser(db, currentUserID);
        props.projectLinks = await ProjectLinkFinder.findActiveLinks(db);
        props.currentProject = await ProjectFinder.findCurrentProject(db);
        meanwhile.show(<SettingsPageSync {...props} />);
        props.devices = await DeviceFinder.findUserDevices(db, props.currentUser, 1);
        meanwhile.show(<SettingsPageSync {...props} />);
        props.repos = await RepoFinder.findProjectRepos(db, props.currentProject);
        meanwhile.show(<SettingsPageSync {...props} />);
        props.system = await SystemFinder.findSystem(db);
        return <SettingsPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Settings page.
 *
 * @extends PureComponent
 */
class SettingsPageSync extends PureComponent {
    static displayName = 'SettingsPageSync';

    constructor(props) {
        super(props);
        this.state = {
            original: null,
        };
    }

    static getDerivedStateFromProps(props, state) {
        let { currentUser } = props;
        if (currentUser && !currentUser.uncommitted) {
            return { original: currentUser };
        }
        return null;
    }

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render() {
        let { env, currentUser } = this.props;
        if (!currentUser) {
            return null;
        }
        return (
            <PageContainer className="settings-page">
                <div className="panels">
                    <ErrorBoundary env={env}>
                        {this.renderDevelopmentPanel()}
                        {this.renderProjectPanel()}
                        {this.renderDevicePanel()}
                        {this.renderNotificationPanel()}
                        {this.renderWebAlertPanel()}
                        {this.renderMobileAlertPanel()}
                        {this.renderUserInfoPanel()}
                        {this.renderUserImagePanel()}
                        {this.renderSocialNetworkPanel()}
                        {this.renderLanguagePanel()}
                    </ErrorBoundary>
                </div>
            </PageContainer>
        );
    }

    /**
     * Render diagnostics panel if it's turned on
     *
     * @return {ReactElement|null}
     */
    renderDevelopmentPanel() {
        let { route, env, currentUser } = this.props;
        let enabled = _.get(currentUser, 'settings.development.show_panel');
        if (!enabled) {
            return null;
        }
        let panelProps = {
            currentUser,
            route,
            env,
            onChange: this.handleChange,
        };
        return <DevelopmentPanel {...panelProps} />;
    }

    /**
     * Render project panel
     *
     * @return {ReactElement}
     */
    renderProjectPanel() {
        let {
            system,
            currentProject,
            projectLinks,
            database,
            route,
            env,
            currentUser,
        } = this.props;
        let panelProps = {
            system,
            currentUser,
            currentProject,
            projectLinks,
            database,
            route,
            env,
            onChange: this.handleChange,
        };
        return <ProjectPanel {...panelProps} />;
    }

    /**
     * Render device panel
     *
     * @return {ReactElement}
     */
    renderDevicePanel() {
        let { database, route, env, devices } = this.props;
        if (env.platform === 'cordova') {
            return null;
        }
        if (_.isEmpty(devices)) {
            return null;
        }
        let panelProps = {
            devices,
            database,
            route,
            env,
        };
        return <DevicePanel {...panelProps} />;
    }

    /**
     * Render user info panel
     *
     * @return {ReactElement}
     */
    renderUserInfoPanel() {
        let { env, currentUser } = this.props;
        let panelProps = {
            currentUser,
            env,
            onChange: this.handleChange,
        };
        return <UserInfoPanel {...panelProps} />;
    }

    /**
     * Render user image panel
     *
     * @return {ReactElement}
     */
    renderUserImagePanel() {
        let { env, payloads, currentUser } = this.props;
        let panelProps = {
            currentUser,
            payloads,
            env,
            onChange: this.handleChange,
        };
        return <UserImagePanel {...panelProps} />;
    }

    /**
     * Render social network panel
     *
     * @return {ReactElement}
     */
    renderSocialNetworkPanel() {
        let { env, currentUser } = this.props;
        let panelProps = {
            currentUser,
            env,
            onChange: this.handleChange,
        };
        return <SocialNetworkPanel {...panelProps} />;
    }

    /**
     * Render notification panel
     *
     * @return {ReactElement}
     */
    renderNotificationPanel() {
        let { env, currentUser, repos } = this.props;
        let panelProps = {
            currentUser,
            repos,
            env,
            onChange: this.handleChange,
        };
        return <NotificationPanel {...panelProps} />;
    }

    /**
     * Render web alert panel
     *
     * @return {ReactElement|null}
     */
    renderWebAlertPanel() {
        let { env, currentUser, repos } = this.props;
        if (env.platform === 'cordova') {
            return null;
        }
        let panelProps = {
            currentUser,
            repos,
            env,
            onChange: this.handleChange,
        };
        return <WebAlertPanel {...panelProps} />;
    }

    /**
     * Render mobile alert panel
     *
     * @return {ReactElement|null}
     */
    renderMobileAlertPanel() {
        let { env, currentUser, devices, repos } = this.props;
        if (_.isEmpty(devices)) {
            return null;
        }
        let panelProps = {
            currentUser,
            repos,
            env,
            onChange: this.handleChange,
        };
        return <MobileAlertPanel {...panelProps} />;
    }

    /**
     * Render language panel
     *
     * @return {ReactElement}
     */
    renderLanguagePanel() {
        let { env } = this.props;
        let panelProps = {
            env,
        };
        return <LanguagePanel {...panelProps} />;
    }

    /**
     * Add Konami code listener
     */
    componentDidMount() {
        KonamiCode.addListener(this.handleKonamiCode);
    }

    /**
     * Save immediately on unmount
     */
    componentWillUnmount() {
        KonamiCode.removeListener(this.handleKonamiCode);
    }

    /**
     * Save new user object to remote database
     *
     * @param  {User} user
     * @param  {Boolean} immediate
     *
     * @return {Promise<User>}
     */
    async saveUser(user, immediate) {
        let { database, payloads } = this.props;
        let { original } = this.state;
        let options = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (UserUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        let db = database.use({ schema: 'global', by: this });
        let userAfter = await db.saveOne({ table: 'user' }, user, options);
        // start file upload
        payloads.dispatch(userAfter);
        return userAfter;
    }

    /**
     * Called when the user is changed by one of the panels
     *
     * @param  {Object} evt
     */
    handleChange = (evt) => {
        this.saveUser(evt.user, evt.immediate || false);
    }

    /**
     * Called when user enters Konami code
     *
     * @param  {Object} evt
     */
    handleKonamiCode = (evt) => {
        let { currentUser } = this.props;
        let userAfter = _.decoupleSet(currentUser, 'settings.development.show_panel', true);
        this.saveUser(userAfter, true);
    }
}

export {
    SettingsPage as default,
    SettingsPage,
    SettingsPageSync,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SettingsPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    SettingsPageSync.propTypes = {
        currentUser: PropTypes.object,
        currentProject: PropTypes.object,
        projectLinks: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        devices: PropTypes.arrayOf(PropTypes.object),
        system: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}

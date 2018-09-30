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

class SettingsPage extends AsyncComponent {
    static displayName = 'SettingsPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, payloads, env } = this.props;
        let db = database.use({ by: this });
        let props = {
            currentUser: null,
            currentProject: null,
            projectLinks: null,
            repos: null,
            devices: null,
            system: null,

            database,
            payloads,
            route,
            env,
        };
        meanwhile.show(<SettingsPageSync {...props} />);
        return db.start().then((currentUserID) => {
            return UserFinder.findUser(db, currentUserID).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return ProjectLinkFinder.findActiveLinks(db).then((links) => {
                props.projectLinks = links;
            });
        }).then(() => {
            return ProjectFinder.findCurrentProject(db).then((project) => {
                props.currentProject = project;
            });
        }).then(() => {
            meanwhile.show(<SettingsPageSync {...props} />);
            return DeviceFinder.findUserDevices(db, props.currentUser, 1).then((devices) => {
                props.devices = devices;
            });
        }).then(() => {
            meanwhile.show(<SettingsPageSync {...props} />);
            return RepoFinder.findProjectRepos(db, props.currentProject).then((repos) => {
                props.repos = repos;
            })
        }).then(() => {
            meanwhile.show(<SettingsPageSync {...props} />);
            return SystemFinder.findSystem(db).then((system) => {
                props.system = system;
            });
        }).then(() => {
            return <SettingsPageSync {...props} />;
        });
    }
}

class SettingsPageSync extends PureComponent {
    static displayName = 'SettingsPage.Sync';

    constructor(props) {
        super(props);
        this.state = {
            user: null,
            original: null,
        };
    }

    /**
     * Return current user, possibility with unsaved modifications
     *
     * @return {User}
     */
    getUser() {
        let { currentUser } = this.props;
        let { user } = this.state;
        return user || currentUser;
    }

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { currentUser } = nextProps;
        if (nextProps.currentUser !== currentUser) {
            let state = { user: null };
            if (nextProps.currentUser && !nextProps.currentUser.uncommitted) {
                state.original = nextProps.currentUser;
            }
            this.setState(state);
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement|null}
     */
    render() {
        let { currentUser } = this.props;
        if (!currentUser) {
            return null;
        }
        return (
            <PageContainer className="settings-page">
                <div className="panels">
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
        let { route, env } = this.props;
        let user = this.getUser();
        let enabled = _.get(user, 'settings.development.show_panel');
        if (!enabled) {
            return null;
        }
        let panelProps = {
            currentUser: user,
            route,
            env,
            onChange: this.handleChange,
        };
        return (
            <ErrorBoundary env={env}>
                <DevelopmentPanel {...panelProps} />
            </ErrorBoundary>
        );
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
        } = this.props;
        let panelProps = {
            system,
            currentUser: this.getUser(),
            currentProject,
            projectLinks,
            database,
            route,
            env,
            onChange: this.handleChange,
        };
        return (
            <ErrorBoundary env={env}>
                <ProjectPanel {...panelProps} />
            </ErrorBoundary>
        );
    }

    /**
     * Render device panel
     *
     * @return {ReactElement}
     */
    renderDevicePanel() {
        let { database, route, env, devices } = this.props;
        if (process.env.PLATFORM === 'cordova') {
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
        return (
            <ErrorBoundary env={env}>
                <DevicePanel {...panelProps} />
            </ErrorBoundary>
        );
    }

    /**
     * Render user info panel
     *
     * @return {ReactElement}
     */
    renderUserInfoPanel() {
        let { env } = this.props;
        let panelProps = {
            currentUser: this.getUser(),
            env,
            onChange: this.handleChange,
        };
        return (
            <ErrorBoundary env={env}>
                <UserInfoPanel {...panelProps} />
            </ErrorBoundary>
        );
    }

    /**
     * Render user image panel
     *
     * @return {ReactElement}
     */
    renderUserImagePanel() {
        let { env, payloads } = this.props;
        let panelProps = {
            currentUser: this.getUser(),
            payloads,
            env,
            onChange: this.handleChange,
        };
        return (
            <ErrorBoundary env={env}>
                <UserImagePanel {...panelProps} />
            </ErrorBoundary>
        );
    }

    /**
     * Render social network panel
     *
     * @return {ReactElement}
     */
    renderSocialNetworkPanel() {
        let { env } = this.props;
        let panelProps = {
            currentUser: this.getUser(),
            env,
            onChange: this.handleChange,
        };
        return (
            <ErrorBoundary env={env}>
                <SocialNetworkPanel {...panelProps} />
            </ErrorBoundary>
        );
    }

    /**
     * Render notification panel
     *
     * @return {ReactElement}
     */
    renderNotificationPanel() {
        let { env, repos } = this.props;
        let panelProps = {
            currentUser: this.getUser(),
            repos,
            env,
            onChange: this.handleChange,
        };
        return (
            <ErrorBoundary env={env}>
                <NotificationPanel {...panelProps} />
            </ErrorBoundary>
        );
    }

    /**
     * Render web alert panel
     *
     * @return {ReactElement|null}
     */
    renderWebAlertPanel() {
        let { env, repos } = this.props;
        if (process.env.PLATFORM === 'cordova') {
            return null;
        }
        let panelProps = {
            currentUser: this.getUser(),
            repos,
            env,
            onChange: this.handleChange,
        };
        return (
            <ErrorBoundary env={env}>
                <WebAlertPanel {...panelProps} />
            </ErrorBoundary>
        );
    }

    /**
     * Render mobile alert panel
     *
     * @return {ReactElement|null}
     */
    renderMobileAlertPanel() {
        let { env, devices, repos } = this.props;
        if (_.isEmpty(devices)) {
            return null;
        }
        let panelProps = {
            currentUser: this.getUser(),
            repos,
            env,
            onChange: this.handleChange,
        };
        return (
            <ErrorBoundary env={env}>
                <MobileAlertPanel {...panelProps} />
            </ErrorBoundary>
        );
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
        return (
            <ErrorBoundary env={env}>
                <LanguagePanel {...panelProps} />
            </ErrorBoundary>
        );
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
    saveUser(user, immediate) {
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
        return db.saveOne({ table: 'user' }, user, options).then((user) => {
            // start file upload
            payloads.dispatch(user);
            return user;
        });
    }

    /**
     * Called when the user is changed by one of the panels
     *
     * @param  {Object} evt
     */
    handleChange = (evt) => {
        let user = evt.user;
        this.setState({ user }, () => {
            this.saveUser(user, evt.immediate || false);
        });
    }

    /**
     * Called when user enters Konami code
     *
     * @param  {Object} evt
     */
    handleKonamiCode = (evt) => {
        let user = _.decoupleSet(this.getUser(), 'settings.development.show_panel', true);
        this.setState({ user }, () => {
            this.saveUser(user, true);
        });
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

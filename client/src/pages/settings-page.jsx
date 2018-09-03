import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import KonamiCode from 'utils/konami-code';
import DeviceFinder from 'objects/finders/device-finder';
import ProjectFinder from 'objects/finders/project-finder';
import RepoFinder from 'objects/finders/repo-finder';
import SystemFinder from 'objects/finders/system-finder';
import UserFinder from 'objects/finders/user-finder';
import UserUtils from 'objects/utils/user-utils';

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
import DiagnoisticsPanel from 'panels/diagnostics-panel';

import './settings-page.scss';

var AUTOSAVE_DURATION = 2000;

class SettingsPage extends AsyncComponent {
    static displayName = 'SettingsPage';

    /**
     * Match current URL against the page's
     *
     * @param  {String} path
     * @param  {Object} query
     *
     * @return {Object|null}
     */
    static parseURL(path, query) {
        return Route.match(path, [
            '/global/settings/?',
            '/:schema/settings/?',
        ], (params) => {
            return {
                schema: params.schema,
                diagnostics: !!query.diagnostics,
            };
        });
    }

    /**
     * Generate a URL of this page based on given parameters
     *
     * @param  {Object} params
     *
     * @return {Object}
     */
    static getURL(params) {
        var path = `/${params.schema || 'global'}/settings/`, query = {};
        if (params.diagnostics) {
            query.diagnostics = 1;
        }
        return { path, query };
    }

    /**
     * Return configuration info for global UI elements
     *
     * @param  {Route} currentRoute
     *
     * @return {Object}
     */
    static configureUI(currentRoute) {
        var params = currentRoute.parameters;
        var route = {
            schema: params.schema,
        };
        return {
            navigation: { route, section: 'settings' }
        };
    }

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: params.schema, by: this });
        var props = {
            currentUser: null,
            currentProject: null,
            projectLinks: null,
            repos: null,
            devices: null,
            system: null,

            database: this.props.database,
            payloads: this.props.payloads,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<SettingsPageSync {...props} />);
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return ProjectFinder.findProjectLinks(db).then((links) => {
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
        return this.state.user || this.props.currentUser;
    }

    /**
     * Update state on prop changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        if (this.props.currentUser !== nextProps.currentUser) {
            var state = { user: null };
            if (nextProps.currentUser && !nextProps.currentUser.uncommitted) {
                state.original = nextProps.currentUser;
            }
            this.setState({ user: null });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        var params = this.props.route.parameters;
        if (params.diagnostics) {
            return this.renderDiagnostics();
        } else {
            return this.renderSettings();
        }
    }

    /**
     * Render settings panels
     *
     * @return {ReactElement|null}
     */
    renderSettings() {
        if (!this.props.currentUser) {
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
     * Render diagnostics panels
     *
     * @return {ReactElement}
     */
    renderDiagnostics() {
        return (
            <PageContainer className="settings-page">
                <div className="panels diagnostics">
                    <DiagnoisticsPanel type="connectivity-monitor" title="Network" />
                    <DiagnoisticsPanel type="websocket-notifier" title="Web Socket" />
                    <DiagnoisticsPanel type="push-notifier" title="Push Notification" />
                    <DiagnoisticsPanel type="subscription-manager" title="Data Subscription" />
                    <DiagnoisticsPanel type="session-manager" title="Sessions" />
                    <DiagnoisticsPanel type="link-manager" title="Project Links" />
                    <DiagnoisticsPanel type="locale-manager" title="Locale Manager" />
                    <DiagnoisticsPanel type="indexed-db-cache" title="IndexedDB Cache" />
                    <DiagnoisticsPanel type="sqlite-cache" title="SQLite Cache" />
                    <DiagnoisticsPanel type="remote-data-source" title="Remote Data Source" />
                    <DiagnoisticsPanel type="payload-manager" title="Payload Manager" />
                    <DiagnoisticsPanel type="code-push" title="CodePush" />
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
        var user = this.getUser();
        var enabled = _.get(user, 'settings.development.show_panel');
        if (!enabled) {
            return null;
        }
        var panelProps = {
            currentUser: user,
            route: this.props.route,
            locale: this.props.locale,
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
        var panelProps = {
            system: this.props.system,
            currentUser: this.getUser(),
            currentProject: this.props.currentProject,
            projectLinks: this.props.projectLinks,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
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
        if (process.env.PLATFORM === 'cordova') {
            return null;
        }
        if (_.isEmpty(this.props.devices)) {
            return null;
        }
        var panelProps = {
            devices: this.props.devices,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <DevicePanel {...panelProps} />;
    }

    /**
     * Render user info panel
     *
     * @return {ReactElement}
     */
    renderUserInfoPanel() {
        var panelProps = {
            currentUser: this.getUser(),
            locale: this.props.locale,
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
        var panelProps = {
            currentUser: this.getUser(),
            payloads: this.props.payloads,
            locale: this.props.locale,
            theme: this.props.theme,
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
        var panelProps = {
            currentUser: this.getUser(),
            locale: this.props.locale,
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
        var panelProps = {
            currentUser: this.getUser(),
            repos: this.props.repos,
            locale: this.props.locale,
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
        if (process.env.PLATFORM === 'cordova') {
            return null;
        }
        var panelProps = {
            currentUser: this.getUser(),
            repos: this.props.repos,
            locale: this.props.locale,
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
        if (_.isEmpty(this.props.devices)) {
            return null;
        }
        var panelProps = {
            currentUser: this.getUser(),
            repos: this.props.repos,
            locale: this.props.locale,
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
        var panelProps = {
            locale: this.props.locale,
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
     *
     * @return {[type]}
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
        var schema = 'global';
        var original = this.state.original;
        var options = {
            delay: (immediate) ? undefined : AUTOSAVE_DURATION,
            onConflict: (evt) => {
                // perform merge on conflict, if the object still exists
                // otherwise saving will be cancelled
                if (UserUtils.mergeRemoteChanges(evt.local, evt.remote, original)) {
                    evt.preventDefault();
                }
            },
        };
        var db = this.props.database.use({ schema, by: this });
        return db.saveOne({ table: 'user' }, user, options).then((user) => {
            // start file upload
            this.props.payloads.dispatch(user);
            return user;
        });
    }

    /**
     * Called when the user is changed by one of the panels
     *
     * @param  {Object} evt
     */
    handleChange = (evt) => {
        var user = evt.user;
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
        var user = _.decoupleSet(this.getUser(), 'settings.development.show_panel', true);
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
import Locale from 'locale/locale';
import Theme from 'theme/theme';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');
    
    SettingsPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
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
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    };
}

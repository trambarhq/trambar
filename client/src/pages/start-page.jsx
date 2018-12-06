import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import HTTPRequest from 'transport/http-request';
import { memoizeWeak } from 'utils/memoize';
import * as UniversalLink from 'routing/universal-link';
import * as ProjectFinder from 'objects/finders/project-finder';
import * as ProjectLinkFinder from 'objects/finders/project-link-finder';
import * as ResourceUtils from 'objects/utils/resource-utils';
import * as SystemFinder from 'objects/finders/system-finder';
import * as UserFinder from 'objects/finders/user-finder';
import * as UserUtils from 'objects/utils/user-utils';

// widgets
import Logo from 'trambar-logo.svg';
import Scrollable from 'widgets/scrollable';
import PushButton from 'widgets/push-button';
import ProfileImage from 'widgets/profile-image';
import ResourceView from 'widgets/resource-view';
import MembershipRequestDialogBox from 'dialogs/membership-request-dialog-box';
import QRScannerDialogBox from 'dialogs/qr-scanner-dialog-box';
import ActivationDialogBox from 'dialogs/activation-dialog-box';
import LoadingAnimation from 'widgets/loading-animation';
import EmptyMessage from 'widgets/empty-message';

import './start-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Start page.
 *
 * @extends AsyncComponent
 */
class StartPage extends AsyncComponent {
    static displayName = 'StartPage';
    static useTransition = true;

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let {
            database,
            route,
            env,
            transitionOut,
            activationCode,
            onTransitionOut,
        } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            currentUser: undefined,
            system: undefined,
            servers: undefined,
            projects: undefined,
            projectLinks: undefined,

            transitionOut,
            database,
            route,
            env,
            onTransitionOut,
        };
        if (!db.authorized) {
            if (env.platform === 'browser') {
                // start authorization process--will receive system description
                // and list of OAuth providers along with links
                meanwhile.show(<StartPageSync {...props} />);
                return db.beginSession('client').then((info) => {
                    // we'll load the system object again, through the regular
                    // data retrieval mechanism, once we have gain access
                    //
                    // save a copy so that we can keep displaying the
                    // background image and project description while loading
                    // occurs
                    this.sessionStartSystem = info.system;

                    props.system = info.system;
                    props.servers = info.servers;
                    return <StartPageSync {...props} />;
                });
            } else if (env.platform === 'cordova') {
                return ProjectLinkFinder.findActiveLinks(db).then((links) => {
                    props.projectLinks = links;
                    return <StartPageSync {...props} />;
                });
            }
        } else {
            // handle things normally after we've gained authorization
            if (this.sessionStartSystem) {
                props.system = this.sessionStartSystem;

                // need to adjust the progressive rendering delay since Relaks
                // by default disables it once a page has fully rendered
                meanwhile.delay(undefined, 300);
            }
            meanwhile.show(<StartPageSync {...props} />);
            return db.start().then((currentUserID) => {
                return UserFinder.findUser(db, currentUserID).then((user) => {
                    props.currentUser = user;
                });
            }).then(() => {
                meanwhile.show(<StartPageSync {...props} />);
                return SystemFinder.findSystem(db).then((system) => {
                    props.system = system;
                });
            }).then(() => {
                meanwhile.show(<StartPageSync {...props} />);
                return ProjectFinder.findActiveProjects(db, 1).then((projects) => {
                    props.projects = projects;
                });
            }).then(() => {
                meanwhile.show(<StartPageSync {...props} />);
                return ProjectLinkFinder.findActiveLinks(db).then((links) => {
                    props.projectLinks = links;
                });
            }).then(() => {
                return <StartPageSync {...props} />;
            });
        }
    }
}

/**
 * Synchronous component that actually renders the Start page.
 *
 * @extends PureComponent
 */
class StartPageSync extends PureComponent {
    static displayName = 'StartPageSync';

    constructor(props) {
        let { env } = props;
        super(props);
        this.state = {
            selectedProjectName: '',
            transitionMethod: 'fast',
        };
        if (env.platform === 'browser') {
            _.assign(this.state, {
                oauthErrors: {},
            });
        } else if (env.platform === 'cordova') {
            _.assign(this.state, {
                scanningQRCode: false,
                enteringManually: false,
                activationError: null,
                addingServer: false,
                lastError: null,
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
        if (env.platform === 'browser') {
            return this.renderForBrowser();
        } else if (env.platform === 'cordova') {
            return this.renderForCordova();
        }
    }

    /**
     * Render component (browser)
     *
     * @return {ReactElement}
     */
    renderForBrowser() {
        let { env, system, transitionOut } = this.props;
        let { transitionMethod } = this.state;
        let { t } = env.locale;
        let pageProps = { className: 'start-page browser' };
        let style;
        if (system) {
            let resources = _.get(system, 'details.resources');
            let backgroundImage = _.find(resources, { type: 'image' });
            if (backgroundImage) {
                let imageURL = ResourceUtils.getImageURL(backgroundImage, { width: 1024, quality: 40 }, env);
                pageProps.style = { backgroundImage: `url(${imageURL})` };
            }
        }
        if (transitionOut) {
            pageProps.className += ` transition-out-${transitionMethod}`;
            pageProps.onTransitionEnd = this.handleTransitionEnd;
        }
        return (
            <div {...pageProps}>
                <div className="bar">
                    <h1 className="welcome">{t('start-welcome')}</h1>
                    <div className="content-area">
                        {this.renderDescription()}
                        {this.renderChoices()}
                    </div>
                </div>
                {this.renderProjectDialog()}
            </div>
        );
    }

    /**
     * Render component (Cordova)
     *
     * @return {ReactElement}
     */
    renderForCordova() {
        let { database, transitionOut } = this.props;
        let { transitionMethod, addingServer } = this.state;
        let pageProps = { className: 'start-page cordova' };
        if (transitionOut) {
            pageProps.className += ` transition-out-${transitionMethod}`;
            pageProps.onTransitionEnd = this.handleTransitionEnd;
            if (transitionMethod === 'slow') {
                // render a greeting during long transition
                return (
                    <div {...pageProps}>
                        {this.renderMobileGreeting()}
                    </div>
                );
            } else {
                return <div {...pageProps} />;
            }
        }
        if (!database.authorized || addingServer) {
            // render only instructions for gaining access
            return (
                <div {...pageProps}>
                    {this.renderTitle()}
                    {this.renderActivationControls()}
                    {this.renderAvailableServers()}
                </div>
            );
        } else {
            // render project list, followed by activation instructions
            return (
                <div {...pageProps}>
                    {this.renderTitle()}
                    {this.renderProjectButtons()}
                    {this.renderEmptyMessage()}
                    {this.renderActivationSelector()}
                    {this.renderProjectDialog()}
                </div>
            );
        }
    }

    /**
     * Render text describing the system
     *
     * @return {ReactElement|null}
     */
    renderDescription() {
        let { env, system } = this.props;
        let { t, p } = env.locale;
        if (!system || !system.details) {
            return null;
        }
        let { title, description } = system.details;
        return (
            <div className="section description">
                <h2>{p(title) || t('start-system-title-default')}</h2>
                <Scrollable>
                    <p>{p(description)}</p>
                </Scrollable>
            </div>
        );
    }

    /**
     * Render either the name of the system the user has logged into or the
     * app name
     *
     * @return {ReactElement|null}
     */
    renderTitle() {
        let { database, env, system } = this.props;
        let { addingServer } = this.state;
        let { t, p } = env.locale;
        let title;
        if (addingServer) {
            title = t('start-activation-new-server');
        } else if (database.authorized) {
            // show the name of the site
            if (system) {
                title = p(system.details.title);
            }
            if (!title) {
                title = t('start-system-title-default');
            }
        } else {
            title = t('app-name');
        }
        return <h2 className="title">{title}</h2>;
    }

    /**
     * Render welcome
     *
     * @return {ReactElement|null}
     */
    renderMobileGreeting() {
        let { env, currentUser } = this.props;
        let { scanningQRCode, enteringManually } = this.state;
        let { t } = env.locale;
        let className = 'welcome';
        if (scanningQRCode || enteringManually) {
            let name;
            if (currentUser) {
                name = UserUtils.getDisplayName(currentUser, env);
                className += ' user';
            } else {
                name = '\u00a0';
            }
            let imageProps = {
                user: currentUser,
                size: 'large',
                env,
            };
            return (
                <div className={className}>
                    <h3>{t('start-welcome-again')}</h3>
                    <ProfileImage {...imageProps} />
                    <h4 className="name">{name}</h4>
                </div>
            );
        } else {
            return (
                <div className={className}>
                    <h3>{t('start-welcome')}</h3>
                </div>
            );
        }
    }

    /**
     * Render instructions plus buttons
     *
     * @return {ReactElement}
     */
    renderActivationControls() {
        return (
            <div>
                {this.renderActivationInstructions()}
                {this.renderActivationButtons()}
                {this.renderQRScannerDialogBox()}
                {this.renderActivationDialogBox()}
            </div>
        );
    }

    /**
     * Render instructions for gaining access on mobile device
     *
     * @return {ReactElement}
     */
    renderActivationInstructions() {
        let { env } = this.props;
        let { t } = env.locale;
        let ui = {
            settings: (
                <span key="0" className="ui">
                    {t('bottom-nav-settings')}
                </span>
            ),
            projects: (
                <span key="1" className="ui">
                    {t('settings-projects')}
                </span>
            ),
            mobileSetup: (
                <span key="2" className="ui">
                    <i className="fa fa-qrcode" />
                    {' '}
                    {t('project-management-mobile-set-up')}
                </span>
            )
        };
        return (
            <div className="activation-instructions">
                {t('start-activation-instructions', ui)}
            </div>
        );
    }

    /**
     * Render buttons for scanning QR code or manual entry of session info
     *
     * @return {ReactElement}
     */
    renderActivationButtons() {
        let { env } = this.props;
        let { t } = env.locale;
        let manualProps = {
            label: t('start-activation-manual'),
            onClick: this.handleManualClick,
        };
        let scanProps = {
            label: t('start-activation-scan-code'),
            emphasized: true,
            onClick: this.handleScanClick,
        };
        return (
            <div className="activation-buttons">
                <div className="left">
                    <PushButton {...manualProps} />
                </div>
                <div className="right">
                    <PushButton {...scanProps} />
                </div>
            </div>
        );
    }

    /**
     * Render button for adding new server
     *
     * @return {ReactElement}
     */
    renderActivationSelector() {
        let { env } = this.props;
        let { t } = env.locale;
        let addProps = {
            label: t('start-activation-add-server'),
            onClick: this.handleAddClick,
        };
        return (
            <div className="activation-buttons">
                <div className="right">
                    <PushButton {...addProps} />
                </div>
            </div>
        );
    }

    /**
     * Render list of buttons, either OAuth providers or available projects
     *
     * @return {ReactElement|null}
     */
    renderChoices() {
        let { database } = this.props;
        if (!database.authorized) {
            return this.renderOAuthButtons();
        } else {
            return this.renderProjectButtons();
        }
    }

    /**
     * Render a message if there're no servers or projects
     *
     * @return {ReactElement|null}
     */
    renderEmptyMessage() {
        let { database, env, servers, projects } = this.props;
        if (!database.authorized) {
            if (!_.isEmpty(servers)) {
                return null;
            }
            if (servers) {
                let props = { phrase: 'start-no-servers', env };
                return <EmptyMessage {...props} />;
            }
        } else {
            if (!_.isEmpty(projects)) {
                return null;
            }
            if (!projects) {
                return <LoadingAnimation />;
            } else {
                let props = { phrase: 'start-no-projects', env };
                return <EmptyMessage {...props} />;
            }
        }
    }

    /**
     * Render OAuth buttons
     *
     * @return {ReactElement|null}
     */
    renderOAuthButtons() {
        let { env, servers } = this.props;
        let { t } = env.locale;
        servers = sortServers(servers, env);
        return (
            <div className="section buttons">
                <h2>{t('start-social-login')}</h2>
                <Scrollable>
                    {this.renderEmptyMessage()}
                    <p>
                        {_.map(servers, this.renderOAuthButton.bind(this))}
                    </p>
                </Scrollable>
            </div>
        );
    }

    /**
     * Render a button for logging in through OAuth
     *
     * @param  {Object} server
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderOAuthButton(server, i) {
        let { database, env } = this.props;
        let { oauthErrors } = this.state;
        let { title } = server.details;
        let { t, p } = env.locale;
        let icon = getServerIcon(server.type);
        let url = database.getOAuthURL(server);
        let props = {
            className: 'oauth-button',
            href: url,
            onClick: this.handleOAuthButtonClick,
            target: '_blank',
            'data-id': server.id,
        };
        let error = oauthErrors[server.id];
        if (error) {
            let text = t(`start-error-${error.reason}`);
            props.className += ' error';
            return (
                <a key={i} {...props}>
                    <span className="icon">
                        <i className={`fa fa-fw fa-${icon}`}></i>
                    </span>
                    <span className="error">{text}</span>
                </a>
            );
        } else {
            return (
                <a key={i} {...props}>
                    <span className="icon">
                        <i className={`fa fa-fw fa-${icon}`}></i>
                    </span>
                    <span className="label">
                        {p(title) || t(`server-type-${server.type}`)}
                    </span>
                </a>
            );
        }
    }

    /**
     * Render project buttons
     *
     * @return {ReactElement}
     */
    renderProjectButtons() {
        let { env, projects } = this.props;
        let { t } = env.locale;
        projects = sortProjects(projects, env);
        if (env.platform == 'browser') {
            return (
                <div className="section buttons">
                    <h2>{projects ? t('start-projects') : ''}</h2>
                    <Scrollable>
                        {this.renderEmptyMessage()}
                        {_.map(projects, this.renderProjectButton.bind(this))}
                    </Scrollable>
                </div>
            );
        } else if (env.platform === 'cordova') {
            return (
                <div className="projects">
                    {this.renderEmptyMessage()}
                    {_.map(projects, this.renderProjectButton.bind(this))}
                </div>
            );
        }
    }

    /**
     * Render a project button
     *
     * @return {ReactElement}
     */
    renderProjectButton(project, i) {
        let { env, route, projectLinks, currentUser } = this.props;
        let { t, p } = env.locale;
        let { name } = project;
        let { description, title, resources } = project.details;

        // project picture
        let icon;
        let image = _.find(resources, { type: 'image' });
        if (image) {
            icon = <ResourceView resource={image} width={56} height={56} env={env} />;
        } else {
            // use logo, with alternating background color
            let num = (project.id % 5) + 1;
            icon = <div className={`default v${num}`}><Logo /></div>;
        }

        // add badge to indicate membership status
        let badge;
        if (UserUtils.isMember(currentUser, project)) {
            badge = <i className="fa fa-user-circle-o badge" />;
        } else if (UserUtils.isPendingMember(currentUser, project)) {
            badge = <i className="fa fa-clock-o badge" />;
        }

        // don't show dialog box if user has previously visited the project
        let skipDialog = _.some(projectLinks, {
            address: route.context.address,
            schema: project.name,
        });
        let linkProps;
        if (!skipDialog) {
            linkProps = {
                'data-project-name': project.name,
                className: 'project-button',
                onClick: this.handleUnknownProjectClick,
            };
        } else {
            linkProps = {
                className: 'project-button',
                href: route.find('news-page', {}, { schema: project.name }),
            };
        }
        return (
            <a key={project.id} {...linkProps}>
                <div className="icon">{icon}</div>
                <div className="text">
                    {badge}
                    <div className="title">
                        {p(title) || name}
                    </div>
                    <div className="description">
                        <div className="contents">
                            {p(description)}
                            <div className="ellipsis">
                                <i className="fa fa-ellipsis-h" />
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        );
    }

    /**
     * Render available servers if there are any
     *
     * @return {ReactElement|null}
     */
    renderAvailableServers() {
        let { database, env, projectLinks } = this.props;
        let { t } = env.locale;
        let servers = _.uniq(_.map(projectLinks, 'address')).sort();
        if (_.isEmpty(servers)) {
            return null;
        }
        let returnProps = {
            label: t('start-activation-return'),
            hidden: !database.authorized,
            onClick: this.handleReturnClick,
        };
        return (
            <div className="other-servers">
                <h2 className="title">{t('start-activation-others-servers')}</h2>
                <ul>{_.map(servers, this.renderServerLink.bind(this))}</ul>
                <div className="activation-buttons">
                    <div className="right">
                        <PushButton {...returnProps} />
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Render server link
     *
     * @param  {String} server
     * @param  {Number} key
     *
     * @return {ReactElement}
     */
    renderServerLink(server, key) {
        let { route, addingServer } = this.props;
        let context = { cors: true, address: server };
        let url = route.find('start-page', {}, context);
        return (
            <li key={key}>
                <a href={url}>
                    <i className="fa fa-home" /> {server}
                </a>
            </li>
        );
    }

    /**
     * Render dialog box for joining a project
     *
     * @return {ReactElement|null}
     */
    renderProjectDialog() {
        let { database, route, env, projects, currentUser, transitionOut } = this.props;
        let { selectedProjectName } = this.state;
        let selectedProject = _.find(projects, { name: selectedProjectName });
        let dialogProps = {
            show: !!selectedProject && !transitionOut,
            currentUser,
            project: selectedProject,
            database,
            route,
            env,
            onConfirm: this.handleMembershipRequestConfirm,
            onRevoke: this.handleMembershipRequestRevoke,
            onClose: this.handleMembershipRequestClose,
            onProceed: this.handleMembershipRequestProceed,
        };
        return <MembershipRequestDialogBox {...dialogProps} />;
    }

    /**
     * Render QR scanner dialog box if we're scanning a QR code
     *
     * @return {ReactElement|null}
     */
    renderQRScannerDialogBox() {
        let { env } = this.props;
        let { scanningQRCode, activationError } = this.state;
        let { t } = env.locale;
        let props = {
            show: scanningQRCode,
            error: activationError,
            env,
            onCancel: this.handleCancelScan,
            onResult: this.handleScanResult,
        };
        let ui = {
            settings: (
                <span key="0" className="ui">
                    {t('bottom-nav-settings')}
                </span>
            ),
            mobileSetup: (
                <span key="2" className="ui">
                    <i className="fa fa-qrcode" />
                    {' '}
                    {t('project-management-mobile-set-up')}
                </span>
            )
        };
        return (
            <QRScannerDialogBox {...props}>
                {t('start-activation-instructions-short', ui)}
            </QRScannerDialogBox>
        );
    }

    /**
     * Render QR scanner dialog box if we're scanning a QR code
     *
     * @return {ReactElement|null}
     */
    renderActivationDialogBox() {
        let { env } = this.props;
        let { enteringManually, activationError } = this.state;
        let { t } = env.locale;
        let props = {
            show: enteringManually,
            error: activationError,
            env,
            onCancel: this.handleActivationCancel,
            onConfirm: this.handleActivationConfirm,
        };
        return (
            <ActivationDialogBox {...props} />
        );
    }

    /**
     * Gain access to server using an activation code
     *
     * @param  {Object} params
     *
     * @return {Promise}
     */
    activateMobileSession(params) {
        let { database, route } = this.props;
        let { address, schema, activationCode } = params || {};
        let db = database.use({ address, schema });
        clearTimeout(this.invalidCodeTimeout);
        return db.acquireMobileSession(activationCode).then((userID) => {
            if (schema) {
                this.navigateToProject(address, schema);
            }

            // create entry in device table
            let device = {
                type: getDeviceType(),
                uuid: getDeviceUUID(),
                details: getDeviceDetails(),
                user_id: userID,
                session_handle: _.toLower(activationCode),
            };
            return db.saveOne({ schema: 'global', table: 'device' }, device);
        }).catch((err) => {
            db.releaseMobileSession();
            this.setState({ activationError: err });
            this.invalidCodeTimeout = setTimeout(() => {
                this.setState({ activationError: null });
            }, 5000);
            throw err;
        });
    }

    /**
     * Navigate to the news page of a project
     *
     * @param  {String} address
     * @param  {String} schema
     *
     * @return {Promise<Boolean>}
     */
    navigateToProject(address, schema) {
        let { database, route, projectLinks } = this.props;
        let context = { schema };
        if (address) {
            context.address = address;
            context.cors = true;
        }
        let bookmarked = _.some(projectLinks, { address, schema });
        if (!bookmarked) {
            this.setState({ transitionMethod: 'slow' });
        }
        return route.push('news-page', {}, context);
    }

    /**
     * Open a popup window to OAuth provider
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    openPopUpWindow(url) {
        return new Promise((resolve, reject) => {
            let width = 800;
            let height = 600;
            let options = {
                width,
                height,
                left: window.screenLeft + Math.round((window.outerWidth - width) / 2),
                top: window.screenTop + Math.round((window.outerHeight - height) / 2),
                toolbar: 'no',
                menubar: 'no',
                status: 'no',
            };
            let pairs = _.map(options, (value, name) => {
                return `${name}=${value}`;
            });
            let win = window.open(url, 'login', pairs.join(','));
            if (win) {
                win.location = url;
                let interval = setInterval(() => {
                    if (win.closed) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            } else {
                reject(new Error('Unable to open popup'))
            }
        });
    }

    /**
     * Called when user clicks on one of the OAuth buttons
     *
     * @param  {Event} evt
     */
    handleOAuthButtonClick = (evt) => {
        let { database } = this.props;
        let { oauthErrors } = this.state;
        evt.preventDefault();
        evt.stopPropagation();
        let url = evt.currentTarget.getAttribute('href');
        let providerID = evt.currentTarget.getAttribute('data-id');
        return this.openPopUpWindow(url).then(() => {
            let db = database.use({ by: this });
            return db.checkAuthorization().catch((err) => {
                oauthErrors = _.clone(oauthErrors);
                oauthErrors[providerID] = err;
                this.setState({ oauthErrors });
            });
        });
    }

    /**
     * Called when user clicks on a project that hasn't visited earlier
     *
     * @param  {Event} evt
     */
    handleUnknownProjectClick = (evt) => {
        let selectedProjectName = evt.currentTarget.getAttribute('data-project-name');
        this.setState({ selectedProjectName });
    }

    /**
     * Called when user chooses to join a project
     *
     * @param  {Event} evt
     */
    handleMembershipRequestConfirm = (evt) => {
        let { database, currentUser } = this.props;
        let { project } = evt.target.props;
        if (!_.includes(currentUser.requested_project_ids, project.id)) {
            let db = database.use({ schema: 'global', by: this });
            let userAfter = _.clone(currentUser);
            userAfter.requested_project_ids = _.union(userAfter.requested_project_ids, [ project.id ]);
            db.saveOne({ table: 'user' }, userAfter);
        }
    }

    /**
     * Called when user chooses to cancel a join request
     *
     * @param  {Event} evt
     */
    handleMembershipRequestRevoke = (evt) => {
        let { database, currentUser } = this.props;
        let { project } = evt.target.props;
        if (_.includes(currentUser.requested_project_ids, project.id)) {
            let userAfter = _.clone(currentUser);
            userAfter.requested_project_ids = _.without(userAfter.requested_project_ids, project.id);
            let db = database.use({ schema: 'global', by: this });
            db.saveOne({ table: 'user' }, userAfter);
        }
    }

    /**
     * Called when user clicks outside the project dialog box or the cancel button
     *
     * @param  {Event} evt
     */
    handleMembershipRequestClose = (evt) => {
        this.setState({ selectedProjectName: null });
    }

    /**
     * Called when user clicks the proceed button
     *
     * @param  {Event} evt
     */
    handleMembershipRequestProceed = (evt) => {
        let { project } = evt.target.props;
        this.navigateToProject('', project.name);
    }

    /**
     * Called when user clicks scan button
     *
     * @param  {Event} evt
     */
    handleScanClick = (evt) => {
        this.setState({ scanningQRCode: true, qrCodeStatus: 'pending' });
    }

    /**
     * Called when user clicks manual button
     *
     * @param  {Event} evt
     */
    handleManualClick = (evt) => {
        this.setState({ enteringManually: true });
    }

    /**
     * Called when user clicks add server button
     *
     * @param  {Event} evt
     */
    handleAddClick = (evt) => {
        this.setState({ addingServer: true });
    }

    /**
     * Called when user clicks return button
     *
     * @param  {Event} evt
     */
    handleReturnClick = (evt) => {
        this.setState({ addingServer: false });
    }

    /**
     * Called when user cancel scanning
     *
     * @param  {Object} evt
     */
    handleCancelScan = (evt) => {
        this.setState({ scanningQRCode: false, activationError: null });
        if (this.invalidCodeTimeout) {
            clearTimeout(this.invalidCodeTimeout);
        }
    }

    /**
     * Called when user has successful scanned a code
     *
     * @param  {Object} evt
     */
    handleScanResult = (evt) => {
        let params = UniversalLink.parseActivationURL(evt.result);
        this.activateMobileSession(params)
    }

    /**
     * Called when user closes the activation dialog box
     *
     * @param  {Object} evt
     */
    handleActivationCancel = (evt) => {
        this.setState({ enteringManually: false });
    }

    /**
     * Called when user clicks OK in the activation dialog box
     *
     * @param  {Object} evt
     */
    handleActivationConfirm = (evt) => {
        let params = {
            address: evt.address,
            schema: evt.schema,
            activationCode: evt.code,
        };
        this.activateMobileSession(params);
    }

    /**
     * Called when transition out is complete
     *
     * @param  {TransitionEvent} evt
     */
    handleTransitionEnd = (evt) => {
        let { onTransitionOut } = this.props;
        if (evt.propertyName === 'opacity') {
            if (onTransitionOut) {
                onTransitionOut({
                    type: 'transitionout',
                    target: this,
                });
            }
        }
    }
}

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}

const sortProjects = memoizeWeak(null, function(projects, env) {
    let { p } = env.locale;
    return _.sortBy(projects, (project) => {
        return p(project.details.title) || project.name;
    });
});

const sortServers = memoizeWeak(null, function(servers, env) {
    let { p } = env.locale;
    return _.sortBy(servers, (server) => {
        return p(server.details.title) || server.name;
    });
});

/**
 * Return the device OS
 *
 * @return {String}
 */
function getDeviceType() {
    if (window.cordova) {
        return cordova.platformId;
    }
    if (process.env.NODE_ENV !== 'production') {
        return 'android';
    }
    return null;
}

/**
 * Return device unique id
 *
 * @return {String}
 */
function getDeviceUUID() {
    let device = window.device;
    if (device) {
        return device.uuid;
    }
    if (process.env.NODE_ENV !== 'production') {
        return '00000000000000000000000000000000';
    }
    return null;
}

/**
 * Return device details
 *
 * @return {Object}
 */
function getDeviceDetails() {
    let device = window.device;
    if (device) {
        let manufacturer = device.manufacturer;
        let name = device.model;
        if (manufacturer === 'MicrosoftMDG') {
            manufacturer = 'Microsoft';
        }
        return { manufacturer, name };
    }
    if (process.env.NODE_ENV !== 'production') {
        return {
            manufacturer: 'Apricot',
            name: 'Apricot oPhone 5',
        };
    }
    return {};
}

export {
    StartPage as default,
    StartPage,
    StartPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    StartPage.propTypes = {
        transitionOut: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onTransitionOut: PropTypes.func,
    };
    StartPageSync.propTypes = {
        transitionOut: PropTypes.bool,
        currentUser: PropTypes.object,
        system: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),
        projectLinks: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onTransitionOut: PropTypes.func,
    };
}

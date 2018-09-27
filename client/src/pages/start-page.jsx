import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import HTTPRequest from 'transport/http-request';
import { memoizeWeak } from 'utils/memoize';
import UniversalLink from 'routing/universal-link';
import * as ProjectFinder from 'objects/finders/project-finder';
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

class StartPage extends AsyncComponent {
    static displayName = 'StartPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, address, add, activationCode } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let props = {
            currentUser: null,
            system: this.sessionStartSystem || null,
            servers: null,
            projects: null,
            projectLinks: null,

            database,
            route,
            env,
        };
        if (!db.authorized) {
            if (process.env.PLATFORM === 'browser') {
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
            }
            if (process.env.PLATFORM === 'cordova') {
                if (address && activationCode) {
                    meanwhile.show(<StartPageSync {...props} />);
                    return db.acquireMobileSession(activationCode).then((userID) => {
                        // create entry in device table
                        let device = {
                            type: getDeviceType(),
                            uuid: getDeviceUUID(),
                            details: getDeviceDetails(),
                            user_id: userID,
                            session_handle: _.toLower(activationCode),
                        };
                        return db.saveOne({ table: 'device' }, device);
                    }).then((device) => {
                        // if no error was encounted, an onAuthorization event
                        // should have caused rerendering at this point
                        return <StartPageSync {...props} />;
                    }).catch((err) => {
                        props.serverError = err;
                        // start over after a few seconds
                        setTimeout(() => {
                            let params = {
                                address: null,
                                activationCode: null
                            };
                            route.replace(route.name, params);
                        }, 10000);
                        return <StartPageSync {...props} />;
                    });
                } else {
                    return ProjectFinder.findProjectLinks(db).then((links) => {
                        props.projectLinks = links;
                        return <StartPageSync {...props} />;
                    });
                }
            }
        } else {
            // handle things normally after we've gained authorization
            if (!add) {
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
                return ProjectFinder.findProjectLinks(db).then((links) => {
                    props.projectLinks = links;
                });
            }).then(() => {
                return <StartPageSync {...props} />;
            });
        }
    }
}

class StartPageSync extends PureComponent {
    static displayName = 'StartPage.Sync';

    constructor(props) {
        super(props);
        if (process.env.PLATFORM === 'browser') {
            this.state = {
                transition: null,
                selectedProjectID: 0,
                oauthErrors: {},
                renderingProjectDialog: false,
                showingProjectDialog: false,
            };
        }
        if (process.env.PLATFORM === 'cordova') {
            this.state = {
                receivedCorrectQRCode: false,
                receivedInvalidQRCode: false,
                scanningQRCode: false,
                enteringManually: false,
                addingServer: false,
                lastError: null,
            };
        }
    }

    /**
     * Return the class of the page that we're targeting--typically the news page
     *
     * @return {ReactClass}
     */
    getTargetPage() {
        let { addingProject } = this.props;
        return (addingProject) ? 'settings-page' : 'news-page';
    }

    /**
     * Initiate transition out from this page
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { database, projects } = this.props;
        let { renderingProjectDialog, selectedProjectID, qrCodeStatus } = this.state;
        if (nextProps.projects !== projects) {
            if (renderingProjectDialog) {
                // close the dialog box if the project has disappeared
                if (!_.some(nextProps.projects, { id: selectedProjectID })) {
                    this.setState({
                        renderingProjectDialog: false,
                        showingProjectDialog: false,
                        selectedProjectID: 0
                    });
                }
            }
        }
        if (qrCodeStatus === 'correct') {
            this.setState({ qrCodeStatus: 'pending' });
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        if (process.env.PLATFORM === 'browser') {
            return this.renderForBrowser();
        }
        if (process.env.PLATFORM === 'cordova') {
            return this.renderForCordova();
        }
    }

    /**
     * Render component (browser)
     *
     * @return {ReactElement}
     */
    renderForBrowser() {
        let { env, system } = this.props;
        let { transition } = this.state;
        let { t } = env.locale;
        let style;
        if (system) {
            let resources = _.get(system, 'details.resources');
            let backgroundImage = _.find(resources, { type: 'image' });
            if (backgroundImage) {
                let imageURL = env.getImageURL(backgroundImage, { width: 1024, quality: 40 });
                style = { backgroundImage: `url(${imageURL})` };
            }
        }
        let className = 'start-page browser';
        if (transition) {
            className += ` ${transition}`;
        }
        return (
            <div className={className} style={style}>
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
        let { database } = this.props;
        let { transition, addingServer } = this.state;
        let className = 'start-page cordova';
        if (transition) {
            className += ` ${transition}`;
            if (transition === 'transition-out-slow') {
                // render a greeting during long transition
                return (
                    <div className={className}>
                        {this.renderMobileGreeting()}
                    </div>
                );
            } else {
                return (
                    <div className={className} />
                );
            }
        }
        if (!database.authorized || addingServer) {
            // render only instructions for gaining access
            return (
                <div className={className}>
                    {this.renderTitle()}
                    {this.renderActivationControls()}
                    {this.renderAvailableServers()}
                </div>
            );
        } else {
            // render project list, followed by activation instructions
            return (
                <div className={className}>
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
        if (!system) {
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
        let { qrCodeStatus } = this.state;
        let { t, p } = env.locale;
        let className = 'welcome';
        if (qrCodeStatus === 'correct') {
            let name;
            if (user) {
                name = UserUtils.getDisplayName(currentUser);
                className += ' user';
            } else {
                name = '\u00a0';
            }
            let imageProps = {
                user: user,
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
        if (!database.unauthorized) {
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
                    {
                        _.map(servers, (server, i) => {
                            return this.renderOAuthButton(server, i);
                        })
                    }
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
        let { type } = server;
        let { title } = server.details;
        let { t, p } = env.locale;
        let icon = getServerIcon(type);
        let url = database.getOAuthURL(server);
        let props = {
            className: 'oauth-button',
            href: url,
            onClick: this.handleOAuthButtonClick,
            'data-type': type,
        };
        let error = oauthErrors[type];
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
                        {p(title) || t(`server-type-${type}`)}
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
        if (process.env.PLATFORM == 'browser') {
            return (
                <div className="section buttons">
                    <h2>{projects ? t('start-projects') : ''}</h2>
                    <Scrollable>
                        {this.renderEmptyMessage()}
                        {
                            _.map(projects, (project, index) => {
                                return this.renderProjectButton(project, index);
                            })
                        }
                    </Scrollable>
                </div>
            );
        }
        if (process.env.PLATFORM === 'cordova') {
            return (
                <div className="projects">
                    {this.renderEmptyMessage()}
                    {
                        _.map(projects, (project, index) => {
                            return this.renderProjectButton(project, index);
                        })
                    }
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
        let { env, route, projectLinks, currentUser, adding } = this.props;
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

        let linkProps = {
            'data-project-id': project.id,
            className: 'project-button'
        };
        let skipDialog = false;
        // always show dialog box when adding
        if (!adding) {
            skipDialog = _.some(projectLinks, {
                address: route.context.address,
                schema: project.name,
            });
        }
        if (skipDialog) {
            // link to the project's news or settings page
            linkProps.href = route.find(this.getTargetPage(), {}, {
                schema: project.name
            });
        } else {
            // add handler for bringing up dialog box
            linkProps.onClick = this.handleProjectButtonClick;
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
            hidden: !databae.authorized,
            onClick: this.handleReturnClick,
        };
        return (
            <div className="other-servers">
                <h2 className="title">{t('start-activation-others-servers')}</h2>
                <ul>
                {
                    _.map(servers, (address, i) => {
                        return this.renderServerLink(address, i);
                    })
                }
                </ul>
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
        let { route } = this.props;
        let params = {
            address: server,
            add: route.params.add
        };
        let url = route.find('start-page', params);
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
        let { database, route, env, projects, currentUser } = this.props;
        let {
            showingProjectDialog,
            renderingProjectDialog,
            selectedProjectID,
        } = this.state;
        if (!renderingProjectDialog) {
            return null;
        }
        let selectedProject = _.find(projects, { id: selectedProjectID });
        if (!selectedProject) {
            return null;
        }
        let dialogProps = {
            show: showingProjectDialog,
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
     * Transition out from this page
     */
    transitionOut(route) {
        let { projectLinks } = this.props;
        let speed = 'fast';
        let duration = 1300;
        let params = route.context;
        // determine whether the user has seen the project before
        let newProject = !_.some(projectLinks, {
            address: route.context.address,
            schema: route.context.schema,
        });
        if (newProject) {
            // show welcome message when we're heading to a new project
            speed = 'slow';
            duration = 3700;
        }
        this.setState({ transition: `transition-out-${speed}` }, () => {
            // TODO
            /*
            setTimeout(() => {
                // tell parent component that we don't need to render
                // the page anymore
                if (this.props.onExit) {
                    this.props.onExit({
                        type: 'exit',
                        target: this,
                    });
                }
            }, duration);
            */
        });
    }

    /**
     * Open a popup window to OAuth provider
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    openPopUpWindow(url) {
        if (process.env.PLATFORM !== 'browser') return;
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
        let url = evt.currentTarget.getAttribute('href');
        let provider = evt.currentTarget.getAttribute('data-type');
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            let db = database.use({ by: this });
            return db.checkAuthorization().then((authorized) => {
                console.log('Authorized:', authorized);
            }).catch((err) => {
                let oauthErrors = _.clone(oauthErrors);
                oauthErrors[provider] = err;
                this.setState({ oauthErrors });
            });
        });
    }

    /**
     * Called when user clicks on a project of which he's not a member
     *
     * @param  {Event} evt
     */
    handleProjectButtonClick = (evt) => {
        let projectID = parseInt(evt.currentTarget.getAttribute('data-project-id'));
        this.setState({
            selectedProjectID: projectID,
            showingProjectDialog: true,
            renderingProjectDialog: true,
        });
    }

    /**
     * Called when user chooses to join a project
     *
     * @param  {Event} evt
     */
    handleMembershipRequestConfirm = (evt) => {
        let { database, currentUser } = this.props;
        let { selectedProjectID } = this.state;
        if (!_.include(currentUser.requested_project_ids, selectedProjectID)) {
            let db = database.use({ schema: 'global', by: this });
            let userAfter = _.clone(currentUser);
            userAfter.requested_project_ids = _.concat(userAfter.requested_project_ids, selectedProjectID);
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
        let { selectedProjectID } = this.state;
        if (_.includes(currentUser.requested_project_ids, selectedProjectID)) {
            let userAfter = _.clone(currentUser);
            userAfter.requested_project_ids = _.without(userAfter.requested_project_ids, selectedProjectID);
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
        this.setState({ showingProjectDialog: false });
        setTimeout(() => {
            this.setState({ renderingProjectDialog: false });
        }, 500);
    }

    /**
     * Called when user clicks the proceed button
     *
     * @param  {Event} evt
     */
    handleMembershipRequestProceed = (evt) => {
        let { route, projects } = this.props;
        let { selectedProjectID } = this.state;
        this.setState({ showingProjectDialog: false, renderingProjectDialog: false });
        let project = _.find(projects, { id: selectedProjectID });
        let page = this.getTargetPage();
        route.push(page, {}, { schema: project.name });
    }

    /**
     * Render QR scanner dialog box if we're scanning a QR code
     *
     * @return {ReactElement|null}
     */
    renderQRScannerDialogBox() {
        let { env, serverError } = this.props;
        let { scanningQRCode, qrCodeStatus } = this.state;
        let { t } = env.locale;
        let props = {
            show: scanningQRCode,
            status: qrCodeStatus,
            serverError,
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
        let { enteringManually } = this.state;
        let { t } = env.locale;
        let props = {
            show: enteringManually,
            env,
            onCancel: this.handleActivationCancel,
            onConfirm: this.handleActivationConfirm,
        };
        return (
            <ActivationDialogBox {...props} />
        );
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
        this.setState({ scanningQRCode: false });
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
        let { route } = this.props;
        if (this.invalidCodeTimeout) {
            clearTimeout(this.invalidCodeTimeout);
        }
        // see if the URL is a valid activation link
        let url = UniversalLink.parse(evt.result);
        let match = (link) ? route.match(url) : null;
        if (match && match.params.activationCode) {
            this.setState({ qrCodeStatus: 'correct' })
            route.change(url);
        } else {
            this.setState({ qrCodeStatus: 'invalid' });
            this.invalidCodeTimeout = setTimeout(() => {
                this.setState({ qrCodeStatus: 'pending' })
            }, 5000);
        }
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
        let { route } = this.props;
        this.handleActivationCancel();
        // redirect to start page, now with server address, schema, as well as
        // the activation code
        let params = {
            cors: true,
            address: evt.address,
            schema: evt.schema,
            activationCode: evt.code,
        };
        route.push('start-page', params);
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
        return cordova.platformID;
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
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onEntry: PropTypes.func,
        onExit: PropTypes.func,
        onAvailableSchemas: PropTypes.func,
    };
    StartPageSync.propTypes = {
        currentUser: PropTypes.object,
        system: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),
        projectLinks: PropTypes.arrayOf(PropTypes.object),
        serverError: PropTypes.instanceOf(Error),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onEntry: PropTypes.func,
        onExit: PropTypes.func,
        onAvailableSchemas: PropTypes.func,
    };
}

var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var HTTPRequest = require('transport/http-request');
var Memoize = require('utils/memoize');
var UniversalLink = require('routing/universal-link');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Scrollable = require('widgets/scrollable');
var PushButton = require('widgets/push-button');
var ProfileImage = require('widgets/profile-image');
var MembershipRequestDialogBox = require('dialogs/membership-request-dialog-box');
var QRScannerDialogBox = (process.env.PLATFORM === 'cordova') ? require('dialogs/qr-scanner-dialog-box') : null;
var ActivationDialogBox = (process.env.PLATFORM === 'cordova') ? require('dialogs/activation-dialog-box') : null;

require('./start-page.scss');

var StartPage = module.exports = Relaks.createClass({
    displayName: 'StartPage',
    propTypes: {
        canAccessServer: PropTypes.bool,
        canAccessSchema: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onEntry: PropTypes.func,
        onExit: PropTypes.func,
        onAvailableSchemas: PropTypes.func,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/:extra?'
            ], (params) => {
                if (_.trimEnd(params.extra, '/')) {
                    // there's extra stuff--not a match
                    return null;
                }
                return {
                    add: !!query.add,
                    activationCode: query.ac,
                    schema: query.p,
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/`, query = {}, hash;
            if (params) {
                if (params.add) {
                    query.add = 1;
                }
                if (params.activationCode) {
                    query.ac = params.activationCode;
                }
                if (params.schema) {
                    query.p = params.schema;
                }
            }
            return { path, query, hash };
        },

        /**
         * Return configuration info for global UI elements
         *
         * @param  {Route} currentRoute
         *
         * @return {Object}
         */
        configureUI: function(currentRoute) {
            return {
                navigation: {
                    top: false,
                    bottom: false,
                },
            };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
        var props = {
            currentUser: null,
            system: null,
            servers: null,
            projects: null,
            projectLinks: null,
            canAccessServer: this.props.canAccessServer,
            canAccessSchema: this.props.canAccessSchema,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onEntry: this.props.onEntry,
            onExit: this.props.onExit,
            onAvailableSchemas: this.props.onAvailableSchemas,
        };
        if (!this.props.canAccessServer) {
            if (process.env.PLATFORM === 'browser') {
                // start authorization process--will receive system description
                // and list of OAuth providers along with links
                meanwhile.show(<StartPageSync {...props} />, delay);
                return db.beginSession('client').then((info) => {
                    props.system = info.system;
                    props.servers = info.servers;
                    return <StartPageSync {...props} />;
                });
            }
            if (process.env.PLATFORM === 'cordova') {
                if (params.address && params.activationCode) {
                    meanwhile.show(<StartPageSync {...props} />);
                    return db.acquireMobileSession(params.activationCode).catch((err) => {
                        props.error = err;
                        // start over after a few seconds
                        setTimeout(() => {
                            var params = {
                                cors: false,
                                address: null,
                                schema: null,
                                activationCode: null
                            };
                            this.props.route.replace(StartPage, params);
                        }, 5000);
                    }).then((userId) => {
                        // create entry in device table
                        var device = {
                            type: getDeviceType(),
                            uuid: getDeviceUUID(),
                            details: getDeviceDetails(),
                            user_id: userId,
                            session_handle: _.toLower(params.activationCode),
                        };
                        return db.saveOne({ table: 'device' }, device);
                    }).then((device) => {
                        // if no error was encounted, an onAuthorization event
                        // should have caused rendering at this point
                        // with props.canAccessServer = true
                        return <StartPageSync {...props} />;
                    });
                } else {
                    return <StartPageSync {...props} />;
                }
            }
        } else {
            // handle things normally after we've gained authorization
            //
            // keep showing what was there before until we've retrieved
            // (delay = undefined)
            meanwhile.show(<StartPageSync {...props} />);
            return db.start().then((userId) => {
                // load current user
                var criteria = {
                    id: userId
                };
                return db.findOne({ table: 'user', criteria });
            }).then((user) => {
                props.currentUser = user;
            }).then(() => {
                // load system info
                var criteria = {};
                return db.findOne({ table: 'system', criteria, required: true });
            }).then((system) => {
                props.system = system;
                return meanwhile.show(<StartPageSync {...props} />);
            }).then(() => {
                // load projects
                var criteria = {
                    archived: false
                };
                return db.find({ table: 'project', criteria });
            }).then((projects) => {
                props.projects = projects;
                return meanwhile.show(<StartPageSync {...props} />);
            }).then(() => {
                // load project links from local schema
                var criteria = {};
                return db.find({ schema: 'local', table: 'project_link', criteria });
            }).then((links) => {
                props.projectLinks = links;
                return <StartPageSync {...props} />;
            });
        }
    },
});

var StartPageSync = module.exports.Sync = React.createClass({
    displayName: 'StartPage.Sync',
    propTypes: {
        currentUser: PropTypes.object,
        system: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),
        projectLinks: PropTypes.arrayOf(PropTypes.object),
        canAccessServer: PropTypes.bool,
        canAccessSchema: PropTypes.bool,
        error: PropTypes.instanceOf(Error),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onEntry: PropTypes.func,
        onExit: PropTypes.func,
        onAvailableSchemas: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        if (process.env.PLATFORM === 'browser') {
            return {
                transition: null,
                selectedProjectId: 0,
                oauthErrors: {},
            };
        }
        if (process.env.PLATFORM === 'cordova') {
            return {
                receivedCorrectQRCode: false,
                receivedInvalidQRCode: false,
                scanningQRCode: false,
                enteringManually: false,
                addingServer: false,
                lastError: null,
            };
        }
    },

    /**
     * Return true if current user is a member of the project
     *
     * @param  {Project} project
     *
     * @return {Boolean}
     */
    isMember: function(project) {
        var currentUser = this.props.currentUser;
        if (currentUser) {
            return _.includes(project.user_ids, currentUser.id);
        } else {
            return false;
        }
    },

    /**
     * Return true if current user has requested project membership
     *
     * @param  {Project} project
     *
     * @return {Boolean}
     */
    isPendingMember: function(project) {
        var currentUser = this.props.currentUser;
        if (currentUser) {
            return _.includes(currentUser.requested_project_ids, project.id);
        } else {
            return false;
        }
    },

    /**
     * Return true if current user has read access to project
     *
     * @param  {Project} project
     *
     * @return {Boolean}
     */
    hasReadAccess: function(project) {
        if (this.isMember(project)) {
            return true;
        } else {
            if (this.props.currentUser.type === 'admin') {
                return true;
            } else {
                return _.get(project, 'settings.access_control.grant_view_access');
            }
        }
        return false;
    },

    /**
     * Return the class of the page that we're targeting--typically the news page
     *
     * @return {ReactClass}
     */
    getTargetPage: function() {
        if (this.props.route.parameters.add) {
            return require('pages/settings-page');
        } else {
            return require('pages/news-page');
        }
    },

    /**
     * Initiate transition out from this page
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        // begin transition out of page if user has gain access
        if (this.props.route !== nextProps.route
         || this.props.canAccessServer !== nextProps.canAccessServer
         || this.props.canAccessSchema !== nextProps.canAccessSchema) {
             if (nextProps.route.component !== StartPage) {
                 // this page isn't the target--transition out if we have
                 // access to the server and the schema
                 if (nextProps.canAccessSchema && nextProps.canAccessServer) {
                     this.transitionOut(nextProps.route);
                 }
             }
             if (process.env.PLATFORM === 'cordova') {
                 if (nextProps.canAccessServer) {
                     var route = nextProps.route;
                     var params = route.parameters;
                     if (params.activationCode) {
                         // we have gain access--redirect to news page if schema
                         // was supplied or to this page again
                         params = _.omit(params, 'activationCode');
                         if (params.schema) {
                             route.replace(require('pages/news-page'), params);
                         } else {
                             route.replace(require('pages/start-page'), params);
                         }
                     }
                 }
             }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        if (process.env.PLATFORM === 'browser') {
            return this.renderForBrowser();
        }
        if (process.env.PLATFORM === 'cordova') {
            return this.renderForCordova();
        }
    },

    /**
     * Render component (browser)
     *
     * @return {ReactElement}
     */
    renderForBrowser: function() {
        if (process.env.PLATFORM !== 'browser') return;
        var t = this.props.locale.translate;
        var style;
        if (this.props.system) {
            var resources = _.get(this.props.system, 'details.resources');
            var backgroundImage = _.find(resources, { type: 'image' });
            if (backgroundImage) {
                var imageURL = this.props.theme.getImageURL(backgroundImage, { width: 1024, quality: 40 });
                style = { backgroundImage: `url(${imageURL})` };
            }
        }
        var className = 'start-page browser';
        if (this.state.transition) {
            className += ` ${this.state.transition}`;
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
    },

    /**
     * Render component (Cordova)
     *
     * @return {ReactElement}
     */
    renderForCordova: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var className = 'start-page cordova';
        if (this.state.transition) {
            className += ` ${this.state.transition}`;
        }
        if (!this.props.canAccessServer) {
            // render only instructions for gaining access
            return (
                <div className={className}>
                    {this.renderTitle()}
                    {this.renderActivationControls()}
                </div>
            );
        } else {
            if (this.state.transition) {
                if (this.state.transition === 'transition-out-slow') {
                    // render a greeting during long transition
                    return (
                        <div className={className}>
                            {this.renderMobileGreeting()}
                        </div>
                    );
                } else {
                    //
                    return (
                        <div className={className} />
                    );
                }
            } else {
                if (this.state.addingServer) {
                    // render project list, followed by activation instructions
                    return (
                        <div className={className}>
                            {this.renderTitle()}
                            {this.renderProjectButtons()}
                            {this.renderActivationControls()}
                        </div>
                    );
                } else {
                    return (
                        <div className={className}>
                            {this.renderTitle()}
                            {this.renderProjectButtons()}
                            {this.renderActivationSelector()}
                        </div>
                    );
                }
            }
        }
    },

    /**
     * Render text describing the system
     *
     * @return {ReactElement|null}
     */
    renderDescription: function() {
        if (process.env.PLATFORM !== 'browser') return;
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var system = this.props.system;
        if (!system) {
            return null;
        }
        var title = p(system.details.title) || t('start-system-title-default');
        var description = p(system.details.description);
        return (
            <div className="section description">
                <h2>{title}</h2>
                <Scrollable>
                    <p>{description}</p>
                </Scrollable>
            </div>
        );
    },

    /**
     * Render either the name of the system the user has logged into or the
     * app name
     *
     * @return {ReactElement|null}
     */
    renderTitle: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var t = this.props.locale.translate;
        var title;
        if (this.props.canAccessServer) {
            // show the name of the
            var p = this.props.locale.pick;
            var system = this.props.system;
            if (system) {
                title = p(system.details.title) || t('start-system-title-default');
            }
        } else {
            title = t('app-name');
        }
        return <h2 className="title">{title}</h2>;
    },

    /**
     * Render welcome
     *
     * @return {ReactElement|null}
     */
    renderMobileGreeting: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var t = this.props.locale.translate;
        var n = this.props.locale.name;
        var name;
        var user = this.props.currentUser;
        if (user) {
            name = n(user.details.name, user.details.gender);
        }
        var imageProps = {
            user: user,
            size: 'large',
            theme: this.props.theme,
        };
        return (
            <div className="welcome">
                <h3>{t('start-welcome-again')}</h3>
                <ProfileImage {...imageProps} />
                <h4>{name}</h4>
            </div>
        );
    },

    /**
     * Render instructions plus buttons
     *
     * @return {ReactElement}
     */
    renderActivationControls: function() {
        return (
            <div>
                {this.renderActivationInstructions()}
                {this.renderActivationButtons()}
                {this.renderQRScannerDialogBox()}
                {this.renderActivationDialogBox()}
            </div>
        );
    },

    /**
     * Render instructions for gaining access on mobile device
     *
     * @return {ReactElement}
     */
    renderActivationInstructions: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var t = this.props.locale.translate;
        return (
            <div className="activation-instructions">
                {t('start-activation-instructions')}
            </div>
        );
    },

    /**
     * Render buttons for scanning QR code or manual entry of session info
     *
     * @return {ReactElement}
     */
    renderActivationButtons: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var t = this.props.locale.translate;
        var manualProps = {
            label: t('start-activation-manual'),
            onClick: this.handleManualClick,
        };
        var scanProps = {
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
    },

    /**
     * Render button for adding new server
     *
     * @return {ReactElement}
     */
    renderActivationSelector: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var t = this.props.locale.translate;
        var addProps = {
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
    },

    /**
     * Render list of buttons, either OAuth providers or available projects
     *
     * @return {ReactElement|null}
     */
    renderChoices: function() {
        if (process.env.PLATFORM !== 'browser') return;
        if (!this.props.canAccessServer) {
            return this.renderOAuthButtons();
        } else {
            return this.renderProjectButtons();
        }
    },

    /**
     * Render OAuth buttons
     *
     * @return {ReactElement|null}
     */
    renderOAuthButtons: function() {
        if (process.env.PLATFORM !== 'browser') return;
        var t = this.props.locale.translate;
        var servers = this.props.servers;
        if (!servers) {
            return null;
        }
        return (
            <div className="section buttons">
                <h2>{t('start-social-login')}</h2>
                <Scrollable>
                    <p>{_.map(servers, this.renderOAuthButton)}</p>
                </Scrollable>
            </div>
        );
    },

    /**
     * Render a button for logging in through OAuth
     *
     * @param  {Object} server
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderOAuthButton: function(server, i) {
        if (process.env.PLATFORM !== 'browser') return;
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(server.details.title) || t(`server-type-${server.type}`);
        var icon = getServerIcon(server.type);
        var url = this.props.database.getOAuthURL(server);
        var props = {
            className: 'oauth-button',
            href: url,
            onClick: this.handleOAuthButtonClick,
            'data-type': server.type,
        };
        var error = this.state.oauthErrors[server.type];
        if (error) {
            var t = this.props.locale.translate;
            var text = t(`start-error-${error.reason}`);
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
                    <span className="label">{name}</span>
                </a>
            );
        }
    },

    /**
     * Render project buttons
     *
     * @return {ReactElement}
     */
    renderProjectButtons: function() {
        var t = this.props.locale.translate;
        var projects = sortProject(this.props.projects, this.props.locale);
        if (!projects) {
            return null;
        }
        if (process.env.PLATFORM == 'browser') {
            return (
                <div className="section buttons">
                    <h2>{t('start-projects')}</h2>
                    <Scrollable>
                        {_.map(projects, this.renderProjectButton)}
                    </Scrollable>
                </div>
            );
        }
        if (process.env.PLATFORM === 'cordova') {
            return (
                <div className="projects">
                    {_.map(projects, this.renderProjectButton)}
                </div>
            );
        }
    },

    /**
     * Render a project button
     *
     * @return {ReactElement}
     */
    renderProjectButton: function(project, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(project.details.title) || project.name;
        var description = p(project.details.description);

        // project picture
        var icon;
        var resources = _.get(project, 'details.resources');
        var projectImage = _.find(resources, { type: 'image' });
        if (projectImage) {
            var imageURL = this.props.theme.getImageURL(projectImage, { width: 56, height: 56 });
            icon = <img src={imageURL} />;
        } else {
            // use logo, with alternating background color
            var Logo = require('trambar-logo.svg');
            var num = (project.id % 5) + 1;
            icon = <div className={`default v${num}`}><Logo /></div>;
        }

        // add badge to indicate membership status
        var badge;
        if (this.isMember(project)) {
            // is member
            badge = <i className="fa fa-user-circle-o badge" />;
        } else if (this.isPendingMember(project)) {
            // pending
            badge = <i className="fa fa-clock-o badge" />;
        }

        var props = {
            'data-project-id': project.id,
            className: 'project-button'
        };
        if (this.hasReadAccess(project)) {
            // link to the project's news page
            props.href = this.props.route.find(this.getTargetPage(), { schema: project.name });
        } else {
            // add handler for requesting access
            // (or just show the project info if user has joined already)
            //
            // the backend won't send projects that the user can't join
            props.onClick = this.handleProjectButtonClick;
        }

        return (
            <a key={project.id} {...props}>
                <div className="icon">{icon}</div>
                <div className="text">
                    {badge}
                    <div className="title">
                        {name}
                    </div>
                    <div className="description">
                        <div className="contents">
                            {description}
                            <div className="ellipsis">
                                <i className="fa fa-ellipsis-h" />
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        );
    },

    /**
     * Render dialog box for joining a project
     *
     * @return {ReactElement|null}
     */
    renderProjectDialog: function() {
        if (!this.state.renderingProjectDialog) {
            return null;
        }
        var selectedProject = _.find(this.props.projects, { id: this.state.selectedProjectId });
        if (!selectedProject) {
            return null;
        }
        var dialogProps = {
            show: this.state.showingProjectDialog,
            currentUser: this.props.currentUser,
            project: selectedProject,
            member: this.isMember(selectedProject),
            pendingMember: this.isPendingMember(selectedProject),
            readAccess: this.hasReadAccess(selectedProject),

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onConfirm: this.handleMembershipRequestConfirm,
            onClose: this.handleMembershipRequestClose,
            onProceed: this.handleMembershipRequestProceed,
        };
        return <MembershipRequestDialogBox {...dialogProps} />;
    },

    /**
     * Check for changes to props
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        // let parent component know what projects the current user
        // can access upon receiving a new list of projects
        if (prevProps.projects !== this.props.projects
         || prevProps.currentUser !== this.props.currentUser) {
            var accessible = _.filter(this.props.projects, (project) => {
                return this.hasReadAccess(project)
            });
            if (!_.isEmpty(accessible)) {
                if (this.props.onAvailableSchemas) {
                    this.props.onAvailableSchemas({
                        type: 'availableschemas',
                        target: this,
                        schemas: _.map(accessible, 'name'),
                    });
                }
            }
        }
    },

    /**
     * Inform parent component that the page has mount
     */
    componentDidMount: function() {
        if (this.props.onEntry) {
            this.props.onEntry({
                type: 'entry',
                target: this,
            });
        }
    },

    /**
     * Transition out from this page
     */
    transitionOut: function(route) {
        var speed = 'fast';
        var duration = 1300;
        var params = route.parameters;
        // determine whether the user has seen the project before
        var newProject = !_.some(this.props.projectLinks, {
            address: params.address,
            schema: params.schema,
        });
        if (newProject) {
            // show welcome message when we're heading to a new project
            speed = 'slow';
            duration = 3700;
        }
        this.setState({ transition: `transition-out-${speed}` }, () => {
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
        });
    },

    /**
     * Open a popup window to OAuth provider
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    openPopUpWindow: function(url) {
        if (process.env.PLATFORM !== 'browser') return;
        return new Promise((resolve, reject) => {
            var width = 800;
            var height = 600;
            var options = {
                width,
                height,
                left: window.screenLeft + Math.round((window.outerWidth - width) / 2),
                top: window.screenTop + Math.round((window.outerHeight - height) / 2),
                toolbar: 'no',
                menubar: 'no',
                status: 'no',
            };
            var pairs = _.map(options, (value, name) => {
                return `${name}=${value}`;
            });
            var win = window.open(url, 'login', pairs.join(','));
            if (win) {
                win.location = url;
                var interval = setInterval(() => {
                    if (win.closed) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            } else {
                reject(new Error('Unable to open popup'))
            }
        });
    },

    /**
     * Called when user clicks on one of the OAuth buttons
     *
     * @param  {Event} evt
     */
    handleOAuthButtonClick: function(evt) {
        if (process.env.PLATFORM !== 'browser') return;
        var url = evt.currentTarget.getAttribute('href');
        var provider = evt.currentTarget.getAttribute('data-type');
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            var db = this.props.database.use({ by: this });
            return db.checkSession().catch((err) => {
                var oauthErrors = _.clone(this.state.oauthErrors);
                oauthErrors[provider] = err;
                this.setState({ oauthErrors });
            });
        });
    },

    /**
     * Called when user clicks on a project of which he's not a member
     *
     * @param  {Event} evt
     */
    handleProjectButtonClick: function(evt) {
        var projectId = parseInt(evt.currentTarget.getAttribute('data-project-id'));
        this.setState({
            selectedProjectId: projectId,
            showingProjectDialog: true,
            renderingProjectDialog: true,
        });
    },

    /**
     * Called when user clicks the confirm button in the project dialog box
     *
     * @param  {Event} evt
     */
    handleMembershipRequestConfirm: function(evt) {
        var projectId = this.state.selectedProjectId;
        var project = _.find(this.props.projects, { id: projectId });
        var projectIds = this.props.currentUser.requested_project_ids;
        var newUserProps = {
            id: this.props.currentUser.id,
            requested_project_ids: _.union(projectIds, [ projectId ])
        };
        var route = this.props.route;
        var db = this.props.database.use({ by: this });
        return db.saveOne({ schema: 'global', table: 'user' }, newUserProps);
    },

    /**
     * Called when user clicks outside the project dialog box or the cancel button
     *
     * @param  {Event} evt
     */
    handleMembershipRequestClose: function(evt) {
        this.setState({ showingProjectDialog: false });
        setTimeout(() => {
            this.setState({ renderingProjectDialog: false });
        }, 500);
    },

    /**
     * Called when user clicks the proceed button
     *
     * @param  {Event} evt
     */
    handleMembershipRequestProceed: function(evt) {
        this.setState({ showingProjectDialog: false, renderingProjectDialog: false });

        var projectId = this.state.selectedProjectId;
        var project = _.find(this.props.projects, { id: projectId });
        this.props.route.push(this.getTargetPage(), { schema: project.name });
    },

    /**
     * Render QR scanner dialog box if we're scanning a QR code
     *
     * @return {ReactElement|null}
     */
    renderQRScannerDialogBox: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var t = this.props.locale.translate;
        var props = {
            show: this.state.scanningQRCode,
            found: this.state.receivedCorrectQRCode,
            invalid: this.state.receivedInvalidQRCode,
            locale: this.props.locale,
            onCancel: this.handleCancelScan,
            onResult: this.handleScanResult,
        };
        return (
            <QRScannerDialogBox {...props}>
                {t('start-activation-instructions')}
            </QRScannerDialogBox>
        );
    },

    /**
     * Render QR scanner dialog box if we're scanning a QR code
     *
     * @return {ReactElement|null}
     */
    renderActivationDialogBox: function() {
        if (process.env.PLATFORM !== 'cordova') return;
        var t = this.props.locale.translate;
        var props = {
            show: this.state.enteringManually,
            locale: this.props.locale,
            theme: this.props.theme,
            onCancel: this.handleActivationCancel,
            onConfirm: this.handleActivationConfirm,
        };
        return (
            <ActivationDialogBox {...props} />
        );
    },

    /**
     * Called when user clicks scan button
     *
     * @param  {Event} evt
     */
    handleScanClick: function(evt) {
        if (process.env.PLATFORM !== 'cordova') return;
        this.setState({ scanningQRCode: true, receivedInvalidQRCode: false });
    },

    /**
     * Called when user clicks manual button
     *
     * @param  {Event} evt
     */
    handleManualClick: function(evt) {
        this.setState({ enteringManually: true });
    },

    /**
     * Called when user clicks add server button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        this.setState({ addingServer: true });
    },

    /**
     * Called when user cancel scanning
     *
     * @param  {Object} evt
     */
    handleCancelScan: function(evt) {
        if (process.env.PLATFORM !== 'cordova') return;
        this.setState({ scanningQRCode: false });
        if (this.invalidCodeTimeout) {
            clearTimeout(this.invalidCodeTimeout);
        }
    },

    /**
     * Called when user has successful scanned a code
     *
     * @param  {Object} evt
     */
    handleScanResult: function(evt) {
        if (process.env.PLATFORM !== 'cordova') return;
        if (this.invalidCodeTimeout) {
            clearTimeout(this.invalidCodeTimeout);
        }
        // see if the URL is a valid activation link
        var link = UniversalLink.parse(evt.result);
        var params = (link) ? StartPage.parseURL(link.path, link.query, link.hash) : null;
        if (params && params.activationCode) {
            this.setState({ receivedCorrectQRCode: true, receivedInvalidQRCode: false })
            this.props.route.change(link.url);
        } else {
            this.setState({ receivedCorrectQRCode: false, receivedInvalidQRCode: true });
            this.invalidCodeTimeout = setTimeout(() => {
                this.setState({ receivedInvalidQRCode: false })
            }, 5000);
        }
    },

    /**
     * Called when user closes the activation dialog box
     *
     * @param  {Object} evt
     */
    handleActivationCancel: function(evt) {
        this.setState({ enteringManually: false });
    },

    /**
     * Called when user clicks OK in the activation dialog box
     *
     * @param  {Object} evt
     */
    handleActivationConfirm: function(evt) {
        this.handleActivationCancel();
        // redirect to start page, now with server address, schema, as well as
        // the activation code
        var params = {
            cors: true,
            address: evt.address,
            schema: evt.schema,
            activationCode: evt.code,
        };
        this.props.route.push(StartPage, params);
    },
});

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}

var sortProject = Memoize(function(projects, locale) {
    var p = locale.pick;
    return _.sortBy(projects, (project) => {
        return p(project.details.title) || project.name;
    });
});

if (process.env.PLATFORM === 'cordova') {
    /**
     * Return the device OS
     *
     * @return {String}
     */
    var getDeviceType = function() {
        var device = window.device;
        if (device) {
            switch (device.type) {
                case 'Android': return 'android';
                case 'iOS': return 'ios';
                case 'WinCE':
                case 'Win32NT': return 'windows';
                case 'Mac OS X': return 'osx';
            }
        }
        if (process.env.NODE_ENV !== 'production') {
            return 'android';
        }
        return 'unknown';
    }

    /**
     * Return device unique id
     *
     * @return {String}
     */
    var getDeviceUUID = function() {
        var device = window.device;
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
    var getDeviceDetails = function() {
        var device = window.device;
        if (device) {
            return {
                manufacturer: _.capitalize(device.manufacturer),
                name: device.model,
            };
        }
        if (process.env.NODE_ENV !== 'production') {
            return {
                manufacturer: 'Apricot',
                name: 'Apricot oPhone 5',
            };
        }
        return {};
    }
}

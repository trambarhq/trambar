const BROWSER = process.env.PLATFORM === 'browser';
const CORDOVA = process.env.PLATFORM === 'cordova';

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
var MembershipRequestDialogBox = require('dialogs/membership-request-dialog-box');
var QRScannerDialogBox = (!CORDOVA) ? null : require('dialogs/qr-scanner-dialog-box');

require('./start-page.scss');

module.exports = Relaks.createClass({
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
            if (params && params.add) {
                query.add = 1;
            } else if (params && params.activationCode) {
                query.ac = params.activationCode;
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
        var db = this.props.database.use({ schema: 'global', by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
        var props = {
            currentUser: null,
            system: null,
            providers: null,
            projects: null,
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
            // start authorization process--will receive system description
            // and list of OAuth providers along with links
            meanwhile.show(<StartPageSync {...props} />, delay);
            return db.beginAuthorization('client').then((info) => {
                props.system = info.system;
                props.providers = info.providers;
                return <StartPageSync {...props} />;
            });
        } else {
            // handle things normally after we've gained authorization
            //
            // keep showing what was there before until we've retrieved the
            // system object (delay = undefined)
            meanwhile.show(<StartPageSync {...props} />);
            var currentUserId;
            return db.start().then((userId) => {
                // load the current user later
                currentUserId = userId;

                // load system info
                var criteria = {};
                return db.findOne({ table: 'system', criteria, required: true });
            }).then((system) => {
                props.system = system;
                return meanwhile.show(<StartPageSync {...props} />, 250);
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
                // load current user
                var criteria = {
                    id: currentUserId
                };
                return db.findOne({ table: 'user', criteria });
            }).then((user) => {
                props.currentUser = user;
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
        providers: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),
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

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        if (BROWSER) {
            return {
                transition: null,
                selectedProjectId: 0,
                newProjectNames: [],
                errors: {},
            };
        } else if (CORDOVA) {
            return {
                receivedInvalidQRCode: false,
                scanningQRCode: false,
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

    render: function() {
        if (BROWSER) {
            return this.renderForBrowser();
        } else if (CORDOVA) {
            return this.renderForCordova();
        }
    },

    /**
     * Render component (browser)
     *
     * @return {ReactElement}
     */
    renderForBrowser: (!BROWSER) ? null : function() {
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
        var className = 'start-page';
        if (this.state.transition) {
            className += ` ${this.state.transition}`;
        }
        return (
            <div className={className} style={style}>
                <div className="bar">
                    <h1 className="welcome">{t('start-welcome')}</h1>
                    <div className="content-area">
                        {this.renderDescription()}
                        {this.renderButtons()}
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
    renderForCordova: (!CORDOVA) ? null : function() {
        return (
            <div className="start-page">
                <div>
                    <h1>Start Page!</h1>
                    <button onClick={this.handleScanClick}>Scan</button>
                </div>
                {this.renderQRScannerDialogBox()}
            </div>
        );
    },


    /**
     * Render text describing the system
     *
     * @return {ReactElement|null}
     */
    renderDescription: (!BROWSER) ? null : function() {
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
     * Render list of buttons, either OAuth providers or available projects
     *
     * @return {ReactElement|null}
     */
    renderButtons: (!BROWSER) ? null : function() {
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
    renderOAuthButtons: (!BROWSER) ? null : function() {
        var t = this.props.locale.translate;
        var providers = this.props.providers;
        if (!providers) {
            return null;
        }
        return (
            <div className="section buttons">
                <h2>{t('start-social-login')}</h2>
                <p>{_.map(providers, this.renderOAuthButton)}</p>
            </div>
        );
    },

    /**
     * Render a button for logging in through OAuth
     *
     * @param  {Object} provider
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderOAuthButton: (!BROWSER) ? null : function(provider, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(provider.details.title) || t(`server-type-${provider.type}`);
        var icon = getServerIcon(provider.type);
        var props = {
            className: 'oauth-button',
            href: provider.url,
            onClick: this.handleOAuthButtonClick,
            'data-type': provider.type,
        };
        var error = this.state.errors[provider.type];
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
        return (
            <div className="section buttons">
                <h2>{t('start-projects')}</h2>
                <Scrollable>
                    {_.map(projects, this.renderProjectButton)}
                </Scrollable>
            </div>
        );
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
                        type: 'available_schema',
                        target: this,
                        schemas: _.map(accessible, 'name'),
                    });
                }
            }
        }

        // begin transition out of page if user has gain access
        if (prevProps.route !== this.props.route
         || prevProps.canAccessServer !== this.props.canAccessServer
         || prevProps.canAccessSchema !== this.props.canAccessSchema) {
             if (this.props.route.component !== module.exports) {
                 // this page isn't the target--transition out if we have
                 // access to the server and the schema
                 if (this.props.canAccessSchema && this.props.canAccessServer) {
                     this.transitionOut();
                 }
             }
        }
    },

    componentDidMount: function() {
        if (this.props.onEntry) {
            this.props.onEntry({
                type: 'entry',
                target: this,
            });
        }
    },

    transitionOut: function() {
        var speed = 'fast';
        var duration = 1300;
        var schema = this.props.route.parameters.schema;
        if (_.includes(this.state.newProjectNames, schema)) {
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
    openPopUpWindow: (!BROWSER) ? null : function(url) {
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
    handleOAuthButtonClick: (!BROWSER) ? null : function(evt) {
        var url = evt.currentTarget.getAttribute('href');
        var provider = evt.currentTarget.getAttribute('data-type');
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            var db = this.props.database.use({ by: this });
            return db.checkAuthorizationStatus().catch((err) => {
                var errors = _.clone(this.state.errors);
                errors[provider] = err;
                this.setState({ errors });
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
        return db.saveOne({ schema: 'global', table: 'user' }, newUserProps).then(() => {
            // remember that we have just joined this project
            var newProjectNames = _.union(this.state.newProjectNames, [ project.name ]);
            this.setState({ newProjectNames });
        });
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
    renderQRScannerDialogBox: (!CORDOVA) ? null : function() {
        if (this.props.activating) {
            return null
        }
        var props = {
            show: this.state.scanningQRCode,
            invalid: this.state.receivedInvalidQRCode,
            locale: this.props.locale,
            onCancel: this.handleCancelScan,
            onResult: this.handleScanResult,
        };
        return (
            <QRScannerDialogBox {...props}>
                {'This is a test'}
            </QRScannerDialogBox>
        );
    },

    /**
     * Called when user click scan button
     *
     * @param  {Event} evt
     */
    handleScanClick: (!CORDOVA) ? null : function(evt) {
        this.setState({ scanningQRCode: true, receivedInvalidQRCode: false });
    },

    /**
     * Called when user cancel scanning
     *
     * @param  {Object} evt
     */
    handleCancelScan: (!CORDOVA) ? null : function(evt) {
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
    handleScanResult: (!CORDOVA) ? null : function(evt) {
        if (this.invalidCodeTimeout) {
            clearTimeout(this.invalidCodeTimeout);
        }
        // see if the URL is a valid activation link
        var link = UniversalLink.parse(evt.result);
        var StartPage = require('pages/start-page');
        debugger;
        var params = (link) ? StartPage.parseURL(link.path, link.query, link.hash) : null;
        if (params && params.activationCode) {
            this.props.route.change(link.url);
        } else {
            this.setState({ receivedInvalidQRCode: true });
            this.invalidCodeTimeout = setTimeout(() => {
                this.setState({ receivedInvalidQRCode: false })
            }, 5000);
        }
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

var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var HttpRequest = require('transport/http-request');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Scrollable = require('widgets/scrollable');
var MembershipRequestDialogBox = require('dialogs/membership-request-dialog-box');

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
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('//:server/start/?', url)
                || Route.match('/start/?', url);
        },

        getUrl: function(params) {
            var server = params.server;
            var url = '/start/';
            if (server) {
                url = '//${server}' + url;
            }
            return url;
        },
    },

    getInitialState: function() {
        return {
            system: null,
            providers: null,
            authentication: null,
        };
    },

    renderAsync: function(meanwhile) {
        var route = this.props.route;
        var server = route.parameters.server;
        var schema = 'global';
        var db = this.props.database.use({ server, schema, by: this });
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
            onOAuthEnd: this.handleOAuthEnd,
        };
        if (!this.props.canAccessServer) {
            // start authorization process--will receive system description
            // and list of OAuth providers along with links
            meanwhile.show(<StartPageSync {...props} />, 250);
            return db.beginAuthorization('client').then((info) => {
                props.system = info.system;
                props.providers = info.providers;
                return <StartPageSync {...props} />;
            });
        } else {
            // handle things normally after we've gained authorization
            //
            // keep showing what was there before until we've retrieved the
            // system object
            meanwhile.show(<StartPageSync {...props} />);
            var userId;
            return db.start().then((currentUserId) => {
                // load the current user later
                userId = currentUserId;

                // load system info
                var criteria = {};
                return db.findOne({ table: 'system', criteria });
            }).then((system) => {
                props.system = system;
                meanwhile.show(<StartPageSync {...props} />, 250);
            }).then(() => {
                // load projects
                var criteria = {};
                return db.find({ table: 'project', criteria });
            }).then((projects) => {
                props.projects = projects;
                meanwhile.show(<StartPageSync {...props} />);
            }).then(() => {
                // load current user
                var criteria = {
                    id: userId
                };
                return db.findOne({ table: 'user', criteria });
            }).then((user) => {
                props.currentUser = user;
                return <StartPageSync {...props} />;
            });
        }
    },

    /**
     * Retrieve authorization object from server
     */
    handleOAuthEnd: function() {
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ server, by: this });
        db.checkAuthorizationStatus();
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
    },

    getInitialState: function() {
        return {
            transition: null,
            selectedProjectId: 0,
            newProjectIds: [],
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.route !== nextProps.route
         || this.props.canAccessServer !== nextProps.canAccessServer
         || this.props.canAccessSchema !== nextProps.canAccessSchema) {
             if (nextProps.route.component !== module.exports) {
                 if (nextProps.canAccessServer && nextProps.canAccessSchema) {
                     this.transitionOut();
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
        var t = this.props.locale.translate;
        var style;
        if (this.props.system) {
            var resources = _.get(this.props.system, 'details.resources');
            var backgroundImage = _.find(resources, { type: 'image' });
            if (backgroundImage) {
                var imageUrl = this.props.theme.getImageUrl(backgroundImage, { width: 1024, quality: 40 });
                style = { backgroundImage: `url(${imageUrl})` };
            }
        }
        var classNames = [ 'start-page' ];
        if (this.state.transition) {
            classNames.push(this.state.transition);
        }
        return (
            <div className={classNames.join(' ')} style={style}>
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
     * Render text describing the system
     *
     * @return {ReactElement|null}
     */
    renderDescription: function() {
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
                <p>{description}</p>
            </div>
        );
    },

    /**
     * Render list of buttons, either OAuth providers or available projects
     *
     * @return {ReactElement|null}
     */
    renderButtons: function() {
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
    renderOAuthButton: function(provider, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(provider.details.title) || t(`server-type-${provider.type}`);
        var icon = getServerIcon(provider.type);
        return (
            <a key={i} className="oauth-button" href={provider.url} onClick={this.handleOAuthButtonClick}>
                <i className={`fa fa-fw fa-${icon}`}></i>
                <span className="label">
                    {name}
                </span>
            </a>
        );
    },

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
            var imageUrl = this.props.theme.getImageUrl(projectImage, { width: 56, height: 56 });
            icon = <img src={imageUrl} />;
        } else {
            // use logo, with alternating background color
            var Logo = require('trambar-logo.svg');
            var num = (project.id % 5) + 1;
            icon = <div className={`default v${num}`}><Logo /></div>;
        }

        // add badge to indicate membership status
        var isMember = false;
        var isPendingMember = false;
        var currentUser = this.props.currentUser;
        if (currentUser) {
            isMember = _.includes(project.user_ids, currentUser.id);
            isPendingMember = _.includes(currentUser.requested_project_ids, project.id);
        }
        var badge;
        if (isMember) {
            // is member
            badge = <i className="fa fa-user-circle-o badge" />;
        } else if (isPendingMember) {
            // pending
            badge = <i className="fa fa-clock-o badge" />;
        }

        var props = {
            key: i,
            'data-project-id': project.id,
            className: 'project-button'
        };
        var viewable = false;
        if (isMember) {
            viewable = true;
        } else if (isPendingMember) {
            // see if the project is read-only for pending member
            var ac = _.get(project.settings, 'access_control', {});
            if (currentUser.type === 'member') {
                viewable = ac.grant_team_members_read_only;
            } else if (currentUser.approved) {
                viewable = ac.grant_approved_users_read_only;
            } else {
                viewable = ac.grant_unapproved_users_read_only;
            }
        }
        if (viewable) {
            // link to the project's news page
            props.href = require('pages/news-page').getUrl({
                server: this.props.route.parameters.server,
                schema: project.name,
            });
        } else {
            // add handler for requesting access
            // (or just show the project info if user has joined already)
            //
            // the backend won't send projects that don't have
            // settings.membership.allow_request = true
            props.onClick = this.handleProjectButtonClick;
        }

        return (
            <a {...props}>
                <div className="icon">{icon}</div>
                <div className="text">
                    {badge}
                    <div className="title">
                        {name}
                    </div>
                    <div className="description">
                        <div className="contents">
                            {description}
                            <div className="ellipsis">...</div>
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
        if (_.some(this.state.newProjects, { name: schema })) {
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
     * Signal to parent component that the OAuth login process has ended
     */
    triggerOAuthEndEvent: function() {
        if (this.props.onOAuthEnd) {
            this.props.onOAuthEnd({
                type: 'oauthended',
                target: this,
            })
        }
    },

    /**
     * Called when user clicks on one of the OAuth buttons
     *
     * @param  {Event} evt
     */
    handleOAuthButtonClick: function(evt) {
        var url = evt.currentTarget.getAttribute('href');
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            this.triggerOAuthEndEvent();
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
        var projectIds = this.props.currentUser.requested_project_ids;
        var newUserProps = {
            id: this.props.currentUser.id,
            requested_project_ids: _.union(projectIds, [ projectId ])
        };
        var route = this.props.route;
        var server = route.parameters.server;
        var db = this.props.database.use({ server, by: this });
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

        var url = require('pages/news-page').getUrl({
            server: this.props.route.parameters.server,
            schema: this.state.selectProject.name,
        });
        this.props.route.change(url);
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

function sortProject(projects, locale) {
    var p = locale.pick;
    return _.sortBy(projects, (project) => {
        return p(project.details.title) || project.name;
    });
}

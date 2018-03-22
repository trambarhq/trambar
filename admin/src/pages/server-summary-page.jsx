var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');
var RoleFinder = require('objects/finders/role-finder');
var ServerFinder = require('objects/finders/server-finder');
var ServerTypes = require('objects/types/server-types');
var ServerSettings = require('objects/settings/server-settings');
var SystemFinder = require('objects/finders/system-finder');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var SlugGenerator = require('utils/slug-generator');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var CollapsibleContainer = require('widgets/collapsible-container');
var TaskList = require('widgets/task-list');
var InputError = require('widgets/input-error');
var ActionConfirmation = require('widgets/action-confirmation');
var DataLossWarning = require('widgets/data-loss-warning');

require('./server-summary-page.scss');

module.exports = Relaks.createClass({
    displayName: 'ServerSummaryPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
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
                '/servers/:server/?'
            ], (params) => {
                return {
                    server: (params.server === 'new') ? 'new' : Route.parseId(params.server),
                    edit: !!query.edit,
                    task: Route.parseId(hash, /T(\d+)/i),
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
            var path = `/servers/${params.server}/`, query, hash;
            if (params.edit) {
                query = { edit: 1 };
            }
            if (params.task) {
                hash = `T${params.task}`;
            }
            return { path, query, hash };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        // don't wait for remote data unless the route changes
        var freshRoute = (meanwhile.prior.props.route !== this.props.route);
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', blocking: freshRoute, by: this });
        var props = {
            system: null,
            server: null,
            roles: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ServerSummaryPageSync {...props} />, 250);
        return db.start().then((userId) => {
            return SystemFinder.findSystem(db).then((system) => {
                props.system = system;
            });
        }).then(() => {
            if (params.server !== 'new') {
                return ServerFinder.findServer(db, params.server).then((server) => {
                    props.server = server;
                });
            }
        }).then(() => {
            meanwhile.show(<ServerSummaryPageSync {...props} />, 250);
            return RoleFinder.findActiveRoles(db).then((roles) => {
                props.roles = roles;
            });
        }).then(() => {
            return <ServerSummaryPageSync {...props} />;
        });
    }
});

var ServerSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'ServerSummaryPage.Sync',
    propTypes: {
        system: PropTypes.object,
        server: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        return {
            newServer: null,
            hasChanges: false,
            saving: false,
            adding: false,
            credentialsChanged: false,
            problems: {},
        };
    },

    /**
     * Return edited copy of server object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getServer: function(state) {
        if (this.isEditing() && (!state || state === 'current')) {
            return this.state.newServer || this.props.server || emptyServer;
        } else {
            return this.props.server || emptyServer;
        }
    },

    /**
     * Return a property of the server object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getServerProperty: function(path, state) {
        var server = this.getServer(state);
        return _.get(server, path);
    },

    /**
     * Modify a property of the server object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setServerProperty: function(path, value) {
        var server = this.getServer();
        var newServer = _.decoupleSet(server, path, value);
        if (path === 'type') {
            // derive title from type
            var t = this.props.locale.translate;
            var p = this.props.locale.pick;
            var autoTitleBefore = t(`server-type-${server.type}`);
            var autoTitleAfter = t(`server-type-${newServer.type}`);
            var title = p(server.details.title);
            if (!title || title === autoTitleBefore) {
                var lang = this.props.locale.languageCode;
                newServer = _.decoupleSet(newServer, `details.title.${lang}`, autoTitleAfter);
            }
        }
        if (path === 'details.title' || path === 'type') {
            // derive name from title
            var autoNameBefore = SlugGenerator.fromTitle(server.details.title);
            var autoNameAfter = SlugGenerator.fromTitle(newServer.details.title);
            if (!server.name || server.name === autoNameBefore) {
                newServer.name = autoNameAfter;
            }
        }
        if (path === 'settings.user.type') {
            if (!value) {
                newServer = _.decoupleSet(newServer, 'settings.user.role_ids', undefined);
            }
        }
        if(_.size(newServer.name) > 128) {
            newServer.name = newServer.name.substr(0, 128);
        }
        var hasChanges = true;
        if (_.isEqual(newServer, this.props.server)) {
            newServer = null;
            hasChanges = false;
        }
        this.setState({ newServer, hasChanges });
    },

    /**
     * Look for problems in server object
     *
     * @return {Object}
     */
    findProblems: function() {
        var problems = {};
        var server = this.getServer();
        if (!server.name) {
            problems.name = 'validation-required';
        }
        if (!server.type) {
            problems.type = 'validation-required';
        }
        var oauth = server.settings.oauth;
        if (oauth) {
            if (oauth.client_id && !oauth.client_secret) {
                problems.client_secret = 'validation-required';
            }
            if (!oauth.client_id && oauth.client_secret) {
                problems.client_id = 'validation-required';
            }
            if ((oauth.client_id || oauth.client_secret) && !oauth.base_url) {
                if (server.type === 'gitlab') {
                    problems.base_url = 'validation-required';
                }
            }
        }
        return problems;
    },

    /**
     * Return true when the URL indicate we're creating a new user
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isCreating: function(props) {
        props = props || this.props;
        return (props.route.parameters.server === 'new');
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isEditing: function(props) {
        props = props || this.props;
        return this.isCreating(props) || props.route.parameters.edit;
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object}  newServer
     *
     * @return {Promise}
     */
    setEditability: function(edit, newServer) {
        if (this.isCreating() && !edit && !newServer) {
            // return to list when cancelling server creation
            return this.returnToList();
        } else {
            var route = this.props.route;
            var params = _.clone(route.parameters);
            params.edit = edit;
            if (newServer) {
                // use id of newly created server
                params.server = newServer.id;
            }
            return route.replace(module.exports, params).then((replaced) => {
                if (replaced) {
                    this.setState({ problems: {} });
                }
            });
        }
    },

    /**
     * Return to repo list
     *
     * @return {Promise}
     */
    returnToList: function() {
        var route = this.props.route;
        return route.push(require('pages/server-list-page'));
    },

    /**
     * Start creating a new role
     *
     * @return {Promise}
     */
    startNew: function() {
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.server = 'new';
        return route.replace(module.exports, params);
    },

    /**
     * Return list of language codes
     *
     * @return {Array<String>}
     */
    getInputLanguages: function() {
        return _.get(this.props.system, 'settings.input_languages', [])
    },

    /**
     * Reset edit state when edit starts
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            this.setState({
                newServer: null,
                hasChanges: false,
            });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var server = this.getServer();
        var title = p(_.get(server, 'details.title'));
        if (!title && server.type) {
            title = t(`server-type-${server.type}`);
        }
        return (
            <div className="server-summary-page">
                {this.renderButtons()}
                <h2>{t('server-summary-member-$name', title)}</h2>
                {this.renderForm()}
                {this.renderInstructions()}
                {this.renderTaskList()}
                <ActionConfirmation ref={this.components.setters.confirmation} locale={this.props.locale} theme={this.props.theme} />
                <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
            </div>
        );
    },

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        if (this.isEditing()) {
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('server-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('server-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            var server = this.getServer();
            var active = !server.deleted && !server.disabled;
            var hasIntegration = _.includes(ServerTypes.integrated, server.type);
            var hasAccessToken = !!_.get(server, 'settings.api.access_token');
            var hasOAuthCredentials = !!(_.get(server, 'settings.oauth.client_id') && _.get(server, 'settings.oauth.client_secret'));
            var credentialsChanged = this.state.credentialsChanged;
            var preselected, alert;
            if (active) {
                if (hasIntegration && !hasAccessToken) {
                    preselected = 'acquire';
                    alert = true;
                } else if (hasOAuthCredentials && credentialsChanged) {
                    preselected = 'test';
                } else {
                    preselected = (this.state.adding) ? 'add' : 'return';
                }
            } else {
                preselected = 'reactivate';
            }
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected} alert={alert}>
                        <option name="return" onClick={this.handleReturnClick}>
                            {t('server-summary-return')}
                        </option>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('server-summary-add')}
                        </option>
                        <option name="acquire" disabled={!active || !hasIntegration} separator onClick={this.handleAcquireClick}>
                            {t('server-summary-acquire')}
                        </option>
                        <option name="test" disabled={!active || !hasOAuthCredentials} onClick={this.handleTestClick}>
                            {t('server-summary-test-oauth')}
                        </option>
                        <option name="disable" disabled={!active} separator onClick={this.handleDisableClick}>
                            {t('server-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={this.handleDeleteClick}>
                            {t('server-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={this.handleReactivateClick}>
                            {t('server-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
                        {t('server-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    },

    /**
     * Render form for entering server details
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        return (
            <div className="form">
                {this.renderTypeSelector()}
                {this.renderTitleInput()}
                {this.renderNameInput()}
                {this.renderUserOptions()}
                {this.renderRoleSelector()}
                {this.renderOAuthCallbackURL()}
                {this.renderPrivacyPolicyURL()}
                {this.renderGitlabURLInput()}
                {this.renderOAuthClientIdInput()}
                {this.renderOAuthClientSecretInput()}
                {this.renderAPIStatus()}
            </div>
        );
    },

    /**
     * Render type selector
     *
     * @return {ReactElement}
     */
    renderTypeSelector: function() {
        var t = this.props.locale.translate;
        var typeCurr = this.getServerProperty('type', 'current');
        var typePrev = this.getServerProperty('type', 'original');
        var optionProps = _.map(ServerTypes, (type) => {
            var icon = getServerIcon(type);
            return {
                name: type,
                selected: typeCurr === type,
                previous: typePrev === type,
                children: [
                    <i className={`fa fa-${icon} fa-fw`} key={0}/>,
                    ' ',
                    t(`server-type-${type}`)
                ],
            };
        });
        var listProps = {
            onOptionClick: this.handleTypeOptionClick,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        return (
            <OptionList {...listProps}>
                <label>
                    {t('server-summary-type')}
                    <InputError>{t(problems.type)}</InputError>
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    },

    /**
     * Render title input
     *
     * @return {ReactElement}
     */
    renderTitleInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'title',
            value: this.getServerProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly: !this.isEditing(),
        };
        return (
            <MultilingualTextField {...props}>
                {t('server-summary-title')}
            </MultilingualTextField>
        );
    },

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'name',
            value: this.getServerProperty('name'),
            locale: this.props.locale,
            onChange: this.handleNameChange,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        return (
            <TextField {...props}>
                {t('server-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    },

    /**
     * Render user creation options
     *
     * @return {ReactElement}
     */
    renderUserOptions: function() {
        var serverType = this.getServerProperty('type');
        switch (serverType) {
            case 'gitlab': return this.renderGitlabUserOptions();
            default: return this.renderOAuthUserOptions();
        }
    },

    /**
     * Render user creation options for Gitlab
     *
     * @return {ReactElement}
     */
    renderGitlabUserOptions: function() {
        var t = this.props.locale.translate;
        var userOptsCurr = this.getServerProperty('settings.user', 'current') || {};
        var userOptsPrev = this.getServerProperty('settings.user', 'original') || {};
        var newServer = !!this.getServerProperty('id');
        var optionProps = [
            {
                name: 'import-admin-disabled',
                selected: !_.get(userOptsCurr, 'mapping.admin'),
                previous: (newServer) ? !_.get(userOptsPrev, 'mapping.admin') : undefined,
                children: t('server-summary-user-import-gitlab-admin-disabled')
            },
            {
                name: 'import-admin-as-admin',
                selected: _.get(userOptsCurr, 'mapping.admin') === 'admin',
                previous: _.get(userOptsPrev, 'mapping.admin') === 'admin',
                children: <span>{t('server-summary-gitlab-admin')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-admin`)}</span>
            },
            {
                name: 'import-admin-as-moderator',
                selected: _.get(userOptsCurr, 'mapping.admin') === 'moderator',
                previous: _.get(userOptsPrev, 'mapping.admin') === 'moderator',
                children: <span>{t('server-summary-gitlab-admin')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-moderator`)}</span>
            },
            {
                name: 'import-admin-as-regular-user',
                selected: _.get(userOptsCurr, 'mapping.admin') === 'regular',
                previous: _.get(userOptsPrev, 'mapping.admin') === 'regular',
                children: <span>{t('server-summary-gitlab-admin')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-regular`)}</span>
            },
            {
                name: 'import-user-disabled',
                selected: !_.get(userOptsCurr, 'mapping.user'),
                previous: (newServer) ? !_.get(userOptsPrev, 'mapping.user') : undefined,
                children: t('server-summary-user-import-gitlab-user-disabled')
            },
            {
                name: 'import-user-as-moderator',
                selected: _.get(userOptsCurr, 'mapping.user') === 'moderator',
                previous: _.get(userOptsPrev, 'mapping.user') === 'moderator',
                children: <span>{t('server-summary-gitlab-regular-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-moderator`)}</span>
            },
            {
                name: 'import-user-as-regular-user',
                selected: _.get(userOptsCurr, 'mapping.user') === 'regular',
                previous: _.get(userOptsPrev, 'mapping.user') === 'regular',
                children: <span>{t('server-summary-gitlab-regular-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-regular`)}</span>
            },
            {
                name: 'import-user-as-guest',
                selected: _.get(userOptsCurr, 'mapping.user') === 'guest',
                previous: _.get(userOptsPrev, 'mapping.user') === 'guest',
                children: <span>{t('server-summary-gitlab-regular-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-guest`)}</span>
            },
            {
                name: 'import-external-user-disabled',
                selected: !_.get(userOptsCurr, 'mapping.external_user'),
                previous: (newServer) ? !_.get(userOptsPrev, 'mapping.external_user') : undefined,
                children: t('server-summary-user-import-gitlab-external-user-disabled')
            },
            {
                name: 'import-external-user-as-regular-user',
                selected: _.get(userOptsCurr, 'mapping.external_user') === 'regular',
                previous: _.get(userOptsPrev, 'mapping.external_user') === 'regular',
                children: <span>{t('server-summary-gitlab-external-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-regular`)}</span>
            },
            {
                name: 'import-external-user-as-guest',
                selected: _.get(userOptsCurr, 'mapping.external_user') === 'guest',
                previous: _.get(userOptsPrev, 'mapping.external_user') === 'guest',
                children: <span>{t('server-summary-gitlab-external-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-guest`)}</span>
            },
        ];
        var listProps = {
            onOptionClick: this.handleGitlabUserOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('server-summary-new-users')}
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    },

    /**
     * Render user creation options for basic OAuth provider
     *
     * @return {ReactElement}
     */
    renderOAuthUserOptions: function() {
        var t = this.props.locale.translate;
        var userOptsCurr = this.getServerProperty('settings.user', 'current') || {};
        var userOptsPrev = this.getServerProperty('settings.user', 'original') || {};
        var newServer = !!this.getServerProperty('id');
        var optionProps = [
            {
                name: 'import-disabled',
                selected: !userOptsCurr.type,
                previous: (newServer) ? !userOptsPrev.type : undefined,
                children: t('server-summary-user-import-disabled')
            },
            {
                name: 'import-user-as-guest',
                selected: userOptsCurr.type === 'guest',
                previous: userOptsPrev.type === 'guest',
                children: <span>{t('server-summary-new-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-guest`)}</span>
            },
            {
                name: 'import-user-as-regular-user',
                selected: userOptsCurr.type === 'regular',
                previous: userOptsPrev.type === 'regular',
                children: <span>{t('server-summary-new-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-regular`)}</span>
            },
        ];
        var listProps = {
            onOptionClick: this.handleOAuthUserOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('server-summary-new-users')}
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    },

    /**
     * Render role selector
     *
     * @return {ReactElement}
     */
    renderRoleSelector: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var userRolesCurr = this.getServerProperty('settings.user.role_ids', 'current') || [];
        var userRolesPrev = this.getServerProperty('settings.user.role_ids', 'original') || [];
        var newServer = !!this.getServerProperty('id');
        var roles = sortRoles(this.props.roles, this.props.locale);
        var optionProps = _.concat({
            name: 'none',
            selected: _.isEmpty(userRolesCurr),
            previous: (newServer) ? _.isEmpty(userRolesPrev) : undefined,
            children: t('server-summary-role-none')
        }, _.map(roles, (role) => {
            var name = p(role.details.title) || p.name;
            return {
                name: String(role.id),
                selected: _.includes(userRolesCurr, role.id),
                previous: _.includes(userRolesPrev, role.id),
                children: <span>{t('server-summary-new-user')} <i className="fa fa-arrow-right" /> {name}</span>
            };
        }));
        var listProps = {
            onOptionClick: this.handleRoleOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>{t('server-summary-roles')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        )
    },

    /**
     * Render read-only input for OAuth callback URL
     *
     * @return {[type]}
     */
    renderOAuthCallbackURL: function() {
        var t = this.props.locale.translate;
        var serverType = this.getServerProperty('type');
        var url, warning;
        var address = _.get(this.props.system, 'settings.address');
        var warning;
        if (!address) {
            warning = t('server-summary-system-address-missing');
            address = window.location.origin;
        }
        switch (serverType) {
            case 'facebook':
                url = address;
                break;
            default:
                if (serverType) {
                    url = `${address}/srv/session/${serverType}/callback/`;
                }
        }
        var props = {
            id: 'oauth_callback',
            value: url,
            locale: this.props.locale,
            readOnly: true,
        };
        var problems = this.state.problems;
        var phrase = 'server-summary-oauth-callback-url';
        switch (this.getServerProperty('type')) {
            case 'dropbox':
                phrase = 'server-summary-oauth-redirect-uri';
                break;
            case 'facebook':
                phrase = 'server-summary-oauth-site-url';
                break;
            case 'github':
                phrase = 'server-summary-oauth-callback-url';
                break;
            case 'gitlab':
                phrase = 'server-summary-oauth-callback-url';
                break;
            case 'google':
                phrase = 'server-summary-oauth-redirect-uri';
                break;
            case 'windows':
                phrase = 'server-summary-oauth-redirect-url';
                break;
        }
        return (
            <TextField {...props}>
                {t(phrase)}
                <InputError type="warning">{warning}</InputError>
            </TextField>
        );
    },

    /**
     * Render read-only input for OAuth callback URL
     *
     * @return {[type]}
     */
    renderPrivacyPolicyURL: function() {
        var t = this.props.locale.translate;
        var serverType = this.getServerProperty('type');
        var needed = [ 'facebook', 'google', 'windows' ];
        if (!_.includes(needed, serverType)) {
            return null;
        }
        var warning;
        var address = _.get(this.props.system, 'settings.address');
        var warning;
        if (!address) {
            warning = t('server-summary-system-address-missing');
            address = window.location.origin;
        }
        var url = `${address}/srv/session/privacy/`;
        var props = {
            id: 'oauth_privacy',
            value: url,
            locale: this.props.locale,
            readOnly: true,
        };
        return (
            <TextField {...props}>
                {t('server-summary-privacy-policy-url')}
                <InputError type="warning">{warning}</InputError>
            </TextField>
        );
    },

    /**
     * Render input for OAuth base URL (Gitlab only)
     *
     * @return {ReactElement}
     */
    renderGitlabURLInput: function() {
        var t = this.props.locale.translate;
        var serverType = this.getServerProperty('type');
        var props = {
            id: 'oauth_token',
            value: this.getServerProperty('settings.oauth.base_url'),
            locale: this.props.locale,
            onChange: this.handleOAuthURLChange,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        return (
            <CollapsibleContainer open={serverType === 'gitlab'}>
                <TextField {...props}>
                    {t('server-summary-oauth-gitlab-url')}
                    <InputError>{t(problems.base_url)}</InputError>
                </TextField>
            </CollapsibleContainer>
        );
    },

    /**
     * Render input for OAuth client id
     *
     * @return {ReactElement}
     */
    renderOAuthClientIdInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'oauth_id',
            value: this.getServerProperty('settings.oauth.client_id'),
            locale: this.props.locale,
            onChange: this.handleOAuthIdChange,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        var phrase = 'server-summary-oauth-client-id';
        switch (this.getServerProperty('type')) {
            case 'dropbox':
                phrase = 'server-summary-oauth-app-key';
                break;
            case 'facebook':
                phrase = 'server-summary-oauth-app-id';
                break;
            case 'github':
                phrase = 'server-summary-oauth-client-id';
                break;
            case 'gitlab':
                phrase = 'server-summary-oauth-application-id';
                break;
            case 'google':
                phrase = 'server-summary-oauth-client-id';
                break;
            case 'windows':
                phrase = 'server-summary-oauth-application-id';
                break;
        }
        return (
            <TextField {...props}>
                {t(phrase)}
                <InputError>{t(problems.client_id)}</InputError>
            </TextField>
        );
    },

    /**
     * Render input for OAuth client secret
     *
     * @return {ReactElement}
     */
    renderOAuthClientSecretInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'oauth_secret',
            value: this.getServerProperty('settings.oauth.client_secret'),
            locale: this.props.locale,
            onChange: this.handleOAuthSecretChange,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        var phrase = 'server-summary-oauth-client-secret';
        switch (this.getServerProperty('type')) {
            case 'dropbox':
                phrase = 'server-summary-oauth-app-secret';
                break;
            case 'facebook':
                phrase = 'server-summary-oauth-app-secret';
                break;
            case 'github':
                phrase = 'server-summary-oauth-client-secret';
                break;
            case 'gitlab':
                phrase = 'server-summary-oauth-application-secret';
                break;
            case 'google':
                phrase = 'server-summary-oauth-client-secret';
                break;
            case 'windows':
                phrase = 'server-summary-oauth-application-secret';
                break;
        }
        return (
            <TextField {...props}>
                {t(phrase)}
                <InputError>{t(problems.client_secret)}</InputError>
            </TextField>
        );
    },

    /**
     * Render API integration status
     *
     * @return {ReactElement}
     */
    renderAPIStatus: function() {
        var t = this.props.locale.translate;
        var serverType = this.getServerProperty('type');
        var apiAccess;
        if (_.includes(ServerTypes.integrated, serverType)) {
            var token = this.getServerProperty('settings.api.access_token');
            if (token) {
                apiAccess = t('server-summary-api-access-acquired');
            } else {
                apiAccess = t('server-summary-api-access-pending');
            }
        } else {
            apiAccess = t('server-summary-api-access-not-applicable');
        }
        var props = {
            id: 'access',
            value: apiAccess,
            locale: this.props.locale,
            readOnly: true
        };
        return (
            <TextField {...props}>
                {t('server-summary-api-access')}
            </TextField>
        );
    },

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions: function() {
        var instructionProps = {
            folder: 'server',
            topic: 'server-summary',
            hidden: !this.isEditing(),
            locale: this.props.locale,
        };
        var serverType = this.getServerProperty('type');
        if (serverType) {
            instructionProps.topic += `-${serverType}`;
        }
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    },

    /**
     * Render task history
     *
     * @return {ReactElement|null}
     */
    renderTaskList: function() {
        if (!this.props.server) {
            return null;
        }
        var t = this.props.locale.translate;
        var params = this.props.route.parameters;
        var historyProps = {
            server: this.props.server,
            selectedTaskId: params.task,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            onSelectionClear: this.handleTaskSelectionClear,
        };
        return (
            <div className="task-history">
                <h2>{t('server-summary-activities')}</h2>
                <TaskList {...historyProps} />
            </div>
        );
    },

    componentDidMount: function() {
        var params = this.props.route.parameters;
        if (params.task) {
            var node = ReactDOM.findDOMNode(this);
            setTimeout(() => {
                node.scrollIntoView(false);
            }, 500);
        }
    },

    /**
     * Save user with new flags
     *
     * @param  {Object} flags
     *
     * @return {Promise<Role>}
     */
    changeFlags: function(flags) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var serverAfter = _.assign({}, this.props.server, flags);
        return db.saveOne({ table: 'server' }, serverAfter);
    },

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleDisableClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('server-summary-confirm-disable');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ disabled: true }).then(() => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user clicks delete button
     *
     * @param  {Event} evt
     */
    handleDeleteClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('server-summary-confirm-delete');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ deleted: true }).then(() => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user clicks reactive button
     *
     * @param  {Event} evt
     */
    handleReactivateClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('server-summary-confirm-reactivate');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ disabled: false, deleted: false });
            }
        });
    },

    /**
     * Open a pop-window to OAuth redirection URL
     *
     * @param  {String} type
     */
    openOAuthPopup: function(type) {
        var db = this.props.database.use({ by: this });
        var server = this.getServer();
        var url = db.getOAuthURL(server, type);

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
        window.open(url, 'api-access-oauth', pairs.join(','));
    },

    /**
     * Called when user clicks on "Acquire API access" button
     *
     * @param  {Event} evt
     */
    handleAcquireClick: function(evt) {
        this.openOAuthPopup('activation');
    },

    /**
     * Called when user clicks on "Test OAuth" button
     *
     * @param  {Event} evt
     */
    handleTestClick: function(evt) {
        this.openOAuthPopup('test');
    },

    /**
     * Called when user click return button
     *
     * @param  {Event} evt
     */
    handleReturnClick: function(evt) {
        return this.returnToList();
    },

    /**
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        return this.startNew();
    },

    /**
     * Called when server clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        return this.setEditability(true);
    },

    /**
     * Called when server clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        return this.setEditability(false);
    },

    /**
     * Called when server clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick: function(evt) {
        if (this.state.saving) {
            return;
        }
        var problems = this.findProblems();
        if (_.some(problems)) {
            this.setState({ problems });
            return;
        }
        var server = this.getServer();
        var oauthBefore = this.getServerProperty('settings.oauth', 'original');
        var oauthAfter = this.getServerProperty('settings.oauth', 'current');
        var credentialsChanged = !_.isEqual(oauthBefore, oauthAfter);
        this.setState({ saving: true, adding: !server.id, credentialsChanged, problems: {} }, () => {
            var db = this.props.database.use({ schema: 'global', by: this });
            return db.start().then((serverId) => {
                return db.saveOne({ table: 'server' }, server).then((server) => {
                    this.setState({ hasChanges: false, saving: false }, () => {
                        return this.setEditability(false, server);
                    });
                    return null;
                });
            }).catch((err) => {
                var problems = {};
                if (err.statusCode === 409) {
                    problems.name = 'validation-duplicate-server-name';
                } else {
                    problems.general = err.message;
                    console.error(err);
                }
                this.setState({ problems, saving: false });
            });
        });
    },

    /**
     * Called when user changes server title
     *
     * @param  {Object} evt
     */
    handleTitleChange: function(evt) {
        this.setServerProperty(`details.title`, evt.target.value);
    },

    /**
     * Called when user changes server name
     *
     * @param  {Object} evt
     */
    handleNameChange: function(evt) {
        var name = _.toLower(evt.target.value).replace(/\W+/g, '');
        this.setServerProperty(`name`, name);
    },

    /**
     * Called when user changes server type
     *
     * @param  {Object} evt
     */
    handleTypeOptionClick: function(evt) {
        this.setServerProperty(`type`, evt.name);
    },

    /**
     * Called when user changes API token
     *
     * @param  {Event} evt
     */
    handleApiTokenChange: function(evt) {
        this.setServerProperty(`settings.api.token`, evt.target.value);
    },

    /**
     * Called when user changes OAuth base URL
     *
     * @param  {Event} evt
     */
    handleOAuthURLChange: function(evt) {
        var url = evt.target.value;
        this.setServerProperty(`settings.oauth.base_url`, url);

        // make sure the URL isn't localhost, which points to the Docker container
        var problems = _.clone(this.state)
        if (/https?:\/\/localhost\b/.test(url)) {
            problems.base_url = 'validation-localhost-is-wrong';
        } else {
            delete problems.base_url;
        }
        this.setState({ problems })
    },

    /**
     * Called when user changes OAuth client id
     *
     * @param  {Event} evt
     */
    handleOAuthIdChange: function(evt) {
        this.setServerProperty(`settings.oauth.client_id`, evt.target.value);
    },

    /**
     * Called when user changes OAuth client secret
     *
     * @param  {Event} evt
     */
    handleOAuthSecretChange: function(evt) {
        this.setServerProperty(`settings.oauth.client_secret`, evt.target.value);
    },

    /**
     * Called when user clicks one of the user options
     *
     * @param  {Object} evt
     */
    handleGitlabUserOptionClick: function(evt) {
        var mapping = this.getServerProperty('settings.user.mapping') || {};
        switch (evt.name) {
            case 'import-admin-disabled':
                mapping.admin = undefined;
                break;
            case 'import-admin-as-regular-user':
                mapping.admin = (mapping.admin !== 'regular') ? 'regular' : undefined;
                break;
            case 'import-admin-as-moderator':
                mapping.admin = (mapping.admin !== 'moderator') ? 'moderator' : undefined;
                break;
            case 'import-admin-as-admin':
                mapping.admin = (mapping.admin !== 'admin') ? 'admin' : undefined;
                break;
            case 'import-user-disabled':
                mapping.user = undefined;
                break;
            case 'import-user-as-guest':
                mapping.user = (mapping.user !== 'guest') ? 'guest' : undefined;
                break;
            case 'import-user-as-regular-user':
                mapping.user = (mapping.user !== 'regular') ? 'regular' : undefined;
                break;
            case 'import-user-as-moderator':
                mapping.user = (mapping.user !== 'moderator') ? 'moderator' : undefined;
                break;
            case 'import-external-user-disabled':
                mapping.external_user = undefined;
                break;
            case 'import-external-user-as-guest':
                mapping.external_user = (mapping.external_user !== 'guest') ? 'guest' : undefined;
                break;
            case 'import-external-user-as-regular-user':
                mapping.external_user = (mapping.external_user !== 'regular') ? 'regular' : undefined;
                break;
        }
        this.setServerProperty('settings.user.mapping', mapping);
    },

    /**
     * Called when user clicks one of the user options
     *
     * @param  {Object} evt
     */
    handleOAuthUserOptionClick: function(evt) {
        var type = this.getServerProperty('settings.user.type');
        switch (evt.name) {
            case 'import-disabled':
                type = undefined;
                break;
            case 'import-user-as-guest':
                type = (type !== 'guest') ? 'guest' : undefined;
                break;
            case 'import-user-as-regular-user':
                type = (type !== 'regular') ? 'regular' : undefined;
                break;
        }
        this.setServerProperty('settings.user.type', type);
    },

    /**
     * Called when user clicks on a role
     *
     * @param  {Object} evt
     */
    handleRoleOptionClick: function(evt) {
        var server = this.getServer();
        var roleIds = _.slice(_.get(server, 'settings.user.role_ids', []));
        if (evt.name === 'none') {
            roleIds = [];
        } else {
            var roleId = parseInt(evt.name);
            if (_.includes(roleIds, roleId)) {
                _.pull(roleIds, roleId);
            } else {
                roleIds.push(roleId);
            }
        }
        this.setServerProperty('settings.user.role_ids', roleIds);
    },

    /**
     * Called when user has scrolled away from selected task
     */
    handleTaskSelectionClear: function() {
        this.props.route.unanchor();
    },
});

var emptyServer = {
    details: {},
    settings: ServerSettings.default,
};

function renderOption(props, i) {
    return <option key={i} {...props} />;
}

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}

var sortRoles = Memoize(function(roles, locale) {
    var p = locale.pick;
    var name = (role) => {
        return p(role.details.title) || role.name;
    };
    return _.sortBy(roles, name);
});

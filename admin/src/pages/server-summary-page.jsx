var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var SlugGenerator = require('utils/slug-generator');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var CollapsibleContainer = require('widgets/collapsible-container');
var InputError = require('widgets/input-error');
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
         * @param  {String} url
         *
         * @return {Object|null}
         */
        parseUrl: function(url) {
            return Route.match('/servers/:serverId/?', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            var url = `/servers/${params.serverId}/`;
            if (params.edit) {
                url += `?edit=1`;
            }
            return url;
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
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: null,
            server: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ServerSummaryPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            var criteria = {};
            return db.findOne({ table: 'system', criteria });
        }).then((system) => {
            props.system = system;
        }).then(() => {
            var criteria = {
                id: parseInt(this.props.route.parameters.serverId)
            };
            return db.findOne({ table: 'server', criteria });
        }).then((server) => {
            props.server = server;
            return <ServerSummaryPageSync {...props} />;
        });
    }
});

var ServerSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'ServerSummaryPage.Sync',
    propTypes: {
        system: PropTypes.object,
        server: PropTypes.object,

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
        return {
            newServer: null,
            hasChanges: false,
            saving: false,
            problems: {},
        };
    },

    /**
     * Return edited copy of server object or the original object
     *
     * @return {Object}
     */
    getServer: function() {
        if (this.isEditing()) {
            return this.state.newServer || this.props.server || emptyServer;
        } else {
            return this.props.server || emptyServer;
        }
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
                var lang = this.props.locale.lang;
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
            if (oauth.clientID && !oauth.clientSecret) {
                problems.clientSecret = 'validation-required';
            }
            if (!oauth.clientID && oauth.clientSecret) {
                problems.clientID = 'validation-required';
            }
            if ((oauth.clientID || oauth.clientSecret) && !oauth.baseURL) {
                if (server.type === 'gitlab') {
                    problems.baseURL = 'validation-required';
                }
            }
        }
        return problems;
    },


    /**
     * Return server id specified in URL
     *
     * @return {Number}
     */
    getServerId: function() {
        return parseInt(this.props.route.parameters.serverId);
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
        return (props.route.parameters.serverId === 'new');
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
        return this.isCreating(props) || !!parseInt(props.route.query.edit);
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
        var serverId = (newServer) ? newServer.id : this.getServerId();
        var url = (serverId)
                ? require('pages/server-summary-page').getUrl({ serverId, edit })
                : require('pages/server-list-page').getUrl();
        var replace = (serverId) ? true : false;
        return this.props.route.change(url, replace);
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
        } else {
            this.setState({ problems: {} });
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
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('server-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('server-summary-save')}
                    </PushButton>
                    <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
                </div>
            );
        } else {
            var server = this.getServer();
            var canAcquire = hasIntegration(server);
            return (
                <div key="view" className="buttons">
                    <PushButton className="acquire" hidden={!canAcquire} onClick={this.handleAcquireClick}>
                        {t('server-summary-acquire')}
                    </PushButton>
                    {' '}
                    <PushButton className="add" onClick={this.handleEditClick}>
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
        var t = this.props.locale.translate;
        var readOnly = !this.isEditing();
        var server = this.getServer();
        var serverOriginal = this.props.server || emptyServer;
        var inputLanguages = _.get(this.props.system, 'settings.input_languages');
        var problems = this.state.problems;
        var titleProps = {
            id: 'title',
            value: server.details.title,
            availableLanguageCodes: inputLanguages,
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly,
        };
        var nameProps = {
            id: 'name',
            value: server.name,
            locale: this.props.locale,
            onChange: this.handleNameChange,
            readOnly,
        };
        var typeListProps = {
            onOptionClick: this.handleTypeOptionClick,
            readOnly,
        };
        var typeOptionProps = _.map(serverTypes, (type) => {
            var icon = getServerIcon(type);
            return {
                name: type,
                selected: server.type === type,
                previous: serverOriginal.type === type,
                children: [
                    <i className={`fa fa-${icon} fa-fw`} key={0}/>,
                    ' ',
                    t(`server-type-${type}`)
                ],
            };
        });
        var apiAccess;
        if (hasIntegration(server)) {
            if (_.get(server.settings, 'api.access_token')) {
                apiAccess = t('server-summary-api-access-acquired');
            } else {
                apiAccess = t('server-summary-api-access-pending');
            }
        } else {
            apiAccess = t('server-summary-api-access-not-applicable');
        }
        var apiAccessProps = {
            id: 'access',
            value: apiAccess,
            locale: this.props.locale,
            readOnly: true
        };
        var needOAuthUrl = (server.type === 'gitlab');
        var oauthUrlProps = {
            id: 'oauth_token',
            value: _.get(server, 'settings.oauth.baseURL', ''),
            locale: this.props.locale,
            onChange: this.handleOAuthUrlChange,
            readOnly: readOnly,
        };
        var oauthIdProps = {
            id: 'oauth_id',
            value: _.get(server, 'settings.oauth.clientID', ''),
            locale: this.props.locale,
            onChange: this.handleOAuthIdChange,
            readOnly: readOnly,
        };
        var oauthSecretProps = {
            id: 'oauth_secret',
            value: _.get(server, 'settings.oauth.clientSecret', ''),
            locale: this.props.locale,
            onChange: this.handleOAuthSecretChange,
            readOnly: readOnly,
        };
        return (
            <div className="form">
                <MultilingualTextField {...titleProps}>{t('server-summary-title')}</MultilingualTextField>
                <TextField {...nameProps}>
                    {t('server-summary-name')}
                    <InputError>{t(problems.name)}</InputError>
                </TextField>
                <OptionList {...typeListProps}>
                    <label>
                        {t('server-summary-type')}
                        <InputError>{t(problems.type)}</InputError>
                    </label>
                    {_.map(typeOptionProps, renderOption)}
                </OptionList>
                <CollapsibleContainer open={needOAuthUrl}>
                    <TextField {...oauthUrlProps}>
                        {t('server-summary-oauth-url')}
                        <InputError>{t(problems.baseURL)}</InputError>
                    </TextField>
                </CollapsibleContainer>
                <TextField {...oauthIdProps}>
                    {t('server-summary-oauth-id')}
                    <InputError>{t(problems.clientID)}</InputError>
                </TextField>
                <TextField {...oauthSecretProps}>
                    {t('server-summary-oauth-secret')}
                    <InputError>{t(problems.clientSecret)}</InputError>
                </TextField>
                <TextField {...apiAccessProps}>{t('server-summary-api-access')}</TextField>
            </div>
        );
    },

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions: function() {
        var instructionProps = {
            topic: 'server',
            hidden: !this.isEditing(),
            locale: this.props.locale,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
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
        this.setState({ saving: true, problems: {} }, () => {
            var db = this.props.database.use({ schema: 'global', by: this });
            var server = this.getServer();
            return db.start().then((serverId) => {
                return db.saveOne({ table: 'server' }, server).then((server) => {
                    this.setState({ hasChanges: false }, () => {
                        return this.setEditability(false, server);
                    });
                });
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
        var name = _.trim(_.toLower(evt.target.value))
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
    handleOAuthUrlChange: function(evt) {
        this.setServerProperty(`settings.oauth.baseURL`, evt.target.value);
    },

    /**
     * Called when user changes OAuth client id
     *
     * @param  {Event} evt
     */
    handleOAuthIdChange: function(evt) {
        this.setServerProperty(`settings.oauth.clientID`, evt.target.value);
    },

    /**
     * Called when user changes OAuth client secret
     *
     * @param  {Event} evt
     */
    handleOAuthSecretChange: function(evt) {
        this.setServerProperty(`settings.oauth.clientSecret`, evt.target.value);
    },

    /**
     * Called when user clicks on "Acquire API access" button
     *
     * @param  {Event} evt
     */
    handleAcquireClick: function(evt) {
        var db = this.props.database.use({ by: this });
        var server = this.getServer();
        var url = db.getActivationUrl(server);

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
});

var serverTypes = [
    'dropbox',
    'facebook',
    'github',
    'gitlab',
    'google',
];

var integratedServerTypes = [
    'dropbox',
    'gitlab',
    'google',
];

var emptyServer = {
    details: {},
    settings: {},
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

function hasIntegration(server) {
    return _.includes(integratedServerTypes, server.type)
}

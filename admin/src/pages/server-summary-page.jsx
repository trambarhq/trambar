var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var CollapsibleContainer = require('widgets/collapsible-container');
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
            return Route.match('/servers/:serverId/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         * @param  {Object} query
         *
         * @return {String}
         */
        getUrl: function(params, query) {
            var url = `/servers/${params.serverId}/`;
            if (query && query.edit) {
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
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var props = {
            server: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ServerSummaryPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
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
        var hasChanges = true;
        if (_.isEqual(newServer, this.props.server)) {
            newServer = null;
            hasChanges = false;
        }
        this.setState({ newServer, hasChanges });
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
                ? require('pages/server-summary-page').getUrl({ serverId }, { edit })
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
                <div className="buttons">
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
            return (
                <div className="buttons">
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
        var titleProps = {
            id: 'title',
            value: server.details.title,
            locale: this.props.locale,
            onChange: this.handleTitleChange,
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
        var showApiSection = (server.type === 'gitlab');
        var showOAuthSection = true;
        var needOAuthUrl = (server.type === 'gitlab');
        var apiUrlProps = {
            id: 'api_url',
            value: _.get(server, 'details.api.url', ''),
            onChange: this.handleApiUrlChange,
            readOnly: readOnly,
        };
        var apiTokenProps = {
            id: 'api_token',
            value: _.get(server, 'details.api.token', ''),
            onChange: this.handleApiTokenChange,
            readOnly: readOnly,
        };
        var oauthUrlProps = {
            id: 'oauth_token',
            value: _.get(server, 'details.oauth.baseURL', ''),
            onChange: this.handleOAuthUrlChange,
            readOnly: readOnly,
        };
        var oauthIdProps = {
            id: 'oauth_id',
            value: _.get(server, 'details.oauth.clientID', ''),
            onChange: this.handleOAuthIdChange,
            readOnly: readOnly,
        };
        var oauthSecretProps = {
            id: 'oauth_secret',
            value: _.get(server, 'details.oauth.clientSecret', ''),
            onChange: this.handleOAuthSecretChange,
            readOnly: readOnly,
        };
        return (
            <div className="form">
                <MultilingualTextField {...titleProps}>{t('server-summary-title')}</MultilingualTextField>
                <OptionList {...typeListProps}>
                    <label>{t('server-summary-type')}</label>
                    {_.map(typeOptionProps, renderOption)}
                </OptionList>
                <CollapsibleContainer open={showApiSection}>
                    <TextField {...apiUrlProps}>{t('server-summary-api-url')}</TextField>
                </CollapsibleContainer>
                <CollapsibleContainer open={showApiSection}>
                    <TextField {...apiTokenProps}>{t('server-summary-api-token')}</TextField>
                </CollapsibleContainer>
                <CollapsibleContainer open={showOAuthSection && needOAuthUrl}>
                    <TextField {...oauthUrlProps}>{t('server-summary-oauth-url')}</TextField>
                </CollapsibleContainer>
                <CollapsibleContainer open={showOAuthSection}>
                    <TextField {...oauthIdProps}>{t('server-summary-oauth-id')}</TextField>
                </CollapsibleContainer>
                <CollapsibleContainer open={showOAuthSection}>
                    <TextField {...oauthSecretProps}>{t('server-summary-oauth-secret')}</TextField>
                </CollapsibleContainer>
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
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var server = this.getServer();
        return db.start().then((serverId) => {
            return db.saveOne({ table: 'server' }, server).then((server) => {
                this.setState({ hasChanges: false }, () => {
                    return this.setEditability(false, server);
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
     * Called when user changes server type
     *
     * @param  {Object} evt
     */
    handleTypeOptionClick: function(evt) {
        this.setServerProperty(`type`, evt.name);
    },

    /**
     * Called when user changes API URL
     *
     * @param  {Event} evt
     */
    handleApiUrlChange: function(evt) {
        this.setServerProperty(`details.api.url`, evt.target.value);
    },

    /**
     * Called when user changes API token
     *
     * @param  {Event} evt
     */
    handleApiTokenChange: function(evt) {
        this.setServerProperty(`details.api.token`, evt.target.value);
    },

    /**
     * Called when user changes OAuth base URL
     *
     * @param  {Event} evt
     */
    handleOAuthUrlChange: function(evt) {
        this.setServerProperty(`details.oauth.baseURL`, evt.target.value);
    },

    /**
     * Called when user changes OAuth client id
     *
     * @param  {Event} evt
     */
    handleOAuthIdChange: function(evt) {
        this.setServerProperty(`details.oauth.clientID`, evt.target.value);
    },

    /**
     * Called when user changes OAuth client secret
     *
     * @param  {Event} evt
     */
    handleOAuthSecretChange: function(evt) {
        this.setServerProperty(`details.oauth.clientSecret`, evt.target.value);
    },
});

var serverTypes = [
    'dropbox',
    'facebook',
    'github',
    'gitlab',
    'google',
];

var emptyServer = {
    details: {}
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

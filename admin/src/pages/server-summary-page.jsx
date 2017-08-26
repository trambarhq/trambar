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
var OptionList = require('widgets/option-list');
var CollapsibleContainer = require('widgets/collapsible-container');

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
        return db.start().then((userId) => {
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
        var serverBefore = this.getServer();
        var serverAfter = (value === undefined)
                      ? _.decoupleUnset(serverBefore, path)
                      : _.decoupleSet(serverBefore, path, value);
        if (_.isEqual(serverAfter, this.props.server)) {
            serverAfter = null;
        }
        this.setState({ newServer: serverAfter });
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
     * Return true when the URL indicate edit mode
     *
     * @return {Boolean}
     */
    isEditing: function() {
        return !!parseInt(this.props.route.query.edit);
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability: function(edit) {
        var serverId = this.getServerId();
        var url = require('pages/server-summary-page').getUrl({ serverId }, { edit });
        return this.props.route.change(url, true);
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
        var title = p(_.get(server, 'details.title')) || t(`server-type-${server.type}`);
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
                    <PushButton className="save" onClick={this.handleSaveClick}>
                        {t('server-summary-save')}
                    </PushButton>
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
        var p = this.props.locale.pick;
        var readOnly = !this.isEditing();
        var server = this.getServer();
        var serverOriginal = this.props.server || emptyServer;
        var titleProps = {
            id: 'title',
            value: p(_.get(server, 'details.title')),
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
                <TextField {...titleProps}>{t('server-summary-title')}</TextField>
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
        // TODO: add confirmation
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
                return this.setEditability(false);
            });
        });
    },

    /**
     * Called when user changes server title
     *
     * @param  {Event} evt
     */
    handleTitleChange: function(evt) {
        var text = evt.target.value;
        var lang = this.props.locale.lang;
        this.setServerProperty(`details.title.${lang}`, text);
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
        var text = evt.target.value;
        this.setServerProperty(`details.api.url`, text);
    },

    /**
     * Called when user changes API token
     *
     * @param  {Event} evt
     */
    handleApiTokenChange: function(evt) {
        var text = evt.target.value;
        this.setServerProperty(`details.api.token`, text);
    },

    /**
     * Called when user changes OAuth base URL
     *
     * @param  {Event} evt
     */
    handleOAuthUrlChange: function(evt) {
        var text = evt.target.value;
        this.setServerProperty(`details.oauth.baseURL`, text);
    },

    /**
     * Called when user changes OAuth client id
     *
     * @param  {Event} evt
     */
    handleOAuthIdChange: function(evt) {
        var text = evt.target.value;
        this.setServerProperty(`details.oauth.clientID`, text);
    },

    /**
     * Called when user changes OAuth client secret
     *
     * @param  {Event} evt
     */
    handleOAuthSecretChange: function(evt) {
        var text = evt.target.value;
        this.setServerProperty(`details.oauth.clientSecret`, text);
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

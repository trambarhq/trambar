var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var UserTooltip = require('tooltips/user-tooltip');
var ModifiedTimeTooltip = require('tooltips/modified-time-tooltip')

require('./server-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'ServerListPage',
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
        parseUrl: function(path, query, hash) {
            return Route.match(path, [
                '/servers/?'
            ], (params) => {
                return params;
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getUrl: function(params) {
            var path = `/servers/`, query, hash;
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
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            servers: null,
            users: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ServerListPageSync {...props} />, 250);
        return db.start().then((userId) => {
            // load all servers
            var criteria = {};
            return db.find({ table: 'server', criteria });
        }).then((servers) => {
            props.servers = servers;
            meanwhile.show(<ServerListPageSync {...props} />);
        }).then(() => {
            // load users associated with servers
            var criteria = {
                server_id: _.map(props.servers, 'id')
            };
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            return <ServerListPageSync {...props} />;
        });
    }
});

var ServerListPageSync = module.exports.Sync = React.createClass({
    displayName: 'ServerListPage.Sync',
    propTypes: {
        servers: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

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
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className="server-list-page">
                {this.renderButtons()}
                <h2>{t('server-list-title')}</h2>
                {this.renderTable()}
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
        var preselected = 'add';
        return (
            <div className="buttons">
                <ComboButton preselected={preselected}>
                    <option name="add" onClick={this.handleAddClick}>
                        {t('server-list-add')}
                    </option>
                </ComboButton>
                {' '}
                <PushButton name="edit" className="emphasis" onClick={this.handleEditClick}>
                    {t('server-list-edit')}
                </PushButton>
            </div>
        );
    },

    /**
     * Render a table
     *
     * @return {ReactElement}
     */
    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
            className: 'servers',
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        return (
            <SortableTable {...tableProps}>
                <thead>
                    {this.renderHeadings()}
                </thead>
                <tbody>
                    {this.renderRows()}
                </tbody>
            </SortableTable>
        );
    },

    /**
     * Render table headings
     *
     * @return {ReactElement}
     */
    renderHeadings: function() {
        return (
            <tr>
                {this.renderTitleColumn()}
                {this.renderTypeColumn()}
                {this.renderOAuthColumn()}
                {this.renderAPIColumn()}
                {this.renderUsersColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    },

    /**
     * Render table rows
     *
     * @return {Array<ReactElement>}
     */
    renderRows: function() {
        var servers = sortServers(
            this.props.servers,
            this.props.users,
            this.props.locale,
            this.state.sortColumns,
            this.state.sortDirections
        );
        return _.map(servers, this.renderRow);
    },

    /**
     * Render a table row
     *
     * @param  {Object} server
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderRow: function(server, i) {
        return (
            <tr key={i}>
                {this.renderTitleColumn(server)}
                {this.renderTypeColumn(server)}
                {this.renderOAuthColumn(server)}
                {this.renderAPIColumn(server)}
                {this.renderUsersColumn(server)}
                {this.renderModifiedTimeColumn(server)}
            </tr>
        );
    },

    /**
     * Render title column, either the heading or a data cell
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderTitleColumn: function(server) {
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(server.details.title) || t(`server-type-${server.type}`);
            var route = this.props.route;
            var params = { server: server.id };
            var url = route.find(require('pages/server-summary-page'), params);
            var icon = getServerIcon(server.type);
            return (
                <td>
                    <a href={url}>
                        <i className={`fa fa-${icon} fa-fw`} />
                        {' '}
                        {title}
                    </a>
                </td>
            );
        }
    },

    /**
     * Render type column, either the heading or a data cell
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderTypeColumn: function(server) {
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="type">{t('table-heading-type')}</TH>;
        } else {
            return <td>{t(`server-type-${server.type}`)}</td>
        }
    },

    /**
     * Render column indicating whether oauth authentication is active
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderOAuthColumn: function(server) {
        if (this.props.theme.isBelowMode('wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="oauth">{t('table-heading-oauth')}</TH>;
        } else {
            var active = hasOAuthCredentials(server);
            return <td>{t(`server-list-oauth-${active}`)}</td>
        }
    },

    /**
     * Render column indicating whether oauth authentication is active
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement}
     */
    renderAPIColumn: function(server) {
        if (this.props.theme.isBelowMode('wide')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="api">{t('table-heading-api-access')}</TH>;
        } else {
            var active = hasAPICredentials(server);
            return <td>{t(`server-list-api-access-${active}`)}</td>
        }
    },

    /**
     * Render users column, either the heading or a data cell
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement|null}
     */
    renderUsersColumn: function(server) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="users">{t('table-heading-users')}</TH>;
        } else {
            var props = {
                users: findUsers(this.props.users, server),
                locale: this.props.locale,
                theme: this.props.theme,
            };
            return <td><UserTooltip {...props} /></td>;
        }
    },

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} server
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn: function(server) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            var props = {
                time: server.mtime,
                locale: this.props.locale,
            };
            return <td><ModifiedTimeTooltip {...props} /></td>;
        }
    },

    /**
     * Called when user clicks a table heading
     *
     * @param  {Object} evt
     */
    handleSort: function(evt) {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    },

    /**
     * Called when user clicks new button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        var route = this.props.route;
        return route.push(require('pages/server-summary-page'), {
            server: 'new'
        });
    },
});

var sortServers = Memoize(function(servers, users, locale, columns, directions) {
    var t = locale.translate;
    var p = locale.pick;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (server) => {
                    return p(server.details.title) || t(`server-type-${server.type}`);
                };
            case 'type':
                return (server) => {
                    return t(`server-type-${server.type}`);
                };
            case 'users':
                return (server) => {
                    return _.size(findUsers(users, server));
                };
            default:
                return column;
        }
    });
    return _.orderBy(servers, columns, directions);
});

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}

function hasOAuthCredentials(server) {
    var oauth = server.settings.oauth;
    if (oauth) {
        if (oauth.client_id && oauth.client_secret) {
            return true;
        }
    }
    return false;
}

function hasAPICredentials(server) {
    var api = server.settings.api;
    if (api) {
        if (api.access_token) {
            return true;
        }
    }
    return false;
}

var findUsers = Memoize(function(users, server) {
    return _.filter(users, { server_id: server.id });
});

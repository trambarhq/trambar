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
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var ModifiedTimeTooltip = require('widgets/modified-time-tooltip')

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
         * @param  {String} url
         *
         * @return {Object|null}
         */
        parseUrl: function(url) {
            return Route.match('/servers/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            return `/servers/`;
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
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            servers: null,
            projects: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ServerListPageSync {...props} />);
        return db.start().then((userId) => {
            // load all servers
            var criteria = {};
            return db.find({ schema: 'global', table: 'server', criteria });
        }).then((servers) => {
            props.servers = servers;
            return <ServerListPageSync {...props} />;
        });
    }
});

var ServerListPageSync = module.exports.Sync = React.createClass({
    displayName: 'ServerListPage.Sync',
    propTypes: {
        servers: PropTypes.arrayOf(PropTypes.object),
        projects: PropTypes.arrayOf(PropTypes.object),

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
        return (
            <div className="buttons">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('server-list-new')}
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
        var servers = sortServers(this.props.servers, this.props.projects, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        {this.renderTitleColumn()}
                        {this.renderTypeColumn()}
                        {this.renderModifiedTimeColumn()}
                    </tr>
                </thead>
                <tbody>
                    {_.map(servers, this.renderRow)}
                </tbody>
            </SortableTable>
        );
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
                {this.renderModifiedTimeColumn(server)}
            </tr>
        );
    },

    /**
     * Render title column, either the heading or a data cell
     *
     * @param  {Object|null} project
     *
     * @return {ReactElement}
     */
    renderTitleColumn: function(server) {
        var t = this.props.locale.translate;
        if (!server) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(server.details.title) || getTypeName(server.type);
            var iconName = getIconName(server.type);
            var url = require('pages/server-summary-page').getUrl({
                serverId: server.id
            });
            return (
                <td>
                    <a href={url}>
                        <i className={`fa fa-${iconName} fa-fw`} />
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
            var type = getTypeName(server.type);
            return <td>{type}</td>
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
            return <td><ModifiedTimeTooltip time={server.mtime} /></td>;
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
});

var sortServers = Memoize(function(servers, projects, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return 'details.last_name';
            default:
                return column;
        }
    });
    return _.orderBy(servers, columns, directions);
});

function getTypeName(type) {
    switch (type) {
        case 'dropbox': return 'Dropbox';
        case 'gitlab': return 'GitLab';
        case 'github': return 'GitHub';
        case 'google': return 'Google';
        case 'facebook': return 'Facebook';
    }
}

function getIconName(type) {
    switch (type) {
        case 'dropbox': return 'dropbox';
        case 'gitlab': return 'gitlab';
        case 'github': return 'github';
        case 'google': return 'google';
        case 'facebook': return 'facebook';
    }
}

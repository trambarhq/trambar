var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var UserSummaryPage = require('pages/user-summary-page');

// widgets
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var ModifiedTimeTooltip = require('widgets/modified-time-tooltip')

require('./repo-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RepoListPage',
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
            return Route.match('/projects/:projectId/repos/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            return `/projects/${params.projectId}/repos/`;
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
            project: null,
            repos: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RepoListPageSync {...props} />);
        return db.start().then((userId) => {
            // load project
            var criteria = {
                id: this.props.route.parameters.projectId
            };
            return db.findOne({ schema: 'global', table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load repos
            var criteria = {
                id: [ props.project.repo_ids ]
            };
            return db.find({ schema: 'global', table: 'repo', criteria });
        }).then((repos) => {
            props.repos = repos;
            meanwhile.show(<RepoListPageSync {...props} />);
        }).then((projects) => {
            props.projects = projects;
            return <RepoListPageSync {...props} />;
        });
    }
});

var RepoListPageSync = module.exports.Sync = React.createClass({
    displayName: 'RepoListPage.Sync',
    propTypes: {
        repos: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,

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
            <div className="repo-list-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('repo-list-edit')}
                </PushButton>
                <h2>{t('repo-list-title')}</h2>
                {this.renderTable()}
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
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        var repos = sortRepos(this.props.repos, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        {this.renderTitleRow()}
                        {this.renderModifiedTimeColumn()}
                    </tr>
                </thead>
                <tbody>
                    {_.map(repos, this.renderRow)}
                </tbody>
            </SortableTable>
        );
    },

    /**
     * Render a table row
     *
     * @param  {Object} repo
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderRow: function(repo, i) {
        return (
            <tr key={i}>
                {this.renderTitleRow(repo)}
                {this.renderModifiedTimeColumn(repo)}
            </tr>
        );
    },

    /**
     * Render name column, either the heading or a data cell
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement}
     */
    renderTitleRow: function(repo) {
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="name">{t('table-heading-name')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(repo.details.title) || repo.details.name;
            var url = UserSummaryPage.getUrl({
                projectId: this.props.route.parameters.projectId,
                userId: user.id
            });
            return (
                <td>
                    <a href={url}>
                        {title}
                    </a>
                </td>
            );
        }
    },

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} repo
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn: function(repo) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!repo) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            return <td><ModifiedTimeTooltip time={repo.mtime} /></td>;
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

var sortRepos = Memoize(function(repos, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'name':
                return 'details.last_name';
            default:
                return column;
        }
    });
    return _.orderBy(repos, columns, directions);
});

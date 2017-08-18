var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var ProjectSummaryPage = require('pages/project-summary-page');

// widgets
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var Tooltip = require('widgets/tooltip');
var RepositoryTooltip = require('widgets/repository-tooltip');
var ModifiedTimeTooltip = require('widgets/modified-time-tooltip')

require('./project-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'ProjectListPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        parseUrl: function(url) {
            return Route.match('/projects/', url);
        },

        getUrl: function(params) {
            return `/projects/`;
        },
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            projects: null,
            repos: null,
            users: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<ProjectListPageSync {...props} />);
        return db.start().then((userId) => {
            // load all projects
            var criteria = {};
            return db.find({ schema: 'global', table: 'project', criteria });
        }).then((projects) => {
            props.projects = projects;
            meanwhile.show(<ProjectListPageSync {...props} />);
        }).then(() => {
            // load repos
            var criteria = {
                id: _.flatten(_.map(props.projects, 'repo_ids'))
            };
            return db.find({ schema: 'global', table: 'repo', criteria });
        }).then((repos) => {
            props.repos = repos;
            meanwhile.show(<ProjectListPageSync {...props} />);
        }).then(() => {
            // load members of projects
            var criteria = {
                project_ids: _.map(props.projects, 'id')
            };
            return db.find({ schema: 'global', table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            return <ProjectListPageSync {...props} />;
        });
    }
});

var ProjectListPageSync = module.exports.Sync = React.createClass({
    displayName: 'ProjectListPage.Sync',
    propTypes: {
        projects: PropTypes.arrayOf(PropTypes.object),
        repos: PropTypes.arrayOf(PropTypes.object),
        users: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
        };
    },

    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className="project-list-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('project-list-new')}
                </PushButton>
                <h2>{t('project-list-title')}</h2>
                {this.renderTable()}
            </div>
        );
    },

    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        var projects = sortProjects(this.props.projects, this.props.users, this.props.repos, this.props.locale, this.state.sortColumns, this.state.sortDirections);
        return (
            <SortableTable {...tableProps}>
                <thead>
                    <tr>
                        {this.renderTitleColumn()}
                        {this.renderRepositoriesColumn()}
                        {this.renderModifiedTimeColumn()}
                    </tr>
                </thead>
                <tbody>
                    {_.map(projects, this.renderRow)}
                </tbody>
            </SortableTable>
        );
    },

    renderRow: function(project, i) {
        return (
            <tr key={i}>
                {this.renderTitleColumn(project)}
                {this.renderRepositoriesColumn(project)}
                {this.renderModifiedTimeColumn(project)}
            </tr>
        );
    },

    renderTitleColumn: function(project) {
        var t = this.props.locale.translate;
        if (project) {
            var p = this.props.locale.pick;
            var title = p(project.details.title);
            if (title) {
                title = t('project-list-$title-with-$name', title, project.name);
            } else {
                title = _.capitalize(project.name);
            }
            var url = ProjectSummaryPage.getUrl({ projectId: project.id });
            return (
                <td>
                    <a href={url}>
                        {title}
                    </a>
                </td>
            );
        } else {
            return <TH id="title">{t('table-heading-name')}</TH>;
        }
    },

    renderRepositoriesColumn: function(project) {
        var t = this.props.locale.translate;
        if (project) {
            var props = {
                repos: findRepos(this.props.repos, project),
                project,
                locale: this.props.locale,
            };
            return <td><RepositoryTooltip {...props} /></td>;
        } else {
            return <TH id="repo">{t('table-heading-repositories')}</TH>
        }
    },

    renderModifiedTimeColumn: function(project) {
        var t = this.props.locale.translate;
        if (project) {
            return <td><ModifiedTimeTooltip time={project.mtime} /></td>;
        } else {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        }
    },

    handleSort: function(evt) {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    },
});

var sortProjects = Memoize(function(projects, users, repos, locale, columns, directions) {
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (project) => {
                    return locale.pick(project.details.title)
                };
            case 'users':
                return (project) => {
                    return _.size(findUsers(users, project));
                };
            case 'repos':
                return (project) => {
                    return _.size(findUsers(repos, project));
                };
            default:
                return column;
        }
    });
    return _.orderBy(projects, columns, directions);
});

var findRepos = Memoize(function(repos, project) {
    return _.filter(repos, (repo) => {
        return _.includes(project.repo_ids, repo.id);
    });
});

var findUsers = Memoize(function(users, project) {
    return _.filter(users, (user) => {
        return _.includes(user.project_ids, project.id);
    });
});

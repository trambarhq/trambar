var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');

require('./repo-summary-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RepoSummaryPage',
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
            return Route.match('/projects/:projectId/repos/:repoId/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            return `/projects/${params.projectId}/repos/${params.repoId}/`;
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
            project: null,
            repo: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RepoSummaryPageSync {...props} />);
        return db.start().then((userId) => {
            var criteria = {
                id: this.props.route.parameters.roleId
            };
            return db.findOne({ table: 'role', criteria });
        }).then((repo) => {
            props.project = repo;
            meanwhile.show(<RepoSummaryPageSync {...props} />);
        }).then(() => {
            var criteria = {
                id: this.props.route.parameters.projectId
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
            return <RepoSummaryPageSync {...props} />;
        });
    }
});

var RepoSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'RepoSummaryPage.Sync',
    propTypes: {
        repo: PropTypes.object,
        project: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    render: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var title = p(_.get(this.props.repo, 'details.title'));
        return (
            <div className="repo-summary-page">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('repo-summary-edit')}
                </PushButton>
                <h2>{t('repo-summary-$title', title)}</h2>
            </div>
        );
    },
});

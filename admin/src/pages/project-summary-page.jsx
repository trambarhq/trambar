var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');

require('./project-summary-page.scss');

module.exports = Relaks.createClass({
    displayName: 'ProjectSummaryPage',
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
            return Route.match('/projects/:projectId/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            return `/projects/${params.projectId}/`;
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

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return db.start().then((userId) => {
            var criteria = {
                id: this.props.route.parameters.projectId
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
            return <ProjectSummaryPageSync {...props} />;
        });
    }
});

var ProjectSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'ProjectSummaryPage.Sync',
    propTypes: {
        project: PropTypes.object.isRequired,
        users: PropTypes.object,
        repos: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        return {
            editing: this.props.route.parameters.editing,
            newProject: null
        };
    },

    getProject: function() {
        return this.state.newProject || this.props.project;
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var project = this.getProject();
        var title = p(project.details.title) || project.name;
        return (
            <div className="project-summary-page">
                {this.renderButtons()}
                <h2>{t('project-summary-$title', title)}</h2>
                {this.renderDetailsSection()}
                {this.renderRepoSection()}
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
                    {t('project-summary-edit')}
                </PushButton>
            </div>
        );
    },

    renderDetailsSection: function() {

    },

    renderRepoSection: function() {

    },
});

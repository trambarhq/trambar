var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var DailyActivities = require('data/daily-activities');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var ActivityChart = require('widgets/activity-chart');
var DataLossWarning = require('widgets/data-loss-warning');

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
         * @param  {Object} query
         *
         * @return {String}
         */
        getUrl: function(params, query) {
            var url = `/projects/${params.projectId}/repos/${params.repoId}/`;
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
            project: null,
            repo: null,
            statistics: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RepoSummaryPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            var repoId = parseInt(this.props.route.parameters.repoId);
            if (repoId) {
                var criteria = {
                    id: repoId
                };
                return db.findOne({ table: 'repo', criteria });
            }
        }).then((repo) => {
            props.repo = repo;
            meanwhile.show(<RepoSummaryPageSync {...props} />);
        }).then(() => {
            var projectId = parseInt(this.props.route.parameters.projectId);
            var criteria = {
                id: projectId
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
            meanwhile.show(<RepoSummaryPageSync {...props} />);
        }).then(() => {
            // load statistics
            return DailyActivities.loadRepoStatistics(db, props.project, [ props.repo ]).then((hash) => {
                return hash[props.repo.id];
            });
        }).then((statistics) => {
            props.statistics = statistics;
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

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            newRepo: null,
        };
    },

    /**
     * Return edited copy of repo object or the original object
     *
     * @return {Object}
     */
    getRepo: function() {
        if (this.isEditing()) {
            return this.state.newRepo || this.props.repo || emptyRepo;
        } else {
            return this.props.repo || emptyRepo;
        }
    },

    /**
     * Modify a property of the repo object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setRepoProperty: function(path, value) {
        var repo = this.getRepo();
        var newRepo = _.decoupleSet(repo, path, value);
        var hasChanges = true;
        if (_.isEqual(newRepo, this.props.repo)) {
            newRepo = null;
            hasChanges = false;
        }
        this.setState({ newRepo, hasChanges });
    },

    /**
     * Return project id specified in URL
     *
     * @return {Number}
     */
    getProjectId: function() {
        return parseInt(this.props.route.parameters.projectId);
    },

    /**
     * Return repo id specified in URL
     *
     * @return {Number}
     */
    getRepoId: function() {
        return parseInt(this.props.route.parameters.repoId);
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object} props
     *
     * @return {Boolean}
     */
    isEditing: function(props) {
        props = props || this.props;
        return !!parseInt(props.route.query.edit);
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability: function(edit) {
        var projectId = this.getProjectId();
        var repoId = this.getRepoId();
        var url = require('pages/repo-summary-page').getUrl({ projectId, repoId }, { edit });
        return this.props.route.change(url, true);
    },

    /**
     * Reset edit state when edit starts
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            if (this.isEditing(nextProps)) {
                this.setState({
                    newRepo: null,
                    hasChanges: false,
                });
            }
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
        var repo = this.getRepo();
        var title = p(_.get(repo, 'details.title')) || repo.name;
        return (
            <div className="repo-summary-page">
                {this.renderButtons()}
                <h2>{t('repo-summary-$title', title)}</h2>
                {this.renderForm()}
                {this.renderInstructions()}
                {this.renderChart()}
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
                        {t('repo-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('repo-summary-save')}
                    </PushButton>
                    <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
                </div>
            );
        } else {
            return (
                <div key="view" className="buttons">
                    <PushButton className="add" onClick={this.handleEditClick}>
                        {t('repo-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    },

    /**
     * Render form for entering repo details
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var readOnly = !this.isEditing();
        var repoOriginal = this.props.repo || emptyRepo;
        var repo = this.getRepo();
        var hasIssueTracker = !!repo.details.issue_tracking;
        var titleProps = {
            id: 'title',
            value: repo.details.title,
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly,
        };
        var nameProps = {
            id: 'name',
            value: repo.name,
            readOnly: true,
        };
        var listProps = {
            onOptionClick: this.handleOptionClick,
            readOnly: readOnly || !hasIssueTracker,
        };
        var optionProps = [
            {
                name: 'not_available',
                selected: true,
                previous: true,
                children: t('repo-summary-issue-tracker-not-available'),
                hidden: hasIssueTracker,
            },
            {
                name: 'enabled',
                selected: repo.details.issue_copying,
                previous: repoOriginal.details.issue_copying,
                children: t('repo-summary-issue-tracker-import-allowed'),
                hidden: !hasIssueTracker,
            },
            {
                name: 'disabled',
                selected: !repo.details.issue_copying,
                previous: !repoOriginal.details.issue_copying,
                children: t('repo-summary-issue-tracker-import-disallowed'),
                hidden: !hasIssueTracker,
            },
        ];
        return (
            <div className="form">
                <MultilingualTextField {...titleProps}>{t('repo-summary-title')}</MultilingualTextField>
                <TextField {...nameProps}>{t('repo-summary-gitlab-name')}</TextField>
                <OptionList {...listProps}>
                    <label>{t('repo-summary-issue-tracker')}</label>
                    {_.map(optionProps, renderOption)}
                </OptionList>
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
            topic: 'repo',
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
     * Render activity chart
     *
     * @return {ReactElement}
     */
    renderChart: function() {
        var t = this.props.locale.translate;
        var chartProps = {
            statistics: this.props.statistics,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return (
            <div className="statistics">
                <h2>{t('repo-summary-statistics')}</h2>
                <ActivityChart {...chartProps} />
            </div>
        );
    },

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        return this.setEditability(true);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        return this.setEditability(false);
    },

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick: function(evt) {
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var repo = this.getRepo();
        return db.start().then((currentUserId) => {
            return db.saveOne({ table: 'repo' }, repo).then((repo) => {
                this.setState({ hasChanges: false }, () => {
                    this.setEditability(false);
                });
            });
        });
    },

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleTitleChange: function(evt) {
        this.setRepoProperty(`details.title`, evt.target.value);
    },
});

var emptyRepo = {
    details: {}
};

function renderOption(props, i) {
    return <option key={i} {...props} />;
}

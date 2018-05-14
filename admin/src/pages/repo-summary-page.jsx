var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var ComponentRefs = require('utils/component-refs');
var ProjectFinder = require('objects/finders/project-finder');
var RepoFinder = require('objects/finders/repo-finder');
var StatisticsFinder = require('objects/finders/statistics-finder');
var SystemFinder = require('objects/finders/system-finder');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var ActivityChart = require('widgets/activity-chart');
var ActionConfirmation = require('widgets/action-confirmation');
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
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/projects/:project/repos/:repo/?',
            ], (params) => {
                return {
                    project: Route.parseId(params.project),
                    repo: Route.parseId(params.repo),
                    edit: !!query.edit,
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/projects/${params.project}/repos/${params.repo}/`, query, hash;
            if (params.edit) {
                query = { edit: 1 };
            }
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
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: null,
            project: null,
            repo: null,
            statistics: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RepoSummaryPageSync {...props} />);
        return db.start().then((currentUserId) => {
            return SystemFinder.findSystem(db).then((system) => {
                props.system = system;
            });
        }).then(() => {
            return RepoFinder.findRepo(db, params.repo).then((repo) => {
                props.repo = repo;
            });
        }).then(() => {
            meanwhile.show(<RepoSummaryPageSync {...props} />);
            return ProjectFinder.findProject(db).then((project) => {
                props.project = project;
            });
        }).then(() => {
            meanwhile.show(<RepoSummaryPageSync {...props} />);
            return StatisticsFinder.findDailyActivitiesOfRepo(db, props.project, props.repo).then((statistics) => {
                props.statistics = statistics;
            });
        }).then(() => {
            return <RepoSummaryPageSync {...props} />;
        });
    }
});

var RepoSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'RepoSummaryPage.Sync',
    propTypes: {
        system: PropTypes.object,
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
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        return {
            newRepo: null,
        };
    },

    /**
     * Return edited copy of repo object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getRepo: function(state) {
        if (this.isEditing() && (!state || state === 'current')) {
            return this.state.newRepo || this.props.repo || emptyRepo;
        } else {
            return this.props.repo || emptyRepo;
        }
    },

    /**
     * Return a property of the repo object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getRepoProperty: function(path, state) {
        var repo = this.getRepo(state);
        return _.get(repo, path);
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
     * Return true when the URL indicate edit mode
     *
     * @param  {Object} props
     *
     * @return {Boolean}
     */
    isEditing: function(props) {
        props = props || this.props;
        return props.route.parameters.edit;
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     *
     * @return {Promise}
     */
    setEditability: function(edit) {
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.edit = edit;
        return route.replace(module.exports, params);
    },

    /**
     * Return to repo list
     *
     * @return {Promise}
     */
    returnToList: function() {
        var route = this.props.route;
        var params = { project: route.parameters.project };
        return route.push(require('pages/repo-list-page'), params);
    },

    /**
     * Return list of language codes
     *
     * @return {Array<String>}
     */
    getInputLanguages: function() {
        return _.get(this.props.system, 'settings.input_languages', [])
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
                <ActionConfirmation ref={this.components.setters.confirmation} locale={this.props.locale} theme={this.props.theme} />
                <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
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
                    <PushButton onClick={this.handleCancelClick}>
                        {t('repo-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('repo-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            var repoId = this.props.route.parameters.repo;
            var project = this.props.project;
            var active = (project) ? _.includes(project.repo_ids, repoId) : true;
            var preselected = (!active) ? 'restore' : undefined;
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={this.handleReturnClick}>
                            {t('repo-summary-return')}
                        </option>
                        <option name="remove" disabled={!active} onClick={this.handleRemoveClick}>
                            {t('repo-summary-remove')}
                        </option>
                        <option name="restore" hidden={active} onClick={this.handleRestoreClick}>
                            {t('repo-summary-restore')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
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
        return (
            <div className="form">
                {this.renderTitleInput()}
                {this.renderNameInput()}
                {this.renderIssueTrackingStatus()}
            </div>
        );
    },

    /**
     * Render title input
     *
     * @return {ReactElement}
     */
    renderTitleInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'title',
            value: this.getRepoProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly: !this.isEditing(),
        };
        return (
            <MultilingualTextField {...props}>
                {t('repo-summary-title')}
            </MultilingualTextField>
        );
    },

    /**
     * Render repo name input (read only)
     *
     * @return {ReactElement}
     */
    renderNameInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'name',
            value: this.getRepoProperty('name'),
            locale: this.props.locale,
            readOnly: true,
        };
        return (
            <TextField {...props}>
                {t('repo-summary-gitlab-name')}
            </TextField>
        );
    },

    /**
     * Render issue tracker status
     *
     * @return {ReactElement}
     */
    renderIssueTrackingStatus: function() {
        var t = this.props.locale.translate;
        var issueTrackStatus;
        if (this.getRepoProperty('details.issues_enabled')) {
            issueTrackStatus = t('repo-summary-issue-tracker-enabled');
        } else {
            issueTrackStatus = t('repo-summary-issue-tracker-disabled');
        }
        var props = {
            id: 'issue-tracker',
            value: issueTrackStatus,
            locale: this.props.locale,
            readOnly: true
        };
        return (
            <TextField {...props}>
                {t('repo-summary-issue-tracker')}
            </TextField>
        );
    },

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions: function() {
        var instructionProps = {
            folder: 'repo',
            topic: 'repo-summary',
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
                <ActivityChart {...chartProps}>
                    {t('repo-summary-statistics')}
                </ActivityChart>
            </div>
        );
    },

    /**
     * Save project with repo added or removed
     *
     * @param  {Boolean} include
     *
     * @return {Promise<Project>}
     */
    changeInclusion: function(include) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var repo = this.props.repo;
        var repoIds = this.props.project.repo_ids;
        if (include) {
            repoIds = _.union(repoIds, [ repo.id ]);
        } else {
            repoIds = _.difference(repoIds, [ repo.id ]);
        }
        var projectAfter = _.assign({}, this.props.project, { repo_ids: repoIds });
        return db.saveOne({ table: 'project' }, projectAfter);
    },

    /**
     * Called when user clicks remove button
     *
     * @param  {Event} evt
     */
    handleRemoveClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('repo-summary-confirm-remove');
        return this.components.confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeInclusion(false).then((project) => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user clicks restore button
     *
     * @param  {Event} evt
     */
    handleRestoreClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('repo-summary-confirm-restore');
        return this.components.confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeInclusion(true);
            }
        });
    },

    /**
     * Called when user clicks return button
     *
     * @param  {Event} evt
     */
    handleReturnClick: function(evt) {
        return this.returnToList();
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
        var db = this.props.database.use({ schema: 'global', by: this });
        var repo = this.getRepo();
        return db.start().then((userId) => {
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

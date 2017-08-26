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
            if (query.edit) {
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

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RepoSummaryPageSync {...props} />);
        return db.start().then((userId) => {
            var criteria = {
                id: parseInt(this.props.route.parameters.roleId)
            };
            return db.findOne({ table: 'role', criteria });
        }).then((repo) => {
            props.project = repo;
            meanwhile.show(<RepoSummaryPageSync {...props} />);
        }).then(() => {
            var criteria = {
                id: parseInt(this.props.route.parameters.projectId)
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
            return this.state.newRepo || this.props.repo || {};
        } else {
            return this.props.repo || {};
        }
    },

    /**
     * Modify a property of the repo object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setRepoProperty: function(path, value) {
        var repoBefore = this.getRepo();
        var repoAfter = _.decoupleSet(repoBefore, path, value);
        if (_.isEqual(repoAfter, this.props.repo)) {
            repoAfter = null;
        }
        this.setState({ newRepo: repoAfter });
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
        var projectId = this.getProjectId();
        var repoId = this.getRepoId();
        var url = require('pages/repo-summary-page').getUrl({ projectId, repoId }, { edit });
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
        var title = p(_.get(this.props.repo, 'details.title'));
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
                <div class="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('repo-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" onClick={this.handleSaveClick}>
                        {t('repo-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            return (
                <div class="buttons">
                    <PushButton className="add" onClick={this.handleAddClick}>
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
        var repoOriginal = this.props.repo || { details: {} };
        var repo = this.getRepo();
        var hasIssueTracker = !!repo.details.issue_tracking;
        var titleProps = {
            id: 'title',
            value: p(repo.details.title),
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
                <TextField {...titleProps}>{t('repo-summary-title')}</TextField>
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
     * Render statistics bar chart
     *
     * @return {ReactElement}
     */
    renderChart: function() {
        return (
            <div className="statistics">
                <h2>Statistics</h2>
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
        // TODO: add confirmation
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
        return db.start().then((userId) => {
            return db.saveOne({ table: 'repo' }, repo).then((repo) => {
                return this.setEditability(false);
            });
        });
    },

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleTitleChange: function(evt) {
        var text = evt.target.value;
        var lang = this.props.locale.lang;
        this.setRepoProperty(`details.title.${lang}`, text);
    },
});

function renderOption(props, i) {
    return <option key={i} {...props} />;
}

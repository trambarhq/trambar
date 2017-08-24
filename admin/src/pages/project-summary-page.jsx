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
         * @param  {Object} query
         *
         * @return {String}
         */
        getUrl: function(params, query) {
            var url = `/projects/${params.projectId}/`;
            if (query && query.edit) {
                url += '?edit=1';
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

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return db.start().then((userId) => {
            var criteria = {
                id: parseInt(this.props.route.parameters.projectId)
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
            newProject: null,
        };
    },

    getProject: function() {
        if (this.isEditing()) {
            return this.state.newProject || this.props.project || {};
        } else {
            return this.props.project || {};
        }
    },

    setProjectProperty: function(path, value) {
        var projectBefore = this.getProject();
        var projectAfter = _.decoupleSet(projectBefore, path, value);
        if (_.isEqual(projectAfter, this.props.project)) {
            projectAfter = null;
        }
        this.setState({ newProject: projectAfter });
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
        var url = require('pages/project-summary-page').getUrl({ projectId }, { edit });
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
        var project = this.getProject();
        var title = p(project.details.title) || project.name;
        return (
            <div className="project-summary-page">
                {this.renderButtons()}
                <h2>{t('project-summary-$title', title)}</h2>
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
            // using keys here to force clearing of focus
            var noChanges = !this.state.newProject;
            return (
                <div key="edit" className="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('project-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={noChanges} onClick={this.handleSaveClick}>
                        {t('project-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            return (
                <div key="view" className="buttons">
                    <PushButton className="edit" onClick={this.handleEditClick}>
                        {t('project-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    },

    renderForm: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var readOnly = !this.isEditing();
        var project = this.getProject();
        var titleProps = {
            id: 'title',
            value: p(project.details.title),
            onChange: this.handleTitleChange,
            readOnly,
        };
        var nameProps = {
            id: 'name',
            value: project.name,
            onChange: this.handleNameChange,
            readOnly,
        };
        var descriptionProps = {
            id: 'description',
            value: p(project.details.description),
            type: 'textarea',
            onChange: this.handleDescriptionChange,
            readOnly,
        };
        return (
            <div className="form">
                <TextField {...titleProps}>{t('project-summary-title')}</TextField>
                <TextField {...nameProps}>{t('project-summary-name')}</TextField>
                <TextField {...descriptionProps}>{t('project-summary-description')}</TextField>
            </div>
        );
    },

    renderInstructions: function() {
        var instructionProps = {
            topic: 'project',
            hidden: !this.isEditing(),
            locale: this.props.locale,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    },

    renderChart: function() {
        return (
            <div className="statistics">
                <h2>Statistics</h2>
            </div>
        );
    },

    componentDidUpdate: function(prevProps, prevState) {
        if (prevProps.route !== this.props.route) {
            this.setState({ newProject: null });
        }
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
        var project = _.omit(this.getProject(), 'user_ids', 'repo_ids');
        return db.start().then((userId) => {
            return db.saveOne({ table: 'project' }, project).then((project) => {
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
        this.setProjectProperty(`details.title.${lang}`, text);
    },

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleNameChange: function(evt) {
        var text = evt.target.value;
        this.setProjectProperty(`name`, text);
    },

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleDescriptionChange: function(evt) {
        var text = evt.target.value;
        var lang = this.props.locale.lang;
        this.setProjectProperty(`details.description.${lang}`, text);
    },
});

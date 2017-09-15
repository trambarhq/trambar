var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

var DailyActivities = require('data/daily-activities');
var SlugGenerator = require('utils/slug-generator');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var ImageSelector = require('widgets/image-selector');
var ActivityChart = require('widgets/activity-chart');
var InputError = require('widgets/input-error');
var DataLossWarning = require('widgets/data-loss-warning');

require('./project-summary-page.scss');

module.exports = Relaks.createClass({
    displayName: 'ProjectSummaryPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
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
            return Route.match('/projects/:projectId/?', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {String}
         */
        getUrl: function(params) {
            var url = `/projects/${params.projectId}/`;
            if (params.edit) {
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
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: null,
            project: null,
            statistics: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
        };
        meanwhile.show(<ProjectSummaryPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            var criteria = {};
            return db.findOne({ table: 'system', criteria });
        }).then((system) => {
            props.system = system;
        }).then(() => {
            var projectId = parseInt(this.props.route.parameters.projectId);
            if (projectId) {
                var criteria = {
                    id: projectId
                };
                return db.findOne({ table: 'project', criteria });
            }
        }).then((project) => {
            props.project = project;
            meanwhile.show(<ProjectSummaryPageSync {...props} />);
        }).then(() => {
            // load project statistics (unless we're creating a new project)
            if (props.project) {
                return DailyActivities.loadProjectStatistics(db, [ props.project ]).then((hash) => {
                    return hash[props.project.id];
                });
            }
        }).then((statistics) => {
            props.statistics = statistics;
            return <ProjectSummaryPageSync {...props} />;
        });
    }
});

var ProjectSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'ProjectSummaryPage.Sync',
    propTypes: {
        system: PropTypes.object,
        project: PropTypes.object,
        statistics: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            newProject: null,
            saving: false,
            problems: {},
        };
    },

    /**
     * Return edited copy of project object or the original object
     *
     * @return {Object}
     */
    getProject: function() {
        if (this.isEditing()) {
            return this.state.newProject || this.props.project || emptyProject;
        } else {
            return this.props.project || emptyProject;
        }
    },

    /**
     * Modify a property of the project object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setProjectProperty: function(path, value) {
        var project = this.getProject();
        var newProject = _.decoupleSet(project, path, value);
        if (path === 'details.title') {
            var autoNameBefore = SlugGenerator.fromTitle(project.details.title);
            var autoNameAfter = SlugGenerator.fromTitle(newProject.details.title);
            if (!project.name || project.name === autoNameBefore) {
                newProject.name = autoNameAfter;
            }
        }
        var hasChanges = true;
        if (_.isEqual(newProject, this.props.project)) {
            newProject = null;
            hasChanges = false;
        }
        this.setState({ newProject, hasChanges });
    },

    /**
     * Look for problems in project object
     *
     * @return {Object}
     */
    findProblems: function() {
        var problems = {};
        var project = this.getProject();
        if (!project.name) {
            problems.name = 'validation-required';
        }
        return problems;
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
     * Return true when the URL indicate we're creating a new user
     *
     * @param  {Object} props
     *
     * @return {Boolean}
     */
    isCreating: function(props) {
        props = props || this.props;
        return (props.route.parameters.projectId === 'new');
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
        return this.isCreating(props) || !!parseInt(props.route.query.edit);
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object|null}  newProject
     *
     * @return {Promise}
     */
    setEditability: function(edit, newProject) {
        var projectId = (newProject) ? newProject.id : this.getProjectId();
        var url = (projectId)
                ? require('pages/project-summary-page').getUrl({ projectId, edit })
                : require('pages/project-list-page').getUrl();
        var replace = (projectId) ? true : false;
        return this.props.route.change(url, replace);
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
                    newProject: null,
                    hasChanges: false,
                });
            } else {
                this.setState({ problems: {} });
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
            return (
                <div key="edit" className="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('project-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('project-summary-save')}
                    </PushButton>
                    <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
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

    /**
     * Render form for entering project details
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        var t = this.props.locale.translate;
        var readOnly = !this.isEditing();
        var projectOriginal = this.props.project;
        var project = this.getProject();
        var inputLanguages = _.get(this.props.system, 'settings.input_languages');
        var problems = this.state.problems;
        var titleProps = {
            id: 'title',
            value: project.details.title,
            availableLanguageCodes: inputLanguages,
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly,
        };
        var nameProps = {
            id: 'name',
            value: project.name,
            locale: this.props.locale,
            onChange: this.handleNameChange,
            readOnly,
        };
        var descriptionProps = {
            id: 'description',
            value: project.details.description,
            availableLanguageCodes: inputLanguages,
            type: 'textarea',
            locale: this.props.locale,
            onChange: this.handleDescriptionChange,
            readOnly,
        };
        var emblemProps = {
            purpose: 'project-emblem',
            desiredWidth: 500,
            desiredHeight: 500,
            resources: project.details.resources,
            database: this.props.database,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleEmblemChange,
            readOnly,
        };
        var listProps = {
            onOptionClick: this.handleOptionClick,
            readOnly,
        };
        var sc = findSettings(project);
        var sp = findSettings(this.props.project);
        var membershipOptionProps = [
            {
                name: 'manual',
                selected: !sc.membership.accept_team_member_automatically
                       && !sc.membership.accept_approved_users_automaticlly,
                previous: !sp.membership.accept_team_member_automatically
                       && !sp.membership.accept_approved_users_automaticlly,
                children: t('project-summary-new-members-manual'),
            },
            {
                name: 'accept_team_member_automatically',
                selected: sc.membership.accept_team_member_automatically,
                previous: sp.membership.accept_team_member_automatically,
                children: t('project-summary-new-members-team-member-auto-join'),
            },
            {
                name: 'accept_approved_users_automaticlly',
                selected: sc.membership.accept_approved_users_automaticlly,
                previous: sp.membership.accept_approved_users_automaticlly,
                children: t('project-summary-new-members-approved-user-auto-join'),
            },
            {
                name: 'allow_request',
                selected: sc.membership.allow_request,
                previous: sp.membership.allow_request,
                children: t('project-summary-new-members-allow-request'),
            },
        ];
        var accessControlOptionProps = [
            {
                name: 'members_only',
                selected: !sc.access_control.grant_team_members_read_only
                       && !sc.access_control.grant_approved_users_read_only
                       && !sc.access_control.grant_unapproved_users_read_only,
                previous: !sp.access_control.grant_team_members_read_only
                       && !sp.access_control.grant_approved_users_read_only
                       && !sp.access_control.grant_unapproved_users_read_only,
                children: t('project-summary-access-control-member-only')
            },
            {
                name: 'grant_team_members_read_only',
                selected: sc.access_control.grant_team_members_read_only,
                previous: sp.access_control.grant_team_members_read_only,
                children: t('project-summary-access-control-team-member-read-only')
            },
            {
                name: 'grant_approved_users_read_only',
                selected: sc.access_control.grant_approved_users_read_only,
                previous: sp.access_control.grant_approved_users_read_only,
                children: t('project-summary-access-control-approved-user-read-only')
            },
            {
                name: 'grant_unapproved_users_read_only',
                selected: sc.access_control.grant_unapproved_users_read_only,
                previous: sp.access_control.grant_unapproved_users_read_only,
                children: t('project-summary-access-control-pending-user-read-only')
            },
        ];
        return (
            <div className="form">
                <MultilingualTextField {...titleProps}>{t('project-summary-title')}</MultilingualTextField>
                <TextField {...nameProps}>
                    {t('project-summary-name')}
                    <InputError>{t(problems.name)}</InputError>
                </TextField>
                <MultilingualTextField {...descriptionProps}>{t('project-summary-description')}</MultilingualTextField>
                <ImageSelector {...emblemProps}>{t('project-summary-emblem')}</ImageSelector>
                <OptionList {...listProps}>
                    <label>{t('project-summary-new-members')}</label>
                    {_.map(membershipOptionProps, renderOption)}
                </OptionList>
                <OptionList {...listProps}>
                    <label>{t('project-summary-access-control')}</label>
                    {_.map(accessControlOptionProps, renderOption)}
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

    /**
     * Render activity chart
     *
     * @return {ReactElement|null}
     */
    renderChart: function() {
        if (this.isCreating()) {
            return null;
        }
        var t = this.props.locale.translate;
        var chartProps = {
            statistics: this.props.statistics,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return (
            <div className="statistics">
                <ActivityChart {...chartProps}>
                    {t('project-summary-statistics')}
                </ActivityChart>
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
        if (this.state.saving) {
            return;
        }
        var problems = this.findProblems();
        if (_.some(problems)) {
            this.setState({ problems });
            return;
        }
        this.setState({ saving: true, problems: {} }, () => {
            var db = this.props.database.use({ schema: 'global', by: this });
            var project = _.omit(this.getProject(), 'user_ids', 'repo_ids');
            var payloads = this.props.payloads;
            return payloads.prepare(project).then(() => {
                return db.start().then((currentUserId) => {
                    return db.saveOne({ table: 'project' }, project).then((project) => {
                        // reattach blob, if any
                        payloads.reattach(project);
                        return payloads.dispatch(project).then(() => {
                            this.setState({ hasChanges: false, saving: false }, () => {
                                this.setEditability(false, project);
                            });
                            return null;
                        });
                    });
                });
            }).catch((err) => {
                console.error(err);
                this.setState({ saving: false });
            });
        });
    },

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleTitleChange: function(evt) {
        this.setProjectProperty(`details.title`, evt.target.value);
    },

    /**
     * Called when user changes the name
     *
     * @param  {Event} evt
     */
    handleNameChange: function(evt) {
        var name = _.trim(_.toLower(evt.target.value));
        this.setProjectProperty(`name`, name);
    },

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleDescriptionChange: function(evt) {
        this.setProjectProperty(`details.description`, evt.target.value);
    },

    /**
     * Called when user changes the project emblem
     *
     * @param  {Object} evt
     */
    handleEmblemChange: function(evt) {
        this.setProjectProperty(`details.resources`, evt.target.value);
    },

    /**
     * Called when user clicks an option under membership or access control
     *
     * @param  {Object} evt
     */
    handleOptionClick: function(evt) {
        var project = this.getProject();
        var s = _.cloneDeep(findSettings(project));
        switch (evt.name) {
            case 'manual':
                s.membership.accept_team_member_automatically = false;
                s.membership.accept_approved_users_automaticlly = false;
                break;
            case 'accept_team_member_automatically':
                s.membership.accept_team_member_automatically = !s.membership.accept_team_member_automatically;
                break;
            case 'accept_approved_users_automaticlly':
                s.membership.accept_approved_users_automaticlly = !s.membership.accept_approved_users_automaticlly;
                break;
            case 'allow_request':
                s.membership.allow_request = !s.membership.allow_request;
                break;
            case 'members_only':
                s.access_control.grant_team_members_read_only = false;
                s.access_control.grant_approved_users_read_only = false;
                s.access_control.grant_unapproved_users_read_only = false;
                break;
            case 'grant_team_members_read_only':
                s.access_control.grant_team_members_read_only = !s.access_control.grant_team_members_read_only;
                break;
            case 'grant_approved_users_read_only':
                s.access_control.grant_approved_users_read_only = !s.access_control.grant_approved_users_read_only;
                break;
            case 'grant_unapproved_users_read_only':
                s.access_control.grant_unapproved_users_read_only = !s.access_control.grant_unapproved_users_read_only;
                break;
        }
        this.setProjectProperty(`settings`, s);
    },
});

var emptyProject = {
    details: {},
    settings: {},
};

var emptySettings = {
    membership: {},
    access_control: {},
};

function findSettings(project) {
    if (project) {
        return _.merge({}, emptySettings, project.settings);
    } else {
        return emptySettings;
    }
}

function renderOption(props, i) {
    return <option key={i} {...props} />;
}

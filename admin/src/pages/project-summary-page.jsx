var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var ComponentRefs = require('utils/component-refs');
var ProjectSettings = require('objects/settings/project-settings');
var StatisticsUtils = require('objects/utils/statistics-utils');
var SlugGenerator = require('utils/slug-generator');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');
var Payloads = require('transport/payloads');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var ImageSelector = require('widgets/image-selector');
var ActivityChart = require('widgets/activity-chart');
var InputError = require('widgets/input-error');
var ActionConfirmation = require('widgets/action-confirmation');
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
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/projects/:project/?'
            ], (params) => {
                return {
                    project: (params.project === 'new') ? 'new' : Route.parseId(params.project),
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
            var path = `/projects/${params.project}/`, query, hash;
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
        // don't wait for remote data unless the route changes
        var freshRoute = (meanwhile.prior.props.route !== this.props.route);
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', blocking: freshRoute, by: this });
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
        return db.start().then((userId) => {
            var criteria = {};
            return db.findOne({ table: 'system', criteria });
        }).then((system) => {
            props.system = system;
        }).then(() => {
            if (params.project !== 'new') {
                var criteria = { id: params.project };
                return db.findOne({ table: 'project', criteria, required: true });
            }
        }).then((project) => {
            props.project = project;
            return meanwhile.show(<ProjectSummaryPageSync {...props} />);
        }).then(() => {
            // load project statistics (unless we're creating a new project)
            return StatisticsUtils.fetchProjectDailyActivities(db, props.project);
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
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        return {
            newProject: null,
            saving: false,
            adding: false,
            problems: {},
        };
    },

    /**
     * Return edited copy of project object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getProject: function(state) {
        if (this.isEditing() && (!state || state === 'current')) {
            return this.state.newProject || this.props.project || emptyProject;
        } else {
            return this.props.project || emptyProject;
        }
    },

    /**
     * Return a prop of the project object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getProjectProperty: function(path, state) {
        var project = this.getProject(state);
        return _.get(project, path);
    },

    /**
     * Modify a property of the project object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setProjectProperty: function(path, value) {
        var project = this.getProject('current');
        var newProject = _.decoupleSet(project, path, value);
        if (path === 'details.title') {
            var autoNameBefore = SlugGenerator.fromTitle(project.details.title);
            var autoNameAfter = SlugGenerator.fromTitle(newProject.details.title);
            if (!project.name || project.name === autoNameBefore) {
                newProject.name = autoNameAfter;
            }
        }
        if(_.size(newProject.name) > 128) {
            newProject.name = newProject.name.substr(0, 128);
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
        var name = _.toLower(_.trim(project.name));
        var reservedNames = [ 'global', 'admin' ];
        if (!name) {
            problems.name = 'validation-required';
        } else if (_.includes(reservedNames, name)) {
            problems.name = 'validation-illegal-project-name';
        }
        return problems;
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
        return (props.route.parameters.project === 'new');
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
        return this.isCreating(props) || props.route.parameters.edit;
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
        if (this.isCreating() && !edit && !newProject) {
            // return to list when cancelling project creation
            this.returnToList();
        } else {
            var route = this.props.route;
            var params = _.clone(route.parameters);
            params.edit = edit;
            if (newProject) {
                // use id of newly created project
                params.project = newProject.id;
            }
            return route.replace(module.exports, params);
        }
    },

    /**
     * Return to project list
     *
     * @return {Promise}
     */
    returnToList: function() {
        var route = this.props.route;
        return route.push(require('pages/project-list-page'));
    },

    /**
     * Start creating a new role
     *
     * @return {Promise}
     */
    startNew: function() {
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.project = 'new';
        return route.replace(module.exports, params);
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
            // using keys here to force clearing of focus
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('project-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('project-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            var project = this.props.project;
            var active = (project) ? !project.deleted && !project.archived : true;
            var preselected;
            if (active) {
                preselected = (this.state.adding) ? 'add' : 'return';
            } else {
                preselected = 'restore';
            }
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={this.handleReturnClick}>
                            {t('project-summary-return')}
                        </option>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('project-summary-add')}
                        </option>
                        <option name="archive" disabled={!active} separator onClick={this.handleArchiveClick}>
                            {t('project-summary-archive')}
                        </option>
                        <option name="delete" disabled={!active} onClick={this.handleDeleteClick}>
                            {t('project-summary-delete')}
                        </option>
                        <option name="restore" hidden={active} onClick={this.handleRestoreClick}>
                            {t('project-summary-restore')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
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
        return (
            <div className="form">
                {this.renderTitleInput()}
                {this.renderNameInput()}
                {this.renderDescriptionInput()}
                {this.renderEmblemSelector()}
                {this.renderMembershipOptions()}
                {this.renderAccessControlOptions()}
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
            value: this.getProjectProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly: !this.isEditing(),
        };
        return (
            <MultilingualTextField {...props}>
                {t('project-summary-title')}
            </MultilingualTextField>
        );
    },

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'name',
            value: this.getProjectProperty('name'),
            locale: this.props.locale,
            onChange: this.handleNameChange,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        return (
            <TextField {...props}>
                {t('project-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    },

    /**
     * Render description input
     *
     * @return {ReactElement}
     */
    renderDescriptionInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'description',
            value: this.getProjectProperty('details.description'),
            availableLanguageCodes: this.getInputLanguages(),
            type: 'textarea',
            locale: this.props.locale,
            onChange: this.handleDescriptionChange,
            readOnly: !this.isEditing(),
        };
        return (
            <MultilingualTextField {...props}>
                {t('project-summary-description')}
            </MultilingualTextField>
        );
    },

    /**
     * Render image selector
     *
     * @return {ReactElement}
     */
    renderEmblemSelector: function() {
        var t = this.props.locale.translate;
        var props = {
            purpose: 'project-emblem',
            desiredWidth: 500,
            desiredHeight: 500,
            resources: this.getProjectProperty('details.resources'),
            database: this.props.database,
            locale: this.props.locale,
            theme: this.props.theme,
            payloads: this.props.payloads,
            onChange: this.handleEmblemChange,
            readOnly: !this.isEditing(),
        };
        return (
            <ImageSelector {...props}>
                {t('project-summary-emblem')}
            </ImageSelector>
        );
    },

    /**
     * Render project membership option list
     *
     * @return {ReactElement}
     */
    renderMembershipOptions: function() {
        var t = this.props.locale.translate;
        var memOptsCurr = this.getProjectProperty('settings.membership', 'current') || {};
        var memOptsPrev = this.getProjectProperty('settings.membership', 'original') || {};
        var newProject = !!this.getProjectProperty('id');
        var optionProps = [
            {
                name: 'manual',
                selected: !_.some(memOptsCurr),
                previous: (newProject) ? !_.some(memOptsPrev) : undefined,
                children: t('project-summary-new-members-manual'),
            },
            {
                name: 'allow_user_request',
                selected: memOptsCurr.allow_user_request,
                previous: memOptsPrev.allow_user_request,
                children: t('project-summary-new-members-join-user'),
            },
            {
                name: 'approve_user_request',
                selected: memOptsCurr.approve_user_request,
                previous: memOptsPrev.approve_user_request,
                hidden: !memOptsCurr.allow_user_request,
                children: t('project-summary-new-members-auto-accept-user'),
            },
            {
                name: 'allow_guest_request',
                selected: memOptsCurr.allow_guest_request,
                previous: memOptsPrev.allow_guest_request,
                children: t('project-summary-new-members-join-guest'),
            },
            {
                name: 'approve_guest_request',
                selected: memOptsCurr.approve_guest_request,
                previous: memOptsPrev.approve_guest_request,
                hidden: !memOptsCurr.allow_guest_request,
                children: t('project-summary-new-members-auto-accept-guest'),
            },
        ];
        var listProps = {
            onOptionClick: this.handleMembershipOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>{t('project-summary-new-members')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    },

    /**
     * Render project access control option list
     *
     * @return {ReactElement}
     */
    renderAccessControlOptions: function() {
        var t = this.props.locale.translate;
        var acOptsCurr = this.getProjectProperty('settings.access_control', 'current') || {};
        var acOptsPrev = this.getProjectProperty('settings.access_control', 'original') || {};
        var newProject = !!this.getProjectProperty('id');
        var optionProps = [
            {
                name: 'members_only',
                selected: !_.some(acOptsCurr),
                previous: (newProject) ? !_.some(acOptsPrev) : undefined,
                children: t('project-summary-access-control-member-only')
            },
            {
                name: 'grant_view_access',
                selected: acOptsCurr.grant_view_access,
                previous: acOptsPrev.grant_view_access,
                children: t('project-summary-access-control-non-member-view')
            },
            {
                name: 'grant_comment_access',
                selected: acOptsCurr.grant_comment_access,
                previous: acOptsPrev.grant_comment_access,
                hidden: !acOptsCurr.grant_view_access,
                children: t('project-summary-access-control-non-member-comment')
            },
        ];
        var listProps = {
            onOptionClick: this.handleAccessControlOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>{t('project-summary-access-control')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    },

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions: function() {
        var instructionProps = {
            folder: 'project',
            topic: 'project-summary',
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
     * Save project with new flags
     *
     * @param  {Object} flags
     *
     * @return {Promise<Project>}
     */
    changeFlags: function(flags) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var projectAfter = _.assign({}, this.props.project, flags);
        return db.saveOne({ table: 'project' }, projectAfter);
    },

    /**
     * Called when user select archive project
     *
     * @param  {Event} evt
     */
    handleArchiveClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('project-summary-confirm-archive');
        return this.components.confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ archived: true }).then((project) => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user select delete project
     *
     * @param  {Event} evt
     */
    handleDeleteClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('project-summary-confirm-delete');
        return this.components.confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ deleted: true }).then((project) => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user select delete project
     *
     * @param  {Event} evt
     */
    handleRestoreClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('project-summary-confirm-restore');
        return this.components.confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ archived: false, deleted: false });
            }
        });
    },

    /**
     * Called when user click return button
     *
     * @param  {Event} evt
     */
    handleReturnClick: function(evt) {
        return this.returnToList();
    },

    /**
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        return this.startNew();
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
        var project = _.omit(this.getProject(), 'user_ids', 'repo_ids');
        this.setState({ saving: true, adding: !project.id, problems: {} }, () => {
            var schema = 'global';
            var db = this.props.database.use({ schema, by: this });
            return db.start().then((userId) => {
                return db.saveOne({ table: 'project' }, project).then((project) => {
                    this.props.payloads.dispatch(project);
                    this.setState({ hasChanges: false, saving: false }, () => {
                        this.setEditability(false, project);
                    });
                    return null;
                });
            }).catch((err) => {
                var problems = {};
                if (err.statusCode === 409) {
                    problems.name = 'validation-duplicate-project-name';
                } else {
                    problems.general = err.message;
                    console.error(err);
                }
                this.setState({ problems, saving: false });
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
        var name = _.toLower(evt.target.value).replace(/\W+/g, '');
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
    handleMembershipOptionClick: function(evt) {
        var memOpts = _.clone(this.getProjectProperty('settings.membership')) || {};
        switch (evt.name) {
            case 'manual':
                memOpts = {};
                break;
            case 'allow_user_request':
                if (memOpts.allow_user_request) {
                    delete memOpts.allow_user_request;
                    delete memOpts.approve_user_request;
                } else {
                    memOpts.allow_user_request = true;
                }
                break;
            case 'approve_user_request':
                if (memOpts.approve_user_request) {
                    delete memOpts.approve_user_request;
                } else {
                    memOpts.approve_user_request = true;
                }
                break;
            case 'allow_guest_request':
                if (memOpts.allow_guest_request) {
                    delete memOpts.allow_guest_request;
                    delete memOpts.approve_guest_request;
                } else {
                    memOpts.allow_guest_request = true;
                }
                break;
            case 'approve_guest_request':
                if (memOpts.approve_guest_request) {
                    delete memOpts.approve_guest_request;
                } else {
                    memOpts.approve_guest_request = true;
                }
                break;
        }
        this.setProjectProperty(`settings.membership`, memOpts);
    },

    /**
     * Called when user clicks an option under membership or access control
     *
     * @param  {Object} evt
     */
    handleAccessControlOptionClick: function(evt) {
        var acOpts = _.clone(this.getProjectProperty('settings.access_control')) || {};
        switch (evt.name) {
            case 'members_only':
                acOpts = {};
                break;
            case 'grant_view_access':
                if (acOpts.grant_view_access) {
                    delete acOpts.grant_view_access;
                } else {
                    acOpts.grant_view_access = true;
                }
                break;
            case 'grant_comment_access':
                if (acOpts.grant_comment_access) {
                    delete acOpts.grant_comment_access;
                } else {
                    acOpts.grant_comment_access = true;
                }
                break;
        }
        this.setProjectProperty(`settings.access_control`, acOpts);
    },
});

var emptyProject = {
    details: {},
    settings: ProjectSettings.default,
};

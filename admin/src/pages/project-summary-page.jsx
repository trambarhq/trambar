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
        var projectOriginal = this.props.project;
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
        var optionListProps = {
            onOptionClick: this.handleOptionClick,
            readOnly,
        };
        var sc = findSettings(project);
        var sp = findSettings(this.props.project);
        var membershipProps = [
            {
                name: 'manual',
                selected: !sc.membership.accept_team_member_automatically
                       && !sc.membership.accept_approved_users_automaticlly,
                previous: !sp.membership.accept_team_member_automatically
                       && !sp.membership.accept_approved_users_automaticlly,
                children: 'Members are added manually',
            },
            {
                name: 'accept_team_member_automatically',
                selected: sc.membership.accept_team_member_automatically,
                previous: sp.membership.accept_team_member_automatically,
                children: 'Team members become project members automatically',
            },
            {
                name: 'accept_approved_users_automaticlly',
                selected: sc.membership.accept_approved_users_automaticlly,
                previous: sp.membership.accept_approved_users_automaticlly,
                children: 'Approved users become members automatically',
            },
            {
                name: 'allow_request',
                selected: sc.membership.allow_request,
                previous: sp.membership.allow_request,
                children: 'People can request to join project',
            },
        ];
        var accessControlProps = [
            {
                name: 'members_only',
                selected: !sc.access_control.grant_team_members_read_only
                       && !sc.access_control.grant_approved_users_read_only
                       && !sc.access_control.grant_unapproved_users_read_only,
                previous: !sp.access_control.grant_team_members_read_only
                       && !sp.access_control.grant_approved_users_read_only
                       && !sp.access_control.grant_unapproved_users_read_only,
               children: 'Only project members can view contents',
            },
            {
                name: 'grant_team_members_read_only',
                selected: sc.access_control.grant_team_members_read_only,
                previous: sp.access_control.grant_team_members_read_only,
                children: 'Team members can view contents but cannot post',
            },
            {
                name: 'grant_approved_users_read_only',
                selected: sc.access_control.grant_approved_users_read_only,
                previous: sp.access_control.grant_approved_users_read_only,
                children: 'Approved users can view contents but cannot post',
            },
            {
                name: 'grant_unapproved_users_read_only',
                selected: sc.access_control.grant_unapproved_users_read_only,
                previous: sp.access_control.grant_unapproved_users_read_only,
                children: 'Pending users can view contents but cannot post',
            },
        ];
        return (
            <div className="form">
                <TextField {...titleProps}>{t('project-summary-title')}</TextField>
                <TextField {...nameProps}>{t('project-summary-name')}</TextField>
                <TextField {...descriptionProps}>{t('project-summary-description')}</TextField>
                <OptionList {...optionListProps}>
                    <label>New members</label>
                    <option {...membershipProps[0]} />
                    <option {...membershipProps[1]} />
                    <option {...membershipProps[2]} />
                    <option {...membershipProps[3]} />
                </OptionList>
                <OptionList {...optionListProps}>
                    <label>Access control</label>
                    <option {...accessControlProps[0]} />
                    <option {...accessControlProps[1]} />
                    <option {...accessControlProps[2]} />
                    <option {...accessControlProps[3]} />
                </OptionList>
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
                console.log(project);
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

var defaultSettings = {
    membership: {
        accept_team_member_automatically: true,
        accept_approved_users_automaticlly: false,
        allow_request: true,
    },
    access_control: {
        grant_team_members_read_only: true,
        grant_approved_users_read_only: true,
        grant_unapproved_users_read_only: false,
    },
};

var emptySettings = {
    membership: {},
    access_control: {},
};

function findSettings(project) {
    if (project) {
        return _.merge({}, defaultSettings, project.settings);
    } else {
        return emptySettings;
    }
}

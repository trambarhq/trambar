var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var UserUtils = require('objects/utils/user-utils');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var PushButton = require('widgets/push-button');
var SystemDescriptionDialogBox = require('dialogs/system-description-dialog-box');
var ProjectDescriptionDialogBox = require('dialogs/project-description-dialog-box');
var MobileSetupDialogBox = require('dialogs/mobile-setup-dialog-box');
var ConfirmationDialogBox = require('dialogs/confirmation-dialog-box');
var ProjectManagementDialogBox = require ('dialogs/project-management-dialog-box');

require('./project-panel.scss');

module.exports = React.createClass({
    displayName: 'ProjectPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        system: PropTypes.object,
        currentUser: PropTypes.object,
        currentProject: PropTypes.object,
        projectLinks: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onChange: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            renderingDialog: null,
            showingDialog: false,
        };
    },

    /**
     * Check if current user has gained membership and if so, bring up a
     * dialog box with a message
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var projectBefore = this.props.currentProject;
        var projectAfter = nextProps.currentProject;
        var user = this.props.currentUser;
        if (projectBefore !== projectAfter) {
            if (projectBefore && projectAfter && projectBefore.id === projectAfter.id) {
                var isMemberBefore = UserUtils.isMember(user, projectBefore);
                var isMemberAfter = UserUtils.isMember(user, projectAfter);
                if (!isMemberBefore && isMemberAfter) {
                    if (!this.state.renderingDialog) {
                        this.setState({
                            renderingDialog: 'membership',
                            showingDialog: true,
                        });
                    }
                }
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
        return (
            <SettingsPanel className="project">
                <header>
                    <i className="fa fa-database" /> {t('settings-projects')}
                </header>
                <body>
                    {this.renderProjects()}
                    {this.renderDialogBox()}
                </body>
                <footer>
                    {this.renderButtons()}
                </footer>
            </SettingsPanel>
        );
    },

    /**
     * Render list of projects
     *
     * @return {Array<ReactElement>}
     */
    renderProjects: function() {
        return _.map(this.props.projectLinks, this.renderProject);
    },

    /**
     * Render a project option, with additional links if it's the current project
     *
     * @param  {Object} link
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderProject: function(link, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var params = this.props.route.parameters;
        if (link.schema === params.schema && link.address == params.address) {
            var isMember = true;
            var isApplying = false;
            var project = this.props.currentProject;
            var user = this.props.currentUser;
            if (project && user) {
                if (!_.includes(project.user_ids, user.id)) {
                    isMember = false;
                    if (_.includes(user.requested_project_ids, project.id)) {
                        isApplying = true;
                    }
                }
            }
            var serverProps = {
                icon: 'home',
                label: link.address,
                onClick: this.handleSystemDescriptionClick,
            };
            var descriptionProps = {
                icon: 'info-circle',
                label: t('project-management-description'),
                onClick: this.handleProjectDescriptionClick,
            };
            var mobileProps = {
                icon: 'qrcode',
                label: t('project-management-mobile-set-up'),
                hidden: (process.env.PLATFORM === 'cordova'),
                onClick: this.handleMobileSetupClick,
            };
            var membershipProps = {
                icon: isApplying ? 'clock-o' : 'user-circle-o',
                label: t(`project-management-${isApplying ? 'withdraw-request' : 'join-project'}`),
                hidden: isMember,
                onClick: isApplying ? this.handleCancelJoinClick : this.handleJoinClick,
            };
            var signOutProps = {
                icon: 'sign-out',
                label: t('project-management-sign-out'),
                onClick: this.handleSignOutClick,
            };
            return (
                <div key={i} className="project-option-button selected">
                    <i className="icon fa fa-check-circle" />
                    <div className="text">
                        <span className="name">{p(link.name)}</span>
                        <div className="supplemental">
                            <SupplementalProjectOption {...serverProps} />
                            <SupplementalProjectOption {...descriptionProps} />
                            <SupplementalProjectOption {...mobileProps} />
                            <SupplementalProjectOption {...membershipProps} />
                            <SupplementalProjectOption {...signOutProps} />
                        </div>
                    </div>
                </div>
            );
        } else {
            return (
                <div key={i} data-key={link.key} className="project-option-button" onClick={this.handleProjectClick}>
                    <i className="icon fa fa-circle-o" />
                    <div className="text">
                        <span className="name">{p(link.name)}</span>
                    </div>
                </div>
            );
        }
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var addProps = {
            label: t('project-management-add'),
            onClick: this.handleAddClick,
        };
        var manageProps = {
            label: t('project-management-manage'),
            onClick: this.handleManageClick,
        };
        return (
            <div className="buttons">
                <PushButton {...manageProps} />
                <PushButton {...addProps} />
            </div>
        );
    },

    /**
     * Render opened dialog box
     *
     * @return {ReactElement}
     */
    renderDialogBox: function() {
        if (!this.props.currentProject) {
            return null;
        }
        return (
            <div>
                {this.renderSystemDescriptionDialogBox()}
                {this.renderProjectDescriptionDialogBox()}
                {this.renderMobileSetupDialogBox()}
                {this.renderSignOutDialogBox()}
                {this.renderProjectManagementDialogBox()}
                {this.renderMembershipDialogBox()}
            </div>
        );
    },

    /**
     * Render project description dialog box
     *
     * @return {ReactElement|null}
     */
    renderSystemDescriptionDialogBox: function() {
        if (this.state.renderingDialog !== 'system-description') {
            return null;
        }
        var props = {
            show: this.state.showingDialog,
            system: this.props.system,
            locale: this.props.locale,
            theme: this.props.theme,
            onClose: this.handleDialogClose,
        };
        return <SystemDescriptionDialogBox {...props} />;
    },

    /**
     * Render project description dialog box
     *
     * @return {ReactElement|null}
     */
    renderProjectDescriptionDialogBox: function() {
        if (this.state.renderingDialog !== 'project-description') {
            return null;
        }
        var props = {
            show: this.state.showingDialog,
            project: this.props.currentProject,
            locale: this.props.locale,
            theme: this.props.theme,
            onClose: this.handleDialogClose,
        };
        return <ProjectDescriptionDialogBox {...props} />;
    },

    /**
     * Render mobile setup dialog box
     *
     * @return {ReactElement|null}
     */
    renderMobileSetupDialogBox: function() {
        if (this.state.renderingDialog !== 'mobile-setup') {
            return null;
        }
        var props = {
            show: this.state.showingDialog,
            system: this.props.system,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            onClose: this.handleDialogClose,
        };
        return <MobileSetupDialogBox {...props} />;
    },

    /**
     * Render sign out dialog box
     *
     * @return {ReactElement|null}
     */
    renderSignOutDialogBox: function() {
        if (this.state.renderingDialog !== 'sign-out') {
            return null;
        }
        var t = this.props.locale.translate;
        var props = {
            show: this.state.showingDialog,
            locale: this.props.locale,
            onClose: this.handleDialogClose,
            onConfirm: this.handleSignOutConfirm,
        };
        return (
            <ConfirmationDialogBox {...props}>
                {t('project-management-sign-out-are-you-sure')}
            </ConfirmationDialogBox>
        );
    },

    /**
     * Render message when user joins project
     *
     * @return {ReactElement|null}
     */
    renderMembershipDialogBox: function() {
        if (this.state.renderingDialog !== 'membership') {
            return null;
        }
        var t = this.props.locale.translate;
        var n = this.props.locale.name;
        var user = this.props.currentUser;
        var name = n(_.get(user, 'details.name'), _.get(user, 'details.gender'));
        var props = {
            show: this.state.showingDialog,
            locale: this.props.locale,
            onConfirm: this.handleDialogClose,
        };
        return (
            <ConfirmationDialogBox {...props}>
                {t('membership-request-$you-are-now-member', name)}
            </ConfirmationDialogBox>
        );
    },

    /**
     * Render project management dialog box
     *
     * @return {ReactElement|null}
     */
    renderProjectManagementDialogBox: function() {
        if (this.state.renderingDialog !== 'management') {
            return null;
        }
        var props = {
            show: this.state.showingDialog,
            projectLinks: this.props.projectLinks,
            route: this.props.route,
            locale: this.props.locale,
            onDelete: this.handleProjectDelete,
            onCancel: this.handleDialogClose,
        };
        return <ProjectManagementDialogBox {...props} />
    },

    handleProjectClick: function(evt) {
        var key = evt.currentTarget.getAttribute('data-key');
        var link = _.find(this.props.projectLinks, { key });
        if (link) {
            // redirect to settings page with new schema, possibly new address
            var siteAddress = window.location.origin;
            var params = {
                address: link.address,
                schema: link.schema,
                cors: (siteAddress !== link.address),
            };
            this.props.route.replace(require('pages/settings-page'), params);
        }
    },

    /**
     * Called when user clicks add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        this.props.route.push(require('pages/start-page'), { add: true });
    },

    /**
     * Called when user clicks manage list button
     *
     * @param  {Event} evt
     */
    handleManageClick: function(evt) {
        this.setState({
            renderingDialog: 'management',
            showingDialog: true,
        });
    },

    /**
     * Called when user clicks description button
     *
     * @param  {Event} evt
     */
    handleSystemDescriptionClick: function(evt) {
        this.setState({
            renderingDialog: 'system-description',
            showingDialog: true,
        });
    },

    /**
     * Called when user clicks description button
     *
     * @param  {Event} evt
     */
    handleProjectDescriptionClick: function(evt) {
        this.setState({
            renderingDialog: 'project-description',
            showingDialog: true,
        });
    },

    /**
     * Called when user clicks mobile-setup button
     *
     * @param  {Event} evt
     */
    handleMobileSetupClick: function(evt) {
        this.setState({
            renderingDialog: 'mobile-setup',
            showingDialog: true,
        });
    },

    /**
     * Called when user clicks withdraw-request button
     *
     * @param  {Event} evt
     */
    handleJoinClick: function(evt) {
        var userAfter = _.cloneDeep(this.props.currentUser);
        userAfter.requested_project_ids = _.union(userAfter.requested_project_ids, [ this.props.currentProject.id ]);
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    },

    /**
     * Called when user clicks join-project button
     *
     * @param  {Event} evt
     */
    handleCancelJoinClick: function(evt) {
        var userAfter = _.cloneDeep(this.props.currentUser);
        _.pull(userAfter.requested_project_ids, this.props.currentProject.id);
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    },

    /**
     * Called when user clicks sign-out button
     *
     * @param  {Event} evt
     */
    handleSignOutClick: function(evt) {
        this.setState({
            renderingDialog: 'sign-out',
            showingDialog: true,
        });
    },

    /**
     * Called when user closes a dialog box
     *
     * @param  {Object} evt
     */
    handleDialogClose: function(evt) {
        this.setState({ showingDialog: false }, () => {
            setTimeout(() => {
                this.setState({ renderingDialog: null });
            }, 500);
        });
    },

    /**
     * Called when user choose to remove selected projects
     *
     * @param  {Object} evt
     */
    handleProjectDelete: function(evt) {
        this.handleDialogClose();

        // redirect to start page if the current project was removed
        var params = this.props.route.parameters;
        var removingCurrent = _.includes(evt.selection, `${params.address}/${params.schema}`);
        var links = _.map(evt.selection, (key) => { return { key } });
        var db = this.props.database.use({ by: this });
        db.remove({ schema: 'local', table: 'project_link' }, links).then(() => {
            if (removingCurrent) {
                return this.props.route.replace(require('pages/start-page'));
            }
        });
    },

    /**
     * Called when user confirms his intention to sign out
     *
     * @param {Object} evt
     */
    handleSignOutConfirm: function(evt) {
        var params = this.props.route.parameters;
        var db = this.props.database.use({ by: this });
        db.endSession().then(() => {
            // delete links of all projects on server
            var serverLinks = _.filter(this.props.projectLinks, { address: params.address });
            return db.remove({ schema: 'local', table: 'project_link' }, serverLinks).then(() => {
                return this.props.route.replace(require('pages/start-page'));
            });
        });
    },
});

function SupplementalProjectOption(props) {
    if (props.hidden) {
        return null;
    }
    return (
        <div className="item">
            <span className="button" onClick={props.onClick}>
                <i className={`fa fa-fw fa-${props.icon}`} />
                <span className="label">{props.label}</span>
            </span>
        </div>
    );
}

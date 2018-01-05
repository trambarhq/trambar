var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var SettingsPanel = require('widgets/settings-panel');
var PushButton = require('widgets/push-button');
var ProjectDescriptionDialogBox = require('dialogs/project-description-dialog-box');
var MobileSetupDialogBox = require('dialogs/mobile-setup-dialog-box');
var ConfirmationDialogBox = require('dialogs/confirmation-dialog-box');
var ProjectManagementDialogBox = require ('dialogs/project-management-dialog-box');

require('./project-panel.scss');

module.exports = React.createClass({
    displayName: 'ProjectPanel',
    mixins: [ UpdateCheck ],
    propTypes: {
        currentProject: PropTypes.object,
        projectLinks: PropTypes.arrayOf(PropTypes.object),

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
            renderingDialog: null,
            showingDialog: false,
        };
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
            var serverProps = {
                icon: 'home',
                label: link.address,
                onClick: this.handleAddressClick,
            };
            var descriptionProps = {
                icon: 'info-circle',
                label: t('project-management-description'),
                onClick: this.handleDescriptionClick,
            };
            var mobileProps = {
                icon: 'qrcode',
                label: t('project-management-mobile-set-up'),
                hidden: (process.env.PLATFORM === 'cordova'),
                onClick: this.handleMobileSetupClick,
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
            disabled: _.size(this.props.projectLinks) < 2,
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
                {this.renderDescriptionDialogBox()}
                {this.renderMobileSetupDialogBox()}
                {this.renderSignOutDialogBox()}
                {this.renderProjectManagementDialogBox()}
            </div>
        );
    },

    /**
     * Render project description dialog box
     *
     * @return {ReactElement|null}
     */
    renderDescriptionDialogBox: function() {
        if (this.state.renderingDialog !== 'description') {
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
            var params = {
                address: link.address,
                schema: link.schema,
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
    handleDescriptionClick: function(evt) {
        this.setState({
            renderingDialog: 'description',
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
        var links = _.map(evt.selection, (key) => {
            return { key };
        });
        var db = this.props.database.use({ by: this });
        db.remove({ schema: 'local', table: 'project_link' }, links).then(() => {
            this.handleDialogClose();
        });
    },

    /**
     * Called when user confirms his intention to sign out
     *
     * @param {Object} evt
     */
    handleSignOutConfirm: function(evt) {
        var db = this.props.database.use({ by: this });
        db.endSession().then(() => {
            return this.props.route.replace(require('pages/start-page'));
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

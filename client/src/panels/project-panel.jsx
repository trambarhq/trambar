import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import SettingsPanel from '../widgets/settings-panel.jsx';
import PushButton from '../widgets/push-button.jsx';
import SystemDescriptionDialogBox from '../dialogs/system-description-dialog-box';
import ProjectDescriptionDialogBox from '../dialogs/project-description-dialog-box';
import MobileSetupDialogBox from '../dialogs/mobile-setup-dialog-box';
import ConfirmationDialogBox from '../dialogs/confirmation-dialog-box';
import ProjectManagementDialogBox from '../dialogs/project-management-dialog-box';

import './project-panel.scss';

/**
 * Panel for switching between different projects.
 *
 * @extends PureComponent
 */
class ProjectPanel extends PureComponent {
    static displayName = 'ProjectPanel';

    constructor(props) {
        super(props);
        this.state = {
            showingSystemDescription: false,
            showingProjectDescription: false,
            activatingMobileDevice: false,
            notifyingNewMembership: false,
            confirmingSignOut: false,
            managingProjects: false,
        };
    }

    /**
     * Check if current user has gained membership and if so, bring up a
     * dialog box with a message
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { currentProject, currentUser } = this.props;
        let { notifyingNewMembership } = this.state;
        if (nextProps.currentProject !== currentProject && currentProject) {
            if (nextProps.currentProject && nextProps.currentProject.id === currentProject.id) {
                let isMemberBefore = UserUtils.isMember(currentUser, currentProject);
                let isMemberAfter = UserUtils.isMember(currentUser, nextProps.currentProject);
                if (!isMemberBefore && isMemberAfter) {
                    if (!notifyingNewMembership) {
                        this.setState({ notifyingNewMembership: true });
                    }
                }
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { env } = this.props;
        let { t } = env.locale;
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
    }

    /**
     * Render list of projects
     *
     * @return {Array<ReactElement>}
     */
    renderProjects() {
        let { projectLinks } = this.props;
        return _.map(projectLinks, (link, index) => {
            return this.renderProject(link, index);
        });
    }

    /**
     * Render a project option, with additional links if it's the current project
     *
     * @param  {Object} link
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderProject(link, i) {
        let { route, env, currentProject, currentUser } = this.props;
        let { t, p } = env.locale;
        let context = route.context;
        if (link.schema === context.schema && link.address == context.address) {
            let isMember = true;
            let isApplying = false;
            if (currentProject && currentUser) {
                if (!_.includes(currentProject.user_ids, currentUser.id)) {
                    isMember = false;
                    if (_.includes(currentUser.requested_project_ids, currentProject.id)) {
                        isApplying = true;
                    }
                }
            }
            let serverProps = {
                icon: 'home',
                label: link.address,
                onClick: this.handleSystemDescriptionClick,
            };
            let descriptionProps = {
                icon: 'info-circle',
                label: t('project-management-description'),
                onClick: this.handleProjectDescriptionClick,
            };
            let mobileProps = {
                icon: 'qrcode',
                label: t('project-management-mobile-set-up'),
                hidden: (env.platform === 'cordova'),
                onClick: this.handleMobileSetupClick,
            };
            let membershipProps = {
                icon: isApplying ? 'clock-o' : 'user-circle-o',
                label: t(`project-management-${isApplying ? 'withdraw-request' : 'join-project'}`),
                hidden: isMember,
                onClick: isApplying ? this.handleCancelJoinClick : this.handleJoinClick,
            };
            let signOutProps = {
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
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env } = this.props;
        let { t } = env.locale;
        let addProps = {
            label: t('project-management-add'),
            onClick: this.handleAddClick,
        };
        let manageProps = {
            label: t('project-management-manage'),
            onClick: this.handleManageClick,
        };
        return (
            <div className="buttons">
                <PushButton {...manageProps} />
                <PushButton {...addProps} />
            </div>
        );
    }

    /**
     * Render opened dialog box
     *
     * @return {ReactElement}
     */
    renderDialogBox() {
        let { currentProject } = this.props;
        if (!currentProject) {
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
    }

    /**
     * Render project description dialog box
     *
     * @return {ReactElement|null}
     */
    renderSystemDescriptionDialogBox() {
        let { env, system } = this.props;
        let { showingSystemDescription } = this.state;
        let props = {
            show: showingSystemDescription,
            system,
            env,
            onClose: this.handleSystemDescriptionDialogClose,
        };
        return <SystemDescriptionDialogBox {...props} />;
    }

    /**
     * Render project description dialog box
     *
     * @return {ReactElement|null}
     */
    renderProjectDescriptionDialogBox() {
        let { env, currentProject } = this.props;
        let { showingProjectDescription } = this.state;
        let props = {
            show: showingProjectDescription,
            project: currentProject,
            env,
            onClose: this.handleProjectDescriptionDialogClose,
        };
        return <ProjectDescriptionDialogBox {...props} />;
    }

    /**
     * Render mobile setup dialog box
     *
     * @return {ReactElement|null}
     */
    renderMobileSetupDialogBox() {
        let { database, env, system } = this.props;
        let { activatingMobileDevice } = this.state;
        let props = {
            show: activatingMobileDevice,
            system,
            database,
            env,
            onClose: this.handleMobileSetupDialogClose,
        };
        return <MobileSetupDialogBox {...props} />;
    }

    /**
     * Render sign out dialog box
     *
     * @return {ReactElement|null}
     */
    renderSignOutDialogBox() {
        let { env } = this.props;
        let { confirmingSignOut } = this.state;
        let { t } = env.locale;
        let props = {
            show: confirmingSignOut,
            env,
            onClose: this.handleConfirmationDialogClose,
            onConfirm: this.handleSignOutConfirm,
        };
        return (
            <ConfirmationDialogBox {...props}>
                {t('project-management-sign-out-are-you-sure')}
            </ConfirmationDialogBox>
        );
    }

    /**
     * Render message when user joins project
     *
     * @return {ReactElement|null}
     */
    renderMembershipDialogBox() {
        let { env, currentUser } = this.props;
        let { notifyingNewMembership } = this.state;
        let { t, g } = env.locale;
        let name = UserUtils.getDisplayName(currentUser, env);
        let gender = UserUtils.getGender(currentUser);
        g(name, gender);
        let props = {
            show: notifyingNewMembership,
            env,
            onConfirm: this.handleMembershipDialogClose,
        };
        return (
            <ConfirmationDialogBox {...props}>
                {t('membership-request-$you-are-now-member', name)}
            </ConfirmationDialogBox>
        );
    }

    /**
     * Render project management dialog box
     *
     * @return {ReactElement|null}
     */
    renderProjectManagementDialogBox() {
        let { route, env, projectLinks } = this.props;
        let { managingProjects } = this.state;
        let props = {
            show: managingProjects,
            projectLinks,
            route,
            env,
            onDelete: this.handleProjectDelete,
            onCancel: this.handleProjectManagementDialogClose,
        };
        return <ProjectManagementDialogBox {...props} />
    }

    handleProjectClick = (evt) => {
        let { route, projectLinks } = this.props;
        let key = evt.currentTarget.getAttribute('data-key');
        let link = _.find(projectLinks, { key });
        if (link) {
            // redirect to settings page with new schema, possibly new address
            let siteAddress = window.location.origin;
            let context = {
                address: link.address,
                schema: link.schema,
                cors: (siteAddress !== link.address),
            };
            route.replace('settings-page', {}, context);
        }
    }

    /**
     * Called when user clicks add button
     *
     * @param  {Event} evt
     */
    handleAddClick = (evt) => {
        let { route } = this.props;
        route.push('start-page', {}, { schema: null });
    }

    /**
     * Called when user clicks manage list button
     *
     * @param  {Event} evt
     */
    handleManageClick = (evt) => {
        this.setState({ managingProjects: true });
    }

    /**
     * Called when user clicks description button
     *
     * @param  {Event} evt
     */
    handleSystemDescriptionClick = (evt) => {
        this.setState({ showingSystemDescription: true });
    }

    /**
     * Called when user clicks description button
     *
     * @param  {Event} evt
     */
    handleProjectDescriptionClick = (evt) => {
        this.setState({ showingProjectDescription: true });
    }

    /**
     * Called when user clicks mobile-setup button
     *
     * @param  {Event} evt
     */
    handleMobileSetupClick = (evt) => {
        this.setState({ activatingMobileDevice: true });
    }

    /**
     * Called when user clicks withdraw-request button
     *
     * @param  {Event} evt
     */
    handleJoinClick = (evt) => {
        let { currentUser, currentProject, onChange } = this.props;
        let userAfter = _.cloneDeep(currentUser);
        userAfter.requested_project_ids = _.union(userAfter.requested_project_ids, [ currentProject.id ]);
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    }

    /**
     * Called when user clicks join-project button
     *
     * @param  {Event} evt
     */
    handleCancelJoinClick = (evt) => {
        let { currentUser, currentProject, onChange } = this.props;
        let userAfter = _.cloneDeep(currentUser);
        _.pull(userAfter.requested_project_ids, currentProject.id);
        if (onChange) {
            onChange({
                type: 'change',
                target: this,
                user: userAfter
            });
        }
    }

    /**
     * Called when user clicks sign-out button
     *
     * @param  {Event} evt
     */
    handleSignOutClick = (evt) => {
        this.setState({ confirmingSignOut: true });
    }

    /**
     * Called when user closes the system description dialog box
     *
     * @param  {Object} evt
     */
    handleSystemDescriptionDialogClose = (evt) => {
        this.setState({ showingSystemDescription: false });
    }

    /**
     * Called when user closes the project description dialog box
     *
     * @param  {Object} evt
     */
    handleProjectDescriptionDialogClose = (evt) => {
        this.setState({ showingProjectDescription: false });
    }

    /**
     * Called when user closes the mobile set-up dialog box
     *
     * @param  {Object} evt
     */
    handleMobileSetupDialogClose = (evt) => {
        this.setState({ activatingMobileDevice: false });
    }

    /**
     * Called when user closes the membership notification dialog box
     *
     * @param  {Object} evt
     */
    handleMembershipDialogClose = (evt) => {
        this.setState({ notifyingNewMembership: false });
    }

    /**
     * Called when user closes the membership notification dialog box
     *
     * @param  {Object} evt
     */
    handleConfirmationDialogClose = (evt) => {
        this.setState({ confirmingSignOut: false });
    }

    /**
     * Called when user closes the project management dialog box
     *
     * @param  {Object} evt
     */
    handleProjectManagementDialogClose = (evt) => {
        this.setState({ managingProjects: false });
    }

    /**
     * Called when user choose to remove selected projects
     *
     * @param  {Object} evt
     */
    handleProjectDelete = async (evt) => {
        this.handleProjectManagementDialogClose();

        // redirect to start page if the current project was removed
        let { database, route } = this.props;
        let context = route.context;
        let removingCurrent = _.includes(evt.selection, `${context.address}/${context.schema}`);
        let links = _.map(evt.selection, (key) => { return { key } });
        let db = database.use({ by: this });
        await db.remove({ schema: 'local', table: 'project_link' }, links);
        if (removingCurrent) {
            return route.replace('start-page', {}, { schema: null });
        }
    }

    /**
     * Called when user confirms his intention to sign out
     *
     * @param {Object} evt
     */
    handleSignOutConfirm = async (evt) => {
        let { database, route, projectLinks } = this.props;
        let context = route.context;
        let db = database.use({ by: this });
        await db.endSession();
        // delete links of all projects on server
        let serverLinks = _.filter(projectLinks, { address: context.address });
        await db.remove({ schema: 'local', table: 'project_link' }, serverLinks);
    }
}

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

export {
    ProjectPanel as default,
    ProjectPanel,
};

import Database from 'common/data/database.mjs';
import Route from 'common/routing/route.mjs';
import Environment from 'common/env/environment.mjs';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ProjectPanel.propTypes = {
        system: PropTypes.object,
        currentUser: PropTypes.object,
        currentProject: PropTypes.object,
        projectLinks: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onChange: PropTypes.func,
    };
}

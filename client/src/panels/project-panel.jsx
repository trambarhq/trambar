import _ from 'lodash';
import React, { useState, useEffect } from 'react';
import { useListener, useErrorCatcher } from 'relaks';
import * as ProjectLinkSaver from 'common/objects/savers/project-link-saver.js';
import * as UserUtils from 'common/objects/utils/user-utils.js';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { SystemDescriptionDialogBox } from '../dialogs/system-description-dialog-box.jsx';
import { ProjectDescriptionDialogBox } from '../dialogs/project-description-dialog-box.jsx';
import { MobileSetupDialogBox } from '../dialogs/mobile-setup-dialog-box.jsx';
import { ProjectManagementDialogBox } from '../dialogs/project-management-dialog-box.jsx';

import {
  useConfirmation,
  useDialogHandling,
} from '../hooks.js';

import './project-panel.scss';

/**
 * Panel for switching between different projects.
 */
export function ProjectPanel(props) {
  const { database, route, env, userDraft, system, project, projectLinks } = props;
  const { t, p } = env.locale;
  const isMember = UserUtils.isMember(userDraft.current, project);
  const [ wasMember, setWasMember ] = useState(isMember);
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();

  const handleProjectOptionClick = useListener((evt) => {
    const key = evt.currentTarget.getAttribute('data-key');
    const link = _.find(projectLinks, { key });
    if (link) {
      // redirect to settings page with new schema, possibly new address
      const siteAddress = window.location.origin;
      const context = {
        address: link.address,
        schema: link.schema,
        cors: (siteAddress !== link.address),
      };
      route.replace('settings-page', {}, context);
    }
  });
  const handleAddClick = useListener((evt) => {
    route.push('start-page', {}, { schema: null });
  });
  const handleJoinClick = useListener((evt) => {
    const projectIDsBefore = userDraft.get('requested_project_ids', []);
    const projectIDs = _.union(projectIDsBefore, [ project.id ]);
    userDraft.set('requested_project_ids', projectIDs);
  });
  const handleCancelJoinClick = useListener((evt) => {
    const projectIDsBefore = userDraft.get('requested_project_ids', []);
    const projectIDs = _.difference(projectIDsBefore, [ project.id ]);
    userDraft.set('requested_project_ids', projectIDs);
  });
  const handleSignOutClick = useListener((evt) => {
    run(async () => {
      await confirm(t('project-management-sign-out-are-you-sure'));

      const { address } = route.context;
      await database.endSession();

      // delete links of all projects on server
      const serverLinks = _.filter(projectLinks, { address });
      await ProjectLinkSaver.removeLinks(database, serverLinks);
    });
  });
  const handleProjectDelete = useListener(async (evt) => {
    // redirect to start page if the current project was removed
    const { address, schema } = route.context;
    const removingCurrent = _.includes(evt.selection, `${address}/${schema}`);
    const links = _.map(evt.selection, (key) => { return { key } });
    await db.remove({ schema: 'local', table: 'project_link' }, links);
    if (removingCurrent) {
      await route.replace('start-page', {}, { schema: null });
    } else {
      handleManagementDialogClose();
    }
  });
  const [ showingSystem, handleSystemClick, handleSystemDialogClose ] = useDialogHandling();
  const [ showingProject, handleProjectClick, handleProjectDialogClose ] = useDialogHandling();
  const [ activatingDevice, handleActivateClick, handleActivationDialogClose ] = useDialogHandling();
  const [ managingProjects, handleManageClick, handleManagementDialogClose ] = useDialogHandling();

  useEffect(() => {
    // Check if current user has gained membership and if so, bring up a
    // dialog box with a message
    if (!wasMember && isMember) {
      confirm(t('membership-request-$you-are-now-member', name), true);
      setWasMember(true);
    }
  }, [ wasMember, isMember ]);

  return (
    <SettingsPanel className="project">
      <header>
        <i className="fas fa-database" /> {t('settings-projects')}
      </header>
      <body>
        {_.map(projectLinks, renderProject)}
        {renderDialogBox()}
      </body>
      <footer>
        {renderButtons()}
      </footer>
    </SettingsPanel>
  );

  function renderProject(link, i) {
    const { schema, address } = route.context;
    if (link.schema === schema && link.address == address) {
      let isMember = true;
      let isApplying = false;
      if (project) {
        const userID = userDraft.get('id');
        const projectIDs = userDraft.get('requested_project_ids');
        if (!_.includes(project.user_ids, userID)) {
          isMember = false;
          if (_.includes(projectIDs, project.id)) {
            isApplying = true;
          }
        }
      }
      const serverProps = {
        icon: 'home',
        label: link.address,
        onClick: handleSystemClick,
      };
      const descriptionProps = {
        icon: 'info-circle',
        label: t('project-management-description'),
        onClick: handleProjectClick,
      };
      const mobileProps = {
        icon: 'qrcode',
        label: t('project-management-mobile-set-up'),
        hidden: (env.platform === 'cordova'),
        onClick: handleActivateClick,
      };
      const membershipProps = {
        icon: isApplying ? 'clock-o' : 'user-circle-o',
        label: t(`project-management-${isApplying ? 'withdraw-request' : 'join-project'}`),
        hidden: isMember,
        onClick: (isApplying) ? handleCancelJoinClick : handleJoinClick,
      };
      const signOutProps = {
        icon: 'sign-out',
        label: t('project-management-sign-out'),
        onClick: handleSignOutClick,
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
        <div key={i} data-key={link.key} className="project-option-button" onClick={handleProjectOptionClick}>
          <i className="icon far fa-circle" />
          <div className="text">
            <span className="name">{p(link.name)}</span>
          </div>
        </div>
      );
    }
  }

  function renderButtons() {
    const addProps = {
      label: t('project-management-add'),
      onClick: handleAddClick,
    };
    const manageProps = {
      label: t('project-management-manage'),
      onClick: handleManageClick,
    };
    return (
      <div className="buttons">
        <PushButton {...manageProps} />
        <PushButton {...addProps} />
      </div>
    );
  }

  function renderDialogBox() {
    if (!project) {
      return null;
    }
    return (
      <div>
        {renderSystemDialogBox()}
        {renderProjectDialogBox()}
        {renderActivationDialogBox()}
        {renderManagementDialogBox()}
        <ActionConfirmation ref={confirmationRef} env={env} />
      </div>
    );
  }

  function renderSystemDialogBox() {
    const props = {
      show: showingSystem,
      system,
      env,
      onClose: handleSystemDialogClose,
    };
    return <SystemDescriptionDialogBox {...props} />;
  }

  function renderProjectDialogBox() {
    const props = {
      show: showingProject,
      project,
      env,
      onClose: handleProjectDialogClose,
    };
    return <ProjectDescriptionDialogBox {...props} />;
  }

  function renderActivationDialogBox() {
    const props = {
      show: activatingDevice,
      system,
      database,
      env,
      onClose: handleActivationDialogClose,
    };
    return <MobileSetupDialogBox {...props} />;
  }

  function renderManagementDialogBox() {
    const props = {
      show: managingProjects,
      projectLinks,
      env,
      onDelete: handleProjectDelete,
      onCancel: handleManagementDialogClose,
    };
    return <ProjectManagementDialogBox {...props} />
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

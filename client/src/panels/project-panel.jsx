import React, { useState, useEffect, useRef } from 'react';
import { useListener, useErrorCatcher } from 'relaks';
import { removeLinks } from 'common/objects/savers/project-link-saver.js';
import { isMember } from 'common/objects/utils/user-utils.js';
import { union, difference } from 'common/utils/array-utils.js';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { SystemDescriptionDialogBox } from '../dialogs/system-description-dialog-box.jsx';
import { ProjectDescriptionDialogBox } from '../dialogs/project-description-dialog-box.jsx';
import { MobileSetupDialogBox } from '../dialogs/mobile-setup-dialog-box.jsx';
import { ProjectManagementDialogBox } from '../dialogs/project-management-dialog-box.jsx';

import { useConfirmation, useDialogHandling } from '../hooks.js';

import './project-panel.scss';

/**
 * Panel for switching between different projects.
 */
export function ProjectPanel(props) {
  const { database, route, env, userDraft, system, project, projectLinks } = props;
  const { t, p } = env.locale;
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const membership = useRef();

  const handleProjectOptionClick = useListener((evt) => {
    const key = evt.currentTarget.getAttribute('data-key');
    const link = projectLinks.find(lnk => lnk.key === key);
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
    const projectIDs = union(projectIDsBefore, [ project.id ]);
    userDraft.set('requested_project_ids', projectIDs);
  });
  const handleCancelJoinClick = useListener((evt) => {
    const projectIDsBefore = userDraft.get('requested_project_ids', []);
    const projectIDs = difference(projectIDsBefore, [ project.id ]);
    userDraft.set('requested_project_ids', projectIDs);
  });
  const handleSignOutClick = useListener((evt) => {
    run(async () => {
      await confirm(t('project-management-sign-out-are-you-sure'));
      await database.endSession();
      // delete links of all projects on server
      const serverLinks = projectLinks.filter(lnk => lnk.address === route.context.address);
      await removeLinks(database, serverLinks);
    });
  });
  const handleProjectDelete = useListener(async (evt) => {
    // redirect to start page if the current project was removed
    const { address, schema } = route.context;
    const removingCurrent = evt.selection.includes(`${address}/${schema}`);
    const serverLinks = projectLinks.filter((link) => {
      return evt.selection.includes(link.key);
    });
    await removeLinks(database, serverLinks);
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
    if (project) {
      if (isMember(userDraft.current, project)) {
        if (membership.current === false) {
          console
          confirm(t('membership-request-$you-are-now-member', name), false);
        }
        membership.current = true;
      } else {
        membership.current = false;
      }
    }
  }, [ project ]);

  return (
    <SettingsPanel className="project">
      <header>
        <i className="fas fa-database" /> {t('settings-projects')}
      </header>
      <body>
        {projectLinks?.map(renderProject)}
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
      let isMemberOf = true;
      let isApplying = false;
      if (project) {
        const userID = userDraft.get('id');
        const projectIDs = userDraft.get('requested_project_ids');
        if (!project.user_ids.includes(userID)) {
          isMemberOf = false;
          if (projectIDs.includes(project.id)) {
            isApplying = true;
          }
        }
      }
      const serverProps = {
        iconClass: 'fas fa-home',
        label: link.address,
        onClick: handleSystemClick,
      };
      const descriptionProps = {
        iconClass: 'fas fa-info-circle',
        label: t('project-management-description'),
        onClick: handleProjectClick,
      };
      const mobileProps = {
        iconClass: 'fas fa-qrcode',
        label: t('project-management-mobile-set-up'),
        hidden: (env.platform === 'cordova'),
        onClick: handleActivateClick,
      };
      const membershipProps = {
        iconClass: (isApplying) ? 'fas fa-clock' : 'fas fa-user-circle',
        label: t(`project-management-${isApplying ? 'withdraw-request' : 'join-project'}`),
        hidden: isMemberOf,
        onClick: (isApplying) ? handleCancelJoinClick : handleJoinClick,
      };
      const signOutProps = {
        iconClass: 'fas fa-sign-out-alt',
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
  const { hidden, label, iconClass, onClick } = props;
  if (hidden) {
    return null;
  }
  return (
    <div className="item">
      <span className="button" onClick={onClick}>
        <i className={`${iconClass} fa-fw`} />
        <span className="label">{label}</span>
      </span>
    </div>
  );
}

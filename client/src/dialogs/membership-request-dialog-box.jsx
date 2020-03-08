import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';
import { getUserName, getGender, isMember, isPendingMember, canViewProject, canJoinProject } from 'common/objects/utils/user-utils.js';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ResourceView } from 'common/widgets/resource-view.jsx';
import { Scrollable } from '../widgets/scrollable.jsx';
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';

import './membership-request-dialog-box.scss';

/**
 * Dialog box for requesting membership to a project.
 */
export const MembershipRequestDialogBox = Overlay.create((props) => {
  const { env, project, currentUser } = props;
  const { onConfirm, onRevoke, onProceed, onClose } = props;
  const { t, p, g } = env.locale;
  const [ userJustJoined, setUserJustJoined ] = useState(false);

  const handleJoinClick = useListener((evt) => {
    setUserJustJoined(true);
    if (onConfirm) {
      onConfirm({ project });
    }
  });
  const handleWithdrawClick = useListener((evt) => {
    if (onRevoke) {
      onRevoke({ project });
    }
  });
  const handleProceedClick = useListener((evt) => {
    if (onProceed) {
      onProceed({ project });
    }
  });

  const classNames = [ 'membership-request-dialog-box' ];
  return (
    <div className={classNames.join(' ')}>
      {renderText()}
      {renderMessage()}
      {renderButtons()}
    </div>
  );

  function renderText() {
    if (!project) {
      return null;
    }
    const { name } = project;
    const { title, description, resources } = project.details;
    const image = _.find(resources, { type: 'image' });
    return (
      <Scrollable>
        <div className="title">{p(title) || name}</div>
        <div className="description">
          <div className="image">
            <ResourceView resource={image} width={160} env={env} />
          </div>
          {p(description)}
        </div>
      </Scrollable>
    );
  }

  function renderMessage() {
    if (!project || !currentUser) {
      return null;
    }
    const you = getUserName(currentUser, env);
    const gender = getGender(currentUser);
    g(you, gender);
    let className = '', iconClass = '', message = '';
    if (isMember(currentUser, project)) {
      className = 'accepted';
      iconClass = 'far fa-user-circle';
      if (userJustJoined) {
        message = t('membership-request-$you-are-now-member', you);
      } else {
        message = t('membership-request-$you-are-member', you);
      }
    } else if (isPendingMember(currentUser, project)) {
      className = 'requested';
      iconClass = 'far fa-clock';
      message = t('membership-request-$you-have-requested-membership', you);
    }
    return (
      <CollapsibleContainer open={!!iconClass}>
        <div className={`message ${className}`}>
          <i className={iconClass} />
          {' '}
          {message}
        </div>
      </CollapsibleContainer>
    );
  }

  function renderButtons() {
    if (isMember(currentUser, project)) {
      const cancelButtonProps = {
        label: t('membership-request-cancel'),
        onClick: onClose,
      };
      const proceedButtonProps = {
        label: t('membership-request-proceed'),
        onClick: handleProceedClick,
        emphasized: true,
      };
      return (
        <div className="buttons">
          <PushButton {...cancelButtonProps} />
          <PushButton {...proceedButtonProps} />
        </div>
      );
    } else if (isPendingMember(currentUser, project)) {
      const cancelButtonProps = {
        label: t('membership-request-cancel'),
        onClick: onClose,
      };
      const withdrawButtonProps = {
        label: t('membership-request-withdraw'),
        onClick: handleWithdrawClick,
      };
      const browseButtonProps = {
        label: t('membership-request-browse'),
        onClick: handleProceedClick,
        hidden: !canViewProject(currentUser, project),
        emphasized: true,
      };
      return (
        <div className="buttons">
          <PushButton {...cancelButtonProps} />
          <PushButton {...withdrawButtonProps} />
          <PushButton {...browseButtonProps} />
        </div>
      );
    } else {
      const cancelButtonProps = {
        label: t('membership-request-cancel'),
        onClick: onClose,
      };
      const browseButtonProps = {
        label: t('membership-request-browse'),
        onClick: handleProceedClick,
        hidden: !canViewProject(currentUser, project),
        emphasized: !canJoinProject(currentUser, project),
      };
      const joinButtonProps = {
        label: t('membership-request-join'),
        onClick: handleJoinClick,
        hidden: !canJoinProject(currentUser, project),
        emphasized: true,
      };
      return (
        <div className="buttons">
          <PushButton {...cancelButtonProps} />
          <PushButton {...browseButtonProps} />
          <PushButton {...joinButtonProps} />
        </div>
      );
    }
  }
});

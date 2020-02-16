import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

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
function MembershipRequestDialogBox(props) {
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
    const you = UserUtils.getDisplayName(currentUser, env);
    const gender = UserUtils.getGender(currentUser);
    g(you, gender);
    let className = '', icon = '', message = '';
    if (UserUtils.isMember(currentUser, project)) {
      className = 'accepted';
      icon = 'user-circle-o';
      if (userJustJoined) {
        message = t('membership-request-$you-are-now-member', you);
      } else {
        message = t('membership-request-$you-are-member', you);
      }
    } else if (UserUtils.isPendingMember(currentUser, project)) {
      className = 'requested';
      icon = 'clock-o';
      message = t('membership-request-$you-have-requested-membership', you);
    }
    return (
      <CollapsibleContainer open={!!icon}>
        <div className={`message ${className}`}>
          <i className={`fa fa-${icon}`} />
          {' '}
          {message}
        </div>
      </CollapsibleContainer>
    );
  }

  function renderButtons() {
    if (UserUtils.isMember(currentUser, project)) {
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
    } else if (UserUtils.isPendingMember(currentUser, project)) {
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
        hidden: !UserUtils.canViewProject(currentUser, project),
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
        hidden: !UserUtils.canViewProject(currentUser, project),
        emphasized: !UserUtils.canJoinProject(currentUser, project),
      };
      const joinButtonProps = {
        label: t('membership-request-join'),
        onClick: handleJoinClick,
        hidden: !UserUtils.canJoinProject(currentUser, project),
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
}

const component = Overlay.create(MembershipRequestDialogBox);

export {
  component as default,
  component as MembershipRequestDialogBox,
};

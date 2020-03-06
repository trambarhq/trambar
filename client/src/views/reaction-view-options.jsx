import _ from 'lodash';
import Moment from 'moment';
import React, { useState } from 'react';
import { useListener } from 'relaks';
import { canHideReaction, canEditReaction, canRemoveReaction } from 'common/objects/utils/user-utils.js';

// widgets
import { PopUpMenu } from '../widgets/pop-up-menu.jsx';
import { OptionButton } from '../widgets/option-button.jsx';

import './reaction-view-options.scss';

/**
 * Component that renders a pop-up menu used to alter options of reactions to
 * stories.
 */
export function ReactionViewOptions(props) {
  const { env, options, reaction, story, currentUser, access, onChange } = props;
  const { t } = env.locale;
  const [ openMenu, setOpenMenu ] = useState('');

  const handleOpen = useListener((evt) => {
    setOpenMenu('main');
  });
  const handleClose = useListener((evt) => {
    setOpenMenu('');
  });
  const handleHideClick = useListener((evt) => {
    const newOptions = { ...options };
    newOptions.hideReaction = !options.hideReaction;
    if (onChange) {
      onChange({ options: newOptions });
    }
  });
  const handleEditClick = useListener((evt) => {
    const newOptions = { ...options };
    newOptions.editReaction = !options.editReaction;
    if (onChange) {
      onChange({ options: newOptions });
    }
  });
  const handleRemoveClick = useListener((evt) => {
    const newOptions = { ...options };
    newOptions.removeReaction = true;
    if (onChange) {
      onChange({ options: newOptions });
    }
  });

  let active = false;
  if (canHideReaction(currentUser, story, reaction, access)) {
    active = true;
  }
  if (canEditReaction(currentUser, story, reaction, access)) {
    active = true;
  }
  if (canRemoveReaction(currentUser, story, reaction, access)) {
    active = true;
  }
  const menuProps = {
    open: (openMenu === 'main'),
    className: 'reaction-view-options',
    disabled: !active,
    popOut: true,
    onOpen: handleOpen,
    onClose: handleClose,
  };
  return (
    <PopUpMenu {...menuProps}>
      <button>
        <i className="fas fa-ellipsis-v" />
      </button>
      <menu>
        {renderOptions()}
      </menu>
    </PopUpMenu>
  );

  function renderOptions() {
    const hideProps = {
      label: t('option-hide-comment'),
      hidden: !canHideReaction(currentUser, story, reaction, access),
      selected: options.hideReaction,
      onClick: handleHideClick,
    };
    const editProps = {
      label: t('option-edit-comment'),
      hidden: !canEditReaction(currentUser, story, reaction, access),
      selected: options.editReaction,
      onClick: handleEditClick,
    };
    const removeProps = {
      label: t('option-remove-comment'),
      hidden: !canRemoveReaction(currentUser, story, reaction, access),
      selected: options.removeReaction,
      onClick: handleRemoveClick,
    };
    return (
      <div className="view-options in-menu">
        <OptionButton {...hideProps} />
        <OptionButton {...editProps} />
        <OptionButton {...removeProps} />
      </div>
    );
  }
}

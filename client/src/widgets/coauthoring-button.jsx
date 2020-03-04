import _ from 'lodash';
import React, { useState } from 'react';
import { useListener } from 'relaks';
import * as UserUtils from 'common/objects/utils/user-utils.mjs';

// widgets
import { HeaderButton } from './header-button.jsx';
import { UserSelectionDialogBox } from '../dialogs/user-selection-dialog-box.jsx';

import './coauthoring-button.scss';

/**
 * Button for adding/removing co-authors from a story. The component is also
 * responsible for rendering the dialog box.
 */
export function CoauthoringButton(props) {
  const { authors, currentUser } = props;
  const { database, route, env } = props;
  const { onRemove, onSelect } = props;
  const { t } = env.locale;
  const [ selecting, setSelecting ] = useState(false);
  const coauthoring = UserUtils.isCoauthor(authors, currentUser);

  const handleClick = useListener((evt) => {
    if (coauthoring) {
      if (onRemove) {
        onRemove({});
      }
    } else {
      setSelecting(true);
    }
  });
  const handleCancel = useListener((evt) => {
    setSelecting(false);
  });
  const handleSelect = useListener((evt) => {
    if (onSelect) {
      onSelect({ selection: evt.selection });
    }
    setSelecting(false);
  });

  let icon, label;
  if (coauthoring) {
    icon = 'minus-square';
    label = t('story-remove-yourself');
  } else {
    icon = 'plus-square';
    if (_.size(authors) > 1) {
      label = t('story-add-remove-coauthor');
    } else {
      label = t('story-add-coauthor');
    }
  }
  return (
    <span className="coauthoring-button">
      <span onClick={handleClick}>
        <i className={`fa fa-${icon}`} />
        <span className="label">{label}</span>
      </span>
      {renderDialogBox()}
    </span>
  );

  function renderDialogBox() {
    const props = {
      show: selecting,
      selection: authors,
      disabled: _.slice(authors, 0, 1),
      database,
      route,
      env,
      onSelect: handleSelect,
      onCancel: handleCancel,
    };
    return <UserSelectionDialogBox {...props} />;
  }
}

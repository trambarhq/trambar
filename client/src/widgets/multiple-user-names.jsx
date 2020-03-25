import React, { useMemo } from 'react';
import { useListener } from 'relaks';
import { getUserName } from 'common/objects/utils/user-utils.js';
import { orderBy } from 'common/utils/array-utils.js';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from './push-button.jsx';
import { Scrollable } from './scrollable.jsx';
import { ProfileImage } from './profile-image.jsx';

import './multiple-user-names.scss';

/**
 * Component that renders a small pop-up window showing a list of users when
 * the mouse pointer goes over a label. The list is truncated when it's long.
 * Clicking on the label brings up the full list in a dialog box.
 */
export function MultipleUserNames(props) {
  const { env, users, label, className } = props;
  const { t, p } = env.locale;
  const [ showingPopUp, showPopUp ] = useState(false);
  const [ showingDialogBox, showDialogBox ] = useState(false);
  const usersSorted = useMemo(() => {
    const name = usr => getUserName(usr, env);
    return orderBy(users, name, 'asc');
  }, [ users, env ]);

  const handleMouseEnter = useListener((evt) => {
    showPopUp(true);
  });
  const handleMouseLeave = useListener((evt) => {
    showPopUp(false);
  });
  const handleClick = useListener((evt) => {
    showPopUp(false);
    showDialogBox(true);
  });
  const handleDialogBoxClose = useListener((evt) => {
    showDialogBox(false);
  });

  const classNames = [ 'multiple-user-names' ];
  if (className) {
    classNames.push(className);
  }
  const containerProps = {
    className: classNames.join(' '),
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
  };
  const labelProps = {
    className: 'label',
    onClick: handleClick,
  };
  return (
    <span {...containerProps}>
      <span {...labelProps}>{label}</span>
      {renderPopUp()}
      {renderDialogBox()}
    </span>
  )

  function renderPopUp() {
    if (!showingPopUp) {
      return null;
    }
    return (
      <div className="popup-container">
        <div className="popup">
          {renderUserList()}
        </div>
      </div>
    );
  }

  function renderDialogBox() {
    const overlayProps = {
      show: showingDialogBox,
      onBackgroundClick: handleDialogBoxClose,
    };
    const buttonProps = {
      label: 'OK',
      emphasized: true,
      onClick: handleDialogBoxClose,
    };
    return (
      <Overlay {...overlayProps}>
        <div className="multiple-user-names-dialog-box">
          <Scrollable>
            <div className="list">
              {renderUserList()}
            </div>
          </Scrollable>
          <div className="buttons">
            <PushButton {...buttonProps} />
          </div>
        </div>
      </Overlay>
    );
  }

  function renderUserList() {
    const chunk = usersSorted.slice(popupLimit);
    const elements = chunk.map((user) => {
      return renderUser(user);
    });
    if (usersSorted.length > limit) {
      elements.push(
        <div key={0} className="more">
          {t('list-$count-more', usersSorted.length - chunk.length)}
        </div>
      );
    }
    return elements;
  }

  function renderUser(user) {
    const userProps = { user, env };
    return <User key={user.id} {...userProps} />;
  }
}

/**
 * Stateless component that renders a user's profile image and name.
 */
function User(props) {
  const { env, user } = props;
  const classNames = [ 'user' ];
  const imageProps = { user, env, size: 'small' };
  let name = getUserName(user, env);
  return (
    <div className={classNames.join(' ')}>
      <ProfileImage {...imageProps} />
      <span className="name">{name}</span>
    </div>
  );
}

MultipleUserNames.defaultProps = {
  popupLimit: 8
};

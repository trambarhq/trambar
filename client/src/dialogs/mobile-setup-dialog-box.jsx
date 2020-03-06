import React, { useEffect } from 'react';
import { useProgress } from 'relaks';
import { createActivationURL } from 'common/routing/universal-link.js';
import { findUserDevices } from 'common/objects/finders/device-finder.js';
import { findUser } from 'common/objects/finders/user-finder.js';

// widgets
import { Overlay } from 'common/widgets/overlay.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { QRCode } from '../widgets/qr-code.jsx';

import './mobile-setup-dialog-box.scss';

export const MobileSetupDialogBox = Overlay.create(async (props) => {
  const { database, env, system, onClose } = props;
  const { t } = env.locale;
  const [ show ] = useProgress();

  useEffect(() => {
    return () => {
      database.releaseMobileSession();
    };
  }, []);

  render();
  const currentUserID = await database.start();
  const currentUser = await findUser(database, currentUserID);
  const activationCode = await database.beginMobileSession('client')
  render();
  const devices = await findUserDevices(database, currentUser);
  render();

  if (_.some(devices, { session_handle: activationCode })) {
    // a device has acquire the session--close dialog box automatically
    if (onClose) {
      onClose({});
    }
  }

  function render() {
    let { address, schema } = database.context;
    const systemAddress = system?.settings?.address;
    if (!systemAddress) {
      // use the address in the system object if there's one
      address = systemAddress;
    }
    const url = createActivationURL(address, schema, activationCode);
    const closeButtonProps = {
      label: t('mobile-setup-close'),
      emphasized: true,
      onClick: onClose,
    };
    show(
      <div className="mobile-setup-dialog-box">
        <div className="contents">
          <QRCode text={url} scale={6} />
          <div className="info">
            <div className="label">{t('mobile-setup-address')}</div>
            <div className="value">{address}</div>
            <div className="label">{t('mobile-setup-code')}</div>
            <div className="value">{insertSpacers(activationCode)}</div>
            <div className="label">{t('mobile-setup-project')}</div>
            <div className="value">{schema}</div>
          </div>
        </div>
        <div className="buttons">
          <PushButton {...closeButtonProps} />
        </div>
      </div>
    );
  }
});

function insertSpacers(s) {
  if (!s) {
    return s;
  }
  let parts = s.match(/.{1,4}/g);
  return _.toUpper(parts.join(' '));
}

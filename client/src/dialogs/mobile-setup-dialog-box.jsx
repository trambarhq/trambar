import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as UniversalLink from 'routing/universal-link';
import * as DeviceFinder from 'objects/finders/device-finder';
import * as UserFinder from 'objects/finders/user-finder';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import QRCode from 'widgets/qr-code';

import './mobile-setup-dialog-box.scss';

class MobileSetupDialogBox extends PureComponent {
    static displayName = 'MobileSetupDialogBox';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { show, onClose } = this.props;
        let overlayProps = { show, onBackgroundClick: onClose };
        let formProps = _.omit(this.props, 'show');
        return (
            <Overlay {...overlayProps}>
                <MobileSetupForm {...formProps} />
            </Overlay>
        );
    }
}

/**
 * Dialog box that displays a QR-code for mobile activation.
 *
 * @extends AsyncComponent
 */
class MobileSetupForm extends AsyncComponent {
    static displayName = 'MobileSetupForm';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, env, system, onClose } = this.props;
        let db = database.use({ by: this });
        let props = {
            activationCode: undefined,
            currentUser: undefined,
            devices: undefined,

            system,
            database,
            env,
            onClose,
        };
        meanwhile.show(<MobileSetupFormSync {...props} />);
        return db.start().then((currentUserID) => {
            return UserFinder.findUser(db, currentUserID).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return db.beginMobileSession('client').then((code) => {
                props.activationCode = code;
            });
            meanwhile.show(<MobileSetupFormSync {...props} />);
        }).then(() => {
            return DeviceFinder.findUserDevices(db, props.currentUser).then((devices) => {
                props.devices = devices;
            });
        }).then(() => {
            return <MobileSetupFormSync {...props} />;
        });
    }

    /**
     * Release the mobile session, assuming the device has acquired it
     */
    componentWillUnmount() {
        let { database } = this.props;
        let db = database.use({ by: this });
        db.releaseMobileSession();
    }
}

class MobileSetupFormSync extends PureComponent {
    static displayName = 'MobileSetupFormSync.Sync';

    /**
     * Check for change in props.devices
     */
    componentWillReceiveProps(nextProps) {
        let { devices, onClose } = this.props;
        if (nextProps.devices !== devices) {
            let handle = nextProps.activationCode;
            if (handle) {
                if (_.some(nextProps.devices, { session_handle: handle })) {
                    // a device has acquire the session--close dialog box automatically
                    if (onClose) {
                        onClose({
                            type: 'close',
                            target: this,
                        });
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
        let { database, env, system, activationCode, onClose } = this.props;
        let { t } = env.locale;
        let { address, schema } = database.context;
        let systemAddress = _.get(system, 'settings.address');
        if (!systemAddress) {
            // use the address in the system object if there's one
            address = systemAddress;
        }
        let url;
        if (activationCode) {
            url = UniversalLink.createActivationURL(address, schema, activationCode);
            console.log(url);
        }
        let closeButtonProps = {
            label: t('mobile-setup-close'),
            emphasized: true,
            onClick: onClose,
        };
        return (
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
}

function insertSpacers(s) {
    if (!s) {
        return s;
    }
    let parts = s.match(/.{1,4}/g);
    return _.toUpper(parts.join(' '));
}

export {
    MobileSetupDialogBox as default,
    MobileSetupDialogBox,
};

import Database from 'data/database';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MobileSetupDialogBox.propTypes = {
        show: PropTypes.bool,
        system: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
    };
}

import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import * as UniversalLink from 'routing/universal-link';
import * as DeviceFinder from 'objects/finders/device-finder';
import * as UserFinder from 'objects/finders/user-finder';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import QRCode from 'widgets/qr-code';

import StartPage from 'pages/start-page';

import './mobile-setup-dialog-box.scss';

/**
 * Dialog box that displays a QR-code for mobile activation.
 *
 * @extends AsyncComponent
 */
class MobileSetupDialogBox extends AsyncComponent {
    static displayName = 'MobileSetupDialogBox';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, system, show, onClose } = this.props;
        let db = database.use({ by: this });
        let props = {
            activationCode: null,
            currentUser: null,
            devices: null,

            show,
            system,
            route,
            env,
            onClose,
        };
        meanwhile.show(<MobileSetupDialogBoxSync {...props} />);
        return db.start().then((currentUserID) => {
            return UserFinder.findUser(db, currentUserID).then((user) => {
                props.currentUser = user;
            });
        }).then(() => {
            return db.beginMobileSession('client').then((code) => {
                props.activationCode = code;
            });
        }).then(() => {
            return DeviceFinder.findUserDevices(db, props.currentUser).then((devices) => {
                props.devices = devices;
            });
        }).then(() => {
            return <MobileSetupDialogBoxSync {...props} />;
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

class MobileSetupDialogBoxSync extends PureComponent {
    static displayName = 'MobileSetupDialogBox.Sync';

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
        let { show, onClose } = this.props;
        let overlayProps = { show, onBackgroundClick: onClose };
        return (
            <Overlay {...overlayProps}>
                <div className="mobile-setup-dialog-box">
                    {this.renderContents()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    }

    /**
     * Render QR-code and activation code
     *
     * @return {ReactElement}
     */
    renderContents() {
        let { route, env, system, activationCode } = this.props;
        let { t } = env.locale;
        let { address, schema } = route.context;
        let systemAddress = _.get(system, 'settings.address');
        let universalLink;
        if (!systemAddress) {
            // use the address in the system object if there's one
            address = systemAddress;
        }
        if (activationCode) {
            let relativeURL = route.find('start-page', { activationCode, schema });
            universalLink = UniversalLink.form(address, relativeURL);
            console.log(universalLink);
        }
        return (
            <div className="contents">
                <QRCode text={universalLink} scale={6} />
                <div className="info">
                    <div className="label">{t('mobile-setup-address')}</div>
                    <div className="value">{address}</div>
                    <div className="label">{t('mobile-setup-code')}</div>
                    <div className="value">{insertSpacers(activationCode)}</div>
                    <div className="label">{t('mobile-setup-project')}</div>
                    <div className="value">{schema}</div>
                </div>
            </div>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, onClose } = this.props;
        let { t } = env.locale;
        let closeButtonProps = {
            label: t('mobile-setup-close'),
            emphasized: true,
            onClick: onClose,
        };
        return (
            <div className="buttons">
                <PushButton {...closeButtonProps} />
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
    MobileSetupDialogBoxSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MobileSetupDialogBox.propTypes = {
        show: PropTypes.bool,
        system: PropTypes.object,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
    };
    MobileSetupDialogBoxSync.propTypes = {
        show: PropTypes.bool,
        activationCode: PropTypes.string,
        devices: PropTypes.arrayOf(PropTypes.object),
        currentUser: PropTypes.object,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        onClose: PropTypes.func,
    };
}

import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import UniversalLink from 'routing/universal-link';
import * as DeviceFinder from 'objects/finders/device-finder';
import * as UserFinder from 'objects/finders/user-finder';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import QRCode from 'widgets/qr-code';

import StartPage from 'pages/start-page';

import './mobile-setup-dialog-box.scss';

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
        let db = this.props.database.use({ by: this });
        let props = {
            activationCode: null,
            currentUser: null,
            devices: null,

            show: this.props.show,
            system: this.props.system,
            route: this.props.route,
            locale: this.props.locale,
            onClose: this.props.onClose,
        };
        meanwhile.show(<MobileSetupDialogBoxSync {...props} />);
        return db.start().then((currentUserId) => {
            return UserFinder.findUser(db, currentUserId).then((user) => {
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
        let db = this.props.database.use({ by: this });
        db.releaseMobileSession();
    }
}

class MobileSetupDialogBoxSync extends PureComponent {
    static displayName = 'MobileSetupDialogBox.Sync';

    /**
     * Check for change in props.devices
     */
    componentWillReceiveProps(nextProps) {
        if (this.props.devices !== nextProps.devices) {
            let handle = nextProps.activationCode;
            if (handle) {
                if (_.some(nextProps.devices, { session_handle: handle })) {
                    // a device has acquire the session--close dialog box automatically
                    if (this.props.onClose) {
                        this.props.onClose({
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
        let overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.props.onClose,
        };
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
     * Render QR-code and number
     *
     * @return {ReactElement}
     */
    renderContents() {
        let t = this.props.locale.translate;
        let number = this.props.number;
        let route = this.props.route;
        let url;
        let address = _.get(this.props.system, 'settings.address');
        if (!address) {
            address = route.parameters.address;
        }
        let schema = route.parameters.schema;
        let activationCode = this.props.activationCode;
        if (activationCode) {
            let urlParts = StartPage.getURL({ activationCode, schema });
            url = UniversalLink.form(address, urlParts.path, urlParts.query);
            console.log(url);
        }
        return (
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
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let t = this.props.locale.translate;
        let closeButtonProps = {
            label: t('mobile-setup-close'),
            emphasized: true,
            onClick: this.props.onClose,
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

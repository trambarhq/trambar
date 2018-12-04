import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent, Children } from 'react';
import ReactDOM from 'react-dom';

// widgets
import PushButton from 'widgets/push-button';

import './qr-scanner-dialog-box.scss';

/**
 * Non-visual component that uses the QR Scanner Cordova plug-in to capture
 * a QR code.
 *
 * @extends PureComponent
 */
class QRScannerDialogBox extends PureComponent {
    static displayName = 'QRScannerDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            available: false,
            scanning: false,
            found: false,
        };
    }

    /**
     * Render function
     *
     * @return {null}
     */
    render() {
        return null;
    }

    /**
     * Update or remove the camera overlay depending on props.show and state.available
     *
     * @param  {Object} prevProps
     * @param  {Object]} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { show, error } = this.props;
        let { available } = this.state;
        if (available && show) {
            this.show();
        } else if (prevProps.show && !show) {
            this.hide();
        }
    }

    /**
     * Initialize QR scanner on mount
     */
    componentDidMount() {
        initializeQRScanner();
        if (QRScanner) {
            QRScanner.prepareAsync().then((status) => {
                this.setState({ available: true });
            });
        } else {
            if (process.env.NODE_ENV !== 'production') {
                this.setState({ available: true });
            }
        }
    }

    /**
     * Turn off QR scanner on unmount
     */
    componentWillUnmount() {
        this.hide();
    }

    /**
     * Create (or update) the camera overlay
     */
    show() {
        let { env, error, children } = this.props;
        let { scanning, found } = this.state;
        let { t } = env.locale;
        if (!this.overlayNode) {
            // show the camera preview, which appears behind the webview
            if (QRScanner) {
                QRScanner.showAsync().then((status) => {
                    return this.startScanning();
                });
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    // insert a placeholder so we can work on the layout in the browser
                    let imageURL = require('camera-placeholder-qr-code.jpg');
                    this.cameraPlaceholderNode = document.createElement('DIV');
                    this.cameraPlaceholderNode.className = 'camera-placeholder';
                    this.cameraPlaceholderNode.style.backgroundImage = `url(${imageURL})`;
                    document.body.appendChild(this.cameraPlaceholderNode);

                    let input = document.createElement('INPUT');
                    input.type = 'text';
                    input.value = '';
                    input.addEventListener('keydown', (evt) => {
                        if (evt.keyCode === 0x0d) {
                            let url = evt.target.value;
                            if (onResult) {
                                onResult({
                                    type: 'result',
                                    target: this,
                                    result: url,
                                });
                            }
                        }
                    });
                    this.cameraPlaceholderNode.appendChild(input);
                }
            }
            this.overlayNode = document.createElement('DIV');
            document.body.appendChild(this.overlayNode);
        } else {
            if (error) {
                this.startScanning();
            }
        }

        let cancelProps = {
            label: t('qr-scanner-cancel'),
            onClick: this.handleCancelClick
        };
        let message;
        if (error) {
            let text;
            switch (error.statusCode) {
                case 400:
                    text = t('qr-scanner-code-invalid');
                    break;
                case 404:
                case 410:
                    text = t('qr-scanner-code-used');
                    break;
                default:
                    if (error.statusCode) {
                        if (error.message) {
                            text = `${error.statusCode} - ${error.message}`;
                        } else {
                            text = `${error.statusCode}`;
                        }
                    } else {
                        text = error.message || 'ERROR';
                    }
            }
            message = <span className="error">{text}</span>;
        } else {
            if (found) {
                message = <span className="success">{t('qr-scanner-code-found')}</span>;
            }
        }
        let element = (
            <CameraOverlay showSight={!found}>
                <top>
                    {children}
                </top>
                <bottom>
                    <div className="message">{message}</div>
                    <div className="buttons">
                        <PushButton {...cancelProps} />
                    </div>
                </bottom>
            </CameraOverlay>
        );
        ReactDOM.render(element, this.overlayNode);
    }

    startScanning() {
        let { onResult } = this.props;
        let { scanning } = this.state;
        if (scanning) {
            return;
        }
        this.setState({ scanning: true, found: false });
        QRScanner.scanAsync().then((result) => {
            this.setState({ scanning: false, found: true });
            if (onResult) {
                onResult({
                    type: 'result',
                    target: this,
                    result,
                });
            }
            return null;
        });
    }

    stopScanning() {
        let { scanning } = this.state;
        if (!scanning) {
            return;
        }
        this.setState({ scanning: false });
        QRScanner.cancelScanAsync();
    }


    /**
     * Destroy the camera overlay
     */
    hide() {
        if (this.overlayNode) {
            if (QRScanner) {
                QRScanner.hideAsync().then(() => {
                    this.stopScanning();
                });
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    if (this.cameraPlaceholderNode) {
                        document.body.removeChild(this.cameraPlaceholderNode);
                    }
                }
            }
            ReactDOM.unmountComponentAtNode(this.overlayNode);
            document.body.removeChild(this.overlayNode);
            this.overlayNode = null;
        }
    }

    /**
     * Called when user clicks the cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        let { onCancel } = this.props;
        if (onCancel) {
            onCancel({
                type: 'cancel',
                target: this,
            });
        }
    }
}

class CameraOverlay extends PureComponent {
    static displayName = 'CameraOverlay';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="camera-overlay">
                {this.renderPart('top')}
                {this.renderSquare()}
                {this.renderPart('bottom')}
            </div>
        );
    }

    /**
     * Render targetting square
     *
     * @return {ReactElement|null}
     */
    renderSquare() {
        let { showSight } = this.props;
        if (!showSight) {
            return null;
        }
        return (
            <div className="square">
                <div className="corner top-left"></div>
                <div className="corner top-right"></div>
                <div className="corner bottom-left"></div>
                <div className="corner bottom-right"></div>
            </div>
        );
    }

    /**
     * Render children at the top and bottom
     *
     * @param  {String} tag
     *
     * @return {ReactElement|null}
     */
    renderPart(tag) {
        let { children } = this.props;
        children = Children.toArray(children);
        let element = _.find(children, { type: tag });
        if (!element) {
            return null;
        }
        return (
            <div className={tag} {...element.props}>
                {element.props.children}
            </div>
        );
    }

    /**
     * Hide the app container on mount
     */
    componentDidMount() {
        let app = document.getElementById('app-container');
        app.style.visibility = 'hidden';
    }

    /**
     * Show the app container again on unmount
     */
    componentWillUnmount() {
        let app = document.getElementById('app-container');
        app.style.visibility = '';
    }
}

let QRScanner;

function initializeQRScanner() {
    if (!QRScanner) {
        if (!window.QRScanner) {
            return false;
        }
        QRScanner = Promise.promisifyAll(window.QRScanner, {
            promisifier: (originalFunction, defaultPromisifier, something) => {
                switch (originalFunction.name) {
                    case 'cancelScan':
                    case 'show':
                    case 'hide':
                    case 'pausePreview':
                    case 'resumePreview':
                    case 'getStatus':
                        // these functions expect single-argument callback
                        return function() {
                            return new Promise((resolve, reject) => {
                                originalFunction((status) => {
                                    resolve(status);
                                });
                            });
                        };
                    default:
                        return defaultPromisifier(originalFunction);
                }
            }
        });
    }
    return true;
}

export {
    QRScannerDialogBox as default,
    QRScannerDialogBox,
    CameraOverlay,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    QRScannerDialogBox.propTypes = {
        show: PropTypes.bool,
        error: PropTypes.instanceOf(Error),
        env: PropTypes.instanceOf(Environment).isRequired,
        onCancel: PropTypes.func,
        onResult: PropTypes.func,
    };
}

import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import Async from 'async-do-while';

// widgets
import PushButton from 'widgets/push-button';

import './qr-scanner-dialog-box.scss';

class QRScannerDialogBox extends PureComponent {
    static displayName = 'QRScannerDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            available: false,
        };
    }

    /**
     * Initialize QR scanner on mount
     */
    componentWillMount() {
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
        let { available, show } = this.state;
        if (available && show) {
            this.show();
        } else if (prevProps.show && !show) {
            this.hide();
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
        let { env, serverError, found, invalid, children, onResult } = this.props;
        let { t } = env.locale;
        if (!this.overlayNode) {
            // show the camera preview, which appears behind the webview
            if (QRScanner) {
                QRScanner.showAsync().then((status) => {
                    Async.do(() => {
                        return QRScanner.scanAsync().then((result) => {
                            if (onResult) {
                                onResult({
                                    type: 'result',
                                    target: this,
                                    result,
                                });
                            }
                            return null;
                        }).catch((err) => {
                            console.log(err)
                            if (err.name !== 'SCAN_CANCELED') {
                                console.error(err);
                            }
                        });
                    });
                    Async.while(() => {
                        let { show } = this.props;
                        return show;
                    });
                    return Async.end();
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
        }

        let cancelProps = {
            label: t('qr-scanner-cancel'),
            onClick: this.handleCancelClick
        };
        let message;
        if (serverError) {
            let text = `${serverError.statusCode} - ${serverError.message}`;
            message = <span className="error">{text}</span>;
        } else {
            if (found) {
                message = <span className="success">{t('qr-scanner-qr-code-found')}</span>;
            } else if (invalid) {
                message = <span className="error">{t('qr-scanner-invalid-qr-code')}</span>;
            }
        }
        let element = (
            <CameraOverlay>
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

    /**
     * Destroy the camera overlay
     */
    hide() {
        if (this.overlayNode) {
            if (QRScanner) {
                QRScanner.hideAsync().then(() => {
                    return QRScanner.cancelScanAsync();
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
     * @return {ReactElement}
     */
    renderSquare() {
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
        let children = React.Children.toArray(this.props.children);
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
        invalid: PropTypes.bool,
        found: PropTypes.bool,
        serverError: PropTypes.instanceOf(Error),
        env: PropTypes.instanceOf(Environment).isRequired,
        onCancel: PropTypes.func,
        onResult: PropTypes.func,
    };
}

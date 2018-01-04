var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Async = require('async-do-while');

var Locale = require('locale/locale');

// mixins
var UpdateCheck = require('mixins/update-check');

// widgets
var PushButton = require('widgets/push-button');

require('./qr-scanner-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'QRScannerDialogBx',
    mixins: [ UpdateCheck ],
    propTypes: {
        show: PropTypes.bool,
        invalid: PropTypes.bool,
        locale: PropTypes.instanceOf(Locale),
        onCancel: PropTypes.func,
        onResult: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            available: false,
        };
    },

    /**
     * Initialize QR scanner on mount
     */
    componentWillMount: function() {
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
    },

    /**
     * Render function
     *
     * @return {null}
     */
    render: function() {
        return null;
    },

    /**
     * Update or remove the camera overlay depending on props.show and state.available
     *
     * @param  {Object} prevProps
     * @param  {Object]} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (this.state.available && this.props.show) {
            this.show();
        } else if (prevProps.show && !this.props.show) {
            this.hide();
        }
    },

    /**
     * Turn off QR scanner on unmount
     */
    componentWillUnmount: function() {
        this.hide();
    },

    /**
     * Create (or update) the camera overlay
     */
    show: function() {
        if (!this.overlayNode) {
            // show the camera preview, which appears behind the webview
            if (QRScanner) {
                QRScanner.showAsync().then((status) => {
                    Async.do(() => {
                        return QRScanner.scanAsync().then((result) => {
                            if (this.props.onResult) {
                                this.props.onResult({
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
                        return this.props.show;
                    });
                    return Async.end();
                });
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    // insert a placeholder so we can work on the layout in the browser
                    var imageURL = require('camera-placeholder-qr-code.jpg');
                    this.cameraPlaceholderNode = document.createElement('DIV');
                    this.cameraPlaceholderNode.className = 'camera-placeholder';
                    this.cameraPlaceholderNode.style.backgroundImage = `url(${imageURL})`;
                    document.body.appendChild(this.cameraPlaceholderNode);
                }
            }
            this.overlayNode = document.createElement('DIV');
            document.body.appendChild(this.overlayNode);
        }

        var t = this.props.locale.translate;
        var cancelProps = {
            label: t('qr-scanner-cancel'),
            onClick: this.handleCancelClick
        };
        var error;
        if (this.props.invalid) {
            error = t('qr-scanner-invalid-qr-code');
        }
        var element = (
            <CameraOverlay>
                <top>
                    {this.props.children}
                </top>
                <bottom>
                    <div className="error">{error}</div>
                    <div className="buttons">
                        <PushButton {...cancelProps} />
                    </div>
                </bottom>
            </CameraOverlay>
        );
        ReactDOM.render(element, this.overlayNode);
    },

    /**
     * Destroy the camera overlay
     */
    hide: function() {
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
    },

    /**
     * Called when user clicks the cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },
});

var CameraOverlay = React.createClass({
    displayName: 'CameraOverlay',
    mixins: [ UpdateCheck ],

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="camera-overlay">
                {this.renderPart('top')}
                {this.renderSquare()}
                {this.renderPart('bottom')}
            </div>
        );
    },

    /**
     * Render targetting square
     *
     * @return {ReactElement}
     */
    renderSquare: function() {
        return (
            <div className="square">
                <div className="corner top-left"></div>
                <div className="corner top-right"></div>
                <div className="corner bottom-left"></div>
                <div className="corner bottom-right"></div>
            </div>
        );
    },

    /**
     * Render children at the top and bottom
     *
     * @param  {String} tag
     *
     * @return {ReactElement|null}
     */
    renderPart: function(tag) {
        var children = React.Children.toArray(this.props.children);
        var element = _.find(children, { type: tag });
        if (!element) {
            return null;
        }
        return (
            <div className={tag} {...element.props}>
                {element.props.children}
            </div>
        );
    },

    /**
     * Hide the app container on mount
     */
    componentDidMount: function() {
        var app = document.getElementById('app-container');
        app.style.visibility = 'hidden';
    },

    /**
     * Show the app container again on unmount
     */
    componentWillUnmount: function() {
        var app = document.getElementById('app-container');
        app.style.visibility = '';
    },
})

var QRScanner;

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

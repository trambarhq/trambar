var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var UniversalLink = require('routing/universal-link');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var QRScannerDialogBox = require('dialogs/qr-scanner-dialog-box');

require('./start-page-cordova.scss');

module.exports = Relaks.createClass({
    displayName: 'StartPage',
    propTypes: {
        canAccessServer: PropTypes.bool,
        canAccessSchema: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onEntry: PropTypes.func,
        onExit: PropTypes.func,
        onAvailableSchemas: PropTypes.func,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/:extra?',
            ], (params) => {
                if (_.trimEnd(params.extra, '/')) {
                    // there's extra stuff--not a match
                    return null;
                }
                return {
                    add: !!query.add,
                    activationCode: query.ac,
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/`, query = {}, hash;
            if (params && params.add) {
                query.add = 1;
            } else if (params && params.activationCode) {
                query.ac = params.activationCode;
            }
            return { path, query, hash };
        },

        /**
         * Return configuration info for global UI elements
         *
         * @param  {Route} currentRoute
         *
         * @return {Object}
         */
        configureUI: function(currentRoute) {
            return {
                navigation: {
                    top: false,
                    bottom: false,
                },
            };
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var params = this.props.route.parameters;
        var props = {
            activating: !!params.activationCode,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onEntry: this.props.onEntry,
            onExit: this.props.onExit,
            onAvailableSchemas: this.props.onAvailableSchemas,
        };
        return <StartPageSync {...props} />;
    },
});

var StartPageSync = module.exports.Sync = React.createClass({
    displayName: 'StartPage',
    propTypes: {
        activating: PropTypes.bool,
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onEntry: PropTypes.func,
        onExit: PropTypes.func,
        onAvailableSchemas: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            receivedInvalidQRCode: false,
            scanningQRCode: false,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="start-page">
                <div>
                    <h1>Start Page!</h1>
                    <button onClick={this.handleScanClick}>Scan</button>
                </div>
                {this.renderQRScannerDialogBox()}
            </div>
        );
    },

    /**
     * Render QR scanner dialog box if we're scanning a QR code
     *
     * @return {ReactElement|null}
     */
    renderQRScannerDialogBox: function() {
        if (this.props.activating) {
            return null
        }
        var props = {
            show: this.state.scanningQRCode,
            invalid: this.state.receivedInvalidQRCode,
            locale: this.props.locale,
            onCancel: this.handleCancelScan,
            onResult: this.handleScanResult,
        };
        return (
            <QRScannerDialogBox {...props}>
                {'This is a test'}
            </QRScannerDialogBox>
        );
    },

    /**
     * Called when user click scan button
     *
     * @param  {Event} evt
     */
    handleScanClick: function(evt) {
        this.setState({ scanningQRCode: true, receivedInvalidQRCode: false });
    },

    /**
     * Called when user cancel scanning
     *
     * @param  {Object} evt
     */
    handleCancelScan: function(evt) {
        this.setState({ scanningQRCode: false });
        if (this.invalidCodeTimeout) {
            clearTimeout(this.invalidCodeTimeout);
        }
    },

    /**
     * Called when user has successful scanned a code
     *
     * @param  {Object} evt
     */
    handleScanResult: function(evt) {
        if (this.invalidCodeTimeout) {
            clearTimeout(this.invalidCodeTimeout);
        }
        // see if the URL is a valid activation link
        var link = UniversalLink.parse(evt.result);
        var StartPage = require('pages/start-page');
        debugger;
        var params = (link) ? StartPage.parseURL(link.path, link.query, link.hash) : null;
        if (params && params.activationCode) {
            this.props.route.change(link.url);
        } else {
            this.setState({ receivedInvalidQRCode: true });
            this.invalidCodeTimeout = setTimeout(() => {
                this.setState({ receivedInvalidQRCode: false })
            }, 5000);
        }
    },
})

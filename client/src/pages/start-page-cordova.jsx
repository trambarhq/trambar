var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

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
                '/:extra?'
            ], (params) => {
                if (_.trimEnd(params.extra, '/')) {
                    // there's extra stuff--not a match
                    return null;
                }
                return {
                    add: !!query.add
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
            var path = `/`, query, hash;
            if (params && params.add) {
                query = { add: 1 };
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
        var props = {
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
            scanningQR: false,
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
        var props = {
            show: this.state.scanningQR,
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
        this.setState({ scanningQR: true });
    },

    /**
     * Called when user cancel scanning
     *
     * @param  {Object} evt
     */
    handleCancelScan: function(evt) {
        this.setState({ scanningQR: false });
    },

    /**
     * Called when user has successful scanned a code
     *
     * @param  {Object} evt
     */
    handleScanResult: function(evt) {
        console.log(evt.result);
        this.handleCancelScan();
    },
})

var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

require('./login-page.scss');

module.exports = React.createClass({
    displayName: 'LoginPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSuccess: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            selectedProvider: null,
            token: null,
            providers: null,
        };
    },

    componentWillMount: function() {
        this.createAuthenticationObject(this.props.server).then((authentication) => {
            this.setState({
                token: authentication.token,
                providers: authentication.providers
            });
        });
    },

    render: function() {
        return (
            <div>Login page</div>
        );
    },

    /**
     * Render list of options
     *
     * @return {ReactElement}
     */
    renderOptions: function() {
        var t = this.props.locale.translate;
        var available = (provider) => {
            return _.includes(this.state.providers, provider);
        };
        var options = [
            {
                label: t('sign-in-with-gitlab'),
                icon: 'gitlab',
                name: 'gitlab',
                hidden: !available('gitlab'),
                onClick: this.handleOptionClick,
            },
        ];
        return (
            <div className="options">
                {_.map(options, this.renderOption)}
            </div>
        );
    },

    /**
     * Render an OAuth option
     *
     * @param  {Object} props
     * @param  {Number} index
     *
     * @return {ReactElement}
     */
    renderOption: function(props, index) {
        return <Option key={index} {...props} />
    },

    /**
     * Sign in through Oauth
     *
     * @param  {String} provider
     *
     * @return {Promise<Object>}
     */
    signInWithOAuth: function(provider) {
        var token = this.state.token;
        var server = this.props.server;
        var protocol = 'http';
        var url = `${protocol}://${server}/auth/${token}/${provider}`;
        return this.openPopUpWindow(url).then(() => {
            // when the popup closes, check if the authentication object now
            // has a user_id
            return this.fetchAuthenticationObject(server, token).then((authentication) => {
                if (authentication && authentication.token && authentication.user_id) {
                    var credentials = {
                        server,
                        token: authentication.token,
                        user_id: authentication.user_id,
                    };
                    this.triggerSuccessEvent(credentials);
                }
            });
        });
    },

    /**
     * Ask server to create an authentication object, used to track the status
     * of the sign-in process
     *
     * @param  {String} server
     * @param  {String} area
     *
     * @return {Promise<Object>}
     */
    createAuthenticationObject: function(server, area) {
        var protocol = 'http';
        var url = `${protocol}://${server}/auth`;
        var options = { responseType: 'json' };
        return HttpRequest.fetch('GET', url, { area }, options);
    },

    /**
     * Retrieve authentication object from server
     *
     * @param  {String} server
     * @param  {String} token
     *
     * @return {Promise<Object>}
     */
    fetchAuthenticationObject: function(server, token) {
        var protocol = 'http';
        var url = `${protocol}://${server}/auth/${token}`;
        var options = { responseType: 'json' };
        return HttpRequest.fetch('GET', url, {}, options);
    },

    /**
     * Open a popup window to OAuth provider
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    openPopUpWindow: function(url) {
        return new Promise((resolve, reject) => {
            var width = 400;
            var height = 500;
            var options = {
                width,
                height,
                left: window.screenLeft + Math.round((window.outerWidth - width) / 2),
                top: window.screenTop + Math.round((window.outerHeight - height) / 2),
                toolbar: 'no',
                menubar: 'no',
                status: 'no',
            };
            var pairs = _.map(options, (value, name) => {
                return `${name}=${value}`;
            });
            var win = window.open(url, 'login', pairs.join(','));
            if (win) {
                win.location = url;
                var interval = setInterval(() => {
                    if (win.closed) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            } else {
                reject(new Error('Unable to open popup'))
            }
        });
    },

    /**
     * Inform parent component that sign-in was successful
     *
     * @param  {Object} credentials
     */
    triggerSuccessEvent: function(credentials) {
        if (this.props.onSuccess) {
            this.props.onSuccess({
                type: 'success',
                target: this,
                credentials,
            });
        }
    },
});

var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var HttpRequest = require('transport/http-request');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var TextField = require('widgets/text-field');

require('./sign-in-page.scss');

module.exports = React.createClass({
    displayName: 'SignInPage',
    propTypes: {
        server: PropTypes.string.isRequired,

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
            username: '',
            password: '',
            selectedProvider: null,
            token: null,
            providers: null,
        };
    },

    /**
     * Return true if username and password are non-empty
     *
     * @return {Boolean}
     */
    canSubmitForm: function() {
        if (!_.trim(this.state.username)) {
            return false;
        }
        if (!_.trim(this.state.password)) {
            return false;
        }
        return true;
    },

    /**
     * Create Authentication object on mount
     */
    componentWillMount: function() {
        this.createAuthenticationObject(this.props.server, 'admin').then((authentication) => {
            this.setState({
                token: authentication.token,
                providers: authentication.providers
            });
        });
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className="sign-in-page">
                <h2>{t('sign-in-title')}</h2>
                <section>
                    {this.renderForm()}
                </section>
                <h2>{t('sign-in-title-oauth')}</h2>
                <section>
                    {this.renderOAuthOptions()}
                </section>
            </div>
        );
    },

    renderForm: function() {
        var t = this.props.locale.translate;
        var valid = this.canSubmitForm();
        var usernameProps = {
            id: 'username',
            type: 'text',
            value: this.state.username,
            onChange: this.handleUsernameChange,
        };
        var passwordProps = {
            id: 'password',
            type: 'password',
            value: this.state.password,
            onChange: this.handlePasswordChange,
        };
        return (
            <form onSubmit={this.handleFormSubmit}>
                <TextField {...usernameProps}>{t('sign-in-username')}</TextField>
                <TextField {...passwordProps}>{t('sign-in-password')}</TextField>
                <div className="button-row">
                    <PushButton disabled={!valid}>{t('sign-in-submit')}</PushButton>
                </div>
            </form>
        );
    },

    /**
     * Render list of options
     *
     * @return {ReactElement}
     */
    renderOAuthOptions: function() {
        var t = this.props.locale.translate;
        var providers = _.sortBy(this.state.providers, [ 'type', 'name' ]);
        return (
            <div className="options">
                {_.map(providers, this.renderOAuthOption)}
            </div>
        );
    },

    /**
     * Render an OAuth option
     *
     * @param  {Object} provider
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderOAuthOption: function(provider, i) {
        var t = this.props.locale.translate;
        var props = {
            key: i,
            label: provider.name,
            description: provider.description,
            icon: provider.type,
            name: provider.name,
            onClick: this.handleOptionClick,
        };
        return <Option {...props} />
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
        var url = `${protocol}://${server}` + provider.url;
        return this.openPopUpWindow(url).then(() => {
            // when the popup closes, see if we can obtain an authorization object
            // with the token
            return this.fetchAuthorizationObject(server, token).then((authorization) => {
                var credentials = {
                    server,
                    token: authorization.token,
                    user_id: authorization.user_id,
                };
                this.triggerSuccessEvent(credentials);
            }).catch((err) => {
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
        var url = `${protocol}://${server}/auth/session`;
        var options = { responseType: 'json', contentType: 'json' };
        return HttpRequest.fetch('POST', url, { area }, options);
    },

    /**
     * Retrieve authorization object from server
     *
     * @param  {String} server
     * @param  {String} token
     *
     * @return {Promise<Object>}
     */
    fetchAuthorizationObject: function(server, token) {
        var protocol = 'http';
        var url = `${protocol}://${server}/auth/session/${token}`;
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
            var win = window.open(url, 'sign-in', pairs.join(','));
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

    /**
     * Called when user clicks on one of the sign-in options
     *
     * @param  {Event} evt
     */
    handleOptionClick: function(evt) {
        var selectedProvider = _.find(this.state.providers, { name: evt.currentTarget.name });
        this.setState({ selectedProvider }, () => {
            this.signInWithOAuth(selectedProvider).then((err) => {
                this.setState({ selectedProvider: null });
            });
        });
    },

    handleUsernameChange: function(evt) {
        this.setState({ username: evt.target.value });
    },

    handlePasswordChange: function(evt) {
        this.setState({ password: evt.target.value });
    },

    handleFormSubmit: function(evt) {
        evt.preventDefault();
        if (!this.canSubmitForm()) {
            return;
        }
        var server = this.props.server;
        var protocol = 'http';
        var url = `${protocol}://${server}/auth/htpasswd`;
        var payload = {
            token: this.state.token,
            username: this.state.username,
            password: this.state.password,
        };
        var options = {
            responseType: 'json',
            contentType: 'json',
        };
        return HttpRequest.fetch('POST', url, payload, options).then((authorization) => {
            var credentials = {
                server,
                token: authorization.token,
                user_id: authorization.user_id,
            };
            this.triggerSuccessEvent(credentials);
        }).catch((err) => {
            console.error(err);
        })
    },
});

function Option(props) {
    if (props.hidden) {
        return null;
    }
    var buttonProps = {
        className: 'option',
        name: props.name,
        disabled: props.disabled,
        onClick: (!props.disabled) ? props.onClick : null,
    };
    return (
        <button {...buttonProps}>
            <i className={`fa fa-${props.icon}`} />
            <span className="label">{props.label}</span>
        </button>
    );
}

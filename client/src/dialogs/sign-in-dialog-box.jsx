var React = require('react'), PropTypes = React.PropTypes;
var HttpRequest = require('transport/http-request');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./sign-in-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'SignInDialogBox',
    propTypes: {
        show: PropTypes.bool,
        server: PropTypes.string,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onSuccess: PropTypes.func,
        onCancel: PropTypes.func,
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
        if (this.props.show) {
            this.createAuthenticationObject(this.props.server, 'client').then((authentication) => {
                this.setState({
                    token: authentication.token,
                    providers: authentication.providers
                });
            });
        }
    },

    /**
     *
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (!this.props.show && nextProps.show) {
            // create authentication object as soon as dialog box opens
            this.createAuthenticationObject(nextProps.server, 'client').then((authentication) => {
                this.setState({
                    token: authentication.token,
                    providers: authentication.providers
                });
            });
        } else if (this.props.show && !nextProps.show) {
            this.setState({
                selectedProvider: null,
                token: null,
                providers: null
            })
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="sign-in-dialog-box">
                    {this.renderOptions()}
                    {this.renderButtons()}
                </div>
            </Overlay>
        );
    },

    /**
     * Render cancel and OK buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var cancelButtonProps = {
            label: t('sign-in-cancel'),
            onClick: this.handleCancelClick,
        };
        return (
            <div className="buttons">
                <PushButton {...cancelButtonProps} />
            </div>
        );
    },

    /**
     * Render list of options
     *
     * @return {ReactElement}
     */
    renderOptions: function() {
        var t = this.props.locale.translate;
        var providers = _.sortBy(this.state.providers, [ 'type', 'name' ]);
        return (
            <div className="options">
                {_.map(providers, this.renderOption)}
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
    renderOption: function(provider, i) {
        var t = this.props.locale.translate;
        var props = {
            key: i,
            label: t('sign-in-with-$provider', provider.name),
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

    /**
     * Inform parent component that user has canceled trying
     */
    triggerCancelEvent: function() {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
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

    /**
     * Called when user click cancel button or outside the dialog box
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        this.triggerCancelEvent();
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

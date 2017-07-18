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
            this.createAuthenticationObject(this.props.server).then((authentication) => {
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
            this.createAuthenticationObject(nextProps.server).then((authentication) => {
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
     * Render list of options
     *
     * @return {ReactElement}
     */
    renderOptions: function() {
        return (
            <div className="options">
                <UserSelectionList {...listProps} />
            </div>
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
            {
                label: t('sign-in-with-github'),
                icon: 'github',
                name: 'github',
                hidden: !available('github'),
                onClick: this.handleOptionClick,
            },
            {
                label: t('sign-in-with-dropbox'),
                icon: 'dropbox',
                name: 'dropbox',
                hidden: !available('dropbox'),
                onClick: this.handleOptionClick,
            },
            {
                label: t('sign-in-with-google'),
                icon: 'google',
                name: 'google',
                hidden: !available('google'),
                onClick: this.handleOptionClick,
            },
            {
                label: t('sign-in-with-facebook'),
                icon: 'facebook-square',
                name: 'facebook',
                hidden: !available('facebook'),
                onClick: this.handleOptionClick,
            },
        ];
        return (
            <div className="options">
                {_.map(options, this.renderOption)}
            </div>
        );
    },

    renderOption: function(props, index) {
        return <Option key={index} {...props} />
    },

    signIn: function(provider) {
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
     *
     * @param  {String} server
     *
     * @return {Promise<Object>}
     */
    createAuthenticationObject: function(server) {
        var protocol = 'http';
        var url = `${protocol}://${server}/auth`;
        var options = { responseType: 'json' };
        return HttpRequest.fetch('GET', url, {}, options);
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
        var selectedProvider = evt.currentTarget.name;
        this.setState({ selectedProvider }, () => {
            this.signIn(selectedProvider);
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

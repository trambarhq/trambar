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
            method: null,
        };
    },

    /**
     * Clear selected method
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (!this.props.show && nextProps.show) {
            this.setState({ method: null });
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
                <div className="user-selection-dialog-box">
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
            label: t('selection-cancel'),
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
        var options = [
            {
                label: t('sign-in-with-gitlab'),
                icon: 'gitlab',
                name: 'gitlab',
                onClick: this.handleOptionClick,
            },
            {
                label: t('sign-in-with-github'),
                icon: 'github',
                name: 'github',
                onClick: this.handleOptionClick,
            },
            {
                label: t('sign-in-with-dropbox'),
                icon: 'dropbox',
                name: 'dropbox',
                onClick: this.handleOptionClick,
            },
            {
                label: t('sign-in-with-google'),
                icon: 'google',
                name: 'google',
                onClick: this.handleOptionClick,
            },
            {
                label: t('sign-in-with-facebook'),
                icon: 'facebook',
                name: 'facebook',
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

    signIn: function(method) {
        var win = this.openPopUpWindow();
        return this.createAuthenticationObject().then((authentication) => {
            var token = authentication.token;
            var url = this.getUrl(`/auth/${token}/${method}`);
            console.log(url);
            return this.usePopUpWindow(win, url).then(() => {
                return this.retrieveAuthenticationObject(token).then((authentication) => {
                    console.log(authentication);
                });
            });
        });
    },

    getUrl: function(uri) {
        var server = this.props.server;
        var protocol = 'http';
        var url = `${protocol}://${server}${uri}`;
        return url;
    },

    createAuthenticationObject: function() {
        var url = this.getUrl(`/auth`);
        var options = { responseType: 'json' };
        return HttpRequest.fetch('GET', url, {}, options);
    },

    retrieveAuthenticationObject: function(token) {
        var url = this.getUrl(`/auth/${token}`);
        var options = { responseType: 'json' };
        return HttpRequest.fetch('GET', url, {}, options);
    },

    openPopUpWindow: function() {
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
        var win = window.open(null, 'login', pairs.join(','));
        return win;
    },

    usePopUpWindow: function(win, url) {
        return new Promise((resolve, reject) => {
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
     * Called when user clicks on one of the sign-in options
     *
     * @param  {Event} evt
     */
    handleOptionClick: function(evt) {
        var method = evt.currentTarget.name;
        this.setState({ method }, () => {
            this.signIn(method);
        });
    },

    /**
     * Called when user click cancel button or outside the dialog box
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
            <span>{props.label}</span>
        </button>
    );
}

var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var HttpRequest = require('transport/http-request');
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var TextField = require('widgets/text-field');

require('./sign-in-page.scss');

module.exports = Relaks.createClass({
    displayName: 'SignInPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ by: this });
        var props = {
            system: null,
            providers: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,

            onOAuthEnd: this.handleOAuthEnd,
            onPasswordSubmit: this.handlePasswordSubmit,
        };
        // start authorization process--will receive system description
        // and list of OAuth providers along with links
        meanwhile.show(<SignInPageSync {...props} />, 250);
        return db.beginAuthorization('admin').then((info) => {
            props.system = info.system;
            props.providers = info.providers;
            return <SignInPageSync {...props} />;
        });
    },

    /**
     * Retrieve authorization object from server
     *
     * @param  {Object} evt
     */
    handleOAuthEnd: function(evt) {
        var db = this.props.database.use({ by: this });
        db.checkAuthorizationStatus();
    },

    /**
     * Submit username/password to server
     *
     * @param  {Object} evt
     */
    handlePasswordSubmit: function(evt) {
        var db = this.props.database.use({ by: this });
        db.submitPassword(evt.username, evt.password);
    },
})

var SignInPageSync = module.exports.Sync = React.createClass({
    displayName: 'SignInPage.Sync',
    propTypes: {
        system: PropTypes.object,
        providers: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onOAuthEnd: PropTypes.func,
        onPasswordSubmit: PropTypes.func,
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
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var system = this.props.system;
        var title = p(_.get(system, 'details.title'));
        return (
            <div className="sign-in-page">
                <h2>{t('sign-in-$title', title)}</h2>
                <section>
                    {this.renderForm()}
                </section>
                <h2>{t('sign-in-oauth')}</h2>
                <section>
                    {this.renderOAuthButtons()}
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
    renderOAuthButtons: function() {
        var t = this.props.locale.translate;
        var providers = _.sortBy(this.props.providers, [ 'type', 'name' ]);
        return (
            <div className="oauth-buttons">
                {_.map(providers, this.renderOAuthButton)}
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
    renderOAuthButton: function(provider, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var title = p(provider.details.title) || t(`server-type-${provider.type}`);
        var icon = getServerIcon(provider.type);
        var buttonProps = {
            key: i,
            className: 'oauth-button',
            name: provider.name,
            onClick: this.handleOAuthButtonClick,
        };
        return (
            <a {...buttonProps}>
                <i className={`fa fa-${icon}`} />
                <span className="label">{title}</span>
            </a>
        );
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
     * Signal to parent component that the OAuth login process has ended
     */
    triggerOAuthEndEvent: function() {
        if (this.props.onOAuthEnd) {
            this.props.onOAuthEnd({
                type: 'oauthended',
                target: this,
            })
        }
    },

    /**
     * Tell parent component to sign-in using username and password
     *
     * @param  {String} username
     * @param  {String} password
     */
    triggerPasswordSubmitEvent: function(username, password) {
        if (this.props.onPasswordSubmit) {
            this.props.onPasswordSubmit({
                type: 'passwordsubmit',
                target: this,
                username,
                password,
            });
        }
    },

    /**
     * Called when user clicks on one of the OAuth buttons
     *
     * @param  {Event} evt
     */
    handleOAuthButtonClick: function(evt) {
        var url = evt.currentTarget.getAttribute('href');
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            this.triggerOAuthEndEvent();
        });
    },

    /**
     * Called when user changes the username
     *
     * @param  {Event} evt
     */
    handleUsernameChange: function(evt) {
        this.setState({ username: evt.target.value });
    },

    /**
     * Called when user changes the password
     *
     * @param  {Event} evt
     */
    handlePasswordChange: function(evt) {
        this.setState({ password: evt.target.value });
    },

    /**
     * Called when user presses enter or clicks on submit button
     *
     * @param  {Event} evt
     */
    handleFormSubmit: function(evt) {
        evt.preventDefault();
        if (!this.canSubmitForm()) {
            return;
        }
        this.triggerPasswordSubmitEvent(this.state.username, this.state.password);
    },
});

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}

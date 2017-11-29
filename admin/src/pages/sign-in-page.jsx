var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var HttpRequest = require('transport/http-request');
var HttpError = require('errors/http-error');

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

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     * @param  {Object} prevProps
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile, prevProps) {
        var db = this.props.database.use({ by: this });
        var delay = (this.props.route !== prevProps.route) ? 100 : 1000;
        var props = {
            system: null,
            providers: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        // start authorization process--will receive system description
        // and list of OAuth providers along with links
        meanwhile.show(<SignInPageSync {...props} />, delay);
        return db.beginAuthorization('admin').then((info) => {
            props.system = info.system;
            props.providers = info.providers;
            return <SignInPageSync {...props} />;
        }).catch(HttpError, (error) => {
            this.props.route.replace(require('pages/error-page'), { error });
        });
    },
});

var SignInPageSync = module.exports.Sync = React.createClass({
    displayName: 'SignInPage.Sync',
    propTypes: {
        system: PropTypes.object,
        providers: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
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
            submitting: false,
            problem: null,
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

    /**
     * Render login/password form
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        var t = this.props.locale.translate;
        var valid = this.canSubmitForm();
        var usernameProps = {
            id: 'username',
            type: 'text',
            value: this.state.username,
            disabled: this.state.submitting,
            locale: this.props.locale,
            onChange: this.handleUsernameChange,
        };
        var passwordProps = {
            id: 'password',
            type: 'password',
            value: this.state.password,
            disabled: this.state.submitting,
            locale: this.props.locale,
            onChange: this.handlePasswordChange,
        };
        return (
            <form onSubmit={this.handleFormSubmit}>
                {this.renderProblem()}
                <TextField {...usernameProps}>{t('sign-in-username')}</TextField>
                <TextField {...passwordProps}>{t('sign-in-password')}</TextField>
                <div className="button-row">
                    <PushButton disabled={!valid || this.state.submitting}>
                        {t('sign-in-submit')}
                    </PushButton>
                </div>
            </form>
        );
    },

    /**
     * Render error message
     *
     * @return {ReactElement|null}
     */
    renderProblem: function() {
        if (!this.state.problem) {
            return null;
        }
        var t = this.props.locale.translate;
        return (
            <div className="error">
                <i className="fa fa-exclamation-circle" />
                {' '}
                {t(`sign-in-problem-${this.state.problem}`)}
            </div>
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
            className: 'oauth-button',
            name: provider.name,
            href: provider.url,
            onClick: this.handleOAuthButtonClick,
        };
        return (
            <a key={i} {...buttonProps}>
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
     * Called when user clicks on one of the OAuth buttons
     *
     * @param  {Event} evt
     */
    handleOAuthButtonClick: function(evt) {
        var url = evt.currentTarget.getAttribute('href');
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            // retrieve authorization object from server
            var db = this.props.database.use({ by: this });
            db.checkAuthorizationStatus();
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
        this.setState({ submitting: true }, () => {
            var db = this.props.database.use({ by: this });
            db.submitPassword(this.state.username, this.state.password).catch((err) => {
                console.log('Cannot login: ' + err.statusCode)
                var problem;
                switch (err.statusCode) {
                    case 401: problem = 'incorrect-username-password'; break;
                    case 403: problem = 'no-support-for-username-password'; break;
                    default: problem = 'unexpected-error';
                }
                this.setState({ problem, submitting: false });
            });
        });
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

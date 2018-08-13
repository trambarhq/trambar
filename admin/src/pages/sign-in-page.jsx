var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Moment = require('moment');
var HTTPRequest = require('transport/http-request');

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
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ by: this });
        var props = {
            system: null,
            servers: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        // start authorization process--will receive system description
        // and list of OAuth providers along with links
        meanwhile.show(<SignInPageSync {...props} />);
        return db.beginSession('admin').then((info) => {
            props.system = info.system;
            props.servers = info.servers;
            return <SignInPageSync {...props} />;
        });
    },
});

var SignInPageSync = module.exports.Sync = React.createClass({
    displayName: 'SignInPage.Sync',
    propTypes: {
        system: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),

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
            savedCredentials: false,
            submitting: false,
            problem: null,
            errors: {},
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
        var buttonDisabled = !valid;
        if (this.state.savedCredentials) {
            // don't disable the button, since the browser will immediately
            // set the password on user action
            buttonDisabled = false;
        }
        if (this.state.submitting) {
            buttonDisabled = true;
        }
        return (
            <form onSubmit={this.handleFormSubmit}>
                {this.renderProblem()}
                <TextField {...usernameProps}>{t('sign-in-username')}</TextField>
                <TextField {...passwordProps}>{t('sign-in-password')}</TextField>
                <div className="button-row">
                    <PushButton disabled={buttonDisabled}>
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
        var servers = _.sortBy(this.props.servers, [ 'type' ]);
        return (
            <div className="oauth-buttons">
                {_.map(servers, this.renderOAuthButton)}
            </div>
        );
    },

    /**
     * Render an OAuth option
     *
     * @param  {Object} server
     * @param  {Number} i
     *
     * @return {ReactElement}
     */
    renderOAuthButton: function(server, i) {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var name = p(server.details.title) || t(`server-type-${server.type}`);
        var icon = getServerIcon(server.type);
        var url = this.props.database.getOAuthURL(server);
        var props = {
            className: 'oauth-button',
            href: url,
            onClick: this.handleOAuthButtonClick,
            'data-id': server.id,
        };
        var error = this.state.errors[server.id];
        if (error) {
            var t = this.props.locale.translate;
            var text = t(`sign-in-error-${error.reason}`);
            props.className += ' error';
            return (
                <a key={i} {...props}>
                    <span className="icon">
                        <i className={`fa fa-fw fa-${icon}`}></i>
                    </span>
                    <span className="error">{text}</span>
                </a>
            );
        } else {
            return (
                <a key={i} {...props}>
                    <span className="icon">
                        <i className={`fa fa-fw fa-${icon}`}></i>
                    </span>
                    <span className="label">{name}</span>
                </a>
            );
        }
    },

    /**
     * Remember when the component is loaded
     */
    componentDidMount: function() {
        this.mountTime = Moment();
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
            var width = 800;
            var height = 600;
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
        var serverID = parseInt(evt.currentTarget.getAttribute('data-id'))
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            // retrieve authorization object from server
            var db = this.props.database.use({ by: this });
            return db.checkSession().catch((err) => {
                var errors = _.clone(this.state.errors);
                errors[serverID] = err;
                console.log(err);
                this.setState({ errors });
            });
        });
    },

    /**
     * Called when user changes the username
     *
     * @param  {Event} evt
     */
    handleUsernameChange: function(evt) {
        // if a username shows up within half a second, it's set by the
        // browser's saved password feature
        var now = Moment();
        var username = evt.target.value;
        var savedCredentials = false;
        if (username.length > 3) {
            if ((now - this.mountTime) < 500) {
                savedCredentials = true;
            }
        }
        this.setState({ username, savedCredentials });
    },

    /**
     * Called when user changes the password
     *
     * @param  {Event} evt
     */
    handlePasswordChange: function(evt) {
        var password = evt.target.value;
        var savedCredentials = false;
        this.setState({ password, savedCredentials });
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

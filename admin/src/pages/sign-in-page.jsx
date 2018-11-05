import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import Moment from 'moment';
import * as HTTPRequest from 'transport/http-request';

// widgets
import PushButton from 'widgets/push-button';
import TextField from 'widgets/text-field';

import './sign-in-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Sign In page.
 *
 * @extends AsyncComponent
 */
class SignInPage extends AsyncComponent {
    static displayName = 'SignInPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let db = database.use({ by: this });
        let props = {
            system: undefined,
            servers: undefined,

            database,
            route,
            env,
        };
        // start authorization process--will receive system description
        // and list of OAuth providers along with links
        meanwhile.show(<SignInPageSync {...props} />);
        return db.beginSession('admin').then((info) => {
            props.system = info.system;
            props.servers = info.servers;
            return <SignInPageSync {...props} />;
        });
    }
}

/**
 * Synchronous component that actually renders the Sign In page.
 *
 * @extends PureComponent
 */
class SignInPageSync extends PureComponent {
    static displayName = 'SignInPageSync';

    constructor(props) {
        super(props);
        this.state = {
            username: '',
            password: '',
            savedCredentials: false,
            submitting: false,
            problem: null,
            errors: {},
        };
    }

    /**
     * Return true if username and password are non-empty
     *
     * @return {Boolean}
     */
    canSubmitForm() {
        let { username, password } = this.state;
        if (!_.trim(username)) {
            return false;
        }
        if (!_.trim(password)) {
            return false;
        }
        return true;
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="sign-in-page">
                {this.renderForm()}
                {this.renderOAuthButtons()}
            </div>
        );
    }

    /**
     * Render login/password form
     *
     * @return {ReactElement}
     */
    renderForm() {
        let { env, system } = this.props;
        let { username, password, submitting, savedCredentials } = this.state;
        let { t, p } = env.locale;
        let valid = this.canSubmitForm();
        let title = p(_.get(system, 'details.title'));
        let usernameProps = {
            id: 'username',
            type: 'text',
            value: username,
            disabled: submitting,
            env,
            onChange: this.handleUsernameChange,
        };
        let passwordProps = {
            id: 'password',
            type: 'password',
            value: password,
            disabled: submitting,
            env,
            onChange: this.handlePasswordChange,
        };
        let buttonDisabled = !valid;
        if (savedCredentials) {
            // don't disable the button, since the browser will immediately
            // set the password on user action
            buttonDisabled = false;
        }
        if (submitting) {
            buttonDisabled = true;
        }
        return (
            <section>
                <h2>{t('sign-in-$title', title)}</h2>
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
            </section>
        );
    }

    /**
     * Render error message
     *
     * @return {ReactElement|null}
     */
    renderProblem() {
        let { env } = this.props;
        let { problem } = this.state;
        let { t } = env.locale;
        if (!problem) {
            return null;
        }
        return (
            <div className="error">
                <i className="fa fa-exclamation-circle" />
                {' '}
                {t(`sign-in-problem-${problem}`)}
            </div>
        );
    }

    /**
     * Render list of options
     *
     * @return {ReactElement}
     */
    renderOAuthButtons() {
        let { env, servers } = this.props;
        let { t } = env.locale;
        servers = _.sortBy(servers, [ 'type' ]);
        if (_.isEmpty(servers)) {
            return null;
        }
        return (
            <section>
                <h2>{t('sign-in-oauth')}</h2>
                <div className="oauth-buttons">
                {
                    _.map(servers, (server) => {
                        return this.renderOAuthButton(server);
                    })
                }
                </div>
            </section>
        );
    }

    /**
     * Render an OAuth option
     *
     * @param  {Object} server
     *
     * @return {ReactElement}
     */
    renderOAuthButton(server) {
        let { database, env } = this.props;
        let { errors } = this.state;
        let { t, p } = env.locale;
        let name = p(server.details.title) || t(`server-type-${server.type}`);
        let icon = getServerIcon(server.type);
        let url = database.getOAuthURL(server);
        let props = {
            className: 'oauth-button',
            href: url,
            onClick: this.handleOAuthButtonClick,
            'data-id': server.id,
        };
        let error = errors[server.id];
        if (error) {
            let text = t(`sign-in-error-${error.reason}`);
            props.className += ' error';
            return (
                <a key={server.id} {...props}>
                    <span className="icon">
                        <i className={`fa fa-fw fa-${icon}`}></i>
                    </span>
                    <span className="error">{text}</span>
                </a>
            );
        } else {
            return (
                <a key={server.id} {...props}>
                    <span className="icon">
                        <i className={`fa fa-fw fa-${icon}`}></i>
                    </span>
                    <span className="label">{name}</span>
                </a>
            );
        }
    }

    /**
     * Remember when the component is loaded
     */
    componentDidMount() {
        this.mountTime = Moment();
    }

    /**
     * Open a popup window to OAuth provider
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    openPopUpWindow(url) {
        return new Promise((resolve, reject) => {
            let width = 800;
            let height = 600;
            let { screenLeft, screenTop, outerWidth, outerHeight } = window;
            let options = {
                width,
                height,
                left: screenLeft + Math.round((outerWidth - width) / 2),
                top: screenTop + Math.round((outerHeight - height) / 2),
                toolbar: 'no',
                menubar: 'no',
                status: 'no',
            };
            let pairs = _.map(options, (value, name) => {
                return `${name}=${value}`;
            });
            let win = window.open(url, 'sign-in', pairs.join(','));
            if (win) {
                win.location = url;
                let interval = setInterval(() => {
                    if (win.closed) {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            } else {
                reject(new Error('Unable to open popup'))
            }
        });
    }

    /**
     * Called when user clicks on one of the OAuth buttons
     *
     * @param  {Event} evt
     */
    handleOAuthButtonClick = (evt) => {
        let { database } = this.props;
        let { errors } = this.state;
        let url = evt.currentTarget.getAttribute('href');
        let serverID = parseInt(evt.currentTarget.getAttribute('data-id'))
        evt.preventDefault();
        return this.openPopUpWindow(url).then(() => {
            // retrieve authorization object from server
            let db = database.use({ by: this });
            return db.checkSession().catch((err) => {
                let errors = _.clone(errors);
                errors[serverID] = err;
                this.setState({ errors });
            });
        });
    }

    /**
     * Called when user changes the username
     *
     * @param  {Event} evt
     */
    handleUsernameChange = (evt) => {
        // if a username shows up within half a second, it's set by the
        // browser's saved password feature
        let now = Moment();
        let username = evt.target.value;
        let savedCredentials = false;
        if (username.length > 3) {
            if ((now - this.mountTime) < 500) {
                savedCredentials = true;
            }
        }
        this.setState({ username, savedCredentials });
    }

    /**
     * Called when user changes the password
     *
     * @param  {Event} evt
     */
    handlePasswordChange = (evt) => {
        let password = evt.target.value;
        let savedCredentials = false;
        this.setState({ password, savedCredentials });
    }

    /**
     * Called when user presses enter or clicks on submit button
     *
     * @param  {Event} evt
     */
    handleFormSubmit = (evt) => {
        let { database } = this.props;
        let { username, password } = this.state;
        evt.preventDefault();
        if (!this.canSubmitForm()) {
            return;
        }
        this.setState({ submitting: true }, () => {
            let db = database.use({ by: this });
            let credentials = {
                type: 'password',
                username,
                password,
            };
            db.authenticate(credentials).catch((err) => {
                let problem;
                switch (err.statusCode) {
                    case 401: problem = 'incorrect-username-password'; break;
                    case 403: problem = 'no-support-for-username-password'; break;
                    default: problem = 'unexpected-error';
                }
                this.setState({ problem, submitting: false });
            });
        });
    }
}

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}

export {
    SignInPage as default,
    SignInPage,
    SignInPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SignInPage.propTypes = {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    SignInPageSync.propTypes = {
        system: PropTypes.object,
        servers: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}

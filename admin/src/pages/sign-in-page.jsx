import _ from 'lodash';
import React, { useState, useEffect } from 'react';
import Relaks, { useProgress, useListener } from 'relaks';
import Moment from 'moment';
import * as HTTPRequest from 'common/transport/http-request.mjs';

// widgets
import PushButton from '../widgets/push-button.jsx';
import TextField from '../widgets/text-field.jsx';

import './sign-in-page.scss';

async function SignInPage(props) {
    const { database, route, env } = props;
    const { t, p } = env.locale;
    const [ show ] = useProgress();
    const [ username, setUsername ] = useState('');
    const [ password, setPassowrd ] = useState('');
    const [ submitting, setSubmitting ] = useState(false);
    const [ problem, setProblem ] = useState();
    const [ errors, setError ] = useState({});
    const [ savedCredentials, setSavedCredentials ] = useState(false);
    const db = database.use({ by: this });

    const handleOAuthButtonClick = useListener(async (evt) => {
        evt.preventDefault();
        const url = evt.currentTarget.getAttribute('href');
        const serverID = parseInt(evt.currentTarget.getAttribute('data-id'))
        try {
            // retrieve authorization object from server
            await openPopUpWindow(url);
            await db.checkAuthorization();
        } catch (err) {
            const newErrors = _.clone(errors);
            newErrors[serverID] = err;
            setErrors(newErrors);
        }
    });
    const handleUsernameChange = useListener((evt) => {
        const text = evt.target.value;
        setUsername(text);
    });
    const handlePasswordChange = useListener((evt) => {
        const text = evt.target.value;
        setPassowrd(text);
    });
    const handleFormSubmit = useListener(async (evt) => {
        evt.preventDefault();
        if (!canSubmitForm()) {
            return;
        }
        setSubmitting(true);
        try {
            const credentials = {
                type: 'password',
                username,
                password,
            };
            await db.authenticate(credentials);
        } catch (err) {
            let problem;
            switch (err.statusCode) {
                case 401: problem = 'incorrect-username-password'; break;
                case 403: problem = 'no-support-for-username-password'; break;
                default: problem = 'unexpected-error';
            }
            setProblem(problem);
        } finally {
            setSubmitting(false);
        }
    });
    useEffect(() => {
        setTimeout(() => {
            // if a username shows up within half a second, it's set by the
             // browser's saved password feature
             if (username.length > 3) {
                setSavedCredentials(true);
             }
        }, 500);
    }, []);

    render();
    const { system, servers } = await db.beginSession('admin');
    render();

    function render() {
        show(
            <div className="sign-in-page">
                {renderForm()}
                {renderOAuthButtons()}
            </div>
        );
    }

    function renderForm() {
        const valid = canSubmitForm();
        const title = p(_.get(system, 'details.title'));
        const usernameProps = {
            id: 'username',
            type: 'text',
            value: username,
            disabled: submitting,
            env,
            onChange: handleUsernameChange,
        };
        const passwordProps = {
            id: 'password',
            type: 'password',
            value: password,
            disabled: submitting,
            env,
            onChange: handlePasswordChange,
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
                <form onSubmit={handleFormSubmit}>
                    {renderProblem()}
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

    function renderProblem() {
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

    function renderOAuthButtons() {
        if (_.isEmpty(servers)) {
            return null;
        }
        const sorted = _.sortBy(servers, [ 'type' ]);
        return (
            <section>
                <h2>{t('sign-in-oauth')}</h2>
                <div className="oauth-buttons">
                    {_.map(sorted, renderOAuthButton)}
                </div>
            </section>
        );
    }

    function renderOAuthButton(server, i) {
        const name = p(server.details.title) || t(`server-type-${server.type}`);
        const icon = getServerIcon(server.type);
        const url = database.getOAuthURL(server);
        const props = {
            className: 'oauth-button',
            href: url,
            onClick: handleOAuthButtonClick,
            'data-id': server.id,
        };
        const error = errors[server.id];
        let text = name;
        if (error) {
            text = t(`sign-in-error-${error.reason}`);
            props.className += ' error';
        }
        return (
            <a key={server.id} {...props}>
                <span className="icon">
                    <i className={`fa fa-fw fa-${icon}`}></i>
                </span>
                <span className="label">{text}</span>
            </a>
        );
    }

    function canSubmitForm() {
        if (!_.trim(username)) {
            return false;
        }
        if (!_.trim(password)) {
            return false;
        }
        return true;
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

function openPopUpWindow(url) {
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

const component = Relaks.memo(SignInPage);

export {
    component as default,
    component as SignInPage,
};

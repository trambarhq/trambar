import React, { useState, useEffect } from 'react';
import { useProgress, useListener, useErrorCatcher } from 'relaks';
import { getServerName, getServerIconClass } from 'common/objects/utils/server-utils.js';
import { orderBy } from 'common/utils/array-utils.js';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { TextField } from '../widgets/text-field.jsx';

import './sign-in-page.scss';

export default async function SignInPage(props) {
  const { database } = props;
  const [ show ] = useProgress();

  render();
  const { system, servers } = await database.beginSession('admin');
  render();

  function render() {
    const sprops = { system, servers, ...props };
    show(<SignInPageSync {...sprops} />);
  }
}

function SignInPageSync(props) {
  const { system, servers } = props;
  const { database, route, env } = props;
  const { t, p } = env.locale;
  const [ username, setUsername ] = useState('');
  const [ password, setPassowrd ] = useState('');
  const [ submitting, setSubmitting ] = useState(false);
  const [ error, run ] = useErrorCatcher();
  const [ oauthErrors, setOAuthErrors ] = useState({});
  const [ savedCredentials, setSavedCredentials ] = useState(false);
  const credentialsValid = !!username.trim() && !!password.trim();

  const handleOAuthButtonClick = useListener(async (evt) => {
    evt.preventDefault();
    const url = evt.currentTarget.getAttribute('href');
    const serverID = parseInt(evt.currentTarget.getAttribute('data-id'))
    try {
      // retrieve authorization object from server
      await openPopUpWindow(url);
      await database.checkAuthorization();
    } catch (err) {
      const newErrors = { ...oauthErrors };
      newErrors[serverID] = err;
      setOAuthErrors(newErrors);
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
  const handleFormSubmit = useListener((evt) => {
    evt.preventDefault();
    if (!credentialsValid) {
      return;
    }
    run(async () => {
      try {
        setSubmitting(true);
        const credentials = { type: 'password', username, password };
        await database.authenticate(credentials);
      } finally {
        setSubmitting(false);
      }
    });
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


  return (
    <div className="sign-in-page">
      {renderForm()}
      {renderOAuthButtons()}
    </div>
  );

  function renderForm() {
    const title = p(system?.details?.title);
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
    let disabled = !credentialsValid;
    if (savedCredentials) {
      // don't disable the button, since the browser will immediately
      // set the password on user action
      disabled = false;
    }
    if (submitting) {
      disabled = true;
    }
    return (
      <section>
        <h2>{t('sign-in-$title', title)}</h2>
        <form onSubmit={handleFormSubmit}>
          {renderError()}
          <TextField {...usernameProps}>{t('sign-in-username')}</TextField>
          <TextField {...passwordProps}>{t('sign-in-password')}</TextField>
          <div className="button-row">
            <PushButton disabled={disabled}>
              {t('sign-in-submit')}
            </PushButton>
          </div>
        </form>
      </section>
    );
  }

  function renderError() {
    if (!error) {
      return null;
    }
    let problem;
    switch (error.statusCode) {
      case 401: problem = 'incorrect-username-password'; break;
      case 403: problem = 'no-support-for-username-password'; break;
      default: problem = 'unexpected-error';
    }
    return (
      <div className="error">
        <i className="fas fa-exclamation-circle" />
        {' '}
        {t(`sign-in-problem-${problem}`)}
      </div>
    );
  }

  function renderOAuthButtons() {
    if (!servers?.length) {
      return null;
    }
    const sorted = orderBy(servers, 'type', 'asc');
    return (
      <section>
        <h2>{t('sign-in-oauth')}</h2>
        <div className="oauth-buttons">
          {sorted?.map(renderOAuthButton)}
        </div>
      </section>
    );
  }

  function renderOAuthButton(server, i) {
    const name = getServerName(server, env);
    const iconClass = getServerIconClass(server);
    const url = database.getOAuthURL(server);
    const props = {
      className: 'oauth-button',
      href: url,
      onClick: handleOAuthButtonClick,
      'data-id': server.id,
    };
    const error = oauthErrors[server.id];
    let text = name;
    if (error) {
      text = t(`sign-in-error-${error.reason}`);
      props.className += ' error';
    }
    return (
      <a key={server.id} {...props}>
        <span className="icon">
          <i className={iconClass}></i>
        </span>
        <span className="label">{text}</span>
      </a>
    );
  }
}

function openPopUpWindow(url) {
  return new Promise((resolve, reject) => {
    const width = 800;
    const height = 600;
    const { screenLeft, screenTop, outerWidth, outerHeight } = window;
    const options = {
      width,
      height,
      left: screenLeft + Math.round((outerWidth - width) / 2),
      top: screenTop + Math.round((outerHeight - height) / 2),
      toolbar: 'no',
      menubar: 'no',
      status: 'no',
    };
    const pairs = [];
    for (let [ name, value ] of Object.entries(options)) {
      pairs.push(`${name}=${value}`);
    }
    const win = window.open(url, 'sign-in', pairs.join(','));
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

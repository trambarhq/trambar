import _ from 'lodash';
import React, { useState } from 'react';
import { useProgress, useListener } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.js';
import { parseActivationURL } from 'common/routing/universal-link.js';
import { findActiveProjects } from 'common/objects/finders/project-finder.js';
import { findActiveLinks } from 'common/objects/finders/project-link-finder.js';
import { getImageURL } from 'common/objects/utils/resource-utils.js';
import { getServerIconClass } from 'common/objects/utils/server-utils.js';
import { findSystem } from 'common/objects/finders/system-finder.js';
import { findUser } from 'common/objects/finders/user-finder.js';
import { isMember, isPendingMember } from 'common/objects/utils/user-utils.js';

// widgets
import { Scrollable } from '../widgets/scrollable.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ProfileImage } from '../widgets/profile-image.jsx';
import { ResourceView } from 'common/widgets/resource-view.jsx';
import { MembershipRequestDialogBox } from '../dialogs/membership-request-dialog-box.jsx';
import { QRScannerDialogBox } from '../dialogs/qr-scanner-dialog-box.jsx';
import { ActivationDialogBox } from '../dialogs/activation-dialog-box.jsx';
import { LoadingAnimation } from '../widgets/loading-animation.jsx';
import { EmptyMessage } from '../widgets/empty-message.jsx';
import Logo from '../../assets/trambar-logo.svg';

import './start-page.scss';

export default async function StartPage(props) {
  const { database, route, env, transitionOut, activationCode, onTransitionOut } = props;
  const { t, p, g } = env.locale;
  const [ show, cancel, delay ] = useProgress();
  const [ sessionStart ] = useState({});
  const [ selectedProjectName, setSelectedProjectName ] = useState('');
  const [ transitionMethod, setTransitionMethod ] = useState('fast');
  const [ scanningQRCode, scanQRCode ] = useState(false);
  const [ enteringManually, enterManually ] = useState(false);
  const [ addingServer, addServer ] = useState(false);
  const [ errors, setErrors ] = useState({});

  const handleOAuthButtonClick = useListener(async (evt) => {
    evt.preventDefault();
    evt.stopPropagation();
    const url = evt.currentTarget.getAttribute('href');
    const providerID = evt.currentTarget.getAttribute('data-id');
    await openPopUpWindow(url);
    const db = database.use();
    try {
      await db.checkAuthorization();
    } catch (err) {
      const newErrors = {};
      newErrors[`oauth-${providerID}`] = err;
      setErrors(newErrors);
    }
  });
  const handleUnknownProjectClick = useListener((evt) => {
    const name = evt.currentTarget.getAttribute('data-project-name');
    setSelectedProjectName(name);
  });
  const handleMembershipRequestConfirm = useListener(async (evt) => {
    toggleMembership(evt.project);
  });
  const handleMembershipRequestRevoke = useListener(async (evt) => {
    toggleMembership(evt.project);
  });
  const handleMembershipRequestClose = useListener((evt) => {
    setSelectedProjectName(null);
  });
  const handleMembershipRequestProceed = useListener((evt) => {
    navigateToProject('', evt.project.name);
  });
  const handleScanClick = useListener((evt) => {
    scanQRCode(true);
  });
  const handleManualClick = useListener((evt) => {
    enterManually(true);
  });
  const handleAddClick = useListener((evt) => {
    addServer(true);
  });
  const handleReturnClick = useListener((evt) => {
    addServer(false);
  });
  const handleCancelScan = useListener((evt) => {
    scanQRCode(false);
    setErrors({});
  });
  const handleScanResult = useListener((evt) => {
    const params = parseActivationURL(evt.result);
    activateMobileSession(params)
  });
  const handleActivationCancel = useListener((evt) => {
    enterManually(false);
  });
  const handleActivationConfirm = useListener((evt) => {
    const params = {
      address: evt.address,
      schema: evt.schema,
      activationCode: evt.code,
    };
    activateMobileSession(params);
  });
  const handleTransitionEnd = useListener((evt) => {
    if (evt.propertyName === 'opacity') {
      if (/start\-page/.test(evt.target.className)) {
        if (onTransitionOut) {
          onTransitionOut({});
        }
      }
    }
  });

  render();
  const db = database.use({ schema: 'global' });
  let currentUser;
  let system;
  let servers;
  let projects;
  let projectLinks;
  if (!db.authorized) {
    if (env.platform === 'browser') {
      // start authorization process--will receive system description
      // and list of OAuth providers along with links
      render();
      const info = await db.beginSession('client');
      // we'll load the system object again, through the regular
      // data retrieval mechanism, once we have gain access
      //
      // save a copy so that we can keep displaying the
      // background image and project description while loading
      // occurs
      sessionStart.system = info.system;
      system = info.system;
      servers = info.servers;
    } else if (env.platform === 'cordova') {
      sessionStart.system = {};
      projectLinks = await findActiveLinks(db);
    }
  } else {
    // handle things normally after we've gained authorization
    if (env.platform === 'browser') {
      if (sessionStart.system) {
        system = sessionStart.system;

        // need to adjust the progressive rendering delay since Relaks
        // by default disables it once a page has fully rendered
        delay(undefined, 500);
      }
      render();
      const currentUserID = await db.start();
      currentUser = await findUser(db, currentUserID);
      render();
      system = await findSystem(db);
      render();
      projects = await findActiveProjects(db, 1);
      render();
      projectLinks = await findActiveLinks(db);
    } else if (env.platform === 'cordova') {
      if (sessionStart.system) {
        // save reason as above; we can let the QR scanner screen
        // linger for a little bit longer
        delay(undefined, 1000);
      }
      render();
      const currentUserID = await db.start();
      currentUser = await findUser(db, currentUserID);
      // we don't need the rest when we're transitioning out
      if (!transitionOut) {
        render();
        system = await findSystem(db);
        render();
        projects = await findActiveProjects(db, 1);
        render();
        projectLinks = await findActiveLinks(db);
      }
    }
  }
  render();

  function render() {
    if (env.platform === 'browser') {
      show(renderForBrowser());
    } else if (env.platform === 'cordova') {
      show(renderForCordova());
    }
  }

  function renderForBrowser() {
    const classNames = [ 'start-page browser' ];
    const style = {};
    const backgroundImage = _.find(system?.details?.resources, { type: 'image' });
    if (backgroundImage) {
      const imageURL = getImageURL(backgroundImage, { width: 1024, quality: 40 }, env);
      style.backgroundImage = `url(${imageURL})`;
    }
    let onTransitionEnd;
    if (transitionOut) {
      classNames.push(`transition-out-${transitionMethod}`);
      onTransitionEnd = handleTransitionEnd;
    }
    const props = {
      className: classNames.join(' '),
      onTransitionEnd,
      style,
    };
    return (
      <div {...props}>
        <div className="bar">
          <h1 className="welcome">{t('start-welcome')}</h1>
          <div className="content-area">
            {renderDescription()}
            {renderChoices()}
          </div>
        </div>
        {renderProjectDialog()}
      </div>
    );
  }

  function renderForCordova() {
    const classNames = [ 'start-page', 'cordova' ];
    if (transitionOut) {
      classNames.push(`transition-out-${transitionMethod}`)
      const props = {
        className: classNames.join(' '),
        onTransitionEnd: handleTransitionEnd,
      };
      let contents;
      if (transitionMethod === 'slow') {
        // render a greeting during long transition
        contents = renderMobileGreeting();
      }
      return <div {...props}>{contents}</div>;
    }
    if (!database.authorized || addingServer) {
      // render only instructions for gaining access
      return (
        <div className={classNames.join(' ')}>
          {renderTitle()}
          {renderActivationControls()}
          {renderAvailableServers()}
        </div>
      );
    } else {
      // render project list, followed by activation instructions
      return (
        <div className={classNames.join(' ')}>
          {renderTitle()}
          {renderProjectButtons()}
          {renderEmptyMessage()}
          {renderActivationSelector()}
          {renderProjectDialog()}
        </div>
      );
    }
  }

  function renderDescription() {
    if (!system || !system.details) {
      return null;
    }
    const { title, description } = system.details;
    return (
      <div className="section description">
        <h2>{p(title) || t('start-system-title-default')}</h2>
        <Scrollable>
          <p>{p(description)}</p>
        </Scrollable>
      </div>
    );
  }

  function renderTitle() {
    let title;
    if (addingServer) {
      title = t('start-activation-new-server');
    } else if (database.authorized) {
      // show the name of the site
      if (system) {
        title = p(system.details.title);
      }
      if (!title) {
        title = t('start-system-title-default');
      }
    } else {
      title = t('app-name');
    }
    return <h2 className="title">{title}</h2>;
  }

  function renderMobileGreeting() {
    const classNames = 'welcome';
    if (scanningQRCode || enteringManually) {
      let name;
      if (currentUser) {
        name = getUserName(currentUser, env);
        classNames.push('user');
      } else {
        name = '\u00a0';
      }
      const imageProps = {
        user: currentUser,
        size: 'large',
        env,
      };
      return (
        <div className={classNames.join(' ')}>
          <h3>{t('start-welcome-again')}</h3>
          <ProfileImage {...imageProps} />
          <h4 className="name">{name}</h4>
        </div>
      );
    } else {
      return (
        <div className={classNames.join(' ')}>
          <h3>{t('start-welcome')}</h3>
        </div>
      );
    }
  }

  function renderActivationControls() {
    return (
      <div>
        {renderActivationInstructions()}
        {renderActivationButtons()}
        {renderQRScannerDialogBox()}
        {renderActivationDialogBox()}
      </div>
    );
  }

  function renderActivationInstructions() {
    const ui = {
      settings: (
        <span key="0" className="ui">
          {t('bottom-nav-settings')}
        </span>
      ),
      projects: (
        <span key="1" className="ui">
          {t('settings-projects')}
        </span>
      ),
      mobileSetup: (
        <span key="2" className="ui">
          <i className="fas fa-qrcode" />
          {' '}
          {t('project-management-mobile-set-up')}
        </span>
      )
    };
    return (
      <div className="activation-instructions">
        {t('start-activation-instructions', ui)}
      </div>
    );
  }

  function renderActivationButtons() {
    const manualProps = {
      label: t('start-activation-manual'),
      onClick: handleManualClick,
    };
    const scanProps = {
      label: t('start-activation-scan-code'),
      emphasized: true,
      onClick: handleScanClick,
    };
    return (
      <div className="activation-buttons">
        <div className="left">
          <PushButton {...manualProps} />
        </div>
        <div className="right">
          <PushButton {...scanProps} />
        </div>
      </div>
    );
  }

  function renderActivationSelector() {
    const addProps = {
      label: t('start-activation-add-server'),
      onClick: handleAddClick,
    };
    return (
      <div className="activation-buttons">
        <div className="right">
          <PushButton {...addProps} />
        </div>
      </div>
    );
  }

  function renderChoices() {
    if (!database.authorized) {
      return renderOAuthButtons();
    } else {
      return renderProjectButtons();
    }
  }

  function renderOAuthButtons() {
    const sorted = sortServers(servers, env);
    return (
      <div className="section buttons">
        <h2>{t('start-social-login')}</h2>
        <Scrollable>
          {renderEmptyMessage()}
          <p>{_.map(sorted, renderOAuthButton)}</p>
        </Scrollable>
      </div>
    );
  }

  function renderOAuthButton(server, i) {
    const { title } = server.details;
    const iconClass = getServerIconClass(server);
    const url = database.getOAuthURL(server);
    const classNames = [ 'oauth-button' ];
    const error = errors[`oauth-${server.id}`];
    let label;
    if (!error) {
      label = p(title) || t(`server-type-${server.type}`);
    } else {
      label = t(`start-error-${error.reason}`);
      classNames.push('error');
    }
    const props = {
      className: classNames.join(' '),
      href: url,
      target: '_blank',
      'data-id': server.id,
      onClick: handleOAuthButtonClick,
    };
    return (
      <a key={i} {...props}>
        <span className="icon">
          <i className={`${iconClass} fa-fw`}></i>
        </span>
        <span className="label">{label}</span>
      </a>
    );
  }

  function renderProjectButtons() {
    const sorted = sortProjects(projects, env);
    if (env.platform == 'browser') {
      return (
        <div className="section buttons">
          <h2>{sorted ? t('start-projects') : ''}</h2>
          <Scrollable>
            {renderEmptyMessage()}
            {_.map(sorted, renderProjectButton)}
          </Scrollable>
        </div>
      );
    } else if (env.platform === 'cordova') {
      return (
        <div className="projects">
          {renderEmptyMessage()}
          {_.map(sorted, renderProjectButton)}
        </div>
      );
    }
  }

  function renderProjectButton(project, i) {
    const { name } = project;
    const { description, title, resources } = project.details;

    // project picture
    let icon;
    let image = _.find(resources, { type: 'image' });
    if (image) {
      icon = <ResourceView resource={image} width={56} height={56} env={env} />;
    } else {
      // use logo, with alternating background color
      const num = (project.id % 5) + 1;
      icon = <div className={`default v${num}`}><Logo /></div>;
    }

    // add badge to indicate membership status
    let badge;
    if (isMember(currentUser, project)) {
      badge = <i className="far fa-user-circle badge" />;
    } else if (isPendingMember(currentUser, project)) {
      badge = <i className="far fa-clock badge" />;
    }

    // don't show dialog box if user has previously visited the project
    const skipDialog = _.some(projectLinks, {
      address: route.context.address,
      schema: project.name,
    });
    let linkProps;
    if (!skipDialog) {
      linkProps = {
        'data-project-name': project.name,
        className: 'project-button',
        onClick: handleUnknownProjectClick,
      };
    } else {
      linkProps = {
        className: 'project-button',
        href: route.find('news-page', {}, { schema: project.name }),
      };
    }
    return (
      <a key={project.id} {...linkProps}>
        <div className="icon">{icon}</div>
        <div className="text">
          {badge}
          <div className="title">
            {p(title) || name}
          </div>
          <div className="description">
            <div className="contents">
              {p(description)}
              <div className="ellipsis">
                <i className="fas fa-ellipsis-h" />
              </div>
            </div>
          </div>
        </div>
      </a>
    );
  }

  function renderEmptyMessage() {
    if (!database.authorized) {
      if (!_.isEmpty(servers)) {
        return null;
      }
      if (servers) {
        return <EmptyMessage phrase="start-no-servers" env={env} />;
      }
    } else {
      if (!_.isEmpty(projects)) {
        return null;
      }
      if (!projects) {
        return <LoadingAnimation />;
      } else {
        return <EmptyMessage phrase="start-no-projects" env={env} />;
      }
    }
  }

  function renderAvailableServers() {
    if (_.isEmpty(projectLinks)) {
      return null;
    }
    const addresses = _.uniq(_.map(projectLinks, 'address')).sort();
    const returnProps = {
      label: t('start-activation-return'),
      hidden: !database.authorized,
      onClick: handleReturnClick,
    };
    return (
      <div className="other-servers">
        <h2 className="title">{t('start-activation-others-servers')}</h2>
        <ul>{_.map(addresses, renderServerLink)}</ul>
        <div className="activation-buttons">
          <div className="right">
            <PushButton {...returnProps} />
          </div>
        </div>
      </div>
    );
  }

  function renderServerLink(address, key) {
    const context = { cors: true, address };
    const url = route.find('start-page', {}, context);
    return (
      <li key={key}>
        <a href={url}>
          <i className="fas fa-home" /> {server}
        </a>
      </li>
    );
  }

  function renderProjectDialog() {
    const selectedProject = _.find(projects, { name: selectedProjectName });
    const dialogProps = {
      show: !!selectedProject && !transitionOut,
      currentUser,
      project: selectedProject,
      database,
      route,
      env,
      onConfirm: handleMembershipRequestConfirm,
      onRevoke: handleMembershipRequestRevoke,
      onClose: handleMembershipRequestClose,
      onProceed: handleMembershipRequestProceed,
    };
    return <MembershipRequestDialogBox {...dialogProps} />;
  }

  function renderQRScannerDialogBox() {
    const props = {
      show: scanningQRCode,
      error: activationError,
      env,
      onCancel: handleCancelScan,
      onResult: handleScanResult,
    };
    const ui = {
      settings: (
        <span key="0" className="ui">
          {t('bottom-nav-settings')}
        </span>
      ),
      mobileSetup: (
        <span key="2" className="ui">
          <i className="fas fa-qrcode" />
          {' '}
          {t('project-management-mobile-set-up')}
        </span>
      )
    };
    return (
      <QRScannerDialogBox {...props}>
        {t('start-activation-instructions-short', ui)}
      </QRScannerDialogBox>
    );
  }

  function renderActivationDialogBox() {
    const props = {
      show: enteringManually,
      error: activationError,
      env,
      onCancel: handleActivationCancel,
      onConfirm: handleActivationConfirm,
    };
    return (
      <ActivationDialogBox {...props} />
    );
  }

  async function activateMobileSession(params) {
    const { address, schema, activationCode } = params || {};
    const db = database.use({ address, schema });
    try {
      const userID = await db.acquireMobileSession(activationCode);
      if (schema) {
        navigateToProject(address, schema);
      }

      // create entry in device table
      const device = {
        type: getDeviceType(),
        uuid: getDeviceUUID(),
        details: getDeviceDetails(),
        user_id: userID,
        session_handle: _.toLower(activationCode),
      };
      await db.saveOne({ schema: 'global', table: 'device' }, device);
    } catch (err) {
      db.releaseMobileSession();
      this.setState({ activationError: err });
      setTimeout(() => {
        this.setState({ activationError: null });
      }, 5000);
      throw err;
    }
  }

  async function toggleMembership(project) {
    const projectIDs = currentUser.requested_project_ids;
    const changes = {
      id: currentUser.id,
      requested_project_ids: _.toggle(projectIDs, project.id),
    };
    const db = database.use({ schema: 'global' });
    await db.saveOne({ table: 'user' }, changes);
  }

  async function navigateToProject(address, schema) {
    const context = { schema };
    if (address) {
      context.address = address;
      context.cors = true;
    }
    const bookmarked = _.some(projectLinks, { address, schema });
    if (!bookmarked) {
      setTransitionMethod('slow');
    }
    return route.push('news-page', {}, context);
  }
}

async function openPopUpWindow(url) {
  return new Promise((resolve, reject) => {
    let width = 800;
    let height = 600;
    let options = {
      width,
      height,
      left: window.screenLeft + Math.round((window.outerWidth - width) / 2),
      top: window.screenTop + Math.round((window.outerHeight - height) / 2),
      toolbar: 'no',
      menubar: 'no',
      status: 'no',
    };
    let pairs = _.map(options, (value, name) => {
      return `${name}=${value}`;
    });
    let win = window.open(url, 'login', pairs.join(','));
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

const sortProjects = memoizeWeak(null, function(projects, env) {
  const { p } = env.locale;
  return _.sortBy(projects, (project) => {
    return p(project.details.title) || project.name;
  });
});

const sortServers = memoizeWeak(null, function(servers, env) {
  const { p } = env.locale;
  return _.sortBy(servers, (server) => {
    return p(server.details.title) || server.name;
  });
});

/**
 * Return the device OS
 *
 * @return {String}
 */
function getDeviceType() {
  if (window.cordova) {
    return cordova.platformId;
  }
  if (process.env.NODE_ENV !== 'production') {
    return 'android';
  }
  return null;
}

/**
 * Return device unique id
 *
 * @return {String}
 */
function getDeviceUUID() {
  const device = window.device;
  if (device) {
    return device.uuid;
  }
  if (process.env.NODE_ENV !== 'production') {
    return '00000000000000000000000000000000';
  }
  return null;
}

/**
 * Return device details
 *
 * @return {Object}
 */
function getDeviceDetails() {
  const device = window.device;
  if (device) {
    let manufacturer = device.manufacturer;
    let name = device.model;
    if (manufacturer === 'MicrosoftMDG') {
      manufacturer = 'Microsoft';
    }
    return { manufacturer, name };
  }
  if (process.env.NODE_ENV !== 'production') {
    return {
      manufacturer: 'Apricot',
      name: 'Apricot oPhone 5',
    };
  }
  return {};
}

StartPage.useTransition = true;

import React, { useState, useMemo, useEffect } from 'react';
import { useListener, useEventTime } from 'relaks';
import { routes } from './routing.js';
import { CORSRewriter } from 'common/routing/cors-rewriter.js';
import { SchemaRewriter } from 'common/routing/schema-rewriter.js';
import { createLink, removeDefunctLinks } from 'common/objects/savers/project-link-saver.js';
import { TopLevelMouseTrap } from 'common/utils/top-level-mouse-trap.js';
import { codePushDeploymentKeys } from './keys.js';

// non-visual components
import { Database } from 'common/data/database.js';
import { Route } from 'common/routing/route.js';
import { Payloads } from 'common/transport/payloads.js';
import { Locale } from 'common/locale/locale.js';
import { Environment } from 'common/env/environment.js';

// widgets
import { TopNavigation } from './widgets/top-navigation.jsx';
import { BottomNavigation } from './widgets/bottom-navigation.jsx';
import { UploadProgress } from 'common/widgets/upload-progress.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';
import { processMobileAlert } from './views/notification-view.jsx';

import 'common/utils/lodash-extra.js';
import './front-end.scss';
import '@fortawesome/fontawesome-free/css/all.css';

const widthDefinitions = {
  'single-col': 0,
  'double-col': 700,
  'triple-col': 1300,
};

export function FrontEnd(props) {
  const { dataSource, routeManager, payloadManager, envMonitor, localeManager, codePush } = props;
  const [ routeChanged, setRouteChanged ] = useEventTime();
  const route = useMemo(() => {
    return new Route(routeManager);
  }, [ routeManager, routeChanged ]);
  const [ prevRoute, setPrevRoute ] = useState();
  const { address, schema } = routeManager.context;
  const [ dataChanged, setDataChanged ] = useEventTime();
  const database = useMemo(() => {
    return new Database(dataSource, { address, schema });
  }, [ dataSource, address, schema, dataChanged ]);
  const [ payloadsChanged, setPayloadsChanged ] = useEventTime();
  const payloads = useMemo(() => {
    return new Payloads(payloadManager, { address, schema });
  }, [ payloadManager, address, schema, payloadsChanged ]);
  const [ localeChanged, setLocaleChanged ] = useEventTime();
  const locale = useMemo(() => {
    return new Locale(localeManager);
  }, [ localeManager, localeChanged ])
  const [ envChanged, setEnvChanged ] = useEventTime();
  const env = useMemo(() => {
    return new Environment(envMonitor, { locale, address, widthDefinitions });
  }, [ envMonitor, locale, address, envChanged ]);
  const [ showingUploadProgress, showUploadProgress ] = useState(false);
  const [ makingRequests, makeRequests ] = useState(false);

  const handleRouteChange = useListener((evt) => {
    // retain the previous route when the page has transition effect
    if (route.page.useTransition) {
      if (route.params.key !== routeManager.params.key) {
        //setPrevRoute(route);
        console.log('prev')
      }
    }
  });
  const handlePageTransitionOut = useListener((evt) => {
    setPrevRoute(null);
  });

  const handleAlertClick = useListener((evt) => {
    processMobileAlert(evt.alert, database, route);
  });

  useEffect(() => {
    //dataSource.addEventListener('change', handleRouteChange);
  }, [ dataSource ]);
  useEffect(() => {
    dataSource.addEventListener('change', setDataChanged);
    routeManager.addEventListener('change', setRouteChanged);
    payloadManager.addEventListener('change', setPayloadsChanged);
    envMonitor.addEventListener('change', setEnvChanged);
    localeManager.addEventListener('change', setLocaleChanged);
    return () => {
      dataSource.removeEventListener('change', setDataChanged);
      routeManager.removeEventListener('change', setRouteChanged);
      payloadManager.removeEventListener('change', setPayloadsChanged);
      envMonitor.removeEventListener('change', setEnvChanged);
      localeManager.removeEventListener('change', setLocaleChanged);
    };
  }, [ dataSource, routeManager, payloadManager, envMonitor, localeManager ]);
  useEffect(() => {
    let timeout = 0;
    let on;

    const handleRequestStart = (evt) => {
      if (!on) {
        makeRequests(true);
        on = true;
      }
      clearTimeout(timeout);
    };
    const handleRequestEnd = (evt) => {
      // use a timeout function to reduce the number of toggles
      timeout = setTimeout(() => {
        if (on) {
          makeRequests(false);
          on = false;
        }
      }, 300);
    };

    dataSource.addEventListener('requeststart', handleRequestStart);
    dataSource.addEventListener('requestend', handleRequestEnd);
  }, [ dataSource ])
  useEffect(() => {
    const handleStupefaction = (evt) => {
      routeManager.substitute('error-page');
    };
    const handleViolation = (evt) => {
      routeManager.replace('start-page', {}, { schema: null });
    };
    dataSource.addEventListener('stupefaction', handleStupefaction);
    dataSource.addEventListener('violation', handleViolation);
    return () => {
      dataSource.removeEventListener('stupefaction', handleStupefaction);
      dataSource.removeEventListener('violation', handleViolation);
    };
  }, [ dataSource, routeManager ])
  useEffect(() => {
    const handleRouteBeforeChange = (evt) => {
      // postpone the route change until the change is confirmed
      evt.postponeDefault(route.confirm());
    }
    routeManager.addEventListener('beforechange', handleRouteBeforeChange, true);
    return () => {
      routeManager.removeEventListener('beforechange', handleRouteBeforeChange);
    };
  }, [ routeManager, route ]);
  useEffect(() => {
    if (payloads.uploading) {
      const handleBeforeUnload = (evt) => {
        // Chrome will repaint only after the modal dialog is dismissed
        showUploadProgress(true);
        return (evt.returnValue = 'Are you sure?');
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    } else {
      if (showingUploadProgress) {
        showUploadProgress(false);
      }
    }
  }, [ payloads.uploading ]);
  useEffect(() => {
    document.title = locale.t('app-name');
  }, [ locale ]);
  useEffect(() => {
    if (database.authorized && schema) {
      createLink(database, address, schema);
    }
  }, [ database.authorized, schema, address ]);
  useEffect(() => {
    if (database.authorized) {
      removeDefunctLinks(database, address);
    }
  }, [ database.authorized, address ]);

  const classNames = [ 'front-end' ];
  if (env.isWiderThan('triple-col')) {
    classNames.push('triple-col');
  } else if (env.isWiderThan('double-col')) {
    classNames.push('double-col');
  } else {
    classNames.push('single-col');
  }
  if (env.androidKeyboard) {
    classNames.push('keyboard');
  }
  if (env.pointingDevice === 'mouse') {
    classNames.push('no-touch');
  }
  const topLevelProps = {
    className: classNames.join(' '),
    onMouseDown: TopLevelMouseTrap.handleMouseDown,
    onMouseUp: TopLevelMouseTrap.handleMouseUp,
  };
  return (
    <div {...topLevelProps}>
      {renderTopNav()}
      <section className="page-view-port">
        <ErrorBoundary env={env}>
          {renderCurrentPage()}
          {renderPreviousPage()}
        </ErrorBoundary>
      </section>
      {renderBottomNav()}
      {renderUploadProgress()}
    </div>
  );

  function renderTopNav() {
    const settings = route.params.ui;
    const props = {
      settings,
      database,
      route,
      payloads,
      makingRequests,
      env,
    };
    return <TopNavigation {...props} />;
  }

  function renderBottomNav() {
    const settings = route.params.ui;
    const props = {
      settings,
      database,
      route,
      env,
    };
    return <BottomNavigation {...props} />;
  }

  function renderCurrentPage() {
    const CurrentPage = route.page;
    const pageProps = {
      database,
      route,
      payloads,
      env,
      ...route.pageParams,
      ...(CurrentPage.diagnostics) ? props : null
    };
    return <CurrentPage {...pageProps} />;
  }

  function renderPreviousPage() {
    if (!prevRoute) {
      return null;
    }
    const PreviousPage = prevRoute.page;
    const pageProps = {
      database,
      route: prevRoute,
      payloads,
      env,
      transitionOut: true,
      onTransitionOut: handlePageTransitionOut,
      ...prevRoute.pageParams,
      ...(PreviousPage.diagnostics) ? props : null
    };
    return <PreviousPage {...pageProps} />;
  }

  function renderUploadProgress() {
    if (!showingUploadProgress) {
      return null;
    }
    const props = { payloads, env };
    return <UploadProgress {...props} />;
  }
}

export const coreConfiguration = {
  area: 'client',
  routeManager: {
    routes,
    rewrites: [ CORSRewriter, SchemaRewriter ],
  },
  dataSource: {
    discoveryFlags: {
      include_uncommitted: true,
    },
  },
  codePush: {
    keys: codePushDeploymentKeys
  },
  cache: {
    name: 'trambar'
  },
};
export { FrontEndCore } from 'common/front-end-core.js';

if (process.env.NODE_ENV !== 'production') {
  require('./__PROPTYPES__.js');
}

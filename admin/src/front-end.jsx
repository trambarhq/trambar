import _ from 'lodash';
import React, { useState, useMemo, useEffect } from 'react';
import Relaks, { useEventTime } from 'relaks';
import { FrontEndCore } from 'common/front-end-core.mjs';
import { CORSRewriter } from 'common/routing/cors-rewriter.mjs';

import { HTTPError } from 'common/errors/http-error.mjs';

import { routes } from './routing.mjs';

// proxy objects
import { Database } from 'common/data/database.mjs';
import { Route } from 'common/routing/route.mjs';
import { Payloads } from 'common/transport/payloads.mjs';
import { Locale } from 'common/locale/locale.mjs';
import { Environment } from 'common/env/environment.mjs';

// widgets
import { SideNavigation } from './widgets/side-navigation.jsx';
import { TaskAlertBar } from './widgets/task-alert-bar.jsx';
import { UploadProgress } from 'common/widgets/upload-progress.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

import 'setimmediate';
import 'common/utils/lodash-extra.mjs';
import 'font-awesome-webpack';
import './front-end.scss';
import './colors.scss';

const widthDefinitions = {
    'narrow': 700,
    'standard': 1000,
    'wide': 1400,
    'super-wide': 1700,
    'ultra-wide': 2000,
};

function FrontEnd(props) {
    const { dataSource, routeManager, payloadManager, envMonitor, localeManager } = props;
    const [ routeChanged, setRouteChanged ] = useEventTime();
    const route = useMemo(() => {
        return new Route(routeManager);
    }, [ routeManager, routeChanged ]);
    const { address } = routeManager.context;
    const [ dataChanged, setDataChanged ] = useEventTime();
    const database = useMemo(() => {
        return new Database(dataSource, { address });
    }, [ dataSource, address, dataChanged ]);
    const [ payloadsChanged, setPayloadsChanged ] = useEventTime();
    const payloads = useMemo(() => {
        return new Payloads(payloadManager, { address, schema: 'global' });
    }, [ payloadManager, address, payloadsChanged ]);
    const [ localeChanged, setLocaleChanged ] = useEventTime();
    const locale = useMemo(() => {
        return new Locale(localeManager);
    }, [ localeManager, localeChanged ])
    const [ envChanged, setEnvChanged ] = useEventTime();
    const env = useMemo(() => {
        return new Environment(envMonitor, { locale, address, widthDefinitions });
    }, [ envMonitor, locale, address, envChanged ]);
    const [ showingUploadProgress, showUploadProgress ] = useState(false);

    useEffect(() => {
        dataSource.addEventListener('change', setRouteChanged);
        routeManager.addEventListener('change', setRouteChanged);
        payloadManager.addEventListener('change', setPayloadsChanged);
        envMonitor.addEventListener('change', setEnvChanged);
        localeManager.addEventListener('change', setLocaleChanged);
        return () => {
            dataSource.removeEventListener('change', setRouteChanged);
            routeManager.removeEventListener('change', setRouteChanged);
            payloadManager.removeEventListener('change', setPayloadsChanged);
            envMonitor.removeEventListener('change', setEnvChanged);
            localeManager.removeEventListener('change', setLocaleChanged);
        };
    }, [ dataSource, routeManager, payloadManager, envMonitor, localeManager ]);
    useEffect(() => {
        const handleStupefaction = (evt) => {
            routeManager.substitute('error-page');
        };
        const handleRouteBeforeChange = (evt) => {
            // postpone the route change until the change is confirmed
            evt.postponeDefault(route.confirm());
        }
        dataSource.addEventListener('stupefaction', handleStupefaction);
        routeManager.addEventListener('beforechange', handleRouteBeforeChange, true);
        return () => {
            dataSource.removeEventListener('stupefaction', handleStupefaction);
            routeManager.removeEventListener('beforechange', handleRouteBeforeChange);
        };
    }, [ route ])
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
        document.title = locale.t('app-title');
    }, [ locale ])

    return (
        <div className="front-end">
            {renderSideNav()}
            <section className="page-view-port">
                {renderPage()}
                {renderTaskAlert()}
                {renderUploadProgress()}
            </section>
        </div>
    );

    function renderSideNav() {
        const props = {
            database,
            route,
            env,
            disabled: route.public,
        };
        return <SideNavigation {...props} />;
    }

    function renderPage() {
        const CurrentPage = route.page;
        const props = {
            database,
            route,
            env,
            payloads,
            ...route.pageParams
        };
        return (
            <div className="scroll-box">
                <ErrorBoundary env={env}>
                    <CurrentPage {...props} />
                </ErrorBoundary>
            </div>
        );
    }

    function renderTaskAlert() {
        const props = { database, route, env };
        return <TaskAlertBar {...props} />;
    }

    function renderUploadProgress() {
        if (!showingUploadProgress) {
            return null;
        }
        const props = { payloads, env };
        return <UploadProgress {...props} />;
    }
}

const coreConfiguration = {
    area: 'admin',
    routeManager: {
        basePath: '/admin',
        routes,
        rewrites: [ CORSRewriter ],
    },
    dataSource: {
        basePath: '/srv/admin-data',
        discoveryFlags: {
            include_deleted: true,
        },
        retrievalFlags: {
            include_ctime: true,
            include_mtime: true,
        },
    },
    cache: {
        name: 'trambar-admin'
    },
};

export {
    FrontEnd as default,
    FrontEnd,
    FrontEndCore,
    coreConfiguration,
};

if (process.env.NODE_ENV !== 'production') {
    require('./__PROPTYPES__.mjs');
}

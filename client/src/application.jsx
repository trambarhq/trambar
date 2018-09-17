import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';
import CORSRewriter from 'routing/cors-rewriter';
import SchemaRewriter from 'routing/schema-rewriter';

// non-visual components
import Database from 'data/database';
import Route from 'routing/route';
import Payloads from 'transport/payloads';
import Locale from 'locale/locale';

// widgets
import TopNavigation from 'widgets/top-navigation';
import BottomNavigation from 'widgets/bottom-navigation';
import UploadProgress from 'widgets/upload-progress';
import NotificationView from 'views/notification-view';

import 'utils/lodash-extra';
import 'application.scss';
import 'font-awesome-webpack';

const widthDefinitions = {
    'single-col': 0,
    'double-col': 700,
    'triple-col': 1300,
};

class Application extends PureComponent {
    static displayName = 'Application';
    static coreConfiguration = {
        routeManager: {
            routes,
            rewrites: [ CORSRewriter, SchemaRewriter ],
        },
        dataSource: {
            area: 'client',
            discoveryFlags: {
                include_uncommitted: true,
            },
        },
    };

    constructor(props) {
        super(props);
        let {
            dataSource,
            routeManager,
            payloadManager,
            envMonitor,
            localeManager,
        } = this.props;
        let { address } = routeManager.context;
        let { schema } = routeManager.params;
        let locale = new Locale(localeManager);
        this.state = {
            database: new Database(dataSource, { address }),
            payloads: new Payloads(payloadManager, { address, schema }),
            route: new Route(routeManager),
            env: new Environment(envMonitor, { locale, address, widthDefinitions }),

            showingUploadProgress: false,
        };
    }

    getClassName() {
        let { env } = this.state;
        let mode;
        if (env.isWiderThan('triple-col')) {
            mode = 'triple-col';
        } else if (env.isWiderThan('double-col')) {
            mode = 'double-col';
        } else {
            mode = 'single-col';
        }
        let className = `application ${mode}`;
        // TODO
        /*
        if (this.state.theme.keyboard) {
            className += ` keyboard`;
        }
        if (!this.state.theme.touch) {
            className += ' no-touch';
        }
        */
        return className;
    }

    /**
     * Render the application
     *
     * @return {ReactElement}
     */
    render() {
        let { database, route, env, payloads } = this.state;
        let { module } = route.params;
        if (process.env.NODE_ENV !== 'production') {
            if (!module) {
                if (!route.name) {
                    console.log('No routing information');
                } else {
                    console.log('No component for route: ' + route.name);
                }
                return null;
            } else if (!module.default) {
                console.log('Component not exported as default: ' + route.name);
                return null;
            }
        }
        let CurrentPage = module.default;
        let settings = CurrentPage.configureUI(route);
        let topNavProps = {
            searching: false, // TODO
            settings,
            database,
            route,
            payloads,
            env,
        };
        let bottomNavProps = {
            settings,
            database,
            route,
            env,
        };
        let pageProps = {
            database,
            route,
            payloads,
            env,
        };
        let className = this.getClassName();
        let key = route.path + route.search;
        return (
            <div className={className} id="application">
                <TopNavigation {...topNavProps} />
                <section className="page-view-port">
                    <CurrentPage key={key} {...pageProps} />
                </section>
                <BottomNavigation {...bottomNavProps} />
                {this.renderUploadProgress()}
            </div>
        );
    }

    /**
     * Render upload progress pop-up if it's activated
     *
     * @return {ReactElement|null}
     */
    renderUploadProgress() {
        let { env, payloads, showingUploadProgress } = this.state;
        if (!showingUploadProgress) {
            return null;
        }
        let props = {
            payloads,
            env,
        };
        return <UploadProgress {...props} />;
    }

    /**
     * Attach event handlers
     */
    componentDidMount() {
    }

    /**
     * Remove event handlers
     */
    componentWillUnmount() {
    }

    /**
     * Called when user clicks on alert message
     *
     * @param  {Object} evt
     */
    handleAlertClick = (evt) => {
        let alert = evt.alert;
        // create an object take has some of Notification's properties
        let notification = {
            id: alert.notification_id,
            type: alert.type,
            user_id: alert.user_id,
            reaction_id: alert.reaction_id,
            story_id: alert.story_id,
        };
        let url = NotificationView.getNotificationURL(notification, this.state.route);
        let target = NotificationView.getNotificationTarget(notification);
        if (target) {
            // create a link and click it to open a new tab
            let a = document.createElement('A');
            a.href = url;
            a.target = target;
            a.click();
        } else {
            // handle it internally
            this.state.route.change(url);
            window.focus();
        }

        // mark as read
        let params = this.state.route.parameters;
        let db = this.state.database.use({ schema: params.schema, by: this });
        db.start().then((userId) => {
            let columns = {
                id: alert.notification_id,
                seen: true
            };
            return db.saveOne({ table: 'notification' }, columns);
        });
    }

    /**
     * Called when user navigate to another site or hit refresh
     *
     * @param  {Event} evt
     */
    handleBeforeUnload = (evt) => {
        if (process.env.PLATFORM !== 'browser') return;
        if (this.state.payloads && this.state.payloads.uploading) {
            // Chrome will repaint only after the modal dialog is dismissed
            this.setState({ showingUploadProgress: true });
            return (evt.returnValue = 'Are you sure?');
        }
    }
}

export {
    Application as default,
    Application,
};

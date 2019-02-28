import _ from 'lodash';
import React, { PureComponent } from 'react';
import ComponentRefs from 'utils/component-refs';

// widgets
import Link from 'widgets/link';
import CollapsibleContainer from 'widgets/collapsible-container';
import CalendarBar from 'widgets/calendar-bar';
import RoleFilterBar from 'widgets/role-filter-bar';
import SearchBar from 'widgets/search-bar';
import ErrorBoundary from 'widgets/error-boundary';

import './top-navigation.scss';

/**
 * Expandable navigation bar at the top of the user interface.
 *
 * @extends PureComponent
 */
class TopNavigation extends PureComponent {
    static displayName = 'TopNavigation';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLDivElement,
        });
        let hidden = !_.get(props.settings, 'navigation.top', true);
        this.state = {
            height: (hidden) ? 0 : 'auto',
        };
    }

    /**
     * Return true if top nav is supposed to be hidden
     *
     * @param  {Object|undefined} props
     *
     * @return {Boolean}
     */
    isHidden(props) {
        let { settings } = props || this.props;
        return !_.get(settings, 'navigation.top', true);
    }

    /**
     * Return control required by route
     *
     * @return {String|null}
     */
    getSelectedControl() {
        let { route } = this.props;
        let params = route.params;
        if (params.search != undefined) {
            return 'search';
        } else if (params.date != undefined) {
            return 'calendar';
        } else if (params.roleIDs != undefined) {
            return 'filter';
        }
        return null;
    }

    /**
     * Return URL for activating/deactivating control
     *
     * @param  {String} control
     *
     * @return {String|null}
     */
    getControlURL(control) {
        let { route, settings } = this.props;
        let selected = this.getSelectedControl();
        let controlSettings = _.get(settings, control);
        if (!controlSettings) {
            return null;
        }
        let params = _.clone(controlSettings.route) || {};
        if (control !== selected) {
            // add empty parameters to trigger the control's activation
            switch (control) {
                case 'search':
                    params.search = '';
                    break;
                case 'calendar':
                    params.date = '';
                    break;
                case 'filter':
                    params.roleIDs = [];
                    break;
            }
        }
        let url = route.find(route.name, params);
        return url;
    }

    /**
     * Change this.state.height when this.props.hidden changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { container } = this.components;
        let hiddenBefore = this.isHidden();
        let hiddenAfter = this.isHidden(nextProps);
        if (hiddenBefore !== hiddenAfter) {
            let contentHeight = container.offsetHeight;
            if (hiddenAfter) {
                // hiding navigation:
                //
                // render with height = contentHeight, then
                // render with height = 0 immediately
                this.setState({ height: contentHeight });
                setTimeout(() => {
                    if (this.isHidden()) {
                        this.setState({ height: 0 });
                    }
                }, 0);
            } else {
                // showing navigation:
                //
                // render with height = contentHeight, then
                // render with height = auto after a second
                this.setState({ height: contentHeight });
                setTimeout(() => {
                    if (!this.isHidden()) {
                        this.setState({ height: 'auto' });
                    }
                }, 1000);
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { height } = this.state;
        let { setters } = this.components;
        return (
            <header className="top-navigation" style={{ height }}>
                <div ref={setters.container} className="container">
                    {this.renderButtonBar()}
                    {this.renderCollapsibleControl()}
                </div>
            </header>
        );
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtonBar() {
        let { database, payloads, env, makingRequests } = this.props;
        let selected = this.getSelectedControl();
        let calendarProps = {
            icon: 'calendar',
            className: 'calendar-btn',
            url: this.getControlURL('calendar'),
            active: (selected === 'calendar'),
        };
        let filterProps = {
            icon: 'filter',
            className: 'filter-btn',
            url: this.getControlURL('filter'),
            active: (selected === 'filter'),
        };
        let searchProps = {
            icon: 'search',
            className: 'search-btn',
            url: this.getControlURL('search'),
            active: (selected === 'search'),
        };
        let connectionProps = {
            uploading: payloads.uploading,
            searching: makingRequests,
            env,
        };
        return (
            <div>
                <Button {...calendarProps} />
                <Button {...filterProps} />
                <Button {...searchProps} />
                <ConnectionIndicator {...connectionProps}/>
            </div>
        );
    }

    /**
     * Render collapsible UI controls
     *
     * @return {ReactElement}
     */
    renderCollapsibleControl() {
        let { env } = this.props;
        let selected = this.getSelectedControl();
        return (
            <CollapsibleContainer open={!!selected}>
                <ErrorBoundary env={env}>
                    {this.renderControl()}
                </ErrorBoundary>
            </CollapsibleContainer>
        );
    }

    /**
     * Render one of the controls
     *
     * @return {ReactElement}
     */
    renderControl() {
        let selected = this.getSelectedControl();
        switch (selected) {
            case 'calendar': return this.renderCalendarBar();
            case 'filter': return this.renderRoleFilterBar();
            case 'search': return this.renderSearchBar();
        }
    }

    /**
     * Render a list of calendars covering the project period
     *
     * @return {ReactElement}
     */
    renderCalendarBar() {
        let { database, route, env, settings } = this.props;
        let props = {
            settings: settings.calendar,
            database,
            route,
            env,
        };
        return <CalendarBar {...props} />;
    }

    /**
     * Render a list of roles
     *
     * @return {ReactElement}
     */
    renderRoleFilterBar() {
        let { database, route, env, settings } = this.props;
        let props = {
            settings: settings.filter,
            database,
            route,
            env,
        };
        return <RoleFilterBar {...props} />;
    }

    /**
     * Render search bar
     *
     * @return {ReactElement}
     */
    renderSearchBar() {
        let { database, route, env, settings } = this.props;
        let props = {
            settings: settings.search,
            database,
            route,
            env,
        };
        return <SearchBar {...props} />;
    }
}

function Button(props) {
    let { url, icon, className, active } = props;
    className = 'button' + ((className) ? ` ${className}` : '');
    if (active) {
        className += ` active`;
    }
    if (!url) {
        className += ` disabled`;
    }
    return (
        <Link className={className} url={url}>
            <i className={`fa fa-${icon}`} />
        </Link>
    );
}

function ConnectionIndicator(props) {
    let { env, uploading, searching } = props;
    let { t } = env.locale;
    if (uploading) {
        let size = _.fileSize(uploading.bytes);
        let count = uploading.files;
        let title = t('upload-progress-uploading-$count-files-$size-remaining', count, size);
        return (
            <span className="connection" title={title}>
                <i className="fa fa-cloud-upload"/>
            </span>
        );
    } else if (searching) {
        return (
            <span className="connection">
                <i className="fa fa-refresh"/>
            </span>
        );
    } else if (!env.online) {
        return (
            <span className="connection">
                <i className="fa fa-wifi" />
                <i className="fa fa-ban" />
            </span>
        );
    } else {
        return null;
    }
}

export {
    TopNavigation as default,
    TopNavigation,
};

import Database from 'data/database';
import Payloads from 'transport/payloads';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    TopNavigation.propTypes = {
        settings: PropTypes.object.isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}

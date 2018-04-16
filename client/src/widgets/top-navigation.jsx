var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Payloads = require('transport/payloads');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Link = require('widgets/link');
var CollapsibleContainer = require('widgets/collapsible-container');
var CalendarBar = require('widgets/calendar-bar');
var RoleFilterBar = require('widgets/role-filter-bar');
var SearchBar = require('widgets/search-bar');

require('./top-navigation.scss');

module.exports = React.createClass({
    displayName: 'TopNavigation',
    propTypes: {
        settings: PropTypes.object.isRequired,
        online: PropTypes.bool,
        connected: PropTypes.bool,
        searching: PropTypes.bool,

        database: PropTypes.instanceOf(Database).isRequired,
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            online: true,
            connected: true,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var hidden = !_.get(this.props.settings, 'navigation.top', true);
        return {
            height: (hidden) ? 0 : 'auto',
        };
    },

    /**
     * Return true if top nav is supposed to be hidden
     *
     * @param  {Object|undefined} settings
     *
     * @return {Boolean}
     */
    isHidden: function(settings) {
        if (!settings) {
            settings = this.props.settings;
        }
        return !_.get(settings, 'navigation.top', true);
    },

    /**
     * Return control required by route
     *
     * @param  {Route} route
     *
     * @return {String|null}
     */
    getSelectedControl: function(route) {
        if (!route) {
            route = this.props.route;
        }
        var params = route.parameters;
        if (params.search != undefined) {
            return 'search';
        } else if (params.date != undefined) {
            return 'calendar';
        } else if (params.roles != undefined) {
            return 'filter';
        }
        return null;
    },

    /**
     * Return URL for activating/deactivating control
     *
     * @param  {String} control
     *
     * @return {String|null}
     */
    getControlURL: function(control) {
        var selected = this.getSelectedControl();
        var settings = _.get(this.props.settings, control);
        if (!settings) {
            return null;
        }
        var params = _.clone(settings.route);
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
                    params.roles = [];
                    break;
            }
        }
        return this.props.route.find(this.props.route.component, params);
    },

    /**
     * Change this.state.height when this.props.hidden changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var hiddenBefore = this.isHidden();
        var hiddenAfter = this.isHidden(nextProps.settings);
        if (hiddenBefore !== hiddenAfter) {
            var container = this.refs.container;
            var contentHeight = container.offsetHeight;
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
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var style = { height: this.state.height };
        return (
            <header className="top-navigation" style={style}>
                <div ref="container" className="container">
                    {this.renderButtonBar()}
                    {this.renderCollapsibleControl()}
                </div>
            </header>
        );
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtonBar: function() {
        var selected = this.getSelectedControl();
        var calendarProps = {
            icon: 'calendar',
            className: 'calendar-btn',
            url: this.getControlURL('calendar'),
            active: selected === 'calendar',
            onClick: this.handleButtonClick,
        };
        var filterProps = {
            icon: 'filter',
            className: 'filter-btn',
            url: this.getControlURL('filter'),
            active: selected === 'filter',
            onClick: this.handleButtonClick,
        };
        var searchProps = {
            icon: 'search',
            className: 'search-btn',
            url: this.getControlURL('search'),
            active: selected === 'search',
            onClick: this.handleButtonClick,
        };
        var connectionProps = {
            locale: this.props.locale,
            uploading: this.props.payloads.uploading,
            searching: this.props.searching,
            online: this.props.online,
            connected: this.props.connected,
        };
        return (
            <div>
                <Button {...calendarProps} />
                <Button {...filterProps} />
                <Button {...searchProps} />
                <ConnectionIndicator {...connectionProps}/>
            </div>
        );
    },

    /**
     * Render collapsible UI controls
     *
     * @return {ReactElement}
     */
    renderCollapsibleControl: function() {
        var selected = this.getSelectedControl();
        return (
            <CollapsibleContainer open={!!selected}>
                {this.renderControl()}
            </CollapsibleContainer>
        );
    },

    /**
     * Render one of the controls
     *
     * @return {ReactElement}
     */
    renderControl: function() {
        var selected = this.getSelectedControl();
        switch (selected) {
            case 'calendar': return this.renderCalendarBar();
            case 'filter': return this.renderRoleFilterBar();
            case 'search': return this.renderSearchBar();
        }
    },

    /**
     * Render a list of calendars covering the project period
     *
     * @return {ReactElement}
     */
    renderCalendarBar: function() {
        var props = {
            settings: this.props.settings.calendar,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
        };
        return <CalendarBar {...props} />;
    },

    /**
     * Render a list of roles
     *
     * @return {ReactElement}
     */
    renderRoleFilterBar: function() {
        var props = {
            settings: this.props.settings.filter,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        return <RoleFilterBar {...props} />;
    },

    /**
     * Render search bar
     *
     * @return {ReactElement}
     */
    renderSearchBar: function() {
        var props = {
            settings: this.props.settings.search,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
        };
        return <SearchBar {...props} />;
    },

    /**
     * Called when user clicks one of the icons
     *
     * @param  {Event} evt
     */
    handleButtonClick: function(evt) {
    },
});

function Button(props) {
    var className = 'button';
    var clickHandler = props.onClick;
    if (props.className) {
        className += ` ${props.className}`;
    }
    if (props.active) {
        className += ` active`;
    }
    if (!props.url) {
        className += ` disabled`;
        clickHandler = null;
    }
    return (
        <Link className={className} href={props.url} onClick={clickHandler}>
            <i className={`fa fa-${props.icon}`} />
        </Link>
    );
}

function ConnectionIndicator(props) {
    var t = props.locale.translate;
    if (props.uploading) {
        var size = _.fileSize(props.uploading.bytes);
        var count = props.uploading.files;
        var title = t('upload-progress-uploading-$count-files-$size-remaining', count, size);
        return (
            <span className="connection" title={title}>
                <i className="fa fa-cloud-upload"/>
            </span>
        );
    } else if (props.searching) {
        return (
            <span className="connection">
                <i className="fa fa-refresh"/>
            </span>
        );
    } else if (!props.online) {
        return (
            <span className="connection">
                <i className="fa fa-wifi" />
                <i className="fa fa-ban" />
            </span>
        );
    } else if (!props.connected) {
        var title = t('warning-no-connection', count, size);
        return (
            <span className="connection" title={title}>
                <i className="fa fa-warning" />
            </span>
        );
    } else {
        return null;
    }
}

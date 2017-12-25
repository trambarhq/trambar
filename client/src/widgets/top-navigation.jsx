var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var CollapsibleContainer = require('widgets/collapsible-container');
var CalendarBar = require('widgets/calendar-bar');
var RoleFilterBar = require('widgets/role-filter-bar');
var SearchBar = require('widgets/search-bar');

require('./top-navigation.scss');

module.exports = React.createClass({
    displayName: 'TopNavigation',
    propTypes: {
        hidden: PropTypes.bool,

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
        var control = this.getRequiredControl(this.props.route);
        return {
            selectedControl: control,
            expanded: !!control,
            height: (this.props.hidden) ? 0 : 'auto',
        };
    },

    /**
     * Return control required by route
     *
     * @param  {Route} route
     *
     * @return {String|null}
     */
    getRequiredControl: function(route) {
        var params = route.parameters;
        if (params.search) {
            return 'search';
        } else if (params.date) {
            return 'calendar';
        } else if (params.roles !== undefined) {
            return 'filter';
        }
        return null;
    },

    /**
     * Change this.state.height when this.props.hidden changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.hidden !== nextProps.hidden) {
            var container = this.refs.container;
            var contentHeight = container.offsetHeight;
            if (nextProps.hidden) {
                // hiding navigation:
                //
                // render with height = contentHeight, then
                // render with height = 0 immediately
                this.setState({ height: contentHeight });
                setTimeout(() => {
                    if (this.props.hidden) {
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
                    if (!this.props.hidden) {
                        this.setState({ height: 'auto' });
                    }
                }, 1000);
            }
        }
        if (this.props.route !== nextProps.route) {
            var control = this.getRequiredControl(nextProps.route);
            if (this.state.selectedControl !== control) {
                this.setState({ selectedControl: control, expanded: true });
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
                    {this.renderSpacerBar()}
                    {this.renderButtonBar()}
                    {this.renderCollapsibleControl()}
                </div>
            </header>
        );
    },

    /**
     * Render a bar on iOS where the status bar overlays the app
     *
     * @return {ReactElement|null}
     */
    renderSpacerBar: function() {
        // TODO
        return null;
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtonBar: function() {
        var options = this.props.route.component.getOptions();
        var params = _.get(options, 'navigation.top', {});
        var selected = (this.state.expanded) ? this.state.selectedControl : '';
        var calendarProps = {
            icon: 'calendar',
            className: 'calendar-btn',
            disabled: !params.dateSelection,
            active: selected === 'calendar',
            onClick: this.handleCalendarClick,
        };
        var filterProps = {
            icon: 'filter',
            className: 'filter-btn',
            disabled: !params.roleSelection,
            active: selected === 'filter',
            onClick: this.handleFilterClick,
        };
        var searchProps = {
            icon: 'search',
            className: 'search-btn',
            disabled: !params.textSearch,
            active: selected === 'search',
            onClick: this.handleSearchClick,
        };
        return (
            <div>
                <Button {...calendarProps} />
                <Button {...filterProps} />
                <Button {...searchProps} />
            </div>
        );
    },

    /**
     * Render collapsible UI controls
     *
     * @return {ReactElement}
     */
    renderCollapsibleControl: function() {
        return (
            <CollapsibleContainer open={this.state.expanded}>
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
        switch (this.state.selectedControl) {
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
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            onSelect: this.handleCalendarSelect,
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
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
        };
        return <SearchBar {...props} />;
    },

    /**
     * Expand/Collapse control
     *
     * @param  {String} name
     */
    toggleControl: function(name) {
        if (this.state.expanded && name === this.state.selectedControl) {
            this.setState({ expanded: false }, () => {
                this.clearRouteParameters();
            });
        } else {
            this.setState({ selectedControl: name, expanded: true });
        }
    },

    /**
     * Remove parameters that the top nav provides, as well as hash
     * variables
     */
    clearRouteParameters: function() {
        var route = this.props.route;
        var params = _.omit(route.parameters, 'date', 'roles', 'search', 'story');
        route.replace(route.component, params);
    },

    /**
     * Called when user clicks the calendar icon
     *
     * @param  {Event} evt
     */
    handleCalendarClick: function(evt) {
        this.toggleControl('calendar');
    },

    /**
     * Called when user clicks the filter icon
     *
     * @param  {Event} evt
     */
    handleFilterClick: function(evt) {
        this.toggleControl('filter');
    },

    /**
     * Called when user clicks the search icon
     *
     * @param  {Event} evt
     */
    handleSearchClick: function(evt) {
        this.toggleControl('search');
    },
});

function Button(props) {
    var classes = [ 'button' ];
    var clickHandler = props.onClick;
    if (props.className) {
        classes.push(props.className);
    }
    if (props.active) {
        classes.push('active');
    }
    if (props.disabled) {
        classes.push('disabled');
        clickHandler = null;
    }
    return (
        <div className={classes.join(' ')} onClick={clickHandler}>
            <i className={`fa fa-${props.icon}`} />
        </div>
    );
}

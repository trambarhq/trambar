var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var CollapsibleContainer = require('widgets/collapsible-container');
var CalendarBar = require('widgets/calendar-bar');

require('./top-navigation.scss');

module.exports = React.createClass({
    displayName: 'TopNavigation',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    getInitialState: function() {
        var route = this.props.route;
        var selectedControl = null;
        if (route.parameters.date) {
            selectedControl = 'calendar';
        } else if (!_.isEmpty(route.parameters.roleIds)) {
            selectedControl = 'filter';
        }
        return {
            selectedControl,
            expanded: !!selectedControl,
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <header className="top-navigation">
                {this.renderSpacerBar()}
                {this.renderButtonBar()}
                {this.renderCollapsibleControl()}
            </header>
        );
    },

    /**
     * Render a bar on iOS where the status bar overlays the app
     *
     * @return {ReactElement}
     */
    renderSpacerBar: function() {

    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtonBar: function() {
        var params = _.get(this.props.route.parameters, 'navigation.top', {});
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

    renderControl: function() {
        switch (this.state.selectedControl) {
            case 'calendar': return this.renderCalendarBar();
            case 'filter': return <div><p>Filter</p></div>;
            case 'search': return <div><p>Search</p></div>;
        }
    },

    renderCalendarBar: function() {
        var route = this.props.route;
        var selection = route.parameters.date;
        var props = {
            selection,
            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            onSelect: this.handleCalendarSelect,
        };
        return (
            <CalendarBar {...props} />
        );
    },

    toggleControl: function(name) {
        if (this.state.expanded && name === this.state.selectedControl) {
            this.setState({ expanded: false }, () => {
                this.clearRouteParameters();
            });
        } else {
            this.setState({ selectedControl: name, expanded: true });
        }
    },

    clearRouteParameters: function() {
        var route = this.props.route;
        var params = _.omit(route.parameters, 'date', 'roleIds');
        var url = route.component.getUrl(params);
        route.change(url, true);
    },

    changeRoute: function(newParam) {
        var route = this.props.route;
        var params = _.assign({}, route.parameters, newParam)
        var url = route.component.getUrl(params);
        route.change(url, true);
    },

    handleCalendarClick: function(evt) {
        this.toggleControl('calendar');
    },

    handleFilterClick: function(evt) {
        this.toggleControl('filter');
    },

    handleSearchClick: function(evt) {
        this.toggleControl('search');
    },

    handleCalendarSelect: function(evt) {
        this.changeRoute({ date: evt.selection });
    }
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

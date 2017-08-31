var _ = require('lodash');
var Moment = require('moment');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var DailyActivities = require('data/daily-activities');

// widgets
var PushButton = require('widgets/push-button');
var SortableTable = require('widgets/sortable-table'), TH = SortableTable.TH;
var ActivityTooltip = require('tooltips/activity-tooltip');
var ModifiedTimeTooltip = require('tooltips/modified-time-tooltip')

require('./robot-list-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RobotListPage',
    propTypes: {
        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    statics: {
        /**
         * Match current URL against the page's
         *
         * @param  {String} url
         *
         * @return {Object|null}
         */
        parseUrl: function(url) {
            return Route.match('/projects/:projectId/robots/', url);
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         * @param  {Object} query
         *
         * @return {String}
         */
        getUrl: function(params, query) {
            return `/projects/${params.projectId}/robots/`;
        },
    },

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync: function(meanwhile) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            project: null,
            robots: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RobotListPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            // load project
            var criteria = {
                id: parseInt(this.props.route.parameters.projectId)
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
        }).then(() => {
            // load robots
            var schema = props.project.name;
            var criteria = {};
            return db.find({ schema, table: 'robot', criteria });
        }).then((robots) => {
            props.robots = robots;
            return <RobotListPageSync {...props} />;
        });
    }
});

var RobotListPageSync = module.exports.Sync = React.createClass({
    displayName: 'RobotListPage.Sync',
    propTypes: {
        robots: PropTypes.arrayOf(PropTypes.object),
        project: PropTypes.object,

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
        return {
            sortColumns: [ 'name' ],
            sortDirections: [ 'asc' ],
        };
    },

    /**
     * Return project id specified in URL
     *
     * @return {Number}
     */
    getProjectId: function() {
        return parseInt(this.props.route.parameters.projectId);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        return (
            <div className="robot-list-page">
                {this.renderButtons()}
                <h2>{t('robot-list-title')}</h2>
                {this.renderTable()}
            </div>
        );
    },

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        return (
            <div className="buttons">
                <PushButton className="add" onClick={this.handleAddClick}>
                    {t('robot-list-add')}
                </PushButton>
            </div>
        );
    },

    /**
     * Render a table
     *
     * @return {ReactElement}
     */
    renderTable: function() {
        var t = this.props.locale.translate;
        var tableProps = {
            sortColumns: this.state.sortColumns,
            sortDirections: this.state.sortDirections,
            onSort: this.handleSort,
        };
        return (
            <SortableTable {...tableProps}>
                <thead>
                    {this.renderHeadings()}
                </thead>
                <tbody>
                    {this.renderRows()}
                </tbody>
            </SortableTable>
        );
    },

    /**
     * Render table headings
     *
     * @return {ReactElement}
     */
    renderHeadings: function() {
        return (
            <tr>
                {this.renderTitleColumn()}
                {this.renderModifiedTimeColumn()}
            </tr>
        );
    },

    /**
     * Render rows
     *
     * @return {Array<ReactElement>}
     */
    renderRows: function() {
        var robots = sortRobots(
            this.props.robots,
            this.props.locale,
            this.state.sortColumns,
            this.state.sortDirections
        );
        return _.map(robots, this.renderRow);
    },

    /**
     * Render a table row
     *
     * @param  {Object} robot
     *
     * @return {ReactElement}
     */
    renderRow: function(robot) {
        return (
            <tr key={robot.id}>
                {this.renderTitleColumn(robot)}
                {this.renderModifiedTimeColumn(robot)}
            </tr>
        );
    },

    /**
     * Render name column, either the heading or a data cell
     *
     * @param  {Object|null} robot
     *
     * @return {ReactElement}
     */
    renderTitleColumn: function(robot) {
        var t = this.props.locale.translate;
        if (!robot) {
            return <TH id="title">{t('table-heading-title')}</TH>;
        } else {
            var p = this.props.locale.pick;
            var title = p(robot.details.title) || robot.name;
            var url = require('pages/robot-summary-page').getUrl({
                projectId: this.getProjectId(),
                robotId: robot.id
            });
            return (
                <td>
                    <a href={url}>
                        {title}
                    </a>
                </td>
            );
        }
    },

    /**
     * Render column showing the last modified time
     *
     * @param  {Object|null} robot
     *
     * @return {ReactElement|null}
     */
    renderModifiedTimeColumn: function(robot) {
        if (this.props.theme.isBelowMode('standard')) {
            return null;
        }
        var t = this.props.locale.translate;
        if (!robot) {
            return <TH id="mtime">{t('table-heading-last-modified')}</TH>
        } else {
            return <td><ModifiedTimeTooltip time={robot.mtime} /></td>;
        }
    },

    /**
     * Called when user clicks a table heading
     *
     * @param  {Object} evt
     */
    handleSort: function(evt) {
        this.setState({
            sortColumns: evt.columns,
            sortDirections: evt.directions
        });
    },

    /**
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        var url = require('pages/robot-summary-page').getUrl({
            projectId: this.getProjectId(),
            robotId: 'new'
        });
        return this.props.route.change(url);
    },
});

var sortRobots = Memoize(function(robots, locale, columns, directions) {
    var t = locale.translate;
    var p = locale.pick;
    columns = _.map(columns, (column) => {
        switch (column) {
            case 'title':
                return (robot) => {
                    return p(robot.details.title) || robot.name;
                };
            default:
                return column;
        }
    });
    return _.orderBy(robots, columns, directions);
});

var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var OptionList = require('widgets/option-list');

require('./robot-summary-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RobotSummaryPage',
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
            return Route.match('/projects/:projectId/robots/:robotId/', url);
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
            var url = `/projects/${params.projectId}/robots/${params.robotId}/`;
            if (query && query.edit) {
                url += `?edit=1`;
            }
            return url;
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
        var db = this.props.database.use({ server: '~', schema: 'global', by: this });
        var props = {
            project: null,
            robot: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RobotSummaryPageSync {...props} />);
        return db.start().then((currentUserId) => {
            var criteria = {
                id: parseInt(this.props.route.parameters.roleId)
            };
            return db.findOne({ table: 'role', criteria });
        }).then((robot) => {
            props.project = robot;
            meanwhile.show(<RobotSummaryPageSync {...props} />);
        }).then(() => {
            var criteria = {
                id: parseInt(this.props.route.parameters.projectId)
            };
            return db.findOne({ table: 'project', criteria });
        }).then((project) => {
            props.project = project;
            return <RobotSummaryPageSync {...props} />;
        });
    }
});

var RobotSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'RobotSummaryPage.Sync',
    propTypes: {
        robot: PropTypes.object,
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
            newRobot: null,
        };
    },

    /**
     * Return edited copy of robot object or the original object
     *
     * @return {Object}
     */
    getRobot: function() {
        if (this.isEditing()) {
            return this.state.newRobot || this.props.robot || emptyRobot;
        } else {
            return this.props.robot || emptyRobot;
        }
    },

    /**
     * Modify a property of the robot object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setRobotProperty: function(path, value) {
        var robotBefore = this.getRobot();
        var robotAfter = _.decoupleSet(robotBefore, path, value);
        if (_.isEqual(robotAfter, this.props.robot)) {
            robotAfter = null;
        }
        this.setState({ newRobot: robotAfter });
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
     * Return robot id specified in URL
     *
     * @return {Number}
     */
    getRobotId: function() {
        return parseInt(this.props.route.parameters.robotId);
    },

    /**
     * Return true when the URL indicate we're creating a new robot
     *
     * @return {Boolean}
     */
    isCreating: function() {
        return (this.props.route.parameters.robotId === 'new');
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @return {Boolean}
     */
    isEditing: function() {
        return this.isCreating() || !!parseInt(this.props.route.query.edit);
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object|null} newRobot
     *
     * @return {Promise}
     */
    setEditability: function(edit, newRobot) {
        var projectId = this.getProjectId();
        var robotId = (newRobot) ? newRobot.id : this.getRobotId();
        var url = (robotId)
                ? require('pages/robot-summary-page').getUrl({ projectId, robotId }, { edit })
                : require('pages/robot-list-page').getUrl({ projectId })
        var replace = (robotId) ? true : false;
        return this.props.route.change(url, replace);
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var title = p(_.get(this.props.robot, 'details.title'));
        return (
            <div className="robot-summary-page">
                {this.renderButtons()}
                <h2>{t('robot-summary-$title', title)}</h2>
                {this.renderForm()}
                {this.renderInstructions()}
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
        if (this.isEditing()) {
            return (
                <div key="edit" className="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('robot-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" onClick={this.handleSaveClick}>
                        {t('robot-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            return (
                <div key="view" className="buttons">
                    <PushButton className="add" onClick={this.handleEditClick}>
                        {t('robot-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    },

    /**
     * Render form for entering robot details
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var readOnly = !this.isEditing();
        var robotOriginal = this.props.robot || emptyRobot;
        var robot = this.getRobot();
        var titleProps = {
            id: 'title',
            value: p(robot.details.title),
            onChange: this.handleTitleChange,
            readOnly,
        };
        var nameProps = {
            id: 'name',
            value: robot.name,
            readOnly,
        };
        return (
            <div className="form">
                <TextField {...titleProps}>{t('robot-summary-title')}</TextField>
                <TextField {...nameProps}>{t('robot-summary-name')}</TextField>
            </div>
        );
    },

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions: function() {
        var instructionProps = {
            topic: 'robot',
            hidden: !this.isEditing(),
            locale: this.props.locale,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    },

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick: function(evt) {
        return this.setEditability(true);
    },

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick: function(evt) {
        // TODO: add confirmation
        return this.setEditability(false);
    },

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick: function(evt) {
        var schema = this.props.project.name;
        var db = this.props.database.use({ server: '~', schema, by: this });
        var robot = this.getRobot();
        return db.start().then((currentUserId) => {
            return db.saveOne({ table: 'robot' }, robot).then((robot) => {
                return this.setEditability(false, robot);
            });
        });
    },

    /**
     * Called when user changes the title
     *
     * @param  {Event} evt
     */
    handleTitleChange: function(evt) {
        var text = evt.target.value;
        var lang = this.props.locale.lang;
        this.setRobotProperty(`details.title.${lang}`, text);
    },
});

var emptyRobot = { details: {} };

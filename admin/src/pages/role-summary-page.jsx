var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var PushButton = require('widgets/push-button');
var DataLossWarning = require('widgets/data-loss-warning');

require('./role-summary-page.scss');

module.exports = Relaks.createClass({
    displayName: 'RoleSummaryPage',
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
            return Route.match('/roles/:roleId/', url);
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
            return `/roles/${params.roleId}/`;
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
        var db = this.props.database.use({ server: '~', by: this });
        var props = {
            projects: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RoleSummaryPageSync {...props} />);
        return db.start().then((roleId) => {
            return <RoleSummaryPageSync {...props} />;
        });
    }
});

var RoleSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'RoleSummaryPage.Sync',
    propTypes: {
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
            newRole: null,
            hasChanges: false,
        };
    },

    /**
     * Return edited copy of role object or the original object
     *
     * @return {Object}
     */
    getRole: function() {
        if (this.isEditing()) {
            return this.state.newRole || this.props.role || emptyRole;
        } else {
            return this.props.role || emptyRole;
        }
    },

    /**
     * Modify a property of the role object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setRoleProperty: function(path, value) {
        var role = this.getRole();
        var newRole = _.decoupleSet(role, path, value);
        var hasChanges = true;
        if (_.isEqual(newRole, this.props.role)) {
            newRole = null;
            hasChanges = false;
        }
        this.setState({ newRole, hasChanges });
    },

    /**
     * Return role id specified in URL
     *
     * @return {Number}
     */
    getRoleId: function() {
        return parseInt(this.props.route.parameters.roleId);
    },

    /**
     * Return true when the URL indicate we're creating a new user
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isCreating: function(props) {
        props = props || this.props;
        return (props.route.parameters.roleId === 'new');
    },

    /**
     * Return true when the URL indicate edit mode
     *
     * @param  {Object|null} props
     *
     * @return {Boolean}
     */
    isEditing: function(props) {
        props = props || this.props;
        return this.isCreating(props) || !!parseInt(props.route.query.edit);
    },

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object}  newRole
     *
     * @return {Promise}
     */
    setEditability: function(edit, newRole) {
        var roleId = (newRole) ? newRole.id : this.getRoleId();
        var url = (roleId)
                ? require('pages/role-summary-page').getUrl({ roleId }, { edit })
                : require('pages/role-list-page').getUrl();
        var replace = (roleId) ? true : false;
        return this.props.route.change(url, replace);
    },

    /**
     * Reset edit state when edit starts
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.isEditing() !== this.isEditing(nextProps)) {
            this.setState({
                newRole: null,
                hasChanges: false,
            });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var title = p(_.get(this.props.role, 'details.title'));
        return (
            <div className="role-summary-page">
                {this.renderButtons()}
                <h2>{t('role-summary-$title', title)}</h2>
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
                <div className="buttons">
                    <PushButton className="cancel" onClick={this.handleCancelClick}>
                        {t('role-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="save" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('role-summary-save')}
                    </PushButton>
                    <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
                </div>
            );
        } else {
            return (
                <div className="buttons">
                    <PushButton className="edit" onClick={this.handleEditClick}>
                        {t('role-summary-edit')}
                    </PushButton>
                </div>
            );

        }
    },
});

var emptyRole = {
    details: {}
};

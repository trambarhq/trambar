var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var SlugGenerator = require('utils/slug-generator');

// widgets
var PushButton = require('widgets/push-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
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
            var url = `/roles/${params.roleId}/`;
            if (query && query.edit) {
                url += '?edit=1';
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
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: null,
            role: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RoleSummaryPageSync {...props} />, 250);
        return db.start().then((currentUserId) => {
            var criteria = {};
            return db.findOne({ table: 'system', criteria });
        }).then((system) => {
            props.system = system;
        }).then(() => {
            var roleId = parseInt(this.props.route.parameters.roleId);
            if (roleId) {
                var criteria = {
                    id: roleId
                };
                return db.findOne({ table: 'role', criteria });
            }
        }).then((role) => {
            props.role = role;
            return <RoleSummaryPageSync {...props} />;
        });
    }
});

var RoleSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'RoleSummaryPage.Sync',
    propTypes: {
        system: PropTypes.object,
        role: PropTypes.object,

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
        if (path === 'details.title') {
            var autoNameBefore = SlugGenerator.fromTitle(role.details.title);
            var autoNameAfter = SlugGenerator.fromTitle(newRole.details.title);
            if (!role.name || role.name === autoNameBefore) {
                newRole.name = autoNameAfter;
            }
        }
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
        var role = this.getRole();
        var title = p(_.get(role, 'details.title')) || role.name;
        return (
            <div className="role-summary-page">
                {this.renderButtons()}
                <h2>{t('role-summary-$title', title)}</h2>
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

    /**
     * Render form for entering role details
     *
     * @return {ReactElement}
     */
    renderForm: function() {
        var t = this.props.locale.translate;
        var readOnly = !this.isEditing();
        var roleOriginal = this.props.role || emptyRole;
        var role = this.getRole();
        var inputLanguages = _.get(this.props.system, 'settings.input_languages');
        var titleProps = {
            id: 'title',
            value: role.details.title,
            availableLanguageCodes: inputLanguages,
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly,
        };
        var nameProps = {
            id: 'name',
            value: role.name,
            locale: this.props.locale,
            onChange: this.handleNameChange,
            readOnly,
        };
        var descriptionProps = {
            id: 'description',
            value: role.details.description,
            availableLanguageCodes: inputLanguages,
            type: 'textarea',
            locale: this.props.locale,
            onChange: this.handleDescriptionChange,
            readOnly,
        };
        return (
            <div className="form">
                <MultilingualTextField {...titleProps}>{t('role-summary-title')}</MultilingualTextField>
                <TextField {...nameProps}>{t('role-summary-name')}</TextField>
                <MultilingualTextField {...descriptionProps}>{t('role-summary-description')}</MultilingualTextField>
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
            topic: 'role',
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
        return this.setEditability(false);
    },

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick: function(evt) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var role = this.getRole();
        return db.start().then((currentUserId) => {
            return db.saveOne({ table: 'role' }, role).then((role) => {
                this.setState({ hasChanges: false }, () => {
                    return this.setEditability(false, role);
                });
            });
        });
    },

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleTitleChange: function(evt) {
        this.setRoleProperty(`details.title`, evt.target.value);
    },

    /**
     * Called when user changes the name
     *
     * @param  {Event} evt
     */
    handleNameChange: function(evt) {
        this.setRoleProperty(`name`, evt.target.value);
    },

    /**
     * Called when user changes the description
     *
     * @param  {Object} evt
     */
    handleDescriptionChange: function(evt) {
        this.setRoleProperty(`details.description`, evt.target.value);
    },
});

var emptyRole = {
    details: {}
};

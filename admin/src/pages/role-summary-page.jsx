var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var Relaks = require('relaks');
var Memoize = require('utils/memoize');
var ComponentRefs = require('utils/component-refs');

var Database = require('data/database');
var Route = require('routing/route');
var Locale = require('locale/locale');
var Theme = require('theme/theme');

var SlugGenerator = require('utils/slug-generator');

// widgets
var PushButton = require('widgets/push-button');
var ComboButton = require('widgets/combo-button');
var InstructionBlock = require('widgets/instruction-block');
var TextField = require('widgets/text-field');
var MultilingualTextField = require('widgets/multilingual-text-field');
var OptionList = require('widgets/option-list');
var InputError = require('widgets/input-error');
var ActionConfirmation = require('widgets/action-confirmation');
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
         * @param  {String} path
         * @param  {Object} query
         * @param  {String} hash
         *
         * @return {Object|null}
         */
        parseURL: function(path, query, hash) {
            return Route.match(path, [
                '/roles/:role/?'
            ], (params) => {
                return {
                    role: (params.role === 'new') ? 'new' : Route.parseId(params.role),
                    edit: !!query.edit,
                };
            });
        },

        /**
         * Generate a URL of this page based on given parameters
         *
         * @param  {Object} params
         *
         * @return {Object}
         */
        getURL: function(params) {
            var path = `/roles/${params.role}/`, query, hash;
            if (params.edit) {
                query = { edit: 1 };
            }
            return { path, query, hash };
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
        // don't wait for remote data unless the route changes
        var freshRoute = (meanwhile.prior.props.route !== this.props.route);
        var params = this.props.route.parameters;
        var db = this.props.database.use({ schema: 'global', by: this });
        var props = {
            system: null,
            role: null,
            users: null,

            database: this.props.database,
            route: this.props.route,
            locale: this.props.locale,
            theme: this.props.theme,
        };
        meanwhile.show(<RoleSummaryPageSync {...props} />, 250);
        return db.start().then((userId) => {
            var criteria = {};
            return db.findOne({ table: 'system', criteria });
        }).then((system) => {
            props.system = system;
        }).then(() => {
            if (params.role !== 'new') {
                var criteria = { id: params.role };
                return db.findOne({ table: 'role', criteria });
            }
        }).then((role) => {
            props.role = role;
            meanwhile.show(<RoleSummaryPageSync {...props} />);
        }).then(() => {
            // load all users (not deleted or disabled)
            var criteria = {
                deleted: false,
                disabled: false,
            };
            return db.find({ table: 'user', criteria });
        }).then((users) => {
            props.users = users;
            return <RoleSummaryPageSync {...props} />;
        });
    }
});

var RoleSummaryPageSync = module.exports.Sync = React.createClass({
    displayName: 'RoleSummaryPage.Sync',
    propTypes: {
        system: PropTypes.object,
        role: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),

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
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        return {
            newRole: null,
            hasChanges: false,
            saving: false,
            adding: false,
            removeList: [],
            addList: [],
            problems: {},
        };
    },

    /**
     * Return edited copy of role object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getRole: function(state) {
        if (this.isEditing() && (!state || state === 'current')) {
            return this.state.newRole || this.props.role || emptyRole;
        } else {
            return this.props.role || emptyRole;
        }
    },

    /**
     * Return a property of the role object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getRoleProperty: function(path, state) {
        var role = this.getRole(state);
        return _.get(role, path);
    },

    /**
     * Modify a property of the role object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setRoleProperty: function(path, value) {
        var role = this.getRole('current');
        var newRole = _.decoupleSet(role, path, value);
        if (path === 'details.title') {
            var autoNameBefore = SlugGenerator.fromTitle(role.details.title);
            var autoNameAfter = SlugGenerator.fromTitle(newRole.details.title);
            if (!role.name || role.name === autoNameBefore) {
                newRole.name = autoNameAfter;
            }
        }
        if(_.size(newRole.name) > 128) {
            newRole.name = newRole.name.substr(0, 128);
        }
        var hasChanges = true;
        if (_.isEqual(newRole, this.props.role)) {
            newRole = null;
            hasChanges = !_.isEmpty(this.state.addList) || !_.isEmpty(this.state.removeList);
        }
        this.setState({ newRole, hasChanges });
    },

    /**
     * Look for problems in role object
     *
     * @return {Object}
     */
    findProblems: function() {
        var problems = {};
        var role = this.getRole();
        if (!role.name) {
            problems.name = 'validation-required';
        }
        return problems;
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
        return (props.route.parameters.role === 'new');
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
        return this.isCreating(props) || props.route.parameters.edit;
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
        if (this.isCreating() && !edit && !newRole) {
            return this.returnToList();
        } else {
            var route = this.props.route;
            var params = _.clone(route.parameters);
            params.edit = edit;
            if (newRole) {
                // use id of newly created role
                params.role = newRole.id;
            }
            return route.replace(module.exports, params);
        }
    },

    /**
     * Return to repo list
     *
     * @return {Promise}
     */
    returnToList: function() {
        var route = this.props.route;
        return route.push(require('pages/role-list-page'));
    },

    /**
     * Start creating a new role
     *
     * @return {Promise}
     */
    startNew: function() {
        var route = this.props.route;
        var params = _.clone(route.parameters);
        params.role = 'new';
        return route.replace(module.exports, params);
    },

    /**
     * Return list of language codes
     *
     * @return {Array<String>}
     */
    getInputLanguages: function() {
        return _.get(this.props.system, 'settings.input_languages', [])
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
                addList: [],
                removeList: [],
            });
        } else {
            this.setState({ problems: {} });
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
                <ActionConfirmation ref={this.components.setters.confirmation} locale={this.props.locale} theme={this.props.theme} />
                <DataLossWarning changes={this.state.hasChanges} locale={this.props.locale} theme={this.props.theme} route={this.props.route} />
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
                    <PushButton onClick={this.handleCancelClick}>
                        {t('role-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!this.state.hasChanges} onClick={this.handleSaveClick}>
                        {t('role-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            var role = this.props.role;
            var active = (role) ? !role.deleted && !role.disabled : true;
            var preselected;
            if (active) {
                preselected = (this.state.adding) ? 'add' : 'return';
            } else {
                preselected = 'reactivate';
            }
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={this.handleReturnClick}>
                            {t('role-summary-return')}
                        </option>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('role-summary-add')}
                        </option>
                        <option name="archive" disabled={!active} separator onClick={this.handleDisableClick}>
                            {t('role-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={this.handleDeleteClick}>
                            {t('role-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={this.handleReactivateClick}>
                            {t('role-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
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
        return (
            <div className="form">
                {this.renderTitleInput()}
                {this.renderNameInput()}
                {this.renderDescriptionInput()}
                {this.renderRatingSelector()}
                {this.renderUserSelector()}
            </div>
        );
    },

    /**
     * Render title input
     *
     * @return {ReactElement}
     */
    renderTitleInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'title',
            value: this.getRoleProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            locale: this.props.locale,
            onChange: this.handleTitleChange,
            readOnly: !this.isEditing(),
        };
        return (
            <MultilingualTextField {...props}>
                {t('role-summary-title')}
            </MultilingualTextField>
        );
    },

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'name',
            value: this.getRoleProperty('name'),
            locale: this.props.locale,
            onChange: this.handleNameChange,
            readOnly: !this.isEditing(),
        };
        var problems = this.state.problems;
        return (
            <TextField {...props}>
                {t('role-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    },

    /**
     * Render description input
     *
     * @return {ReactElement}
     */
    renderDescriptionInput: function() {
        var t = this.props.locale.translate;
        var props = {
            id: 'description',
            value: this.getRoleProperty('details.description'),
            availableLanguageCodes: this.getInputLanguages(),
            type: 'textarea',
            locale: this.props.locale,
            onChange: this.handleDescriptionChange,
            readOnly: !this.isEditing(),
        };
        return (
            <MultilingualTextField {...props}>
                {t('role-summary-description')}
            </MultilingualTextField>
        );
    },

    /**
     * Render message rating selector
     *
     * @return {ReactElement}
     */
    renderRatingSelector: function() {
        var t = this.props.locale.translate;
        var ratingCurr = this.getRoleProperty('settings.rating', 'current') || 0;
        var ratingPrev = this.getRoleProperty('settings.rating', 'original') || 0;
        var optionProps = _.map(messageRatings, (rating, key) => {
            return {
                name: key,
                selected: ratingCurr === rating,
                previous: ratingCurr === rating,
                children: t(`role-summary-rating-${key}`),
            };
        });
        var listProps = {
            onOptionClick: this.handleRatingOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('role-summary-rating')}
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    },

    /**
     * Render user selector
     *
     * @return {ReactElement}
     */
    renderUserSelector: function() {
        var t = this.props.locale.translate;
        var p = this.props.locale.pick;
        var roleId = this.getRoleProperty('id');
        var users = sortUsers(this.props.users, this.props.locale);
        var optionProps = _.map(users, (user) => {
            var selectedBefore = _.includes(user.role_ids, roleId);
            var selectedAfter;
            if (selectedBefore) {
                selectedAfter = !_.includes(this.state.removeList, user.id);
            } else {
                selectedAfter = _.includes(this.state.addList, user.id);
            }
            return {
                name: String(user.id),
                selected: selectedAfter,
                previous: selectedBefore,
                children: p(user.details.name) || p.username
            }
        });
        var listProps = {
            onOptionClick: this.handleUserOptionClick,
            readOnly: !this.isEditing(),
        };
        return (
            <OptionList {...listProps}>
                <label>{t('role-summary-users')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    },

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions: function() {
        var instructionProps = {
            folder: 'role',
            topic: 'role-summary',
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
     * Save user with new flags
     *
     * @param  {Object} flags
     *
     * @return {Promise<Role>}
     */
    changeFlags: function(flags) {
        var db = this.props.database.use({ schema: 'global', by: this });
        var roleAfter = _.assign({}, this.props.role, flags);
        return db.saveOne({ table: 'role' }, roleAfter);
    },

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleDisableClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('role-summary-confirm-disable');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ disabled: true }).then(() => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user clicks delete button
     *
     * @param  {Event} evt
     */
    handleDeleteClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('role-summary-confirm-delete');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ deleted: true }).then(() => {
                    return this.returnToList();
                });
            }
        });
    },

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleReactivateClick: function(evt) {
        var t = this.props.locale.translate;
        var message = t('role-summary-confirm-reactivate');
        var confirmation = this.components.confirmation;
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ disabled: false, deleted: false });
            }
        });
    },

    /**
     * Called when user click return button
     *
     * @param  {Event} evt
     */
    handleReturnClick: function(evt) {
        return this.returnToList();
    },

    /**
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick: function(evt) {
        return this.startNew();
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
        if (this.state.saving) {
            return;
        }
        var problems = this.findProblems();
        if (_.some(problems)) {
            this.setState({ problems });
            return;
        }
        var role = this.getRole();
        this.setState({ saving: true, adding: !role.id, problems: {} }, () => {
            var db = this.props.database.use({ schema: 'global', by: this });
            return db.start().then((userId) => {
                return db.saveOne({ table: 'role' }, role).then((role) => {
                    // change role_ids of selected/deselected users
                    var userChanges = [];
                    _.each(this.state.addList, (userId) => {
                        var user = _.find(this.props.users, { id: userId });
                        userChanges.push({
                            id: user.id,
                            role_ids: _.union(user.role_ids, [ role.id ]),
                        });
                    });
                    _.each(this.state.removeList, (userId) => {
                        var user = _.find(this.props.users, { id: userId });
                        userChanges.push({
                            id: user.id,
                            role_ids: _.difference(user.role_ids, [ role.id ]),
                        });
                    });
                    if (_.isEmpty(userChanges)) {
                        return role;
                    }
                    return db.save({ table: 'user' }, userChanges).return(role);
                }).then((role) => {
                    this.setState({ hasChanges: false, saving: false }, () => {
                        return this.setEditability(false, role);
                    });
                    return null;
                });
            }).catch((err) => {
                var problems = {};
                if (err.statusCode === 409) {
                    problems.name = 'validation-duplicate-role-name';
                } else {
                    problems.general = err.message;
                    console.error(err);
                }
                this.setState({ problems, saving: false });
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
        var name = _.toLower(evt.target.value).replace(/\W+/g, '');
        this.setRoleProperty(`name`, name);
    },

    /**
     * Called when user changes the description
     *
     * @param  {Object} evt
     */
    handleDescriptionChange: function(evt) {
        this.setRoleProperty(`details.description`, evt.target.value);
    },

    /**
     * Called when user clicks on one of the rating option
     *
     * @param  {Object} evt
     */
    handleRatingOptionClick: function(evt) {
        var key = evt.name;
        var rating = messageRatings[key];
        this.setRoleProperty(`settings.rating`, rating);
    },

    /**
     * Called when user clicks on one of the users in list
     *
     * @param  {Object} evt
     */
    handleUserOptionClick: function(evt) {
        var userId = parseInt(evt.name);
        var user = _.find(this.props.users, { id: userId });
        var roleId = this.getRoleProperty('id');
        var addList = _.slice(this.state.addList);
        var removeList = _.slice(this.state.removeList);
        if (_.includes(user.role_ids, roleId)) {
            if (_.includes(removeList, user.id)) {
                _.pull(removeList, user.id);
            } else {
                removeList.push(user.id);
            }
        } else {
            if (_.includes(addList, user.id)) {
                _.pull(addList, user.id);
            } else {
                addList.push(user.id);
            }
        }
        var hasChanges = true;
        if (!this.state.newRole) {
            hasChanges = !_.isEmpty(addList) || !_.isEmpty(removeList);
        }
        this.setState({ addList, removeList, hasChanges });
    },
});

var sortUsers = Memoize(function(users, locale) {
    var p = locale.pick;
    var name = (user) => {
        return p(user.details.name) || user.username;
    };
    return _.sortBy(users, name);
});

var emptyRole = {
    details: {}
};

var messageRatings = {
    'very-high': 50,
    'high': 20,
    'normal': 0,
    'low': -20,
    'very-low': -50,
};

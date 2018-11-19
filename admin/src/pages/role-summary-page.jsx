import _ from 'lodash';
import React, { PureComponent } from 'react';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as RoleFinder from 'objects/finders/role-finder';
import * as SystemFinder from 'objects/finders/system-finder';
import * as UserFinder from 'objects/finders/user-finder';
import * as SlugGenerator from 'utils/slug-generator';

// widgets
import PushButton from 'widgets/push-button';
import ComboButton from 'widgets/combo-button';
import InstructionBlock from 'widgets/instruction-block';
import TextField from 'widgets/text-field';
import MultilingualTextField from 'widgets/multilingual-text-field';
import OptionList from 'widgets/option-list';
import InputError from 'widgets/input-error';
import ActionConfirmation from 'widgets/action-confirmation';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';

import './role-summary-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Role Summary page.
 *
 * @extends AsyncComponent
 */
class RoleSummaryPage extends AsyncComponent {
    static displayName = 'RoleSummaryPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    renderAsync(meanwhile) {
        let { database, route, env, roleID, editing } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let creating = (roleID === 'new');
        let props = {
            system: undefined,
            role: undefined,
            users: undefined,

            database,
            route,
            env,
            editing: editing || creating,
            creating,
        };
        meanwhile.show(<RoleSummaryPageSync {...props} />);
        return db.start().then((currentUserID) => {
            return SystemFinder.findSystem(db).then((system) => {
                props.system = system;
            });
        }).then(() => {
            if (!creating) {
                return RoleFinder.findRole(db, roleID).then((role) => {
                    props.role = role;
                });
            }
        }).then(() => {
            meanwhile.show(<RoleSummaryPageSync {...props} />);
            return UserFinder.findActiveUsers(db).then((users) => {
                props.users = users;
            });
        }).then(() => {
            return <RoleSummaryPageSync {...props} />;
        });
    }
}

/**
 * Synchronous component that actually renders the Role Summary page.
 *
 * @extends PureComponent
 */
class RoleSummaryPageSync extends PureComponent {
    static displayName = 'RoleSummaryPageSync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            newRole: null,
            hasChanges: false,
            saving: false,
            adding: false,
            removingUserIDs: [],
            addingUserIDs: [],
            problems: {},
        };
    }

    /**
     * Return edited copy of role object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getRole(state) {
        let { role, editing } = this.props;
        let { newRole } = this.state;
        if (editing && (!state || state === 'current')) {
            return newRole || role || emptyRole;
        } else {
            return role || emptyRole;
        }
    }

    /**
     * Return a property of the role object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getRoleProperty(path, state) {
        let role = this.getRole(state);
        return _.get(role, path);
    }

    /**
     * Modify a property of the role object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setRoleProperty(path, value) {
        let { role } = this.props;
        let { addingUserIDs, removingUserIDs } = this.state;
        let newRole = this.getRole('current');
        let newRoleAfter = _.decoupleSet(newRole, path, value);
        if (path === 'details.title') {
            let autoNameBefore = SlugGenerator.fromTitle(newRole.details.title);
            let autoNameAfter = SlugGenerator.fromTitle(newRoleAfter.details.title);
            if (!newRole.name || newRole.name === autoNameBefore) {
                newRoleAfter.name = autoNameAfter;
            }
        }
        if(_.size(newRoleAfter.name) > 128) {
            newRoleAfter.name = newRoleAfter.name.substr(0, 128);
        }
        let hasChanges = true;
        if (_.isEqual(newRoleAfter, role)) {
            newRoleAfter = null;
            hasChanges = !_.isEmpty(addingUserIDs) || !_.isEmpty(removingUserIDs);
        }
        this.setState({ newRole: newRoleAfter, hasChanges });
    }

    /**
     * Look for problems in role object
     *
     * @return {Object}
     */
    findProblems() {
        let problems = {};
        let newRole = this.getRole();
        if (!newRole.name) {
            problems.name = 'validation-required';
        }
        return problems;
    }

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object}  newRole
     *
     * @return {Promise}
     */
    setEditability(edit, newRole) {
        let { route, creating } = this.props;
        if (creating && !edit && !newRole) {
            return this.returnToList();
        } else {
            let params = _.clone(route.params);
            params.editing = edit || undefined;
            if (newRole) {
                // use id of newly created role
                params.roleID = newRole.id;
            }
            return route.replace(route.name, params);
        }
    }

    /**
     * Return to repo list
     *
     * @return {Promise}
     */
    returnToList() {
        let { route } = this.props;
        return route.push('role-list-page');
    }

    /**
     * Start creating a new role
     *
     * @return {Promise}
     */
    startNew() {
        let { route } = this.props;
        let params = _.clone(route.params);
        params.roleID = 'new';
        return route.replace(route.name, params);
    }

    /**
     * Return list of language codes
     *
     * @return {Array<String>}
     */
    getInputLanguages() {
        let { system } = this.props;
        return _.get(system, 'settings.input_languages', [])
    }

    /**
     * Reset edit state when edit starts
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { editing } = this.props;
        if (nextProps.editing !== editing) {
            if (nextProps.editing) {
                this.setState({
                    newRole: null,
                    hasChanges: false,
                    addingUserIDs: [],
                    removingUserIDs: [],
                });
            } else {
                this.setState({ problems: {} });
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, env } = this.props;
        let { hasChanges, problems } = this.state;
        let { setters } = this.components;
        let { t, p } = env.locale;
        let role = this.getRole();
        let title = p(_.get(role, 'details.title')) || role.name;
        return (
            <div className="role-summary-page">
                {this.renderButtons()}
                <h2>{t('role-summary-$title', title)}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderForm()}
                {this.renderInstructions()}
                <ActionConfirmation ref={setters.confirmation} env={env} />
                <DataLossWarning changes={hasChanges} env={env} route={route} />
            </div>
        );
    }

    /**
     * Render buttons in top right corner
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let { env, role, editing } = this.props;
        let { hasChanges, adding } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('role-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('role-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            let active = (role) ? !role.deleted && !role.disabled : true;
            let preselected;
            if (active) {
                preselected = (adding) ? 'add' : 'return';
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
    }

    /**
     * Render form for entering role details
     *
     * @return {ReactElement}
     */
    renderForm() {
        return (
            <div className="form">
                {this.renderTitleInput()}
                {this.renderNameInput()}
                {this.renderDescriptionInput()}
                {this.renderRatingSelector()}
                {this.renderUserSelector()}
            </div>
        );
    }

    /**
     * Render title input
     *
     * @return {ReactElement}
     */
    renderTitleInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'title',
            value: this.getRoleProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            onChange: this.handleTitleChange,
            readOnly: !editing,
            env,
        };
        return (
            <MultilingualTextField {...props}>
                {t('role-summary-title')}
            </MultilingualTextField>
        );
    }

    /**
     * Render name input
     *
     * @return {ReactElement}
     */
    renderNameInput() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'name',
            value: this.getRoleProperty('name'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleNameChange,
        };
        return (
            <TextField {...props}>
                {t('role-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    }

    /**
     * Render description input
     *
     * @return {ReactElement}
     */
    renderDescriptionInput() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let props = {
            id: 'description',
            value: this.getRoleProperty('details.description'),
            availableLanguageCodes: this.getInputLanguages(),
            type: 'textarea',
            readOnly: !editing,
            env,
            onChange: this.handleDescriptionChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('role-summary-description')}
            </MultilingualTextField>
        );
    }

    /**
     * Render message rating selector
     *
     * @return {ReactElement}
     */
    renderRatingSelector() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let ratingCurr = this.getRoleProperty('settings.rating', 'current') || 0;
        let ratingPrev = this.getRoleProperty('settings.rating', 'original') || 0;
        let optionProps = _.map(messageRatings, (rating, key) => {
            return {
                name: key,
                selected: ratingCurr === rating,
                previous: ratingCurr === rating,
                children: t(`role-summary-rating-${key}`),
            };
        });
        let listProps = {
            onOptionClick: this.handleRatingOptionClick,
            readOnly: !editing,
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('role-summary-rating')}
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render user selector
     *
     * @return {ReactElement}
     */
    renderUserSelector() {
        let { env, users, editing } = this.props;
        let { removingUserIDs, addingUserIDs } = this.state;
        let { t, p } = env.locale;
        let roleID = this.getRoleProperty('id');
        users = sortUsers(users, env);
        let optionProps = _.map(users, (user) => {
            let selectedBefore = _.includes(user.role_ids, roleID);
            let selectedAfter;
            if (selectedBefore) {
                selectedAfter = !_.includes(removingUserIDs, user.id);
            } else {
                selectedAfter = _.includes(addingUserIDs, user.id);
            }
            return {
                name: String(user.id),
                selected: selectedAfter,
                previous: selectedBefore,
                children: p(user.details.name) || p.username
            }
        });
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleUserOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('role-summary-users')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render instruction box
     *
     * @return {ReactElement}
     */
    renderInstructions() {
        let { env, editing } = this.props;
        let instructionProps = {
            folder: 'role',
            topic: 'role-summary',
            hidden: !editing,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    /**
     * Save user with new flags
     *
     * @param  {Object} flags
     *
     * @return {Promise<Role>}
     */
    changeFlags(flags) {
        let { database, role } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let roleAfter = _.assign({}, role, flags);
        return db.saveOne({ table: 'role' }, roleAfter).catch((err) => {
            let problems = { unexpected: err.message };
            this.setState({ problems });
        });
    }

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleDisableClick = (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('role-summary-confirm-disable');
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ disabled: true }).then((role) => {
                    if (role) {
                        return this.returnToList();
                    }
                });
            }
        });
    }

    /**
     * Called when user clicks delete button
     *
     * @param  {Event} evt
     */
    handleDeleteClick = (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('role-summary-confirm-delete');
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ deleted: true }).then((role) => {
                    if (role) {
                        return this.returnToList();
                    }
                });
            }
        });
    }

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleReactivateClick = (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('role-summary-confirm-reactivate');
        return confirmation.ask(message).then((confirmed) => {
            if (confirmed) {
                return this.changeFlags({ disabled: false, deleted: false });
            }
        });
    }

    /**
     * Called when user click return button
     *
     * @param  {Event} evt
     */
    handleReturnClick = (evt) => {
        return this.returnToList();
    }

    /**
     * Called when user click add button
     *
     * @param  {Event} evt
     */
    handleAddClick = (evt) => {
        return this.startNew();
    }

    /**
     * Called when user clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        return this.setEditability(true);
    }

    /**
     * Called when user clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        return this.setEditability(false);
    }

    /**
     * Called when user clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick = (evt) => {
        let { database, users } = this.props;
        let { saving, removingUserIDs, addingUserIDs } = this.state;
        if (saving) {
            return;
        }
        let problems = this.findProblems();
        if (_.some(problems)) {
            this.setState({ problems });
            return;
        }
        let role = this.getRole();
        this.setState({ saving: true, adding: !role.id, problems: {} }, () => {
            let db = database.use({ schema: 'global', by: this });
            return db.start().then((userID) => {
                return db.saveOne({ table: 'role' }, role).then((role) => {
                    // change role_ids of selected/deselected users
                    let userChanges = [];
                    _.each(addingUserIDs, (userID) => {
                        let user = _.find(users, { id: userID });
                        userChanges.push({
                            id: user.id,
                            role_ids: _.union(user.role_ids, [ role.id ]),
                        });
                    });
                    _.each(removingUserIDs, (userID) => {
                        let user = _.find(users, { id: userID });
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
                let problems;
                if (err.statusCode === 409) {
                    problems = { name: 'validation-duplicate-role-name' };
                } else {
                    problems = { unexpected: err.message };
                }
                this.setState({ problems, saving: false });
            });
        });
    }

    /**
     * Called when user changes the title
     *
     * @param  {Object} evt
     */
    handleTitleChange = (evt) => {
        this.setRoleProperty(`details.title`, evt.target.value);
    }

    /**
     * Called when user changes the name
     *
     * @param  {Event} evt
     */
    handleNameChange = (evt) => {
        let name = _.toLower(evt.target.value).replace(/\W+/g, '');
        this.setRoleProperty(`name`, name);
    }

    /**
     * Called when user changes the description
     *
     * @param  {Object} evt
     */
    handleDescriptionChange = (evt) => {
        this.setRoleProperty(`details.description`, evt.target.value);
    }

    /**
     * Called when user clicks on one of the rating option
     *
     * @param  {Object} evt
     */
    handleRatingOptionClick = (evt) => {
        let key = evt.name;
        let rating = messageRatings[key];
        this.setRoleProperty(`settings.rating`, rating);
    }

    /**
     * Called when user clicks on one of the users in list
     *
     * @param  {Object} evt
     */
    handleUserOptionClick = (evt) => {
        let { users } = this.props;
        let { addingUserIDs, removingUserIDs, newRole } = this.state;
        let userID = parseInt(evt.name);
        let user = _.find(users, { id: userID });
        let roleID = this.getRoleProperty('id');
        if (_.includes(user.role_ids, roleID)) {
            if (_.includes(removingUserIDs, user.id)) {
                removingUserIDs = _.without(removingUserIDs, user.id);
            } else {
                removingUserIDs = _.concat(removingUserIDs, user.id);
            }
        } else {
            if (_.includes(addingUserIDs, user.id)) {
                addingUserIDs = _.without(addingUserIDs, user.id);
            } else {
                addingUserIDs = _.concat(addingUserIDs, user.id);
            }
        }
        let hasChanges = true;
        if (!newRole) {
            hasChanges = !_.isEmpty(addingUserIDs) || !_.isEmpty(removingUserIDs);
        }
        this.setState({ addingUserIDs, removingUserIDs, hasChanges });
    }
}

let sortUsers = memoizeWeak(null, function(users, env) {
    let { p } = env.locale;
    let name = (user) => {
        return p(user.details.name) || user.username;
    };
    return _.sortBy(users, name);
});

const emptyRole = {
    details: {}
};

const messageRatings = {
    'very-high': 50,
    'high': 20,
    'normal': 0,
    'low': -20,
    'very-low': -50,
};

export {
    RoleSummaryPage as default,
    RoleSummaryPage,
    RoleSummaryPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    RoleSummaryPage.propTypes = {
        editing: PropTypes.bool,
        roleID: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.oneOf([ 'new' ]),
        ]).isRequired,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    RoleSummaryPageSync.propTypes = {
        editing: PropTypes.bool,
        creating: PropTypes.bool,
        system: PropTypes.object,
        role: PropTypes.object,
        users: PropTypes.arrayOf(PropTypes.object),

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}

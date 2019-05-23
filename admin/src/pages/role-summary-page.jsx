import _ from 'lodash';
import React, { useState, useCallback } from 'react';
import Relaks, { useProgress, Cancellation } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
    useDraftBuffer,
    useSelectionBuffer,
    useAutogenID,
    useNavigation,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './role-summary-page.scss';

async function RoleSummaryPage(props) {
    const { database, roleID } = props;
    const creating = (roleID === 'new');
    const [ show ] = useProgress();

    render();
    const db = database.use({ schema: 'global' });
    const currentUserID = await db.start();
    const system = await SystemFinder.findSystem(db);
    const role = !creating ? await RoleFinder.findRole(db, roleID) : null;
    render();
    const users = await UserFinder.findActiveUsers(db);
    render();

    function render() {
        const sprops = { system, role, users, creating };
        show(<RoleSummaryPageSync {...sprops} {...props} />);
    }
}

function RoleSummaryPageSync(props) {
    const { system, role, users, creating } = props;
    const { database, route, env, editing } = props;
    const { t, p } = env.locale;
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const readOnly = !editing && !creating;
    const [ adding, setAdding ] = useState(false);
    const [ problems, setProblems ] = useState({});
    const draft = useDraftBuffer({
        original: role || {},
        save: (base, ours, action) => {
            switch (action) {
                case 'restore': return restoreRole(base);
                default: return saveRole(base, ours);
            }
        },
        remove: (base, ours, action) => {
            switch (action) {
                case 'disable': return disableRole(base);
                default: return removeRole(base);
            }
        },
        reset: readOnly,
    });
    const members = _.filter(users, (user) => {
        return (role) ? _.includes(user.role_ids, role.id) : false;
    });
    const userSelection = useSelectionBuffer({
        original: _.map(members, 'id'),
        reset: readOnly,
    });
    const navigation = useNavigation(route, {
        add: { params: { roleID: 'new' } },
        return: { page: 'role-list-page' },
    });
    const [ confirmationRef, confirm ] = useConfirmation();
    useDataLossWarning(route, env, confirm, () => draft.unsaved);

    const handleEditClick = useCallback((evt) => navigation.edit());
    const handleCancelClick = useCallback((evt) => navigation.cancel());
    const handleAddClick = useCallback((evt) => navigation.add());
    const handleReturnClick = useCallback((evt) => navigation.return());
    const handleDisableClick = useCallback(async (evt) => {
        if (await draft.remove('disable')) {
            navigation.return();
        }
    });
    const handleRemoveClick = useCallback(async (evt) => {
        if (await draft.remove()) {
            navigation.return();
        }
    });
    const handleRestoreClick = useCallback(async (evt) => {
        await draft.save('restore');
    });
    const handleSaveClick = useCallback(async (evt) => {
        if (await draft.save()) {
            if (creating) {
                setAdding(true);
                navigation.done({ roleID: draft.current.id });
            } else {
                navigation.done();
            }
        }
    });
    const [ handleTitleChange, handleNameChange ] = useAutogenID(draft, {
        titleKey: 'details.title',
        nameKey: 'name',
    });
    const handleDescriptionChange = useCallback((evt) => {
        const description = evt.target.value;
        draft.update('details.description', description);
    });
    const handleRatingOptionClick = useCallback((evt) => {
        const key = evt.name;
        const rating = messageRatings[key];
        draft.update('settings.rating', rating);
    });
    const handleUserOptionClick = useCallback((evt) => {
        let userID = parseInt(evt.name);
        userSelection.toggle(userID);
    });

    const title = p(draft.get('details.title')) || draft.get('name');
    return (
        <div className="role-summary-page">
            {renderButtons()}
            <h2>{t('role-summary-$title', title)}</h2>
            <UnexpectedError error={draft.error} />
            {renderForm()}
            {renderInstructions()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const active = (role) ? !role.deleted && !role.disabled : true;
            let preselected;
            if (active) {
                preselected = (adding) ? 'add' : 'return';
            } else {
                preselected = 'reactivate';
            }
            return (
                <div className="buttons">
                    <ComboButton preselected={preselected}>
                        <option name="return" onClick={handleReturnClick}>
                            {t('role-summary-return')}
                        </option>
                        <option name="add" onClick={handleAddClick}>
                            {t('role-summary-add')}
                        </option>
                        <option name="archive" disabled={!active} separator onClick={handleDisableClick}>
                            {t('role-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={handleRemoveClick}>
                            {t('role-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={handleRestoreClick}>
                            {t('role-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('role-summary-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const unsaved = draft.unsaved || userSelection.unsaved;
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('role-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!unsaved} onClick={handleSaveClick}>
                        {t('role-summary-save')}
                    </PushButton>
                </div>
            );
        }
    }

    function renderForm() {
        return (
            <div className="form">
                {renderTitleInput()}
                {renderNameInput()}
                {renderDescriptionInput()}
                {renderRatingSelector()}
                {renderUserSelector()}
            </div>
        );
    }

    function renderTitleInput() {
        const props = {
            id: 'title',
            value: draft.get('details.title', {}),
            availableLanguageCodes,
            readOnly,
            env,
            onChange: handleTitleChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('role-summary-title')}
            </MultilingualTextField>
        );
    }

    function renderNameInput() {
        const props = {
            id: 'name',
            value: draft.get('name', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleNameChange,
        };
        return (
            <TextField {...props}>
                {t('role-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    }

    function renderDescriptionInput() {
        const props = {
            id: 'description',
            value: draft.get('details.description', {}),
            type: 'textarea',
            availableLanguageCodes,
            readOnly,
            env,
            onChange: handleDescriptionChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('role-summary-description')}
            </MultilingualTextField>
        );
    }

    function renderRatingSelector() {
        let listProps = {
            onOptionClick: handleRatingOptionClick,
            readOnly,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('role-summary-rating')}</label>
                {_.map(messageRatings, renderRatingOption)}
            </OptionList>
        );
    }

    function renderRatingOption(rating, key) {
        const ratingCurr = draft.getCurrent('settings.rating', 0);
        const ratingPrev = draft.getOriginal('settings.rating', 0);
        const props = {
            name: key,
            selected: ratingCurr === rating,
            previous: ratingPrev === rating,
            children: t(`role-summary-rating-${key}`),
        };
        return <option key={key} {...props} />;
    }

    function renderUserSelector() {
        const usersSorted = sortUsers(users, env);
        const listProps = {
            readOnly,
            onOptionClick: handleUserOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('role-summary-users')}</label>
                {_.map(usersSorted, renderUserOption)}
            </OptionList>
        );
    }

    function renderUserOption(user, i) {
        const props = {
            name: String(user.id),
            selected: userSelection.keeping(user.id),
            previous: userSelection.existing(user.id),
            children: p(user.details.name) || p.username
        };
        return <option key={i} {...props} />;
    }

    function renderInstructions() {
        const instructionProps = {
            folder: 'role',
            topic: 'role-summary',
            hidden: readOnly,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    async function disableRole(base) {
        await confirm(t('role-summary-confirm-disable'));
        const changes = { id: base.id, disabled: true };
        const db = database.use({ schema: 'global' });
        await db.saveOne({ table: 'role' }, changes);
    }

    async function removeRole(base) {
        await confirm(t('role-summary-confirm-delete'));
        const changes = { id: base.id, deleted: true };
        const db = database.use({ schema: 'global' });
        await db.saveOne({ table: 'role' }, changes);
    }

    async function restoreRole(base) {
        await confirm(t('role-summary-confirm-reactivate'));
        const changes = { id: base.id, disabled: false, deleted: false };
        const db = database.use({ schema: 'global' });
        await db.saveOne({ table: 'role' }, changes);
    }

    async function saveRole(base, ours) {
        try {
            validateRoleInfo(ours);

            const db = database.use({ schema: 'global' });
            const roleAfter = await db.saveOne({ table: 'role' }, ours);

            let userChanges = [];
            for (let user of users) {
                const columns = { id: user.id };
                if (userSelection.adding(user.id)) {
                    columns.role_ids = _.union(user.role_ids, [ roleAfter.id ]);
                } else if (userSelection.removing(user.id)) {
                    columns.role_ids = _.difference(user.role_ids, [ roleAfter.id ]);
                } else {
                    continue;
                }
                userChanges.push(columns);
            }
            if (!_.isEmpty(userChanges)) {
                await db.save({ table: 'user' }, userChanges);
            }
            return roleAfter;
        } catch (err) {
            if (err.statusCode === 409) {
                setProblems({ name: 'validation-duplicate-role-name' });
                err = new Cancellation;
            }
            throw err;
        }
    }

    function validateRoleInfo(ours) {
        const problems = {};
        if (!ours.name) {
            problems.name = 'validation-required';
        }
        setProblems(problems);
        if (!_.isEmpty(problems)) {
            throw new Cancellation;
        }
    }
}

const sortUsers = memoizeWeak(null, function(users, env) {
    const { p } = env.locale;
    const name = (user) => {
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

const component = Relaks.memo(RoleSummaryPage);

export {
    component as default,
    component as RoleSummaryPage,
};

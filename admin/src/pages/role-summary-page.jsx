import _ from 'lodash';
import React, { useState, useCallback } from 'react';
import Relaks, { useProgress, useSaveBuffer, Cancellation } from 'relaks';
import { useSelectionBuffer, useEditHandling, useAddHandling, useReturnHandling, useConfirmation } from '../hooks.mjs';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as SlugGenerator from 'common/utils/slug-generator.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

import './role-summary-page.scss';

async function RoleSummaryPage(props) {
    const { database, route, env, roleID, editing } = props;
    const { t, p } = env.locale;
    const db = database.use({ schema: 'global', by: this });
    const creating = (roleID === 'new');
    const readOnly = !editing;
    const [ problems, setProblems ] = useState({});
    const [ confirmationRef, confirm ] = useConfirmation();
    const [ show ] = useProgress();
    const draft = useSaveBuffer({
        save: (base, ours, action) => {
            switch (action) {
                case 'restore': return restore(base);
                default: return save(base, ours);
            }
        },
        remove: (base, ours, action) => {
            switch (action) {
                case 'disable': return disable(base);
                default: return remove(base);
            }
        },
        compare: _.isEqual,
        reset: !editing,
    });
    const userSelection = useSelectionBuffer(editing);

    const [ handleEditClick, handleCancelClick ] = useEditHandling(route);
    const [ handleAddClick ] = useAddHandling(route, {
        params: { roleID: 'new' },
    });
    const [ handleReturnClick ] = useReturnHandling(route, {
        page: 'role-list-page',
    });
    const handleDisableClick = useCallback(async (evt) => {
        await draft.remove('disable');
    });
    const handleRemoveClick = useCallback(async (evt) => {
        await draft.remove();
    });
    const handleRestoreClick = useCallback(async (evt) => {
        await draft.save('restore');
    });
    const handleSaveClick = useCallback(async (evt) => {
        await draft.save();
    });
    const handleTitleChange = useCallback((evt) => {
        const title = evt.target.value;
        let after = _.decoupleSet(draft.current, 'details.title', title);

        // derive name from title
        const titleBefore = _.get(draft.current, 'details.title', {});
        const autoNameBefore = SlugGenerator.fromTitle(titleBefore);
        const autoName = SlugGenerator.fromTitle(title);
        const nameBefore = _.get(draft.current, 'name', '');
        if (!nameBefore || nameBefore === autoNameBefore) {
            after = _.decoupleSet(after, 'name', autoName);
        }
        draft.set(after);
    });
    const handleNameChange = useCallback((evt) => {
        const name = evt.target.value;
        const nameTransformed = _.toLower(name).replace(/[^\w\-]+/g, '');
        const nameLimited = nameTransformed.substr(0, 128);
        draft.set(_.decoupleSet(draft.current, 'name', nameLimited));
    });
    const handleDescriptionChange = useCallback((evt) => {
        const description = evt.target.value;
        draft.set(_.decoupleSet(draft.current, 'details.description', description));
    });
    const handleRatingOptionClick = useCallback((evt) => {
        const key = evt.name;
        const rating = messageRatings[key];
        draft.set(_.decoupleSet(draft.current, 'settings.rating', rating));
    });
    const handleUserOptionClick = useCallback((evt) => {
        let userID = parseInt(evt.name);
        userSelection.toggle(userID);
    });

    render();
    const currentUserID = await db.start();
    const system = await SystemFinder.findSystem(db);
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const role = await (creating ? null : RoleFinder.findRole(db, roleID));
    draft.base(role || {});
    render();
    const users = await UserFinder.findActiveUsers(db);
    const members = _.filter(users, (user) => {
        return _.includes(user.role_ids, role.id);
    });
    userSelection.base(_.map(members, 'id'));
    render();

    function render() {
        const changed = draft.changed || userSelection.changed;
        const title = p(_.get(draft.current, 'details.title')) || _.get(draft.current, 'name');
        show(
            <div className="role-summary-page">
                {renderButtons()}
                <h2>{t('role-summary-$title', title)}</h2>
                <UnexpectedError error={draft.error} />
                {renderForm()}
                {renderInstructions()}
                <ActionConfirmation ref={confirmationRef} env={env} />
                <DataLossWarning changes={changed} env={env} route={route} />
            </div>
        );
    }

    function renderButtons() {
        const changed = draft.changed || userSelection.changed;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('role-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('role-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            const active = (role) ? !role.deleted && !role.disabled : true;
            let preselected;
            if (active) {
                preselected = (creating) ? 'add' : 'return';
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
            value: _.get(draft.current, 'details.title', {}),
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
            value: _.get(draft.current, 'name', ''),
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
            value: _.get(draft.current, 'details.description', {}),
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
            readOnly: !editing,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('role-summary-rating')}</label>
                {_.map(messageRatings, renderRatingOption)}
            </OptionList>
        );
    }

    function renderRatingOption(rating, key) {
        const ratingCurr = _.get(draft.current, 'settings.rating', 0);
        const ratingPrev = _.get(draft.original, 'settings.rating', 0);
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
            readOnly: !editing,
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
            hidden: !editing,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    async function disable(base) {
        await confirm(t('role-summary-confirm-disable'));
        const changes = { id: base.id, disabled: true };
        await db.saveOne({ table: 'role' }, changes);
        handleReturnClick();
    }

    async function remove(base) {
        await confirm(t('role-summary-confirm-delete'));
        const changes = { id: base.id, deleted: true };
        await db.saveOne({ table: 'role' }, changes);
        handleReturnClick();
    }

    async function restore(base) {
        await confirm(t('role-summary-confirm-reactivate'));
        const changes = { id: base.id, disabled: true, deleted: true };
        await db.saveOne({ table: 'role' }, changes);
    }

    async function save(base, ours) {
        validate(ours);
        setSaving(true);
        try {
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
            handleCancelClick();
            return roleAfter;
        } catch (err) {
            if (err.statusCode === 409) {
                setProblems({ name: 'validation-duplicate-role-name' });
                err = new Cancellation;
            }
            throw err;
        } finally {
            setSaving(false);
        }
    }

    function validate(ours) {
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

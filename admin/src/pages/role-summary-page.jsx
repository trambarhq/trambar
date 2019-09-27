import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as RoleSaver from 'common/objects/savers/role-saver.mjs';
import * as RoleUtils from 'common/objects/utils/role-utils.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import * as UserSaver from 'common/objects/savers/user-saver.mjs';

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
    useValidation,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './role-summary-page.scss';

async function RoleSummaryPage(props) {
    const { database, roleID } = props;
    const creating = (roleID === 'new');
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const system = await SystemFinder.findSystem(database);
    const role = !creating ? await RoleFinder.findRole(database, roleID) : null;
    render();
    const users = await UserFinder.findActiveUsers(database);
    render();

    function render() {
        const sprops = { system, role, users, creating };
        show(<RoleSummaryPageSync key={roleID} {...sprops} {...props} />);
    }
}

function RoleSummaryPageSync(props) {
    const { system, role, users, creating } = props;
    const { database, route, env, editing } = props;
    const { t, p } = env.locale;
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const readOnly = !editing && !creating;
    const [ adding, setAdding ] = useState(false);
    const draft = useDraftBuffer({
        original: role || {},
        reset: readOnly,
    });
    const members = _.filter(users, (user) => {
        return (role) ? _.includes(user.role_ids, role.id) : false;
    });
    const userSelection = useSelectionBuffer({
        original: members,
        reset: readOnly,
    });
    const [ problems, reportProblems ] = useValidation(!readOnly);
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const warnDataLoss = useDataLossWarning(route, env, confirm);

    const handleEditClick = useListener((evt) => {
        route.replace({ editing: true });
    });
    const handleCancelClick = useListener((evt) => {
        if (creating) {
            handleReturnClick();
        } else {
            route.replace({ editing: undefined });
        }
    });
    const handleAddClick = useListener((evt) => {
        route.push({ roleID: 'new' });
    });
    const handleReturnClick = useListener((evt) => {
        route.push('role-list-page');
    });
    const handleDisableClick = useListener((evt) => {
        run(async () => {
            await confirm(t('role-summary-confirm-disable'));
            await RoleSaver.disableRole(database, role);
            handleReturnClick();
        });
    });
    const handleRemoveClick = useListener((evt) => {
        run(async () => {
            await confirm(t('role-summary-confirm-delete'));
            await RoleSaver.removeRole(database, role);
            handleReturnClick();
        });
    });
    const handleRestoreClick = useListener((evt) => {
        run(async () => {
            await confirm(t('role-summary-confirm-reactivate'));
            await RoleSaver.restoreRole(database, role);
        });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            try {
                const problems = {};
                const name = draft.get('name');
                if (!name) {
                    problems.name = 'validation-required';
                }
                reportProblems(problems);

                const roleAfter = await RoleSaver.saveRole(database, draft.current);
                const adding = userSelection.adding();
                const removing = userSelection.removing();
                await UserSaver.addRole(database, adding, roleAfter);
                await UserSaver.removeRole(database, removing, roleAfter);

                if (creating) {
                    setAdding(true);
                }
                warnDataLoss(false);
                route.replace({ editing: undefined, roleID: roleAfter.id });
            } catch (err) {
                if (err.statusCode === 409) {
                    reportProblems({ name: 'validation-duplicate-role-name' });
                } else {
                    throw err;
                }
            }
        });
    });
    const [ handleTitleChange, handleNameChange ] = useAutogenID(draft, {
        titleKey: 'details.title',
        nameKey: 'name',
    });
    const handleDescriptionChange = useListener((evt) => {
        const description = evt.target.value;
        draft.set('details.description', description);
    });
    const handleRatingOptionClick = useListener((evt) => {
        const key = evt.name;
        const rating = messageRatings[key];
        draft.set('settings.rating', rating);
    });
    const handleUserOptionClick = useListener((evt) => {
        const userID = parseInt(evt.name);
        const user = _.find(users, { id: userID });
        userSelection.toggle(user);
    });

    warnDataLoss(draft.changed || userSelection.changed);

    const title = RoleUtils.getDisplayName(draft.current, env);
    return (
        <div className="role-summary-page">
            {renderButtons()}
            <h2>{t('role-summary-$title', title)}</h2>
            <UnexpectedError error={error} />
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
            const changed = draft.changed || userSelection.changed;
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
            selected: userSelection.isKeeping(user),
            previous: userSelection.isExisting(user),
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
}

const sortUsers = memoizeWeak(null, function(users, env) {
    const { p } = env.locale;
    const name = (user) => {
        return p(user.details.name) || user.username;
    };
    return _.sortBy(users, name);
});

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

import _ from 'lodash';
import React, { useState, useCallback } from 'react';
import Relaks, { useProgress, Cancellation } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as UserFinder from 'common/objects/finders/user-finder.mjs';
import { UserTypes } from 'common/objects/types/user-types.mjs';
import * as UserSettings from 'common/objects/settings/user-settings.mjs';
import * as StatisticsFinder from 'common/objects/finders/statistics-finder.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { ImageSelector } from '../widgets/image-selector.jsx';
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';
import { ActivityChart } from '../widgets/activity-chart.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { DataLossWarning } from '../widgets/data-loss-warning.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

// custom hooks
import {
    useDraftBuffer,
    useEditHandling,
    useAddHandling,
    useNameHandling,
    useConfirmation,
} from '../hooks.mjs';

import './user-summary-page.scss';

async function UserSummaryPage(props) {
    const { database, route, env, payloads, projectID, userID, editing } = props;
    const { t, p } = env.locale;
    const db = database.use({ schema: 'global', by: this });
    const creating = (userID === 'new');
    const readOnly = !editing;
    const [ problems, setProblems ] = useState({});
    const [ showingSocialLinks, setShowingSocialLinks ] = useState(false);
    const [ confirmationRef, confirm ] = useConfirmation();
    const [ show ] = useProgress();
    const draft = useDraftBuffer(editing, {
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
        }
    });

    const [ handleEditClick, handleCancelClick ] = useEditHandling(route);
    const [ handleAddClick ] = useAddHandling(route, {
        params: { roleID: 'new' },
    });
    const handleReturnClick = useCallback((evt) => {
        if (projectID) {
            route.push('member-list-page', { projectID });
        } else {
            route.push('user-list-page');
        }
    }, [ route ]);
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
    const [ handleNameChange, handleUsernameChange ] = useNameHandling(draft, {
        titleKey: 'details.name',
        nameKey: 'username',
        personal: true
    });
    const handleEmailChange = useCallback((evt) => {
        const address = evt.target.value;
        draft.update(`details.email`, address);
    });
    const handlePhoneChange = useCallback((evt) => {
        const number = evt.target.value;
        draft.update(`details.phone`, number);
    });
    const handleProfileImageChange = useCallback((evt) => {
        const resources = evt.target.value;
        draft.update(`details.resources`, resources);
    });
    const handleTypeOptionClick = useCallback((evt) => {
        const type = evt.name;
        draft.update('type', type);
    });
    const handleRoleOptionClick = useCallback((evt) => {
        const roleID = parseInt(evt.name);
        const before = draft.get('role_ids', []);
        const after = (roleID) ? _.toggle(before, roleID) : [];
        draft.update('role_ids', after);
    });
    const handleSocialLinksToggleClick = useCallback((evt) => {
        setShowingSocialLinks(!showingSocialLinks);
    }, [ showingSocialLinks ]);
    const handleSkypeUsernameChange = useCallback((evt) => {
        const username = _.trim(evt.target.value);
        draft.update(`details.skype_username`, username);
    });
    const handleIchatUsernameChange = useCallback((evt) => {
        const username = _.trim(evt.target.value);
        draft.update(`details.ichat_username`, username);
    });
    const handleTwitterUsernameChange = useCallback((evt) => {
        const username = extractUsername(evt.target.value);
        draft.update(`details.twitter_username`, username);
    });
    const handleLinkedinURLChange = useCallback((evt) => {
        const url = _.trim(evt.target.value);
        draft.update(`details.linkedin_url`, url);
    });
    const handleGitHubURLChange = useCallback((evt) => {
        const url = _.trim(evt.target.value);
        draft.update(`details.github_url`, url);
    });
    const handleGitlabURLChange = useCallback((evt) => {
        const url = _.trim(evt.target.value);
        draft.update(`details.gitlab_url`, url);
    });
    const handleStackoverflowURLChange = useCallback((evt) => {
        const url = _.trim(evt.target.value);
        draft.update(`details.stackoverflow_url`, url);
    });

    render();
    const currentUserID = await db.start();
    const system = await SystemFinder.findSystem(db);
    const user = (!creating) ? await UserFinder.findUser(db, userID) : null;
    draft.base(user);
    render();
    const roles = await RoleFinder.findActiveRoles(db)
    render();
    // load project if project id is provided (i.e. member summary)
    const project = (projectID) ? await ProjectFinder.findProject(db, projectID) : null;
    render();
    const statistics = (project && user) ? await StatisticsFinder.findDailyActivitiesOfUser(db, project, user) : null;
    render();

    function render() {
        const { changed } = draft;
        show(
            <div className="user-summary-page">
                {renderButtons()}
                <h2>{t(projectID ? 'user-summary-member-$name' : 'user-summary-$name', name)}</h2>
                <UnexpectedError error={draft.error} />
                {renderForm()}
                {renderSocialLinksToggle()}
                {renderSocialLinksForm()}
                {renderInstructions()}
                {renderChart()}
                <ActionConfirmation ref={confirmationRef} env={env} />
                <DataLossWarning changes={changed} env={env} route={route} />
            </div>
        );
    }

    function renderButtons() {
        const { changed } = draft;
        if (editing) {
            return (
                <div className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('user-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t(projectID ? 'user-summary-member-save' : 'user-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            const active = (user) ? !user.deleted && !user.disabled : true;
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
                            {t(projectID ? 'user-summary-member-return' : 'user-summary-return')}
                        </option>
                        <option name="add" onClick={handleAddClick}>
                            {t('user-summary-add')}
                        </option>
                        <option name="disable" disabled={!active} separator onClick={handleDisableClick}>
                            {t('user-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={handleRemoveClick}>
                            {t('user-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={handleRestoreClick}>
                            {t('user-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t(projectID ? 'user-summary-member-edit' : 'user-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    function renderForm() {
        return (
            <div className="form">
                {renderNameInput()}
                {renderUsernameInput()}
                {renderEmailInput()}
                {renderPhoneInput()}
                {renderProfileImageSelector()}
                {renderTypeSelector()}
                {renderRoleSelector()}
            </div>
        );
    }

    function renderNameInput() {
        // not supporting multilingual name yet
        const name = p(draft.get('details.name'));
        const props = {
            id: 'name',
            value: name,
            spellCheck: false,
            readOnly,
            env,
            onChange: handleNameChange,
        };
        return <TextField {...props}>{t('user-summary-name')}</TextField>;
    }

    function renderUsernameInput() {
        const props = {
            id: 'username',
            value: draft.get('username', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleUsernameChange,
        };
        return (
            <TextField {...props}>
                {t('user-summary-username')}
                <InputError>{t(problems.username)}</InputError>
            </TextField>
        );
    }

    function renderEmailInput() {
        const props = {
            id: 'email',
            type: 'email',
            value: draft.get('details.email', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleEmailChange,
        };
        return (
            <TextField {...props}>
                {t('user-summary-email')}
                <InputError>{t(problems.email)}</InputError>
            </TextField>
        );
    }

    function renderPhoneInput() {
        const props = {
            id: 'phone',
            type: 'tel',
            value: draft.get('details.phone', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handlePhoneChange,
        };
        return <TextField {...props}>{t('user-summary-phone')}</TextField>;
    }

    function renderProfileImageSelector() {
        const props = {
            purpose: 'profile-image',
            desiredWidth: 500,
            desiredHeight: 500,
            resources: draft.get('details.resources', []),
            readOnly,
            database,
            env,
            payloads,
            onChange: handleProfileImageChange,
        };
        return (
            <ImageSelector {...props}>
                {t('user-summary-profile-image')}
            </ImageSelector>
        );
    }

    function renderTypeSelector() {
        const listProps = {
            readOnly,
            onOptionClick: handleTypeOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('user-summary-type')}
                    <InputError>{t(problems.type)}</InputError>
                </label>
                {_.map(UserTypes, renderTypeOption)}
            </OptionList>
        );
    }

    function renderTypeOption(type, i) {
        const typeCurr = draft.getCurrent('type', '');
        const typePrev = draft.getOriginal('type', '');
        const props = {
            name: type,
            selected: (typeCurr === type),
            previous: (typePrev === type),
        };
        return (
            <option key={i} {...props}>
                {t(`user-summary-type-${type}`)}
            </option>
        );
    }

    function renderRoleSelector() {
        const listProps = {
            readOnly,
            onOptionClick: handleRoleOptionClick,
        };

        const sorted = sortRoles(roles, env) || [];
        const withNone = _.concat(null, sorted);
        return (
            <OptionList {...listProps}>
                <label>{t('user-summary-roles')}</label>
                {_.map(withNone, renderRoleOption)}
            </OptionList>
        );
    }

    function renderRoleOption(role, i) {
        const rolesCurr = draft.getCurrent('role_ids', []);
        const rolesPrev = draft.getOriginal('role_ids', []);
        let name, props;
        if (!role) {
            name = t('user-summary-role-none')
            props = {
                name: 'none',
                selected: _.isEmpty(rolesCurr),
                previous: (creating) ? _.isEmpty(rolesPrev) : undefined,
            };
        } else {
            name = p(role.details.title) || role.name;
            props = {
                name: String(role.id),
                selected: _.includes(rolesCurr, role.id),
                previous: _.includes(rolesPrev, role.id),
            };
        }
        return <option key={i} {...props}>{name}</option>;
    }

    function renderSocialLinksToggle() {
        const dir = (showingSocialLinks) ? 'up' : 'down';
        return (
            <h2 className="social-toggle" onClick={handleSocialLinksToggleClick}>
                {t('user-summary-social-links')}
                {' '}
                <i className={`fa fa-angle-double-${dir}`} />
            </h2>
        );
    }

    function renderSocialLinksForm() {
        return (
            <div className="form social">
                <CollapsibleContainer open={showingSocialLinks}>
                    {renderSkypeNameInput()}
                    {renderIChatInput()}
                    {renderTwitterInput()}
                    {renderGithubURLInput()}
                    {renderGitlabURLInput()}
                    {renderLinkedInURLInput()}
                    {renderStackoverflowURLInput()}
                </CollapsibleContainer>
            </div>
        );
    }

    function renderSkypeNameInput() {
        const props = {
            id: 'skype',
            value: draft.get('details.skype_username', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleSkypeUsernameChange,
        };
        return <TextField {...props}>{t('user-summary-skype')}</TextField>;
    }

    function renderIChatInput() {
        const props = {
            id: 'ichat',
            value: draft.get('details.ichat_username', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleIchatUsernameChange,
        };
        return <TextField {...props}>{t('user-summary-ichat')}</TextField>;
    }

    function renderTwitterInput() {
        const props = {
            id: 'twitter',
            value: draft.get('details.twitter_username', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleTwitterUsernameChange,
        };
        return <TextField {...props}>{t('user-summary-twitter')}</TextField>;
    }

    function renderGithubURLInput() {
        const props = {
            id: 'github',
            type: 'url',
            value: draft.get('details.github_url', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleGitHubURLChange,
        };
        return <TextField {...props}>{t('user-summary-github')}</TextField>;
    }

    function renderGitlabURLInput() {
        const props = {
            id: 'github',
            type: 'url',
            value: draft.get('details.gitlab_url', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleGitlabURLChange,
        };
        return <TextField {...props}>{t('user-summary-gitlab')}</TextField>;
    }

    function renderLinkedInURLInput() {
        const props = {
            id: 'linkedin',
            type: 'url',
            value: draft.get('details.linkedin_url', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleLinkedinURLChange,
        };
        return <TextField {...props}>{t('user-summary-linkedin')}</TextField>;
    }

    function renderStackoverflowURLInput() {
        const props = {
            id: 'stackoverflow',
            type: 'url',
            value: draft.get('details.stackoverflow_url', ''),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleStackoverflowURLChange,
        };
        return <TextField {...props}>{t('user-summary-stackoverflow')}</TextField>;
    }

    function renderInstructions() {
        const instructionProps = {
            folder: 'user',
            topic: 'user-summary',
            hidden: !editing,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    function renderChart() {
        if (!projectID || creating) {
            return null;
        }
        const chartProps = { statistics, env };
        return (
            <div className="statistics">
                <ErrorBoundary env={env}>
                    <ActivityChart {...chartProps}>
                        {t('user-summary-statistics')}
                    </ActivityChart>
                </ErrorBoundary>
            </div>
        );
    }

    async function disable(base) {
        await confirm(t('user-summary-confirm-disable'));
        const changes = { id: base.id, disabled: true };
        await db.saveOne({ table: 'user' }, changes);
        handleReturnClick();
    }

    async function remove(base) {
        await confirm(t('user-summary-confirm-delete'));
        const changes = { id: base.id, deleted: true };
        await db.saveOne({ table: 'user' }, changes);
        handleReturnClick();
    }

    async function restore(base) {
        await confirm(t('user-summary-confirm-reactivate'));
        const changes = { id: base.id, disabled: true, deleted: true };
        await db.saveOne({ table: 'user' }, changes);
    }

    async function save(base, ours) {
        validate(ours);
        setSaving(true);
        try {
            const userAfter = await db.saveOne({ table: 'user' }, ours);
            payloads.dispatch(userAfter);

            if (project) {
                // add user to member list if he's not there yet
                const userIDs = project.user_ids;
                if (!_.includes(userIDs, userAfter.id)) {
                    const userIDsAfter = _.union(userIDs, [ userAfter.id ]);
                    const changes = {
                        id: project.id,
                        user_ids: userIDsAfter
                    };
                    await db.saveOne({ table: 'project' }, changes);
                }
            }
            handleCancelClick();
            return userAfter;
        } catch (err) {
            if (err.statusCode === 409) {
                setProblems({ username: 'validation-duplicate-user-name' });
                err = new Cancellation;
            }
            throw err;
        } finally {
            setSaving(false);
        }
    }

    function validate(ours) {
        const problems = {};
        if (!ours.username) {
            problems.username = 'validation-required';
        }
        if (!ours.type) {
            problems.type = 'validation-required';
        }
        setProblems(problems);
        if (!_.isEmpty(problems)) {
            throw new Cancellation;
        }
    }
}

const sortRoles = memoizeWeak(null, function(roles, env) {
    const { p } = env.locale;
    const name = (role) => {
        return p(role.details.title) || role.name;
    };
    return _.sortBy(roles, name);
});

const findRoles = memoizeWeak(null, function(roles, user) {
    if (user.role_ids) {
        const hash = _.keyBy(roles, 'id');
        return _.filter(_.map(user.role_ids, (id) => {
            return hash[id];
        }));
    }
});

function extractUsername(text, type) {
    if (/https?:/.test(text)) {
        // remove query string
        text = _.trim(text.replace(/\?.*/, ''));
        let parts = _.filter(text.split('/'));
        return parts[parts.length - 1];
    }
    return text;
}

const component = Relaks.memo(UserSummaryPage);

export {
    component as default,
    component as UserSummaryPage,
};

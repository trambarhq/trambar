import _ from 'lodash';
import React, { useState } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as RoleFinder from 'common/objects/finders/role-finder.mjs';
import * as ServerFinder from 'common/objects/finders/server-finder.mjs';
import * as ServerSaver from 'common/objects/savers/server-saver.mjs';
import { ServerTypes, IntegratedServerTypes } from 'common/objects/types/server-types.mjs';
import * as ServerSettings from 'common/objects/settings/server-settings.mjs';
import * as SystemFinder from 'common/objects/finders/system-finder.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';
import { TaskList } from '../widgets/task-list.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

// custom hooks
import {
    useDraftBuffer,
    useAutogenID,
    useValidation,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './server-summary-page.scss';

async function ServerSummaryPage(props) {
    const { database, serverID } = props;
    const creating = (serverID === 'new');
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const system = await SystemFinder.findSystem(database);
    render();
    const server = (!creating) ? await ServerFinder.findServer(database, serverID) : null;
    render();
    const roles = await RoleFinder.findActiveRoles(database);
    render();

    function render() {
        const sprops = { system, server, roles, creating };
        show(<ServerSummaryPageSync key={serverID} {...sprops} {...props} />);
    }
}

function ServerSummaryPageSync(props) {
    const { system, server, roles, creating } = props;
    const { database, route, env, editing, scrollToTaskID } = props;
    const { t, p, languageCode } = env.locale;
    const availableLanguageCodes = _.get(system, 'settings.input_languages', []);
    const readOnly = !(editing || creating);
    const [ adding, setAdding ] = useState(false);
    const [ credentialsChanged, setCredentialsChanged ] = useState(false);
    const draft = useDraftBuffer({
        original: server || {},
        reset: readOnly,
    });
    const [ error, run ] = useErrorCatcher();
    const [ problems, reportProblems ] = useValidation();
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
        route.push({ serverID: 'new' });
    });
    const handleReturnClick = useListener((evt) => {
        route.push('server-list-page');
    });
    const handleDisableClick = useListener((evt) => {
        run(async () => {
            await confirm(t('server-summary-confirm-disable'));
            await ServerSaver.disableServer(database, server);
            handleReturnClick();
        });
    });
    const handleDeleteClick = useListener((evt) => {
        run(async () => {
            await confirm(t('server-summary-confirm-delete'));
            await ServerSaver.removeServer(database, server);
            handleReturnClick();
        });
    });
    const handleRestoreClick = useListener((evt) => {
        run(async () => {
            await confirm(t('server-summary-confirm-reactivate'));
            await ServerSaver.restoreServer(database, server);
        });
    });
    const handleSaveClick = useListener((evt) => {
        run(async () => {
            try {
                const problems = {};
                if (!draft.get('name')) {
                    problems.name = 'validation-required';
                }
                if (!draft.get('type')) {
                    problems.type = 'validation-required';
                }
                let oauth = draft.get('settings.oauth');
                if (oauth) {
                    if (oauth.client_id && !oauth.client_secret) {
                        problems.client_secret = 'validation-required';
                    }
                    if (!oauth.client_id && oauth.client_secret) {
                        problems.client_id = 'validation-required';
                    }
                    if ((oauth.client_id || oauth.client_secret) && !oauth.base_url) {
                        if (ours.type === 'gitlab') {
                            problems.base_url = 'validation-required';
                        }
                    }
                }
                reportProblems(problems);

                const serverAfter = await ServerSaver.saveServer(database, draft.current);
                if (creating) {
                    setAdding(true);
                }
                warnDataLoss(false);
                route.replace({ editing: undefined, serverID: serverAfter.id });
            } catch (err) {
                if (err.statusCode === 409) {
                    reportProblems({ name: 'validation-duplicate-server-name' });
                } else {
                    throw err;
                }
            }
        });
    });
    const handleAcquireClick = useListener((evt) => {
        const url = database.getOAuthURL(server, 'activation');
        openPopupWindow(url);
    });
    const handleTestClick = useListener((evt) => {
        const url = database.getOAuthURL(server, 'test');
        openPopupWindow(url);
    });
    const [ handleTitleChange, handleNameChange ] = useAutogenID(draft, {
        titleKey: 'details.title',
        nameKey: 'name',
    });
    const handleTypeOptionClick = useListener((evt) => {
        const typeBefore = draft.get('type');
        const type = evt.name;
        draft.set('type', type);

        // derive title from type
        const autoTitleBefore = t(`server-type-${typeBefore}`);
        const autoTitleAfter = t(`server-type-${type}`);
        const title = p(draft.get('details.title'));
        if (!title || title === autoTitleBefore) {
            const titles = _.set({}, languageCode, autoTitleAfter);
            draft.set('details.title', titles);
        }

        // derive name from type
        const autoNameBefore = typeBefore;
        const autoNameAfter = type;
        const name = draft.get('name');
        if (!name || name === autoNameBefore) {
            draft.set('name', autoNameAfter);
        }
    });
    const handleGitlabUserOptionClick = useListener((evt) => {
        const option = _.find(gitlabImportOptions, (option) => {
            return evt.name === `${option.type}-${option.value}`;
        });
        const typeBefore = draft.get(`settings.user.mapping.${option.type}`);
        let type;
        if (option.value && typeBefore !== option.value) {
            type = option.value;
        }
        draft.set(`settings.user.mapping.${option.type}`, type);
    })
    const handleOAuthUserOptionClick = useListener((evt) => {
        const option = _.find(gitlabImportOptions, (option) => {
            return evt.name === `${option.value}`;
        });
        const typeBefore = draft.get('settings.user.type');
        let type;
        if (option.value && typeBefore !== option.value) {
            type = option.value;
        }
        draft.set('settings.user.type', type);
    });
    const handleRoleOptionClick = useListener((evt) => {
        const roleIDsBefore = draft.get('settings.user.role_ids', []);
        const options = getRoleOptions(roles, env);
        const option = _.find(options, { name: evt.name });
        let roleIDs;
        if (option.none) {
            roleIDs = [];
        } else {
            roleIDs = _.toggle(roleIDsBefore, option.value);
        }
        draft.set('settings.user.role_ids', roleIDs);
    });
    const handleWhitelistChange = useListener((evt) => {
        const whitelist = evt.target.value.replace(/\s*[;,]\s*/g, '\n');
        draft.set('settings.user.whitelist', whitelist);
    });
    const handleApiTokenChange = useListener((evt) => {
        const token = evt.target.value;
        draft.set('settings.api.token', token);
    });
    const handleOAuthURLChange = useListener((evt) => {
        const url = evt.target.value;
        draft.set('settings.oauth.base_url', url);

        // make sure the URL isn't localhost, which points to the Docker container
        let newProblems;
        if (/https?:\/\/localhost\b/.test(url)) {
            newProblems = { ...problems, base_url: 'validation-localhost-is-wrong' };
        } else {
            newProblems = _.omit(problems, 'base_url');
        }
        setProblems(newProblems);
    });
    const handleOAuthIDChange = useListener((evt) => {
        const id = evt.target.value;
        draft.set('settings.oauth.client_id', id);
    });
    const handleOAuthSecretChange = useListener((evt) => {
        const secret = evt.target.value;
        draft.set('settings.oauth.client_secret', secret);
    });
    const handleTaskSelectionClear = useListener(() => {
        // TODO
    });

    warnDataLoss(draft.changed);

    let title = p(draft.get('details.title'));
    const type = draft.get('type');
    if (!title && type) {
        title = t(`server-type-${type}`);
    }
    return (
        <div className="server-summary-page">
            {renderButtons()}
            <h2>{t('server-summary-member-$name', title)}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderInstructions()}
            {renderTaskList()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        if (readOnly) {
            const active = (server) ? !server.deleted && !server.disabled : true;
            const hasIntegration = _.includes(IntegratedServerTypes, _.get(server, 'type'));
            const hasAccessToken = !!_.get(server, 'settings.api.access_token');
            const hasOAuthCredentials = !!(_.get(server, 'settings.oauth.client_id') && _.get(server, 'settings.oauth.client_secret'));
            let preselected, alert;
            if (active) {
                if (hasIntegration && !hasAccessToken && hasOAuthCredentials) {
                    preselected = 'acquire';
                    alert = true;
                } else if (hasOAuthCredentials && credentialsChanged) {
                    preselected = 'test';
                } else {
                    preselected = (adding) ? 'add' : 'return';
                }
            } else {
                preselected = 'reactivate';
            }
            return (
                <div key="view" className="buttons">
                    <ComboButton preselected={preselected} alert={alert}>
                        <option name="return" onClick={handleReturnClick}>
                            {t('server-summary-return')}
                        </option>
                        <option name="add" onClick={handleAddClick}>
                            {t('server-summary-add')}
                        </option>
                        <option name="acquire" disabled={!active || !hasIntegration} separator onClick={handleAcquireClick}>
                            {t('server-summary-acquire')}
                        </option>
                        <option name="test" disabled={!active || !hasOAuthCredentials} onClick={handleTestClick}>
                            {t('server-summary-test-oauth')}
                        </option>
                        <option name="disable" disabled={!active} separator onClick={handleDisableClick}>
                            {t('server-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={handleDeleteClick}>
                            {t('server-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={handleRestoreClick}>
                            {t('server-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={handleEditClick}>
                        {t('server-summary-edit')}
                    </PushButton>
                </div>
            );
        } else {
            const { changed } = draft;
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={handleCancelClick}>
                        {t('server-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
                        {t('server-summary-save')}
                    </PushButton>
                </div>
            );
        }
    }

    function renderForm() {
        return (
            <div className="form">
                {renderTypeSelector()}
                {renderTitleInput()}
                {renderNameInput()}
                {renderUserOptions()}
                {renderWhitelist()}
                {renderRoleSelector()}
                {renderSiteURL()}
                {renderOAuthCallbackURL()}
                {renderDeauthorizeCallbackURL()}
                {renderPrivacyPolicyURL()}
                {renderTermsAndConditionsURL()}
                {renderGitlabURLInput()}
                {renderOAuthClientIDInput()}
                {renderOAuthClientSecretInput()}
                {renderAPIStatus()}
            </div>
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
                    {t('server-summary-type')}
                    <InputError>{t(problems.type)}</InputError>
                </label>
                {_.map(ServerTypes, renderServerType)}
            </OptionList>
        );
    }

    function renderServerType(type, i) {
        const typeCurr = draft.getCurrent('type', 'current');
        const typePrev = draft.getOriginal('type', 'original');
        const props = {
            name: type,
            selected: typeCurr === type,
            previous: typePrev === type,
        };
        let icon;
        switch (type) {
            case 'facebook':
                icon = 'facebook-official';
                break;
            default:
                icon = type;
        }
        return (
            <option key={i} {...props}>
                <i className={`fa fa-${icon} fa-fw`} key={0}/>
                {' '}
                {t(`server-type-${type}`)}
            </option>
        );
    }

    function renderTitleInput() {
        const props = {
            id: 'title',
            value: draft.get('details.title'),
            availableLanguageCodes,
            readOnly,
            env,
            onChange: handleTitleChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('server-summary-title')}
            </MultilingualTextField>
        );
    }

    function renderNameInput() {
        const props = {
            id: 'name',
            value: draft.get('name'),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleNameChange,
        };
        return (
            <TextField {...props}>
                {t('server-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    }

    function renderUserOptions() {
        const serverType = draft.get('type');
        switch (serverType) {
            case 'gitlab': return renderGitlabUserOptions();
            default: return renderOAuthUserOptions();
        }
    }

    function renderGitlabUserOptions() {
        const listProps = {
            readOnly,
            onOptionClick: handleGitlabUserOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('server-summary-new-users')}</label>
                {_.map(gitlabImportOptions, renderGitlabUserOption)}
            </OptionList>
        );
    }

    function renderGitlabUserOption(option, i) {
        const typeCurr = draft.getCurrent(`settings.user.mapping.${option.type}`, null);
        const typePrev = draft.getOriginal(`settings.user.mapping.${option.type}`, null);
        const props = {
            name: `${option.type}-${option.value}`,
            selected: typeCurr === option.value,
            previous: (!creating) ? typePrev === option.value : undefined,
        };
        let label;
        if (option.label instanceof Array) {
            label = (
                <span>
                    {t(option.label[0])}
                    {' '}
                    <i className="fa fa-arrow-right" />
                    {' '}
                    {t(option.label[1])}
                </span>
            );
        } else {
            label = t(option.label);
        }
        return <option key={i} {...props}>{label}</option>;
    }

    function renderOAuthUserOptions() {
        const listProps = {
            readOnly,
            onOptionClick: handleOAuthUserOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('server-summary-new-users')}</label>
                {_.map(oauthImportOptions, renderOAuthUserOption)}
            </OptionList>
        );
    }

    function renderOAuthUserOption(option, i) {
        const typeCurr = draft.getCurrent('settings.user.type', null);
        const typePrev = draft.getOriginal('settings.user.type', null);
        const props = {
            name: `${option.value}`,
            selected: typeCurr === option.value,
            previous: (!creating) ? typePrev === option.value : undefined,
        };
        let label;
        if (option.label instanceof Array) {
            label = (
                <span>
                    {t(option.label[0])}
                    {' '}
                    <i className="fa fa-arrow-right" />
                    {' '}
                    {t(option.label[1])}
                </span>
            );
        } else {
            label = t(option.label);
        }
        return <option key={i} {...props}>{label}</option>;
    }

    function renderWhitelist() {
        const serverType = draft.get('type');
        if (serverType === 'gitlab') {
            return null;
        }
        const userType = draft.get('settings.user.type', '');
        if (!userType) {
            return null;
        }
        let props = {
            id: 'whitelist',
            value: draft.get('settings.user.whitelist'),
            type: 'textarea',
            spellCheck: false,
            readOnly,
            env,
            onChange: handleWhitelistChange,
        };
        return <TextField {...props}>{t('server-summary-whitelist')}</TextField>;
    }

    function renderRoleSelector() {
        const listProps = {
            readOnly,
            onOptionClick: handleRoleOptionClick,
        };
        const options = getRoleOptions(roles, env);
        return (
            <OptionList {...listProps}>
                <label>{t('server-summary-roles')}</label>
                {_.map(options, renderRoleOption)}
            </OptionList>
        );
    }

    function renderRoleOption(option, i) {
        const rolesCurr = draft.getCurrent('settings.user.role_ids', []);
        const rolesPrev = draft.getOriginal('settings.user.role_ids', []);
        const setCurr = (option.none) ? _.isEmpty(rolesCurr) : _.includes(rolesCurr, option.value);
        const setPrev = (option.none) ? _.isEmpty(rolesPrev) : _.includes(rolesPrev, option.value);
        const props = {
            name: option.name,
            selected: setCurr,
            previous: (!creating) ? setPrev : undefined,
        };
        let label;
        if (option.label instanceof Array) {
            label = (
                <span>
                    {t(option.label[0])}
                    {' '}
                    <i className="fa fa-arrow-right" />
                    {' '}
                    {option.label[1]}
                </span>
            );
        } else {
            label = t(option.label);
        }
        return <option key={i} {...props}>{label}</option>;
    }

    function renderSiteURL() {
        let address = _.get(system, 'settings.address');
        let warning;
        if (!address) {
            if (system) {
                warning = t('server-summary-system-address-missing');
            }
            address = window.location.origin;
        }
        const props = {
            id: 'oauth_callback',
            value: address,
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('server-summary-oauth-site-url')}
                <InputError type="warning">{warning}</InputError>
            </TextField>
        );
    }

    function renderOAuthCallbackURL() {
        const type = draft.get('type');
        let address = _.get(system, 'settings.address');
        if (!address) {
            address = window.location.origin;
        }
        address = _.trimEnd(address, '/');
        const url = `${address}/srv/session/${type || '...'}/callback/`;
        const props = {
            id: 'oauth_callback',
            value: url,
            readOnly: true,
            env,
        };
        const variants = {
            dropbox: 'redirect-uri',
            facebook: 'redirect-uri',
            gitlab: 'redirect-uri',
            google: 'redirect-uri',
        };
        const phrase = `server-summary-oauth-${variants[type] || 'redirect-url'}`;
        return <TextField {...props}>{t(phrase)}</TextField>;
    }

    function renderDeauthorizeCallbackURL() {
        const type = draft.get('type');
        const needed = [ 'facebook' ];
        if (!_.includes(needed, type)) {
            return null;
        }
        const address = _.get(system, 'settings.address', window.location.origin);
        const url = `${address}/srv/session/${type || '...'}/deauthorize/`;
        const props = {
            id: 'deauthize_callback',
            value: url,
            readOnly: true,
            env,
        };
        return <TextField {...props}>{t('server-summary-oauth-deauthorize-callback-url')}</TextField>;
    }

    function renderPrivacyPolicyURL() {
        const type = draft.get('type');
        const needed = [ 'facebook', 'google', 'windows' ];
        if (!_.includes(needed, type)) {
            return null;
        }
        let warning;
        let address = _.get(system, 'settings.address');
        if (!address) {
            warning = t('server-summary-system-address-missing');
            address = window.location.origin;
        }
        const url = `${address}/srv/session/privacy/`;
        const props = {
            id: 'oauth_privacy',
            value: url,
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('server-summary-privacy-policy-url')}
                <InputError type="warning">{warning}</InputError>
            </TextField>
        );
    }

    function renderTermsAndConditionsURL() {
        const type = draft.get('type');
        const needed = [ 'facebook', 'google', 'windows' ];
        if (!_.includes(needed, type)) {
            return null;
        }
        let warning;
        let address = _.get(system, 'settings.address');
        if (!address) {
            warning = t('server-summary-system-address-missing');
            address = window.location.origin;
        }
        const url = `${address}/srv/session/terms/`;
        const props = {
            id: 'oauth_terms',
            value: url,
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('server-summary-terms-and-conditions-url')}
                <InputError type="warning">{warning}</InputError>
            </TextField>
        );
    }

    function renderGitlabURLInput() {
        const type = draft.get('type');
        const props = {
            id: 'oauth_token',
            type: 'url',
            value: draft.get('settings.oauth.base_url'),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleOAuthURLChange,
        };
        return (
            <CollapsibleContainer open={type === 'gitlab'}>
                <TextField {...props}>
                    {t('server-summary-oauth-gitlab-url')}
                    <InputError>{t(problems.base_url)}</InputError>
                </TextField>
            </CollapsibleContainer>
        );
    }

    function renderOAuthClientIDInput() {
        const type = draft.get('type');
        const props = {
            id: 'oauth_id',
            value: draft.get('settings.oauth.client_id'),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleOAuthIDChange,
        };
        const variants = {
            dropbox: 'app-key',
            facebook: 'app-id',
            gitlab: 'application-id',
            windows: 'application-id',
        };
        const phrase = `server-summary-oauth-${variants[type] || 'client-id'}`;
        return (
            <TextField {...props}>
                {t(phrase)}
                <InputError>{t(problems.client_id)}</InputError>
            </TextField>
        );
    }

    function renderOAuthClientSecretInput() {
        const type = draft.get('type');
        const props = {
            id: 'oauth_secret',
            value: draft.get('settings.oauth.client_secret'),
            spellCheck: false,
            readOnly,
            env,
            onChange: handleOAuthSecretChange,
        };
        const variants = {
            dropbox: 'app-secret',
            facebook: 'app-secret',
            gitlab: 'application-secret',
            windows: 'application-secret',
        };
        const phrase = `server-summary-oauth-${variants[type] || 'client-secret'}`;
        return (
            <TextField {...props}>
                {t(phrase)}
                <InputError>{t(problems.client_secret)}</InputError>
            </TextField>
        );
    }

    function renderAPIStatus() {
        const type = draft.get('type');
        let apiAccess;
        if (_.includes(IntegratedServerTypes, type)) {
            let token = draft.get('settings.api.access_token');
            if (token) {
                apiAccess = t('server-summary-api-access-acquired');
            } else {
                apiAccess = t('server-summary-api-access-pending');
            }
        } else {
            apiAccess = t('server-summary-api-access-not-applicable');
        }
        const props = {
            id: 'access',
            value: apiAccess,
            readOnly: true,
            env,
        };
        return <TextField {...props}>{t('server-summary-api-access')}</TextField>;
    }

    function renderInstructions() {
        const type = draft.get('type');
        const instructionProps = {
            folder: 'server',
            topic: 'server-summary' + (type ? `-${type}` : ''),
            hidden: readOnly,
            env,
        };
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    function renderTaskList() {
        if (!server) {
            return null;
        }
        const hasIntegration = _.includes(IntegratedServerTypes, server.type);
        if (!hasIntegration) {
            return null;
        }
        const historyProps = {
            server,
            database,
            env,
            scrollToTaskID,
            onSelectionClear: handleTaskSelectionClear,
        };
        return (
            <div className="task-history">
                <h2>{t('server-summary-activities')}</h2>
                <ErrorBoundary env={env}>
                    <TaskList {...historyProps} />
                </ErrorBoundary>
            </div>
        );
    }
}

const gitlabImportOptions = [
    {
        type: 'admin',
        label: 'server-summary-user-import-gitlab-admin-disabled',
        value: null,
    },
    {
        type: 'admin',
        label: [ 'server-summary-gitlab-admin', 'server-summary-user-type-admin' ],
        value: 'admin',
    },
    {
        type: 'admin',
        label: [ 'server-summary-gitlab-admin', 'server-summary-user-type-moderator' ],
        value: 'moderator',
    },
    {
        type: 'admin',
        label: [ 'server-summary-gitlab-admin', 'server-summary-user-type-regular' ],
        value: 'regular',
    },
    {
        type: 'user',
        label: 'server-summary-user-import-gitlab-user-disabled',
        value: null,
    },
    {
        type: 'user',
        label: [ 'server-summary-gitlab-regular-user', 'server-summary-user-type-moderator' ],
        value: 'moderator',
    },
    {
        type: 'user',
        label: [ 'server-summary-gitlab-regular-user', 'server-summary-user-type-regular' ],
        value: 'regular',
    },
    {
        type: 'user',
        label: [ 'server-summary-gitlab-regular-user', 'server-summary-user-type-guest' ],
        value: 'guest',
    },
    {
        type: 'external_user',
        label: 'server-summary-user-import-gitlab-external-user-disabled',
        value: null,
    },
    {
        type: 'external_user',
        label: [ 'server-summary-gitlab-external-user', 'server-summary-user-type-regular' ],
        value: 'regular',
    },
    {
        type: 'external_user',
        label: [ 'server-summary-gitlab-external-user', 'server-summary-user-type-guest' ],
        value: 'guest',
    },
];

const oauthImportOptions = [
    {
        label: 'server-summary-user-import-disabled',
        value: null,
    },
    {
        label: [ 'server-summary-new-user', 'server-summary-user-type-regular' ],
        value: 'regular',
    },
    {
        label: [ 'server-summary-new-user', 'server-summary-user-type-guest' ],
        value: 'guest',
    },
];

function getRoleOptions(roles, env) {
    const { p } = env.locale;
    const sorted = sortRoles(roles, env);
    const options = _.map(sorted, (role) => {
        const name = p(role.details.title) || p.name;
        return {
            name: `role-${role.id}`,
            value: role.id,
            label: [ 'server-summary-new-user', name ],
        };
    });
    options.unshift({
        name: `role-null`,
        none: true,
        label: 'server-summary-role-none'
    });
    return options;
}

const sortRoles = memoizeWeak(null, function(roles, env) {
    const { p } = env.locale;
    const name = (role) => {
        return p(role.details.title) || role.name;
    };
    return _.sortBy(roles, name);
});

function openPopupWindow(url) {
    const width = 800;
    const height = 600;
    const { screenLeft, screenTop, outerWidth, outerHeight } = window;
    const options = {
        width,
        height,
        left: screenLeft + Math.round((outerWidth - width) / 2),
        top: screenTop + Math.round((outerHeight - height) / 2),
        toolbar: 'no',
        menubar: 'no',
        status: 'no',
    };
    const pairs = _.map(options, (value, name) => {
        return `${name}=${value}`;
    });
    window.open(url, 'api-access-oauth', pairs.join(','));
}

const component = Relaks.memo(ServerSummaryPage);

export {
    component as default,
    component as ServerSummaryPage,
};

import _ from 'lodash';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import { AsyncComponent } from 'relaks';
import { memoizeWeak } from 'utils/memoize';
import ComponentRefs from 'utils/component-refs';
import * as RoleFinder from 'objects/finders/role-finder';
import * as ServerFinder from 'objects/finders/server-finder';
import { ServerTypes, IntegratedServerTypes } from 'objects/types/server-types';
import * as ServerSettings from 'objects/settings/server-settings';
import * as SystemFinder from 'objects/finders/system-finder';
import * as SlugGenerator from 'utils/slug-generator';

// widgets
import PushButton from 'widgets/push-button';
import ComboButton from 'widgets/combo-button';
import InstructionBlock from 'widgets/instruction-block';
import TextField from 'widgets/text-field';
import MultilingualTextField from 'widgets/multilingual-text-field';
import OptionList from 'widgets/option-list';
import CollapsibleContainer from 'widgets/collapsible-container';
import TaskList from 'widgets/task-list';
import InputError from 'widgets/input-error';
import ActionConfirmation from 'widgets/action-confirmation';
import DataLossWarning from 'widgets/data-loss-warning';
import UnexpectedError from 'widgets/unexpected-error';
import ErrorBoundary from 'widgets/error-boundary';

import './server-summary-page.scss';

/**
 * Asynchronous component that retrieves data needed by the Server Summary page.
 *
 * @extends AsyncComponent
 */
class ServerSummaryPage extends AsyncComponent {
    static displayName = 'ServerSummaryPage';

    /**
     * Render the component asynchronously
     *
     * @param  {Meanwhile} meanwhile
     *
     * @return {Promise<ReactElement>}
     */
    async renderAsync(meanwhile) {
        let { database, route, env } = this.props;
        let { serverID, editing, scrollToTaskID } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let creating = (serverID === 'new');
        let props = {
            database,
            route,
            env,
            editing: editing || creating,
            creating,
            scrollToTaskID,
        };
        meanwhile.show(<ServerSummaryPageSync {...props} />);
        let currentUserID = await db.start();
        props.system = await SystemFinder.findSystem(db);
        if (!creating) {
            props.server = await ServerFinder.findServer(db, serverID)
        }
        meanwhile.show(<ServerSummaryPageSync {...props} />);
        props.roles = await RoleFinder.findActiveRoles(db);
        return <ServerSummaryPageSync {...props} />;
    }
}

/**
 * Synchronous component that actually renders the Server Summary page.
 *
 * @extends PureComponent
 */
class ServerSummaryPageSync extends PureComponent {
    static displayName = 'ServerSummaryPageSync';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            confirmation: ActionConfirmation
        });
        this.state = {
            newServer: null,
            hasChanges: false,
            saving: false,
            adding: false,
            credentialsChanged: false,
            problems: {},
        };
    }

    /**
     * Reset edit state when edit ends
     *
     * @param  {Object} props
     * @param  {Object} state
     */
    static getDerivedStateFromProps(props, state) {
        let { editing } = props;
        if (!editing) {
            return {
                newServer: null,
                hasChanges: false,
                problems: {},
            };
        }
        return null;
    }

    /**
     * Return edited copy of server object or the original object
     *
     * @param  {String} state
     *
     * @return {Object}
     */
    getServer(state) {
        let { server } = this.props;
        let { newServer } = this.state;
        if (!state || state === 'current') {
            return newServer || server || emptyServer;
        } else {
            return server || emptyServer;
        }
    }

    /**
     * Return a property of the server object
     *
     * @param  {String} path
     * @param  {String} state
     *
     * @return {*}
     */
    getServerProperty(path, state) {
        let server = this.getServer(state);
        return _.get(server, path);
    }

    /**
     * Modify a property of the server object
     *
     * @param  {String} path
     * @param  {*} value
     */
    setServerProperty(path, value) {
        let { env, server } = this.props;
        let { t, p, languageCode } = env.locale;
        let newServer = this.getServer();
        let newServerAfter = _.decoupleSet(newServer, path, value);
        if (path === 'type') {
            // derive title from type
            let autoTitleBefore = t(`server-type-${newServer.type}`);
            let autoTitleAfter = t(`server-type-${newServerAfter.type}`);
            let title = p(newServer.details.title);
            if (!title || title === autoTitleBefore) {
                newServerAfter = _.decoupleSet(newServerAfter, `details.title.${languageCode}`, autoTitleAfter);
            }
        }
        if (path === 'details.title' || path === 'type') {
            // derive name from title
            let autoNameBefore = SlugGenerator.fromTitle(newServer.details.title);
            let autoNameAfter = SlugGenerator.fromTitle(newServerAfter.details.title);
            if (!newServer.name || newServer.name === autoNameBefore) {
                newServerAfter.name = autoNameAfter;
            }
        }
        if (path === 'settings.user.type') {
            if (!value) {
                newServerAfter = _.decoupleSet(newServerAfter, 'settings.user.role_ids', undefined);
            }
        }
        if(_.size(newServerAfter.name) > 128) {
            newServerAfter.name = newServerAfter.name.substr(0, 128);
        }
        let hasChanges = true;
        if (_.isEqual(newServerAfter, server)) {
            newServerAfter = null;
            hasChanges = false;
        }
        this.setState({ newServer: newServerAfter, hasChanges });
    }

    /**
     * Look for problems in server object
     *
     * @return {Object}
     */
    findProblems() {
        let problems = {};
        let newServer = this.getServer();
        if (!newServer.name) {
            problems.name = 'validation-required';
        }
        if (!newServer.type) {
            problems.type = 'validation-required';
        }
        let oauth = newServer.settings.oauth;
        if (oauth) {
            if (oauth.client_id && !oauth.client_secret) {
                problems.client_secret = 'validation-required';
            }
            if (!oauth.client_id && oauth.client_secret) {
                problems.client_id = 'validation-required';
            }
            if ((oauth.client_id || oauth.client_secret) && !oauth.base_url) {
                if (newServer.type === 'gitlab') {
                    problems.base_url = 'validation-required';
                }
            }
        }
        return problems;
    }

    /**
     * Change editability of page
     *
     * @param  {Boolean} edit
     * @param  {Object}  newServer
     *
     * @return {Promise}
     */
    setEditability(edit, newServer) {
        let { route, creating } = this.props;
        if (creating && !edit && !newServer) {
            // return to list when cancelling server creation
            return this.returnToList();
        } else {
            let params = _.clone(route.params);
            params.editing = edit || undefined;
            if (newServer) {
                // use id of newly created server
                params.serverID = newServer.id;
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
        return route.push('server-list-page');
    }

    /**
     * Start creating a new role
     *
     * @return {Promise}
     */
    startNew() {
        let { route } = this.props;
        let params = _.clone(route.params);
        params.serverID = 'new';
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
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { route, env } = this.props;
        let { hasChanges, problems } = this.state;
        let { setters } = this.components;
        let { t, p } = env.locale;
        let server = this.getServer();
        let title = p(_.get(server, 'details.title'));
        if (!title && server.type) {
            title = t(`server-type-${server.type}`);
        }
        return (
            <div className="server-summary-page">
                {this.renderButtons()}
                <h2>{t('server-summary-member-$name', title)}</h2>
                <UnexpectedError>{problems.unexpected}</UnexpectedError>
                {this.renderForm()}
                {this.renderInstructions()}
                {this.renderTaskList()}
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
        let { env, editing } = this.props;
        let { hasChanges, adding, credentialsChanged } = this.state;
        let { t } = env.locale;
        if (editing) {
            return (
                <div key="edit" className="buttons">
                    <PushButton onClick={this.handleCancelClick}>
                        {t('server-summary-cancel')}
                    </PushButton>
                    {' '}
                    <PushButton className="emphasis" disabled={!hasChanges} onClick={this.handleSaveClick}>
                        {t('server-summary-save')}
                    </PushButton>
                </div>
            );
        } else {
            let server = this.getServer();
            let active = !server.deleted && !server.disabled;
            let hasIntegration = _.includes(IntegratedServerTypes, server.type);
            let hasAccessToken = !!_.get(server, 'settings.api.access_token');
            let hasOAuthCredentials = !!(_.get(server, 'settings.oauth.client_id') && _.get(server, 'settings.oauth.client_secret'));
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
                        <option name="return" onClick={this.handleReturnClick}>
                            {t('server-summary-return')}
                        </option>
                        <option name="add" onClick={this.handleAddClick}>
                            {t('server-summary-add')}
                        </option>
                        <option name="acquire" disabled={!active || !hasIntegration} separator onClick={this.handleAcquireClick}>
                            {t('server-summary-acquire')}
                        </option>
                        <option name="test" disabled={!active || !hasOAuthCredentials} onClick={this.handleTestClick}>
                            {t('server-summary-test-oauth')}
                        </option>
                        <option name="disable" disabled={!active} separator onClick={this.handleDisableClick}>
                            {t('server-summary-disable')}
                        </option>
                        <option name="delete" disabled={!active} onClick={this.handleDeleteClick}>
                            {t('server-summary-delete')}
                        </option>
                        <option name="reactivate" hidden={active} onClick={this.handleReactivateClick}>
                            {t('server-summary-reactivate')}
                        </option>
                    </ComboButton>
                    {' '}
                    <PushButton className="emphasis" onClick={this.handleEditClick}>
                        {t('server-summary-edit')}
                    </PushButton>
                </div>
            );
        }
    }

    /**
     * Render form for entering server details
     *
     * @return {ReactElement}
     */
    renderForm() {
        return (
            <div className="form">
                {this.renderTypeSelector()}
                {this.renderTitleInput()}
                {this.renderNameInput()}
                {this.renderUserOptions()}
                {this.renderWhitelist()}
                {this.renderRoleSelector()}
                {this.renderSiteURL()}
                {this.renderOAuthCallbackURL()}
                {this.renderDeauthorizeCallbackURL()}
                {this.renderPrivacyPolicyURL()}
                {this.renderTermsAndConditionsURL()}
                {this.renderGitlabURLInput()}
                {this.renderOAuthClientIDInput()}
                {this.renderOAuthClientSecretInput()}
                {this.renderAPIStatus()}
            </div>
        );
    }

    /**
     * Render type selector
     *
     * @return {ReactElement}
     */
    renderTypeSelector() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let typeCurr = this.getServerProperty('type', 'current');
        let typePrev = this.getServerProperty('type', 'original');
        let optionProps = _.map(ServerTypes, (type) => {
            let icon = getServerIcon(type);
            return {
                name: type,
                selected: typeCurr === type,
                previous: typePrev === type,
                children: [
                    <i className={`fa fa-${icon} fa-fw`} key={0}/>,
                    ' ',
                    t(`server-type-${type}`)
                ],
            };
        });
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleTypeOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('server-summary-type')}
                    <InputError>{t(problems.type)}</InputError>
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
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
            value: this.getServerProperty('details.title'),
            availableLanguageCodes: this.getInputLanguages(),
            readOnly: !editing,
            env,
            onChange: this.handleTitleChange,
        };
        return (
            <MultilingualTextField {...props}>
                {t('server-summary-title')}
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
            value: this.getServerProperty('name'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleNameChange,
        };
        return (
            <TextField {...props}>
                {t('server-summary-name')}
                <InputError>{t(problems.name)}</InputError>
            </TextField>
        );
    }

    /**
     * Render user creation options
     *
     * @return {ReactElement}
     */
    renderUserOptions() {
        let serverType = this.getServerProperty('type');
        switch (serverType) {
            case 'gitlab': return this.renderGitlabUserOptions();
            default: return this.renderOAuthUserOptions();
        }
    }

    /**
     * Render user creation options for Gitlab
     *
     * @return {ReactElement}
     */
    renderGitlabUserOptions() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let userOptsCurr = this.getServerProperty('settings.user', 'current') || {};
        let userOptsPrev = this.getServerProperty('settings.user', 'original') || {};
        let newServer = !!this.getServerProperty('id');
        let optionProps = [
            {
                name: 'import-admin-disabled',
                selected: !_.get(userOptsCurr, 'mapping.admin'),
                previous: (newServer) ? !_.get(userOptsPrev, 'mapping.admin') : undefined,
                children: t('server-summary-user-import-gitlab-admin-disabled')
            },
            {
                name: 'import-admin-as-admin',
                selected: _.get(userOptsCurr, 'mapping.admin') === 'admin',
                previous: _.get(userOptsPrev, 'mapping.admin') === 'admin',
                children: <span>{t('server-summary-gitlab-admin')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-admin`)}</span>
            },
            {
                name: 'import-admin-as-moderator',
                selected: _.get(userOptsCurr, 'mapping.admin') === 'moderator',
                previous: _.get(userOptsPrev, 'mapping.admin') === 'moderator',
                children: <span>{t('server-summary-gitlab-admin')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-moderator`)}</span>
            },
            {
                name: 'import-admin-as-regular-user',
                selected: _.get(userOptsCurr, 'mapping.admin') === 'regular',
                previous: _.get(userOptsPrev, 'mapping.admin') === 'regular',
                children: <span>{t('server-summary-gitlab-admin')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-regular`)}</span>
            },
            {
                name: 'import-user-disabled',
                selected: !_.get(userOptsCurr, 'mapping.user'),
                previous: (newServer) ? !_.get(userOptsPrev, 'mapping.user') : undefined,
                children: t('server-summary-user-import-gitlab-user-disabled')
            },
            {
                name: 'import-user-as-moderator',
                selected: _.get(userOptsCurr, 'mapping.user') === 'moderator',
                previous: _.get(userOptsPrev, 'mapping.user') === 'moderator',
                children: <span>{t('server-summary-gitlab-regular-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-moderator`)}</span>
            },
            {
                name: 'import-user-as-regular-user',
                selected: _.get(userOptsCurr, 'mapping.user') === 'regular',
                previous: _.get(userOptsPrev, 'mapping.user') === 'regular',
                children: <span>{t('server-summary-gitlab-regular-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-regular`)}</span>
            },
            {
                name: 'import-user-as-guest',
                selected: _.get(userOptsCurr, 'mapping.user') === 'guest',
                previous: _.get(userOptsPrev, 'mapping.user') === 'guest',
                children: <span>{t('server-summary-gitlab-regular-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-guest`)}</span>
            },
            {
                name: 'import-external-user-disabled',
                selected: !_.get(userOptsCurr, 'mapping.external_user'),
                previous: (newServer) ? !_.get(userOptsPrev, 'mapping.external_user') : undefined,
                children: t('server-summary-user-import-gitlab-external-user-disabled')
            },
            {
                name: 'import-external-user-as-regular-user',
                selected: _.get(userOptsCurr, 'mapping.external_user') === 'regular',
                previous: _.get(userOptsPrev, 'mapping.external_user') === 'regular',
                children: <span>{t('server-summary-gitlab-external-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-regular`)}</span>
            },
            {
                name: 'import-external-user-as-guest',
                selected: _.get(userOptsCurr, 'mapping.external_user') === 'guest',
                previous: _.get(userOptsPrev, 'mapping.external_user') === 'guest',
                children: <span>{t('server-summary-gitlab-external-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-guest`)}</span>
            },
        ];
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleGitlabUserOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('server-summary-new-users')}
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render user creation options for basic OAuth provider
     *
     * @return {ReactElement}
     */
    renderOAuthUserOptions() {
        let { env, editing } = this.props;
        let { t } = env.locale;
        let userOptsCurr = this.getServerProperty('settings.user', 'current') || {};
        let userOptsPrev = this.getServerProperty('settings.user', 'original') || {};
        let newServer = !!this.getServerProperty('id');
        let optionProps = [
            {
                name: 'import-disabled',
                selected: !userOptsCurr.type,
                previous: (newServer) ? !userOptsPrev.type : undefined,
                children: t('server-summary-user-import-disabled')
            },
            {
                name: 'import-user-as-guest',
                selected: userOptsCurr.type === 'guest',
                previous: userOptsPrev.type === 'guest',
                children: <span>{t('server-summary-new-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-guest`)}</span>
            },
            {
                name: 'import-user-as-regular-user',
                selected: userOptsCurr.type === 'regular',
                previous: userOptsPrev.type === 'regular',
                children: <span>{t('server-summary-new-user')} <i className="fa fa-arrow-right" /> {t(`server-summary-user-type-regular`)}</span>
            },
        ];
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleOAuthUserOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>
                    {t('server-summary-new-users')}
                </label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        );
    }

    /**
     * Render user white list
     *
     * @return {ReactElement}
     */
    renderWhitelist() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let serverType = this.getServerProperty('type');
        if (serverType === 'gitlab') {
            return null;
        }
        let userOpts = this.getServerProperty('settings.user', 'current') || {};
        if (!userOpts.type) {
            return null;
        }
        let props = {
            id: 'whitelist',
            value: this.getServerProperty('settings.user.whitelist'),
            readOnly: !editing,
            type: 'textarea',
            spellCheck: false,
            env,
            onChange: this.handleWhitelistChange,
        };
        return (
            <TextField {...props}>
                {t('server-summary-whitelist')}
            </TextField>
        );
    }

    /**
     * Render role selector
     *
     * @return {ReactElement}
     */
    renderRoleSelector() {
        let { env, roles, editing } = this.props;
        let { t, p } = env.locale;
        let userRolesCurr = this.getServerProperty('settings.user.role_ids', 'current') || [];
        let userRolesPrev = this.getServerProperty('settings.user.role_ids', 'original') || [];
        let newServer = !!this.getServerProperty('id');
        roles = sortRoles(roles, env);
        let optionProps = _.map(roles, (role) => {
            let name = p(role.details.title) || p.name;
            return {
                name: String(role.id),
                selected: _.includes(userRolesCurr, role.id),
                previous: _.includes(userRolesPrev, role.id),
                children: <span>{t('server-summary-new-user')} <i className="fa fa-arrow-right" /> {name}</span>
            };
        });
        optionProps.unshift({
            name: 'none',
            selected: _.isEmpty(userRolesCurr),
            previous: (newServer) ? _.isEmpty(userRolesPrev) : undefined,
            children: t('server-summary-role-none')
        });
        let listProps = {
            readOnly: !editing,
            onOptionClick: this.handleRoleOptionClick,
        };
        return (
            <OptionList {...listProps}>
                <label>{t('server-summary-roles')}</label>
                {_.map(optionProps, (props, i) => <option key={i} {...props} /> )}
            </OptionList>
        )
    }

    /**
     * Render read-only input for site URL
     *
     * @return {ReactElement}
     */
    renderSiteURL() {
        let { env, system } = this.props;
        let { t } = env.locale;
        let address = _.get(system, 'settings.address');
        let warning;
        if (!address) {
            if (system) {
                warning = t('server-summary-system-address-missing');
            }
            address = window.location.origin;
        }
        let props = {
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

    /**
     * Render read-only input for OAuth callback URL
     *
     * @return {ReactElement|null}
     */
    renderOAuthCallbackURL() {
        let { env, system } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let serverType = this.getServerProperty('type');
        let address = _.get(system, 'settings.address');
        if (!address) {
            address = window.location.origin;
        }
        let url = `${address}/srv/session/${serverType || '...'}/callback/`;
        let props = {
            id: 'oauth_callback',
            value: url,
            readOnly: true,
            env,
        };
        let phrase = 'server-summary-oauth-callback-url';
        switch (serverType) {
            case 'dropbox':
                phrase = 'server-summary-oauth-redirect-uri';
                break;
            case 'facebook':
                phrase = 'server-summary-oauth-redirect-uri';
                break;
            case 'github':
                phrase = 'server-summary-oauth-callback-url';
                break;
            case 'gitlab':
                phrase = 'server-summary-oauth-redirect-uri';
                break;
            case 'google':
                phrase = 'server-summary-oauth-redirect-uri';
                break;
            case 'windows':
                phrase = 'server-summary-oauth-redirect-url';
                break;
        }
        return (
            <TextField {...props}>
                {t(phrase)}
            </TextField>
        );
    }

    /**
     * Render read-only input for deauthorize callback URL
     *
     * @return {ReactElement|null}
     */
    renderDeauthorizeCallbackURL() {
        let { env, system } = this.props;
        let { t } = env.locale;
        let serverType = this.getServerProperty('type');
        let needed = [ 'facebook' ];
        if (!_.includes(needed, serverType)) {
            return null;
        }
        let address = _.get(system, 'settings.address');
        if (!address) {
            address = window.location.origin;
        }
        let url = `${address}/srv/session/${serverType || '...'}/deauthorize/`;
        let props = {
            id: 'deauthize_callback',
            value: url,
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('server-summary-oauth-deauthorize-callback-url')}
            </TextField>
        );
    }

    /**
     * Render read-only input for generic privacy policy URL
     *
     * @return {ReactElement|null}
     */
    renderPrivacyPolicyURL() {
        let { env, system } = this.props;
        let { t } = env.locale;
        let serverType = this.getServerProperty('type');
        let needed = [ 'facebook', 'google', 'windows' ];
        if (!_.includes(needed, serverType)) {
            return null;
        }
        let warning;
        let address = _.get(system, 'settings.address');
        if (!address) {
            warning = t('server-summary-system-address-missing');
            address = window.location.origin;
        }
        let url = `${address}/srv/session/privacy/`;
        let props = {
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

    /**
     * Render read-only input for terms and conditions URL
     *
     * @return {ReactElement|null}
     */
    renderTermsAndConditionsURL() {
        let { env, system } = this.props;
        let { t } = env.locale;
        let serverType = this.getServerProperty('type');
        let needed = [ 'facebook', 'google', 'windows' ];
        if (!_.includes(needed, serverType)) {
            return null;
        }
        let warning;
        let address = _.get(system, 'settings.address');
        if (!address) {
            warning = t('server-summary-system-address-missing');
            address = window.location.origin;
        }
        let url = `${address}/srv/session/terms/`;
        let props = {
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

    /**
     * Render input for OAuth base URL (Gitlab only)
     *
     * @return {ReactElement}
     */
    renderGitlabURLInput() {
        let { env, system, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let serverType = this.getServerProperty('type');
        let props = {
            id: 'oauth_token',
            type: 'url',
            value: this.getServerProperty('settings.oauth.base_url'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleOAuthURLChange,
        };
        return (
            <CollapsibleContainer open={serverType === 'gitlab'}>
                <TextField {...props}>
                    {t('server-summary-oauth-gitlab-url')}
                    <InputError>{t(problems.base_url)}</InputError>
                </TextField>
            </CollapsibleContainer>
        );
    }

    /**
     * Render input for OAuth client id
     *
     * @return {ReactElement}
     */
    renderOAuthClientIDInput() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'oauth_id',
            value: this.getServerProperty('settings.oauth.client_id'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleOAuthIDChange,
        };
        let phrase = 'server-summary-oauth-client-id';
        switch (this.getServerProperty('type')) {
            case 'dropbox':
                phrase = 'server-summary-oauth-app-key';
                break;
            case 'facebook':
                phrase = 'server-summary-oauth-app-id';
                break;
            case 'github':
                phrase = 'server-summary-oauth-client-id';
                break;
            case 'gitlab':
                phrase = 'server-summary-oauth-application-id';
                break;
            case 'google':
                phrase = 'server-summary-oauth-client-id';
                break;
            case 'windows':
                phrase = 'server-summary-oauth-application-id';
                break;
        }
        return (
            <TextField {...props}>
                {t(phrase)}
                <InputError>{t(problems.client_id)}</InputError>
            </TextField>
        );
    }

    /**
     * Render input for OAuth client secret
     *
     * @return {ReactElement}
     */
    renderOAuthClientSecretInput() {
        let { env, editing } = this.props;
        let { problems } = this.state;
        let { t } = env.locale;
        let props = {
            id: 'oauth_secret',
            value: this.getServerProperty('settings.oauth.client_secret'),
            readOnly: !editing,
            spellCheck: false,
            env,
            onChange: this.handleOAuthSecretChange,
        };
        let phrase = 'server-summary-oauth-client-secret';
        switch (this.getServerProperty('type')) {
            case 'dropbox':
                phrase = 'server-summary-oauth-app-secret';
                break;
            case 'facebook':
                phrase = 'server-summary-oauth-app-secret';
                break;
            case 'github':
                phrase = 'server-summary-oauth-client-secret';
                break;
            case 'gitlab':
                phrase = 'server-summary-oauth-application-secret';
                break;
            case 'google':
                phrase = 'server-summary-oauth-client-secret';
                break;
            case 'windows':
                phrase = 'server-summary-oauth-application-secret';
                break;
        }
        return (
            <TextField {...props}>
                {t(phrase)}
                <InputError>{t(problems.client_secret)}</InputError>
            </TextField>
        );
    }

    /**
     * Render API integration status
     *
     * @return {ReactElement}
     */
    renderAPIStatus() {
        let { env } = this.props;
        let { t } = env.locale;
        let serverType = this.getServerProperty('type');
        let apiAccess;
        if (_.includes(IntegratedServerTypes, serverType)) {
            let token = this.getServerProperty('settings.api.access_token');
            if (token) {
                apiAccess = t('server-summary-api-access-acquired');
            } else {
                apiAccess = t('server-summary-api-access-pending');
            }
        } else {
            apiAccess = t('server-summary-api-access-not-applicable');
        }
        let props = {
            id: 'access',
            value: apiAccess,
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('server-summary-api-access')}
            </TextField>
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
            folder: 'server',
            topic: 'server-summary',
            hidden: !editing,
            env,
        };
        let serverType = this.getServerProperty('type');
        if (serverType) {
            instructionProps.topic += `-${serverType}`;
        }
        return (
            <div className="instructions">
                <InstructionBlock {...instructionProps} />
            </div>
        );
    }

    /**
     * Render task history
     *
     * @return {ReactElement|null}
     */
    renderTaskList() {
        let { database, route, env, server, scrollToTaskID } = this.props;
        let { t } = env.locale;
        if (!server) {
            return null;
        }
        let hasIntegration = _.includes(IntegratedServerTypes, server.type);
        if (!hasIntegration) {
            return null;
        }
        let historyProps = {
            server,
            database,
            env,
            scrollToTaskID,
            onSelectionClear: this.handleTaskSelectionClear,
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

    /**
     * Save user with new flags
     *
     * @param  {Object} flags
     *
     * @return {Promise<Role>}
     */
    changeFlags(flags) {
        let { database, server } = this.props;
        let db = database.use({ schema: 'global', by: this });
        let serverAfter = _.assign({}, server, flags);
        return db.saveOne({ table: 'server' }, serverAfter).catch((err) => {
            let problems = { unexpected: err.message };
            this.setState({ problems });
        });
    }

    /**
     * Called when user clicks disable button
     *
     * @param  {Event} evt
     */
    handleDisableClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('server-summary-confirm-disable');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            let serverAfter = await this.changeFlags({ disabled: true });
            if (serverAfter) {
                await this.returnToList();
            }
        }
    }

    /**
     * Called when user clicks delete button
     *
     * @param  {Event} evt
     */
    handleDeleteClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('server-summary-confirm-delete');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            let serverAfter = await this.changeFlags({ deleted: true });
            if (serverAfter) {
                await this.returnToList();
            }
        }
    }

    /**
     * Called when user clicks reactive button
     *
     * @param  {Event} evt
     */
    handleReactivateClick = async (evt) => {
        let { env } = this.props;
        let { confirmation } = this.components;
        let { t } = env.locale;
        let message = t('server-summary-confirm-reactivate');
        let confirmed = await confirmation.ask(message);
        if (confirmed) {
            await this.changeFlags({ disabled: false, deleted: false });
        }
    }

    /**
     * Open a pop-window to OAuth redirection URL
     *
     * @param  {String} type
     */
    openOAuthPopup(type) {
        let { database, env } = this.props;
        let server = this.getServer();
        let url = database.getOAuthURL(server, type);
        let width = 800;
        let height = 600;
        let { screenLeft, screenTop, outerWidth, outerHeight } = window;
        let options = {
            width,
            height,
            left: screenLeft + Math.round((outerWidth - width) / 2),
            top: screenTop + Math.round((outerHeight - height) / 2),
            toolbar: 'no',
            menubar: 'no',
            status: 'no',
        };
        let pairs = _.map(options, (value, name) => {
            return `${name}=${value}`;
        });
        window.open(url, 'api-access-oauth', pairs.join(','));
    }

    /**
     * Called when user clicks on "Acquire API access" button
     *
     * @param  {Event} evt
     */
    handleAcquireClick = (evt) => {
        this.openOAuthPopup('activation');
    }

    /**
     * Called when user clicks on "Test OAuth" button
     *
     * @param  {Event} evt
     */
    handleTestClick = (evt) => {
        this.openOAuthPopup('test');
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
     * Called when server clicks edit button
     *
     * @param  {Event} evt
     */
    handleEditClick = (evt) => {
        return this.setEditability(true);
    }

    /**
     * Called when server clicks cancel button
     *
     * @param  {Event} evt
     */
    handleCancelClick = (evt) => {
        return this.setEditability(false);
    }

    /**
     * Called when server clicks save button
     *
     * @param  {Event} evt
     */
    handleSaveClick = (evt) => {
        let { database } = this.props;
        let { saving } = this.state;
        if (saving) {
            return;
        }
        let problems = this.findProblems();
        if (_.some(problems)) {
            this.setState({ problems });
            return;
        }
        let server = this.getServer();
        let oauthBefore = this.getServerProperty('settings.oauth', 'original');
        let oauthAfter = this.getServerProperty('settings.oauth', 'current');
        let credentialsChanged = !_.isEqual(oauthBefore, oauthAfter);
        this.setState({ saving: true, adding: !server.id, credentialsChanged, problems: {} }, async () => {
            try {
                let db = database.use({ schema: 'global', by: this });
                let currentUserID = await db.start();
                let serverAfter = await db.saveOne({ table: 'server' }, server);
                this.setState({ hasChanges: false, saving: false }, () => {
                    return this.setEditability(false, serverAfter);
                });
            } catch (err) {
                let problems;
                if (err.statusCode === 409) {
                    problems = { name: 'validation-duplicate-server-name' };
                } else {
                    problems = { unexpected: err.message };
                }
                this.setState({ problems, saving: false });
            }
        });
    }

    /**
     * Called when user changes server title
     *
     * @param  {Object} evt
     */
    handleTitleChange = (evt) => {
        this.setServerProperty(`details.title`, evt.target.value);
    }

    /**
     * Called when user changes server name
     *
     * @param  {Object} evt
     */
    handleNameChange = (evt) => {
        let name = _.toLower(evt.target.value).replace(/[^\w\-]+/g, '');
        this.setServerProperty(`name`, name);
    }

    /**
     * Called when user changes server type
     *
     * @param  {Object} evt
     */
    handleTypeOptionClick = (evt) => {
        this.setServerProperty(`type`, evt.name);
    }

    /**
     * Called when user changes the white list
     *
     * @param  {Object} evt
     */
    handleWhitelistChange = (evt) => {
        let whitelist = evt.target.value.replace(/\s*[;,]\s*/g, '\n');
        this.setServerProperty(`settings.user.whitelist`, whitelist);
    }

    /**
     * Called when user changes API token
     *
     * @param  {Event} evt
     */
    handleApiTokenChange = (evt) => {
        this.setServerProperty(`settings.api.token`, evt.target.value);
    }

    /**
     * Called when user changes OAuth base URL
     *
     * @param  {Event} evt
     */
    handleOAuthURLChange = (evt) => {
        let { problems } = this.state;
        let url = evt.target.value;
        this.setServerProperty(`settings.oauth.base_url`, url);

        // make sure the URL isn't localhost, which points to the Docker container
        if (/https?:\/\/localhost\b/.test(url)) {
            problems = _.assign({}, problems, {
                base_url: 'validation-localhost-is-wrong'
            });
        } else {
            problems = _.omit(problems, 'base_url');
        }
        this.setState({ problems });
    }

    /**
     * Called when user changes OAuth client id
     *
     * @param  {Event} evt
     */
    handleOAuthIDChange = (evt) => {
        this.setServerProperty(`settings.oauth.client_id`, evt.target.value);
    }

    /**
     * Called when user changes OAuth client secret
     *
     * @param  {Event} evt
     */
    handleOAuthSecretChange = (evt) => {
        this.setServerProperty(`settings.oauth.client_secret`, evt.target.value);
    }

    /**
     * Called when user clicks one of the user options
     *
     * @param  {Object} evt
     */
    handleGitlabUserOptionClick = (evt) => {
        let mapping = this.getServerProperty('settings.user.mapping') || {};
        mapping = _.clone(mapping);
        switch (evt.name) {
            case 'import-admin-disabled':
                mapping.admin = undefined;
                break;
            case 'import-admin-as-regular-user':
                mapping.admin = (mapping.admin !== 'regular') ? 'regular' : undefined;
                break;
            case 'import-admin-as-moderator':
                mapping.admin = (mapping.admin !== 'moderator') ? 'moderator' : undefined;
                break;
            case 'import-admin-as-admin':
                mapping.admin = (mapping.admin !== 'admin') ? 'admin' : undefined;
                break;
            case 'import-user-disabled':
                mapping.user = undefined;
                break;
            case 'import-user-as-guest':
                mapping.user = (mapping.user !== 'guest') ? 'guest' : undefined;
                break;
            case 'import-user-as-regular-user':
                mapping.user = (mapping.user !== 'regular') ? 'regular' : undefined;
                break;
            case 'import-user-as-moderator':
                mapping.user = (mapping.user !== 'moderator') ? 'moderator' : undefined;
                break;
            case 'import-external-user-disabled':
                mapping.external_user = undefined;
                break;
            case 'import-external-user-as-guest':
                mapping.external_user = (mapping.external_user !== 'guest') ? 'guest' : undefined;
                break;
            case 'import-external-user-as-regular-user':
                mapping.external_user = (mapping.external_user !== 'regular') ? 'regular' : undefined;
                break;
        }
        this.setServerProperty('settings.user.mapping', mapping);
    }

    /**
     * Called when user clicks one of the user options
     *
     * @param  {Object} evt
     */
    handleOAuthUserOptionClick = (evt) => {
        let type = this.getServerProperty('settings.user.type');
        switch (evt.name) {
            case 'import-disabled':
                type = undefined;
                break;
            case 'import-user-as-guest':
                type = (type !== 'guest') ? 'guest' : undefined;
                break;
            case 'import-user-as-regular-user':
                type = (type !== 'regular') ? 'regular' : undefined;
                break;
        }
        this.setServerProperty('settings.user.type', type);
    }

    /**
     * Called when user clicks on a role
     *
     * @param  {Object} evt
     */
    handleRoleOptionClick = (evt) => {
        let server = this.getServer();
        let roleIDs = _.get(server, 'settings.user.role_ids', []);
        if (evt.name === 'none') {
            roleIDs = [];
        } else {
            let roleID = parseInt(evt.name);
            if (_.includes(roleIDs, roleID)) {
                roleIDs = _.without(roleIDs, roleID);
            } else {
                roleIDs = _.concat(roleIDs, roleID);
            }
        }
        this.setServerProperty('settings.user.role_ids', roleIDs);
    }

    /**
     * Called when user has scrolled away from selected task
     */
    handleTaskSelectionClear() {
        let { route } = this.props;
        route.unanchor();
    }
}

const emptyServer = {
    details: {},
    settings: ServerSettings.default,
};

function renderOption(props, i) {
    return <option key={i} {...props} />;
}

function getServerIcon(type) {
    switch (type) {
        case 'facebook':
            return 'facebook-official';
        default:
            return type;
    }
}

let sortRoles = memoizeWeak(null, function(roles, env) {
    let { p } = env.locale;
    let name = (role) => {
        return p(role.details.title) || role.name;
    };
    return _.sortBy(roles, name);
});

export {
    ServerSummaryPage as default,
    ServerSummaryPage,
    ServerSummaryPageSync,
};

import Database from 'data/database';
import Route from 'routing/route';
import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ServerSummaryPage.propTypes = {
        editing: PropTypes.bool,
        serverID: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.oneOf([ 'new' ]),
        ]).isRequired,
        scrollToTaskID: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
    ServerSummaryPageSync.propTypes = {
        editing: PropTypes.bool,
        creating: PropTypes.bool,
        system: PropTypes.object,
        server: PropTypes.object,
        roles: PropTypes.arrayOf(PropTypes.object),
        scrollToTaskID: PropTypes.number,

        database: PropTypes.instanceOf(Database).isRequired,
        route: PropTypes.instanceOf(Route).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}

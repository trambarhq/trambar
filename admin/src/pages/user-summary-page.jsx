import React, { useState } from 'react';
import { useProgress, useListener, useErrorCatcher } from 'relaks';
import { findProject } from 'common/objects/finders/project-finder.js';
import { removeMembers, addMembers } from 'common/objects/savers/project-saver.js';
import { findActiveRoles } from 'common/objects/finders/role-finder.js';
import { findUser } from 'common/objects/finders/user-finder.js';
import { disableUser, removeUser, restoreUser, saveUser } from 'common/objects/savers/user-saver.js';
import { getUserName } from 'common/objects/utils/user-utils.js';
import { UserTypes } from 'common/objects/types/user-types.js';
import { findDailyActivitiesOfUser } from 'common/objects/finders/statistics-finder.js';
import { findSystem } from 'common/objects/finders/system-finder.js';
import { findByIds, orderBy, toggle } from 'common/utils/array-utils.js';
import { isEmpty } from 'common/utils/object-utils.js';

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
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { ErrorBoundary } from 'common/widgets/error-boundary.jsx';

// custom hooks
import {
  useDraftBuffer,
  useAutogenID,
  useConfirmation,
  useDataLossWarning,
} from '../hooks.js';

import './user-summary-page.scss';

export default async function UserSummaryPage(props) {
  const { database, route, env, payloads, projectID, userID, editing } = props;
  const creating = (userID === 'new');
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const system = await findSystem(database);
  const user = (!creating) ? await findUser(database, userID) : null;
  render();
  const roles = await findActiveRoles(database)
  render();
  // load project if project id is provided (i.e. member summary)
  const project = (projectID) ? await findProject(database, projectID) : null;
  render();
  const statistics = (project && user) ? await findDailyActivitiesOfUser(database, project, user) : null;
  render();

  function render() {
    const sprops = { system, user, roles, project, statistics, creating };
    show(<UserSummaryPageSync key={userID} {...sprops} {...props} />);
  }
}

function UserSummaryPageSync(props) {
  const { system, user, roles, project, statistics, creating } = props;
  const { database, route, env, payloads, projectID, editing } = props;
  const { t, p } = env.locale;
  const readOnly = !(editing || creating);
  const [ problems, setProblems ] = useState({});
  const [ showingSocialLinks, setShowingSocialLinks ] = useState(false);
  const draft = useDraftBuffer({
    original: user || {},
    reset: readOnly,
  });
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const warnDataLoss = useDataLossWarning(route, env, confirm);

  const handleEditClick = useListener(() => {
    route.replace({ editing: true });
  });
  const handleCancelClick = useListener(() => {
    if (creating) {
      handleReturnClick();
    } else {
      route.replace({ editing: undefined });
    }
  });
  const handleAddClick = useListener(() => {
    route.replace({ userID: 'new' });
  });
  const handleReturnClick = useListener(() => {
    if (projectID) {
      route.push('member-list-page', { projectID });
    } else {
      route.push('user-list-page');
    }
  });
  const handleDisableClick = useListener(async (evt) => {
    run(async () => {
      await confirm(t('user-summary-confirm-disable'));
      await disableUser(database, user);
      handleReturnClick();
    });
  });
  const handleRemoveClick = useListener(async (evt) => {
    run(async () => {
      await confirm(t('user-summary-confirm-delete'));
      await removeUser(database, user);
      handleReturnClick();
    });
  });
  const handleRestoreClick = useListener(async (evt) => {
    run(async () => {
      await confirm(t('user-summary-confirm-reactivate'));
      await restoreUser(database, user);
    });
  });
  const handleRemoveMembershipClick = useListener(async (evt) => {
    run(async () => {
      await removeMembers(database, project, [ user ]);
      handleReturnClick();
    });
  });
  const handleRestoreMembershipClick = useListener(async (evt) => {
    run(async () => {
      await addMembers(database, project, [ user ]);
    });
  });
  const handleSaveClick = useListener(async (evt) => {
    run(async () => {
      try {
        const problems = {};
        if (!draft.get('username')) {
          problems.username = 'validation-required';
        }
        if (!draft.get('type')) {
          problems.type = 'validation-required';
        }
        setProblems(problems);
        if (isEmpty(problems)) {
          const userAfter = await saveUser(database, draft.current);
          payloads.dispatch(userAfter);

          // add user to member list if he's not there yet
          if (project && !project.user_ids.includes(userAfter.id)) {
            await addMembers(database, project, [ userAfter ]);
          }

          warnDataLoss(false);
          route.replace({
            editing: undefined,
            adding: true,
            userID: userAfter.id
          });
        }
      } catch (err) {
        if (err.statusCode === 409) {
          setProblems({ username: 'validation-duplicate-user-name' });
        } else {
          throw err;
        }
      }
    });
  });
  const [ handleNameChange, handleUsernameChange ] = useAutogenID(draft, {
    titleKey: 'details.name',
    nameKey: 'username',
    personal: true
  });
  const handleEmailChange = useListener((evt) => {
    const address = evt.target.value;
    draft.set(`details.email`, address);
  });
  const handlePhoneChange = useListener((evt) => {
    const number = evt.target.value;
    draft.set(`details.phone`, number);
  });
  const handleProfileImageChange = useListener((evt) => {
    const resources = evt.target.value;
    draft.set(`details.resources`, resources);
  });
  const handleTypeOptionClick = useListener((evt) => {
    const type = evt.name;
    draft.set('type', type);
  });
  const handleRoleOptionClick = useListener((evt) => {
    const roleID = parseInt(evt.name);
    const before = draft.get('role_ids', []);
    const after = (roleID) ? toggle(before, roleID) : [];
    draft.set('role_ids', after);
  });
  const handleSocialLinksToggleClick = useListener((evt) => {
    setShowingSocialLinks(!showingSocialLinks);
  });
  const handleSkypeUsernameChange = useListener((evt) => {
    const username = evt.target.value.trim();
    draft.set(`details.skype_username`, username);
  });
  const handleIchatUsernameChange = useListener((evt) => {
    const username = evt.target.value.trim();
    draft.set(`details.ichat_username`, username);
  });
  const handleTwitterUsernameChange = useListener((evt) => {
    const username = extractUsername(evt.target.value);
    draft.set(`details.twitter_username`, username);
  });
  const handleLinkedinURLChange = useListener((evt) => {
    const url = evt.target.value.trim();
    draft.set(`details.linkedin_url`, url);
  });
  const handleGitHubURLChange = useListener((evt) => {
    const url = evt.target.value.trim();
    draft.set(`details.github_url`, url);
  });
  const handleGitlabURLChange = useListener((evt) => {
    const url = evt.target.value.trim();
    draft.set(`details.gitlab_url`, url);
  });
  const handleStackoverflowURLChange = useListener((evt) => {
    const url = evt.target.value.trim();
    draft.set(`details.stackoverflow_url`, url);
  });

  warnDataLoss(draft.changed);

  const name = getUserName(draft.current, env);
  return (
    <div className="user-summary-page">
      {renderButtons()}
      <h2>{t(projectID ? 'user-summary-member-$name' : 'user-summary-$name', name)}</h2>
      <UnexpectedError error={error} />
      {renderForm()}
      {renderSocialLinksToggle()}
      {renderSocialLinksForm()}
      {renderInstructions()}
      {renderChart()}
      <ActionConfirmation ref={confirmationRef} env={env} />
    </div>
  );

  function renderButtons() {
    if (readOnly) {
      const active = (user) ? !user.deleted && !user.disabled : true;
      const membership = (project) ? project.user_ids.includes(user.id) : undefined;
      let preselected;
      if (active) {
        preselected = (route.params.adding) ? 'add' : 'return';
        if (membership === false) {
          preselected = 'restore-membership';
        }
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
            <option name="remove-membership" hidden={membership !== true} separator onClick={handleRemoveMembershipClick}>
              {t('user-summary-remove-membership')}
            </option>
            <option name="restore-membership" hidden={membership !== false} separator onClick={handleRestoreMembershipClick}>
              {t('user-summary-restore-membership')}
            </option>
          </ComboButton>
          {' '}
          <PushButton className="emphasis" onClick={handleEditClick}>
            {t(projectID ? 'user-summary-member-edit' : 'user-summary-edit')}
          </PushButton>
        </div>
      );
    } else {
      const { changed } = draft;
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
        {UserTypes.map(renderTypeOption)}
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

    const sorted = sortRoles(roles, env);
    const withNone = [ null, ...sorted ];
    return (
      <OptionList {...listProps}>
        <label>{t('user-summary-roles')}</label>
        {withNone.map(renderRoleOption)}
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
        selected: (rolesCurr.length === 0),
        previous: (creating) ? (rolesPrev.length === 0) : undefined,
      };
    } else {
      name = p(role.details.title) || role.name;
      props = {
        name: String(role.id),
        selected: rolesCurr.includes(role.id),
        previous: rolesPrev.includes(role.id),
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
      hidden: readOnly,
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
}

function sortRoles(roles, env) {
  if (!roles) {
    return [];
  }
  const { p } = env.locale;
  const name = (role) => {
    return p(role.details.title) || role.name;
  };
  return orderBy(roles, name, 'asc');
}

function extractUsername(text, type) {
  if (/https?:/.test(text)) {
    // remove query string
    text = text.replace(/\?.*/, ''.trim());
    const parts = text.split('/').filter(Boolean);
    return parts[parts.length - 1];
  }
  return text;
}

import Moment from 'moment';
import 'moment-timezone';
import React, { useMemo } from 'react';
import { useProgress, useListener, useSaveBuffer, useErrorCatcher } from 'relaks';
import { findProject } from 'common/objects/finders/project-finder.js';
import { saveProject } from 'common/objects/savers/project-saver.js';
import { findTemplates } from 'common/objects/finders/repo-finder.js';
import { getRepoName } from 'common/objects/utils/repo-utils.js';
import { findSnapshots } from 'common/objects/finders/snapshot-finder.js';
import { uniqBy } from 'common/utils/array-utils.js';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { SnapshotList } from '../widgets/snapshot-list.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import { useDraftBuffer, useSortHandler, useValidation, useRowToggle, useConfirmation, useDataLossWarning, } from '../hooks.js';

import './website-summary-page.scss';

export default async function WebsiteSummaryPage(props) {
  const { database, route, env, projectID, editing } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const project = await findProject(database, projectID);
  render();
  const repos = await findTemplates(database);
  const template = repos.find(r => r.id === project.template_repo_id) || null;
  render();
  const snapshots = await findSnapshots(database, template, 100);
  render();

  function render() {
    const sprops = { project, repos, template, snapshots };
    show(<WebsiteSummaryPageSync {...sprops} {...props} />);
  }
}

function WebsiteSummaryPageSync(props) {
  const { project, repos, template, snapshots } = props;
  const { database, route, env, editing } = props;
  const { t, p } = env.locale;
  const readOnly = !editing;
  const draft = useDraftBuffer({
    original: project || {},
    reset: readOnly,
  });
  const timezoneOptions = useMemo(() => {
    const options = [];
    for (let timezone of Moment.tz.names()) {
      const parts = timezone.split('/').map((part) => {
        return part.replace(/_/g, ' ');
      });
      if (parts.length === 1 || parts[0] === 'Etc') {
        continue;
      }
      const names = parts.map((part) => {
        const id = part.toLowerCase().replace(/ /g, '-');
        return t(`tz-name-${id}`);
      });
      const label = names.join(' / ');
      options.push({ label, timezone });
    }
    return uniqBy(options, 'label');
  }, [ env ]);
  const timezoneLabels = useMemo(() => {
    return timezoneOptions.map(opt => opt.label).sort();
  }, [ timezoneOptions ]);
  const selectedTimezoneLabel = useMemo(() => {
    const timezone = project?.settings?.timezone;
    const option = timezoneOptions.find(tz => tz.timezone === timezone);
    return option?.label ?? '';
  }, [ timezoneOptions, project ]);
  const timezoneBuf = useSaveBuffer({
    original: selectedTimezoneLabel,
    reset: readOnly,
  });
  const using = (draft.get('template_repo_id') !== null);

  const [ problems, reportProblems ] = useValidation(!readOnly);
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const warnDataLoss = useDataLossWarning(route, env, confirm);

  const handleEditClick = useListener((evt) => {
    route.replace({ editing: true });
  });
  const handleCancelClick = useListener((evt) => {
    route.replace({ editing: undefined });
  });
  const handleSaveClick = useListener((evt) => {
    run(async () => {
      const domains = uniq(draft.get('settings.domains', [])).filter(Boolean);
      draft.set('settings.domains', domains);

      const problems = {};
      if (domains.includes(location.hostname)) {
        problems.domains = 'validation-used-by-trambar';
      }
      if (!draft.get('settings.timezone') && timezoneBuf.current.trim()) {
        problems.timezone = 'validation-invalid-timezone';
      }
      reportProblems(problems);

      const projectAfter = await saveProject(database, draft.current);

      warnDataLoss(false);
      route.replace({ editing: undefined });
    });
  });
  const handleDomainChange = useListener((evt) => {
    const text = evt.target.value;
    const cleaned = text.toLowerCase().replace(/[;,]/g, ' ');
    const domains = cleaned.split(/\s/);
    draft.set('settings.domains', domains);
  });
  const handleTemplateChange = useListener((evt) => {
    const repoID = (evt.name !== null) ? parseInt(evt.name) : null;
    draft.set('template_repo_id', repoID);
  });
  const handleReportTimeChange = useListener((evt) => {
    let time = evt.target.value || '00:00';
    if (time === '00:00') {
      // the defauft is handled a bit different
      // 00:00 will actually be interpreted as 23:59:59
      time = undefined;
    }
    draft.set('settings.traffic_report_time', time);
  });
  const handleTimeZoneChange = useListener((evt) => {
    const label = evt.target.value.trim();
    const option = timezoneOptions.find(tz.label === label);
    draft.set('settings.timezone', option?.timezone);
    timezoneBuf.set(evt.target.value);
  });

  warnDataLoss(draft.changed);

  return (
    <div className="website-summary-page">
      {renderButtons()}
      <h2>{t('website-summary-title')}</h2>
      <UnexpectedError error={error} />
      {renderForm()}
      {renderInstructions()}
      {renderSnapshots()}
      <ActionConfirmation ref={confirmationRef} env={env} />
    </div>
  );

  function renderButtons() {
    if (readOnly) {
      return (
        <div className="buttons">
          <PushButton className="emphasis" onClick={handleEditClick}>
            {t('website-summary-edit')}
          </PushButton>
        </div>
      );
    } else {
      const { changed } = draft;
      return (
        <div className="buttons">
          <PushButton onClick={handleCancelClick}>
            {t('website-summary-cancel')}
          </PushButton>
          {' '}
          <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
            {t('website-summary-save')}
          </PushButton>
        </div>
      );
    }
  }

  function renderForm() {
    return (
      <div className="form">
        {renderTemplateSelect()}
        {renderDomainNameInput()}
        {renderTimeZoneInput()}
        {renderReportTimeInput()}
      </div>
    );
  }

  function renderDomainNameInput() {
    if (!using) {
      return;
    }
    const domains = draft.get('settings.domains', []);
    const props = {
      id: 'domains',
      value: domains.join(' '),
      onChange: handleDomainChange,
      readOnly,
      env,
    };
    return (
      <TextField {...props}>
        {t('website-summary-domain-names')}
        <InputError>{t(problems.domains)}</InputError>
      </TextField>
    );
  }

  function renderTemplateSelect() {
    const listProps = {
      readOnly,
      onOptionClick: handleTemplateChange,
    };
    const list = [
      {
        id: null,
        name: t('website-summary-template-disabled'),
      },
      {
        id: 0,
        name: t('website-summary-template-generic')
      }
    ];
    if (repos) {
      for (let repo of repos) {
        list.push(repo);
      }
    } else {
      // add placeholder so the control doesn't collapse
      const id = draft.getCurrent('template_repo_id');
      if (id) {
        list.push({ id, name: '\u00a0' });
      }
    }
    return (
      <OptionList {...listProps}>
        <label>
          {t('website-summary-template')}
          {' '}
          {renderRepoLink()}
        </label>
        {list?.map(renderTemplateOption)}
      </OptionList>
    );
  }

  function renderTemplateOption(repo) {
    const repoIDCurr = draft.getCurrent('template_repo_id');
    const repoIDPrev = draft.getOriginal('template_repo_id');
    const props = {
      name: repo.id,
      selected: repoIDCurr === repo.id,
      previous: repoIDPrev === repo.id,
    };
    const label = getRepoName(repo, env);
    return <option key={repo.id} {...props}>{label}</option>;
  }

  function renderRepoLink() {
    const url = template?.details?.web_url;
    if (!url) {
      return;
    }
    return (
      <a className="link" href={url} target="_blank">
        <i className="fas fa-external-link-alt" />
      </a>
    );
  }

  function renderTimeZoneInput() {
    if (!using) {
      return;
    }
    const props = {
      id: 'timezone',
      value: timezoneBuf.current,
      list: timezoneLabels,
      onChange: handleTimeZoneChange,
      readOnly,
      env,
    };
    return (
      <TextField {...props}>
        {t('website-summary-timezone')}
        <InputError>{t(problems.timezone)}</InputError>
      </TextField>
    );
  }

  function renderReportTimeInput() {
    if (!using) {
      return;
    }
    const props = {
      id: 'report-time',
      type: 'time',
      value: draft.get('settings.traffic_report_time', '00:00'),
      step: 60,
      onChange: handleReportTimeChange,
      readOnly,
      env,
    };
    return (
      <TextField {...props}>
        {t('website-summary-traffic-report-time')}
      </TextField>
    );
  }

  function renderInstructions() {
    const instructionProps = {
      folder: 'website',
      topic: 'website-summary',
      hidden: readOnly,
      env,
    };
    return (
      <div className="instructions">
        <InstructionBlock {...instructionProps} />
      </div>
    );
  }

  function renderSnapshots() {
    if (!project || project.template_repo_id === null) {
      return;
    }
    if (!snapshots && !!project.template_repo_id) {
      return;
    }
    const props = {
      database,
      project,
      template,
      snapshots,
      env,
    };
    return (
      <div className="snapshots">
        <h2>{t('website-summary-versions')}</h2>
        <SnapshotList {...props} />
      </div>
    );
  }
}

import _ from 'lodash';
import Moment from 'moment';
import 'moment-timezone';
import React, { useMemo } from 'react';
import Relaks, { useProgress, useListener, useSaveBuffer, useErrorCatcher } from 'relaks';
import { memoizeWeak } from 'common/utils/memoize.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as ProjectSaver from 'common/objects/savers/project-saver.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as RepoUtils from 'common/objects/utils/repo-utils.mjs';
import * as SnapshotFinder from 'common/objects/finders/snapshot-finder.mjs';

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
import {
    useDraftBuffer,
    useSortHandler,
    useValidation,
    useRowToggle,
    useConfirmation,
    useDataLossWarning,
} from '../hooks.mjs';

import './website-summary-page.scss';

async function WebsiteSummaryPage(props) {
    const { database, route, env, projectID, editing } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const project = await ProjectFinder.findProject(database, projectID);
    render();
    const repos = await RepoFinder.findTemplates(database);
    const template = _.find(repos, { id: project.template_repo_id }) || null;
    render();
    const snapshots = await SnapshotFinder.findSnapshots(database, template, 100);
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
            const parts = _.map(_.split(timezone, '/'), (part) => {
                return _.replace(part, /_/g, ' ');
            });
            if (parts.length === 1 || parts[0] === 'Etc') {
                continue;
            }
            const names = _.map(parts, (part) => {
                return t(`tz-name-${_.kebabCase(part)}`);
            });
            const label = names.join(' / ');
            options.push({ label, timezone });
        }
        return _.uniqBy(options, 'label');
    }, [ env ]);
    const timezoneLabels = useMemo(() => {
        return _.sortBy(_.map(timezoneOptions, 'label'));
    }, [ timezoneOptions ]);
    const selectedTimezoneLabel = useMemo(() => {
        const timezone = _.get(project, 'settings.timezone');
        const option = _.find(timezoneOptions, { timezone })
        return (option) ? option.label : '';
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
            const domains = _.filter(draft.get('settings.domains', []));
            draft.set('settings.domains', domains);

            const problems = {};
            if (_.includes(domains, location.hostname)) {
                problems.domains = 'validation-used-by-trambar';
            }
            if (!draft.get('settings.timezone') && _.trim(timezoneBuf.current)) {
                problems.timezone = 'validation-invalid-timezone';
            }
            reportProblems(problems);

            const projectAfter = await ProjectSaver.saveProject(database, draft.current);

            warnDataLoss(false);
            route.replace({ editing: undefined });
        });
    });
    const handleDomainChange = useListener((evt) => {
        const text = _.replace(evt.target.value, /[;,]/g, '');
        const domains = _.split(text, /\s/);
        draft.set('settings.domains', domains);
    });
    const handleTemplateChange = useListener((evt) => {
        const repoID = (evt.name !== null) ? parseInt(evt.name) : null;
        draft.set('template_repo_id', repoID);
    });
    const handleReportTimeChange = useListener((evt) => {
        let time = evt.target.value || '00:00';
        if (label === '00:00') {
            // the defauft is handled a bit different
            // 00:00 will actually be interpreted as 23:59:59
            time = undefined;
        }
        draft.set('settings.traffic_report_time', time);
    });
    const handleTimeZoneChange = useListener((evt) => {
        const label = _.trim(evt.target.value);
        const option = _.find(timezoneOptions, { label });
        draft.set('settings.timezone', _.get(option, 'timezone'));
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
            list.push({ id, name: '\u00a0' });
        }
        return (
            <OptionList {...listProps}>
                <label>
                    {t('website-summary-template')}
                    {' '}
                    {renderRepoLink()}
                </label>
                {_.map(list, renderTemplateOption)}
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
        const label = RepoUtils.getDisplayName(repo, env);
        return <option key={repo.id} {...props}>{label}</option>;
    }

    function renderRepoLink() {
        const url = _.get(template, 'details.web_url');
        if (!url) {
            return;
        }
        return (
            <a className="link" href={url} target="_blank">
                <i className="fa fa-external-link" />
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
                {t('website-summary-traiffic-report-time')}
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
        if (!template) {
            return null;
        }
        const sorted = sortSnapshots(snapshots);
        const props = {
            database,
            project,
            template,
            snapshots: sorted,
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

const sortSnapshots = memoizeWeak(null, function(snapshots) {
    return _.orderBy(snapshots, 'ptime', 'desc');
});

const component = Relaks.memo(WebsiteSummaryPage);

export {
    component as default,
    component as WebsiteSummaryPage,
};

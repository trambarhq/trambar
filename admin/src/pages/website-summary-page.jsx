import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
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
    const template = _.find(repos, { id: project.template_repo_id });
    render();
    const snapshots = await SnapshotFinder.findSnapshots(database, template);
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

    const [ problems, reportProblems ] = useValidation();
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
            const problems = {};
            reportProblems(problems);

            const projectAfter = await ProjectSaver.saveProject(database, draft.current);

            warnDataLoss(false);
            route.replace({ editing: undefined });
        });
    });
    const handleDomainChange = useListener((evt) => {
        const text = _.replace(evt.target.value, /[;,]/g, '');
        const domains = _.split(text, /\s/);
        draft.set('details.domains', domains);
    });
    const handleTemplateChange = useListener((evt) => {
        const repoID = (evt.name !== null) ? parseInt(evt.name) : null;
        draft.set('template_repo_id', repoID);
    });

    warnDataLoss(draft.changed);

    return (
        <div className="website-summary-page">
            {renderButtons()}
            <h2>{t('website-summary-title')}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderInstructions()}
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
            </div>
        );
    }

    function renderDomainNameInput() {
        if (readOnly) {
            if (project && project.template_repo_id === null) {
                return null;
            }
        }
        const domains = draft.get('details.domains', []);
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
            </TextField>
        );
    }

    function renderTemplateSelect() {
        const listProps = {
            readOnly,
            onOptionClick: handleTemplateChange,
        };
        const list = _.concat([
            {
                id: null,
                name: t('website-summary-template-disabled'),
            },
            {
                id: 0,
                name: t('website-summary-template-generic')
            }
        ], repos || []);
        return (
            <OptionList {...listProps}>
                <label>
                    {t('website-summary-template')}
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
}

const component = Relaks.memo(WebsiteSummaryPage);

export {
    component as default,
    component as WebsiteSummaryPage,
};

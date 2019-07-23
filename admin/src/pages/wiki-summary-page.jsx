import _ from 'lodash';
import React, { useState, useRef, useMemo } from 'react';
import Relaks, { useProgress, useListener, useErrorCatcher } from 'relaks';
import { MarkdownPage } from 'trambar-www';
import * as ExternalDataUtils from 'common/objects/utils/external-data-utils.mjs';
import * as ProjectFinder from 'common/objects/finders/project-finder.mjs';
import * as RepoFinder from 'common/objects/finders/repo-finder.mjs';
import * as WikiFinder from 'common/objects/finders/wiki-finder.mjs';
import * as WikiSaver from 'common/objects/savers/wiki-saver.mjs';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { MarkdownPreview } from '../widgets/markdown-preview.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
    useConfirmation,
} from '../hooks.mjs';

import './wiki-summary-page.scss';

async function WikiSummaryPage(props) {
    const { database, projectID, wikiID } = props;
    const [ show ] = useProgress();

    render();
    const currentUserID = await database.start();
    const project = await ProjectFinder.findProject(database, projectID);
    const schema = project.name;
    const wiki = await WikiFinder.findWiki(database, schema, wikiID);
    render();
    const repos = await RepoFinder.findProjectRepos(database, project);
    const repo = _.find(repos, (repo) => {
        let link = ExternalDataUtils.findLinkByRelative(repo, wiki, 'project');
        return !!link;
    });
    render();

    function render() {
        const sprops = { schema, project, wiki, repo };
        show(<WikiSummaryPageSync key={wikiID} {...sprops} {...props} />);
    }
}

function WikiSummaryPageSync(props) {
    const { schema, system, project, wiki, repo } = props;
    const { database, route, env, editing } = props;
    const { t } = env.locale;
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();

    const handleEditClick = useListener((evt) => {
        const baseURL = _.get(repo, 'details.web_url');
        const slug = _.get(wiki, 'slug');
        const url = `${baseURL}/wikis/${slug}/edit`;
        open(url, 'gitlab');
    });
    const handleReturnClick = useListener((evt) => {
        route.push('wiki-list-page', { projectID: project.id });
    });
    const handleSelectClick = useListener((evt) => {
        run(async () => {
            await confirm(t('wiki-summary-confirm-select'));
            await WikiSaver.selectWiki(database, schema, wiki);
        });
    });
    const handleDeselectClick = useListener((evt) => {
        run(async () => {
            await confirm(t('wiki-summary-confirm-deselect'));
            await WikiSaver.deselectWiki(database, schema, wiki);
            handleReturnClick();
        });
    });

    const title = _.get(wiki, 'details.title', '');
    return (
        <div className="wiki-summary-page">
            {renderButtons()}
            <h2>{t('wiki-summary-$title', title)}</h2>
            <UnexpectedError error={error} />
            {renderForm()}
            {renderContents()}
            <ActionConfirmation ref={confirmationRef} env={env} />
        </div>
    );

    function renderButtons() {
        const chosen = wiki && wiki.chosen;
        let preselected;
        return (
            <div className="buttons">
                <ComboButton preselected={preselected}>
                    <option name="return" onClick={handleReturnClick}>
                        {t('wiki-summary-return')}
                    </option>
                    <option name="select" hidden={chosen} onClick={handleSelectClick}>
                        {t('wiki-summary-select')}
                    </option>
                    <option name="deselect" hidden={!chosen} onClick={handleDeselectClick}>
                        {t('wiki-summary-deselect')}
                    </option>
                </ComboButton>
                {' '}
                <PushButton className="emphasis" disabled={!wiki || !repo} onClick={handleEditClick}>
                    {t('wiki-summary-edit')}
                </PushButton>
            </div>
        );
    }

    function renderForm() {
        return (
            <div className="form">
                {renderTitle()}
                {renderSlug()}
                {renderRepo()}
                {renderPublic()}
            </div>
        );
    }

    function renderTitle() {
        const props = {
            id: 'title',
            value: _.get(wiki, 'details.title', ''),
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('wiki-summary-title')}
            </TextField>
        );
    }

    function renderSlug() {
        const props = {
            id: 'title',
            value: _.get(wiki, 'slug', ''),
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('wiki-summary-slug')}
            </TextField>
        );
    }

    function renderRepo() {
        const props = {
            id: 'repo',
            value: _.get(repo, 'name'),
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('wiki-summary-repo')}
            </TextField>
        );
    }

    function renderPublic() {
        let state;
        if (wiki) {
            if (wiki.public) {
                if (wiki.chosen) {
                    state = 'always';
                } else {
                    state = 'referenced';
                }
            } else {
                state = 'no';
            }
        }
        const props = {
            id: 'repo',
            value: (state) ? t(`wiki-summary-public-${state}`) : '',
            readOnly: true,
            env,
        };
        return (
            <TextField {...props}>
                {t('wiki-summary-public')}
            </TextField>
        );
    }

    function renderContents() {
        if (wiki && wiki.public) {
            return <WikiContents wiki={wiki} env={env}/>
        }
    }
}

function WikiContents(props) {
    const { wiki, env } = props;
    const { t } = env.locale;
    const [ open, setOpen ] = useState(false);
    const shown = useRef(false);
    if (open) {
        shown.current = true;
    }
    const page = useMemo(() => {
        if (shown.current) {
            const data = {
                slug: wiki.slug,
                title: wiki.details.title,
                markdown: wiki.details.content,
                resources: wiki.details.resources,
            };
            return MarkdownPage.create(data)
        }
    }, [ wiki, shown.current ]);
    const pageLocalized = useMemo(() => {
        if (page) {
            return page.filter(env.locale.localeCode);
        }
    }, [ page, env.locale ]);

    const handleToggleClick = useListener((evt) => {
        setOpen(!open);
    });

    return (
        <div className="section">
            {renderTitle()}
            {renderContents()}
        </div>
    );

    function renderTitle() {
        const dir = (open) ? 'up' : 'down';
        return (
            <h2 className="title-toggle" onClick={handleToggleClick}>
                {t('wiki-summary-page-contents')}
                {' '}
                <i className={`fa fa-angle-double-${dir}`} />
            </h2>
        );
    }

    function renderContents() {
        return (
            <CollapsibleContainer open={open}>
                <MarkdownPreview page={page} localized={pageLocalized} env={env} />
            </CollapsibleContainer>
        );
    }
}

const component = Relaks.memo(WikiSummaryPage);

export {
    component as default,
    component as WikiSummaryPage,
};

import _ from 'lodash';
import React, { useState, useRef, useMemo, useEffect } from 'react';
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
import { ImagePreviewDialogBox } from '../dialogs/image-preview-dialog-box.jsx';
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
    const wikis = await WikiFinder.findPublicWikis(database, schema);
    render();

    function render() {
        const sprops = { schema, project, wiki, wikis, repo };
        show(<WikiSummaryPageSync key={wikiID} {...sprops} {...props} />);
    }
}

function WikiSummaryPageSync(props) {
    const { schema, system, project, wiki, wikis, repo } = props;
    const { database, route, env, editing } = props;
    const { t } = env.locale;
    const [ error, run ] = useErrorCatcher();
    const [ confirmationRef, confirm ] = useConfirmation();
    const baseURL = _.get(repo, 'details.web_url');

    const handleEditClick = useListener((evt) => {
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
                {' '}
                {renderWikiLink()}
            </TextField>
        );
    }

    function renderWikiLink() {
        const slug = _.get(wiki, 'slug');
        if (!baseURL || !slug) {
            return;
        }
        const url = `${baseURL}/wikis/${slug}`;
        return (
            <a className="link" href={url} target="_blank">
                <i className="fa fa-external-link" />
            </a>
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
                {' '}
                {renderRepoLink()}
            </TextField>
        );
    }

    function renderRepoLink() {
        if (!baseURL) {
            return;
        }
        return (
            <a className="link" href={baseURL} target="_blank">
                <i className="fa fa-external-link" />
            </a>
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
            const props = { wiki, wikis, route, env };
            return <WikiContents {...props} />
        }
    }
}

const openedBefore = {};

function WikiContents(props) {
    const { wiki, wikis, env, route } = props;
    const { t } = env.locale;
    const [ open, setOpen ] = useState(() => {
        // show wiki contents when navigated from another wiki
        const prev = route.history[route.history.length - 2];
        if (prev && prev.name === route.name) {
            return true;
        } else {
            // see if it was opened before
            return !!openedBefore[route.path];
        }
    });
    const [ selectedImage, setSelectedImage ] = useState(null);
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
    const handleReference = useListener((evt) => {
        const selected = _.find(wikis, { slug: evt.href });
        if (selected) {
            const params = { ...route.params, wikiID: selected.id };
            const url = route.find('wiki-summary-page', params);
            return url;
        }
    });
    const handlePreviewClick = useListener((evt) => {
        const { tagName, src } = evt.target;
        if (tagName === 'IMG') {
            const image = page.image(src);
            if (image) {
                setSelectedImage(image);
            }
        }
    });
    const handleImagePreviewClose = useListener((evt) => {
        setSelectedImage(null);
    });

    useEffect(() => {
        openedBefore[route.path] = open;
    }, [ route, open ]);

    return (
        <div className="wiki-contents" onClick={handlePreviewClick}>
            {renderTitle()}
            {renderContents()}
            {renderDialogBox()}
        </div>
    );

    function renderTitle() {
        const dir = (open) ? 'up' : 'down';
        return (
            <h2>
                <span className="title-toggle" onClick={handleToggleClick}>
                    {t('wiki-summary-page-contents')}
                    {' '}
                    <i className={`fa fa-angle-double-${dir}`} />
                </span>
            </h2>
        );
    }

    function renderContents() {
        const props = {
            page,
            localized: pageLocalized,
            env,
            onReference: handleReference,
        };
        return (
            <CollapsibleContainer open={open}>
                <MarkdownPreview {...props} />
            </CollapsibleContainer>
        );
    }

    function renderDialogBox() {
        const props = {
            show: !!selectedImage,
            image: selectedImage,
            env,
            onClose: handleImagePreviewClose,
        };
        return <ImagePreviewDialogBox {...props} />;
    }
}

const component = Relaks.memo(WikiSummaryPage);

export {
    component as default,
    component as WikiSummaryPage,
};

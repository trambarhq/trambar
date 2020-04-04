import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useProgress, useListener, useErrorCatcher } from 'relaks';
import { GitlabWiki } from 'trambar-www';
import { findProject } from 'common/objects/finders/project-finder.js';
import { findProjectRepos } from 'common/objects/finders/repo-finder.js';
import { findWiki, findPublicWikis } from 'common/objects/finders/wiki-finder.js';
import { selectWiki, deselectWiki, saveWiki } from 'common/objects/savers/wiki-saver.js';
import { findLinkByRelative } from 'common/objects/utils/external-data-utils.js';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { URLLink } from '../widgets/url-link.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { MarkdownPreview } from '../widgets/markdown-preview.jsx';
import { ImagePreviewDialogBox } from '../dialogs/image-preview-dialog-box.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';

// custom hooks
import {
  useDraftBuffer,
  useValidation,
  useConfirmation,
  useDataLossWarning,
} from '../hooks.js';

import './wiki-summary-page.scss';

export default async function WikiSummaryPage(props) {
  const { database, projectID, wikiID } = props;
  const [ show ] = useProgress();

  render();
  const currentUserID = await database.start();
  const project = await findProject(database, projectID);
  const schema = project.name;
  const wiki = await findWiki(database, schema, wikiID);
  render();
  const repos = await findProjectRepos(database, project);
  const repo = repos.find((repo) => {
    return !!findLinkByRelative(repo, wiki, 'project');
  });
  render();
  const wikis = await findPublicWikis(database, schema);
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
  const readOnly = !editing;
  const draft = useDraftBuffer({
    original: wiki || {},
    reset: readOnly,
  });
  const [ problems, reportProblems ] = useValidation(!readOnly);
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const warnDataLoss = useDataLossWarning(route, env, confirm);
  const baseURL = repo?.details?.web_url;

  const handleEditClick = useListener((evt) => {
    route.replace({ editing: true });
  });
  const handleCancelClick = useListener((evt) => {
    route.replace({ editing: undefined });
  });
  const handleReturnClick = useListener((evt) => {
    route.push('wiki-list-page', { projectID: project.id });
  });
  const handleSelectClick = useListener((evt) => {
    run(async () => {
      await confirm(t('wiki-summary-confirm-select'));
      await selectWiki(database, schema, wiki);
    });
  });
  const handleDeselectClick = useListener((evt) => {
    run(async () => {
      await confirm(t('wiki-summary-confirm-deselect'));
      await deselectWiki(database, schema, wiki);
    });
  });
  const handleSaveClick = useListener((evt) => {
    run(async () => {
      const problems = {};
      reportProblems(problems);

      const wikiAfter = await saveWiki(database, schema, draft.current);
      warnDataLoss(false);
      route.replace({ editing: undefined });
    });
  });
  const handleHiddenOptionClick = useListener((evt) => {
    const hidden = (evt.name === 'true');
    draft.set('hidden', hidden);
  });

  warnDataLoss(draft.changed);

  const title = wiki?.details?.title ?? '';
  return (
    <div className="wiki-summary-page">
      {renderButtons()}
      <h2>{t('wiki-summary-$title', title)}</h2>
      <UnexpectedError error={error} />
      {renderForm()}
      {renderInstructions()}
      {renderContents()}
      <ActionConfirmation ref={confirmationRef} env={env} />
    </div>
  );

  function renderButtons() {
    if (readOnly) {
      const chosen = !!wiki?.chosen;
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
    } else {
      const { changed } = draft;
      return (
        <div className="buttons">
          <PushButton onClick={handleCancelClick}>
            {t('wiki-summary-cancel')}
          </PushButton>
          {' '}
          <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
            {t('wiki-summary-save')}
          </PushButton>
        </div>
      );
    }
  }

  function renderForm() {
    return (
      <div className="form">
        {renderTitle()}
        {renderSlug()}
        {renderRepo()}
        {renderPublic()}
        {renderHiddenSelector()}
      </div>
    );
  }

  function renderTitle() {
    const props = {
      id: 'title',
      value: wiki?.details?.title ?? '',
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
    const slug = wiki?.slug ?? '';
    const url = (baseURL && slug) ? `${baseURL}/wikis/${slug}` : '';
    const props = {
      id: 'slug',
      value: slug,
      readOnly: true,
      env,
    };
    return (
      <TextField {...props}>
        {t('wiki-summary-slug')}
        {' '}
        <URLLink url={url} />
      </TextField>
    );
  }

  function renderRepo() {
    const props = {
      id: 'repo',
      value: repo?.name ?? '',
      readOnly: true,
      env,
    };
    return (
      <TextField {...props}>
        {t('wiki-summary-repo')}
        {' '}
        <URLLink url={baseURL} />
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
      id: 'public',
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

  function renderHiddenSelector() {
    const listProps = {
      readOnly,
      onOptionClick: handleHiddenOptionClick,
    };
    return (
      <OptionList {...listProps}>
        <label>
          {t('wiki-summary-hidden')}
        </label>
        {[ false, true ].map(renderHiddenOption)}
      </OptionList>
    );
  }

  function renderHiddenOption(hidden, i) {
    const [ hiddenPrev, hiddenCurr ] = draft.getBoth('hidden', false);
    const props = {
      name: hidden,
      selected: (hiddenCurr === hidden),
      previous: (hiddenPrev === hidden),
    };
    return (
      <option key={i} {...props}>
        {t(`wiki-summary-hidden-${hidden}`)}
      </option>
    );
  }

  function renderContents() {
    if (wiki?.public) {
      const props = { wiki, wikis, route, env };
      return <WikiContents {...props} />
    }
  }

  function renderInstructions() {
    const instructionProps = {
      folder: 'wiki',
      topic: 'wiki-summary',
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

const openedBefore = {};

function WikiContents(props) {
  const { wiki, wikis, env, route } = props;
  const { t } = env.locale;
  const [ open, setOpen ] = useState(() => {
    // show wiki contents when navigated from another wiki
    const prev = route.history[route.history.length - 2];
    if (prev?.name === route.name) {
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
        title: {
          json: [ wiki.details.title ],
        },
        content: {
          json: wiki.details.json || [],
          resources: wiki.details.resources,
        },
      };
      return new GitlabWiki([], data)
    }
  }, [ wiki, shown.current ]);

  const handleToggleClick = useListener((evt) => {
    setOpen(!open);
  });
  const handleReference = useListener((evt) => {
    const selected = wikis.find(w => w.slug === evt.href);
    if (selected) {
      const params = { ...route.params, wikiID: selected.id };
      const url = route.find('wiki-summary-page', params);
      return url;
    }
  });
  const handlePreviewClick = useListener((evt) => {
    const { tagName, src } = evt.target;
    if (tagName === 'IMG') {
      const image = page.getImage(src);
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

import _ from 'lodash';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useProgress, useListener, useErrorCatcher } from 'relaks';
import { ExcelFile } from 'trambar-www';
import { findProject } from 'common/objects/finders/project-finder.js';
import { getWebsiteAddress } from 'common/objects/utils/project-utils.js';
import { findSpreadsheet } from 'common/objects/finders/spreadsheet-finder.js';
import { disableSpreadsheet, removeSpreadsheet, restoreSpreadsheet, saveSpreadsheet } from 'common/objects/savers/spreadsheet-saver.js';
import { getSpreadsheetName } from 'common/objects/utils/spreadsheet-utils.js';
import { fetch } from 'common/transport/http-request.js';

// widgets
import { PushButton } from '../widgets/push-button.jsx';
import { ComboButton } from '../widgets/combo-button.jsx';
import { CollapsibleContainer } from 'common/widgets/collapsible-container.jsx';
import { InstructionBlock } from '../widgets/instruction-block.jsx';
import { TextField } from '../widgets/text-field.jsx';
import { OptionList } from '../widgets/option-list.jsx';
import { URLLink } from '../widgets/url-link.jsx';
import { MultilingualTextField } from '../widgets/multilingual-text-field.jsx';
import { ExcelPreview } from '../widgets/excel-preview.jsx';
import { ImagePreviewDialogBox } from '../dialogs/image-preview-dialog-box.jsx';
import { InputError } from '../widgets/input-error.jsx';
import { ActionConfirmation } from '../widgets/action-confirmation.jsx';
import { UnexpectedError } from '../widgets/unexpected-error.jsx';
import { LoadingAnimation } from '../widgets/loading-animation.jsx';

// custom hooks
import {
  useDraftBuffer,
  useValidation,
  useConfirmation,
  useDataLossWarning,
} from '../hooks.js';

import './spreadsheet-summary-page.scss';

export default async function SpreadsheetSummaryPage(props) {
  const { database, projectID, spreadsheetID, env } = props;
  const creating = (spreadsheetID === 'new');
  const [ show ] = useProgress();
  const updateRequest = useRef(false);

  const handleFocus = useListener((evt) => {
    if (project && spreadsheet) {
      requestUpdate(project, spreadsheet, env);
    }
  });

  useEffect(() => {
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    }
  }, []);

  render();
  const currentUserID = await database.start();
  const project = await findProject(database, projectID);
  const schema = project.name;
  const spreadsheet = !creating ? await findSpreadsheet(database, schema, spreadsheetID) : null;
  render();

  if (!updateRequest.current) {
    updateRequest.current = requestUpdate(project, spreadsheet, env);
  }

  function render() {
    const sprops = { schema, project, spreadsheet, creating };
    show(<SpreadsheetSummaryPageSync key={spreadsheetID} {...sprops} {...props} />);
  }
}

function SpreadsheetSummaryPageSync(props) {
  const { schema, project, spreadsheet, users, creating } = props;
  const { database, route, env, editing } = props;
  const { t, p, localeCode } = env.locale;
  const readOnly = !editing && !creating;
  const [ adding, setAdding ] = useState(false);
  const draft = useDraftBuffer({
    original: spreadsheet || {},
    reset: readOnly,
  });
  const [ problems, reportProblems ] = useValidation(!readOnly);
  const [ error, run ] = useErrorCatcher();
  const [ confirmationRef, confirm ] = useConfirmation();
  const warnDataLoss = useDataLossWarning(route, env, confirm);
  const excel = useMemo(() => {
    if (spreadsheet) {
      if (!spreadsheet.disabled && !spreadsheet.deleted) {
        const file = new ExcelFile([], spreadsheet.details);
        return file.getLanguageSpecificSections(localeCode);
      }
    }
  }, [ spreadsheet, localeCode ]);

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
    route.push({ spreadsheetID: 'new' });
  });
  const handleReturnClick = useListener((evt) => {
    route.push('spreadsheet-list-page', { projectID: project.id });
  });
  const handleDisableClick = useListener((evt) => {
    run(async () => {
      await confirm(t('spreadsheet-summary-confirm-disable'));
      await disableSpreadsheet(database, schema, spreadsheet);
      handleReturnClick();
    });
  });
  const handleRemoveClick = useListener((evt) => {
    run(async () => {
      await confirm(t('spreadsheet-summary-confirm-delete'));
      await removeSpreadsheet(database, schema, spreadsheet);
      handleReturnClick();
    });
  });
  const handleRestoreClick = useListener((evt) => {
    run(async () => {
      await confirm(t('spreadsheet-summary-confirm-reactivate'));
      await restoreSpreadsheet(database, schema, spreadsheet);
    });
  });
  const handleSaveClick = useListener((evt) => {
    run(async () => {
      try {
        const problems = {};
        reportProblems(problems);

        const spreadsheetAfter = await saveSpreadsheet(database, schema, draft.current);
        if (spreadsheet?.url !== spreadsheetAfter.url) {
          requestUpdate(project, spreadsheetAfter, env);
        }

        if (creating) {
          setAdding(true);
        }
        warnDataLoss(false);
        route.replace({ editing: undefined, spreadsheetID: spreadsheetAfter.id });
      } catch (err) {
        if (err.statusCode === 409) {
          reportProblems({ name: 'validation-duplicate-spreadsheet-name' });
        } else {
          throw err;
        }
      }
    });
  });
  const handleNameChange = useListener((evt) => {
    const name = _.toLower(evt.target.value).replace(/[^\w\-]+/g, '');
    draft.set('name', name);
  });
  const handleURLChange = useListener((evt) => {
    const url = evt.target.value;
    draft.set('url', url);
  });
  const handleHiddenOptionClick = useListener((evt) => {
    const hidden = (evt.name === 'true');
    draft.set('hidden', hidden);
  });

  useEffect(() => {
    const msg = spreadsheet?.details?.error;
    if (msg) {
      run(() => { throw new ImportError(msg) });
    } else if (error instanceof ImportError) {
      run(() => {});
    }
  }, [ spreadsheet ]);

  warnDataLoss(draft.changed);

  const title = getSpreadsheetName(draft.current, env);
  return (
    <div className="spreadsheet-summary-page">
      {renderButtons()}
      <h2>{t('spreadsheet-summary-$title', title)}</h2>
      <UnexpectedError error={error} />
      {renderForm()}
      {renderInstructions()}
      {renderSheets()}
      <ActionConfirmation ref={confirmationRef} env={env} />
    </div>
  );

  function renderButtons() {
    if (readOnly) {
      const active = (spreadsheet) ? !spreadsheet.deleted && !spreadsheet.disabled : true;
      let preselected;
      if (active) {
        preselected = (adding) ? 'add' : 'return';
      } else {
        preselected = 'reactivate';
      }
      return (
        <div className="buttons">
          <ComboButton preselected={preselected}>
            <option name="return" onClick={handleReturnClick}>
              {t('spreadsheet-summary-return')}
            </option>
            <option name="add" onClick={handleAddClick}>
              {t('spreadsheet-summary-add')}
            </option>
            <option name="archive" disabled={!active} separator onClick={handleDisableClick}>
              {t('spreadsheet-summary-disable')}
            </option>
            <option name="delete" disabled={!active} onClick={handleRemoveClick}>
              {t('spreadsheet-summary-delete')}
            </option>
            <option name="reactivate" hidden={active} onClick={handleRestoreClick}>
              {t('spreadsheet-summary-reactivate')}
            </option>
          </ComboButton>
          {' '}
          <PushButton className="emphasis" onClick={handleEditClick}>
            {t('spreadsheet-summary-edit')}
          </PushButton>
        </div>
      );
    } else {
      const { changed } = draft;
      return (
        <div className="buttons">
          <PushButton onClick={handleCancelClick}>
            {t('spreadsheet-summary-cancel')}
          </PushButton>
          {' '}
          <PushButton className="emphasis" disabled={!changed} onClick={handleSaveClick}>
            {t('spreadsheet-summary-save')}
          </PushButton>
        </div>
      );
    }
  }

  function renderForm() {
    return (
      <div className="form">
        {renderURLInput()}
        {renderNameInput()}
        {renderFilename()}
        {renderTitle()}
        {renderDescription()}
        {renderHiddenSelector()}
      </div>
    );
  }

  function renderURLInput() {
    const url = draft.get('url', '');
    const props = {
      id: 'url',
      value: draft.get('url', ''),
      readOnly,
      env,
      onChange: handleURLChange,
    };
    return (
      <TextField {...props}>
        {t('spreadsheet-summary-url')}
        {' '}
        <URLLink url={url} />
      </TextField>
    );
  }

  function renderNameInput() {
    const props = {
      id: 'name',
      value: draft.get('name', ''),
      spellCheck: false,
      readOnly,
      env,
      onChange: handleNameChange,
    };
    return (
      <TextField {...props}>
        {t('spreadsheet-summary-name')}
        <InputError>{t(problems.name)}</InputError>
      </TextField>
    );
  }

  function renderFilename() {
    if (creating) {
      return;
    }
    const props = {
      id: 'filename',
      value: draft.get('details.filename', ''),
      readOnly: true,
      env,
    };
    return (
      <TextField {...props}>
        {t('spreadsheet-summary-filename')}
      </TextField>
    );
  }

  function renderTitle() {
    if (creating) {
      return;
    }
    const props = {
      id: 'title',
      value: draft.get('details.title', ''),
      readOnly: true,
      env,
    };
    return (
      <TextField {...props}>
        {t('spreadsheet-summary-title')}
      </TextField>
    );
  }

  function renderDescription() {
    if (creating) {
      return;
    }
    const props = {
      id: 'description',
      value: draft.get('details.description', ''),
      type: 'textarea',
      readOnly: true,
      env,
    };
    return (
      <TextField {...props}>
        {t('spreadsheet-summary-description')}
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
          {t('spreadsheet-summary-hidden')}
        </label>
        {_.map([ false, true ], renderHiddenOption)}
      </OptionList>
    );
  }

  function renderHiddenOption(hidden, i) {
    const hiddenCurr = draft.getCurrent('hidden', false);
    const hiddenPrev = draft.getOriginal('hidden', false);
    const props = {
      name: hidden,
      selected: (hiddenCurr === hidden),
      previous: (hiddenPrev === hidden),
    };
    return (
      <option key={i} {...props}>
        {t(`spreadsheet-summary-hidden-${hidden}`)}
      </option>
    );
  }

  function renderInstructions() {
    const instructionProps = {
      folder: 'spreadsheet',
      topic: 'spreadsheet-summary' + (creating ? '-new' : ''),
      hidden: readOnly,
      env,
    };
    return (
      <div className="instructions">
        <InstructionBlock {...instructionProps} />
      </div>
    );
  }

  function renderSheets() {
    if (excel) {
      if (!_.isEmpty(excel.sheets)) {
        return _.map(excel.sheets, renderSheet);
      } else {
        const error = spreadsheet?.details?.error;
        if (!error) {
          return (
            <div className="sheet">
              <LoadingAnimation />
            </div>
          );
        }
      }
    }
  }

  function renderSheet(sheet, i) {
    const props = {
      sheet,
      number: i + 1,
      route,
      env,
    };
    return <Sheet key={i} {...props} />
  }
}

const openedBefore = {};

function Sheet(props) {
  const { sheet, localized, number, route, env } = props;
  const { t } = env.locale;
  const [ open, setOpen ] = useState(() => {
    return !!openedBefore[route.path + number];
  });
  const [ selectedImage, setSelectedImage ] = useState(null);

  const handleToggleClick = useListener((evt) => {
    setOpen(!open);
  });
  const handlePreviewClick = useListener((evt) => {
    const { tagName, src } = evt.target;
    if (tagName === 'IMG') {
      const image = sheet.image(src);
      if (image) {
        setSelectedImage(image);
      }
    }
  });
  const handleImagePreviewClose = useListener((evt) => {
    setSelectedImage(null);
  });

  useEffect(() => {
    openedBefore[route.path + number] = open;
  }, [ open, route ]);

  return (
    <div className="sheet" onClick={handlePreviewClick}>
      {renderTitle()}
      {renderTable()}
      {renderDialogBox()}
    </div>
  );

  function renderTitle() {
    const dir = (open) ? 'up' : 'down';
    const { name, flags } = sheet;
    let label = name;
    if (!_.isEmpty(flags)) {
      label += ` (${_.join(flags, ', ')})`;
    }
    return (
      <h2>
        <span className="title-toggle" onClick={handleToggleClick}>
          {t('spreadsheet-summary-sheet-$number-$name', number, label)}
          {' '}
          <i className={`fa fa-angle-double-${dir}`} />
        </span>
      </h2>
    );
  }

  function renderTable() {
    return (
      <CollapsibleContainer open={open}>
        <ExcelPreview sheet={sheet} localized={localized} env={env} />
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

async function requestUpdate(project, spreadsheet, env) {
  if (spreadsheet.url && spreadsheet.name) {
    const baseURL = getWebsiteAddress(project);
    const relativeURL = ExcelFile.getObjectURL([ spreadsheet.name ]);
    const url = `${baseURL}${relativeURL}`;
    try {
      await fetch('HEAD', url);
    } catch (err) {
      console.error(err);
    }
  }
}

class ImportError extends Error {
}

import _ from 'lodash';
import React, { useState, useRef } from 'react';
import { useListener } from 'relaks';
import { FocusManager } from 'common/utils/focus-manager.js';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { PushButton } from '../widgets/push-button.jsx';
import { ImageEditor } from '../editors/image-editor.jsx';
import { MediaImporter } from '../editors/media-importer.jsx';
import Icon from 'octicons/build/svg/person.svg';

import './user-image-panel.scss';

/**
 * Panel for adding and changing the user's profile image.
 */
export function UserImagePanel(props) {
  const { env, payloads, userDraft } = props;
  const { t } = env.locale;
  const importerRef = useRef();
  const [ newImage, setNewImage ] = useState(null);
  const [ action, setAction ] = useState('');
  const existingResources = userDraft.get('details.resources', []);
  const existingImage = _.find(existingResources, { type: 'image' });

  const handleCancelClick = useListener((evt) => {
    setAction('');
    setNewImage(null);
  });
  const handleAdjustClick = useListener((evt) => {
    setAction('adjust');
  });
  const handleReplaceClick = useListener((evt) => {
    setAction('replace');
  });
  const handleTakeClick = useListener((evt) => {
    importerRef.current.capture('image');
  });
  const handleFileChange = useListener(async (evt) => {
    const { files } = evt.target;
    importerRef.current.importFiles(files);
  });
  const handleSaveClick = useListener((evt) => {
    if (newImage) {
      userDraft.set('details.resources', [ newImage ]);
      setNewImage(null);
      setAction('')
    }
  });
  const handleImageChange = useListener((evt) => {
    setNewImage(evt.resource);
  });
  const handleChange = useListener((evt) => {
    const image = evt.resources[0];
    if (image) {
      setNewImage(image);
      setAction('adjust');
    }
  });

  return (
    <SettingsPanel className="user-image">
      <header>
        <i className="fas fa-image" /> {t('settings-profile-image')}
      </header>
      <body>
        {renderProfilePicture()}
        {renderMediaImporter()}
      </body>
      <footer>
        {renderButtons()}
      </footer>
    </SettingsPanel>
  );

  function renderProfilePicture() {
    const image = newImage || existingImage;
    let contents;
    if (image) {
      const props = {
        resource: image,
        previewWidth: 256,
        previewHeight: 256,
        disabled: (action !== 'adjust'),
        env,
        onChange: handleImageChange,

      };
      contents = <ImageEditor {...props} />;
    } else {
      contents = <div className="no-image"><Icon /></div>;
    }
    return <div className="image-container">{contents}</div>;
  }

  function renderMediaImporter() {
    const props = {
      types: [ 'image' ],
      limit: 1,
      schema: 'global',
      resources: [],
      env,
      payloads: payloads.override({ schema: 'global' }),
      cameraDirection: 'front',
      onChange: handleChange,
    };
    return <MediaImporter ref={importerRef} {...props} />
  }

  function renderButtons() {
    let hasPicture = !!(newImage || existingImage);
    if (action === 'adjust' && hasPicture) {
      const cancelProps = {
        label: t('user-image-cancel'),
        onClick: handleCancelClick,
      };
      const saveProps = {
        label: t('user-image-save'),
        emphasized: true,
        disabled: !newImage,
        onClick: handleSaveClick,
      }
      return (
        <div key="adjust" className="buttons">
          <PushButton {...cancelProps} />
          <PushButton {...saveProps} />
        </div>
      );
    } else if (action === 'replace' && hasPicture) {
      const cancelProps = {
        label: t('user-image-cancel'),
        onClick: handleCancelClick,
      };
      const takeProps = {
        label: t('user-image-snap'),
        hidden: !_.includes(env.recorders, 'image'),
        onClick: handleTakeClick,
      };
      const selectProps = {
        label: t('user-image-select'),
        accept: 'image/*',
        onChange: handleFileChange,
      };
      return (
        <div key="replace" className="buttons">
          <PushButton {...cancelProps} />
          <PushButton {...takeProps} />
          <PushButton.File {...selectProps} />
        </div>
      );
    } else if (hasPicture) {
      const adjustProps = {
        label: t('user-image-adjust'),
        onClick: handleAdjustClick,
      };
      const replaceProps = {
        label: t('user-image-replace'),
        onClick: handleReplaceClick,
      };
      return (
        <div key="action" className="buttons">
          <PushButton {...adjustProps} />
          <PushButton {...replaceProps} />
        </div>
      );
    } else {
      const takeProps = {
        label: t('user-image-snap'),
        hidden: !_.includes(env.recorders, 'image'),
        onClick: handleTakeClick,
      };
      const selectProps = {
        label: t('user-image-select'),
        accept: 'image/*',
        onChange: handleFileChange,
      };
      return (
        <div key="add" className="buttons">
          <PushButton {...takeProps} />
          <PushButton.File {...selectProps} />
        </div>
      );
    }
  }
}

import Moment from 'moment';
import React from 'react';
import Bytes from 'bytes';
import round from 'lodash/round.js';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './payload-manager-panel.scss';

export function PayloadManagerPanel(props) {
  const { payloadManager } = props;
  const { payloads } = payloadManager;
  if (payloads.length === 0) {
    return null;
  }
  const pending = payloads.filter(p => p.started === false);
  const uploading = payloads.filter(p => p.started === true && !p.sent && !p.failed);
  const processing =  payloads.filter(p => p.sent && !p.completed);
  const failed = payloads.filter(p => p.failed);
  const completed = payloads.filter(p => p.completed);
  return (
    <SettingsPanel className="payload-manager">
      <header>
        <i className="fas fa-gear" /> Payloads
      </header>
      <body>
        <DiagnosticsSection label="Pending payloads" hidden={pending.length === 0}>
          {pending.map(renderPayload)}
        </DiagnosticsSection>
        <DiagnosticsSection label="Payloads in transit" hidden={uploading.length === 0}>
          {uploading.map(renderPayload)}
        </DiagnosticsSection>
        <DiagnosticsSection label="Payloads in backend process" hidden={processing.length === 0}>
          {processing.map(renderPayload)}
        </DiagnosticsSection>
        <DiagnosticsSection label="Failed payloads" hidden={failed.length === 0}>
          {failed.map(renderPayload)}
        </DiagnosticsSection>
        <DiagnosticsSection label="Completed payloads" hidden={completed.length === 0}>
          {completed.map(renderPayload)}
        </DiagnosticsSection>
      </body>
    </SettingsPanel>
  );

  function renderPayload(payload, index) {
    return (
      <div key={index}>
        <div>Payload ID: {payload.id}</div>
        <div>Resource type: {payload.type}</div>
        {renderTransferStatus(payload)}
        {renderBackendStatus(payload)}
        <ol>
          {payload.parts.map(renderPayloadPart)}
        </ol>
      </div>
    );
  }

  function renderTransferStatus(payload) {
    if (!payload.started) {
      return null;
    }
    if (payload.sent) {
      const elapsed = (Moment(payload.uploadEndTime) - Moment(payload.uploadStartTime)) * 0.001;
      const size = payload.getSize();
      let speed;
      if (size > 0) {
        speed = `(${Bytes(size / elapsed)} per sec)`;
      }
      const duration = round(elapsed, (elapsed < 1) ? 2 : 0) + 's';
      return <div>Upload duration: {duration} {speed}</div>;
    } else {
      const size = payload.getSize();
      const uploaded = payload.getUploaded();
      const progress = round(uploaded / size * 100 || 0) + '%';
      return <div>Upload progress: {progress}</div>;
    }
  }

  function renderBackendStatus(payload) {
    if (!payload.sent) {
      return null;
    }
    if (payload.completed) {
      const elapsed = (Moment(payload.processEndTime) - Moment(payload.uploadEndTime)) * 0.001;
      const duration = round(elapsed, (elapsed < 1) ? 2 : 0) + 's';
      return <div>Backend duration: {duration}</div>;
    } else {
      const progress = payload.processed + '%';
      return <div>Backend progress: {progress}</div>;
    }
  }

  function renderPayloadPart(part, index) {
    const name = part.name;
    let type;
    if (part.blob || part.cordovaFile) {
      type = 'File';
    } else if (part.stream) {
      type = 'Stream';
    } else if (part.url) {
      type = 'URL';
    } else {
      type = 'Unknown';
    }
    let size;
    if (part.size > 0) {
      size = <span className="file-size">{Bytes(part.size)}</span>;
    }
    return (
      <li key={index}>
        {type} - {name} {size}
      </li>
    );
  }
}

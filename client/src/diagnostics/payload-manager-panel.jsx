import _ from 'lodash';
import Moment from 'moment';
import React from 'react';

// widgets
import { SettingsPanel } from '../widgets/settings-panel.jsx';
import { DiagnosticsSection } from '../widgets/diagnostics-section.jsx';

import './payload-manager-panel.scss';

function PayloadManagerPanel(props) {
  const { payloadManager } = props;
  const { payloads } = payloadManager;
  if (_.isEmpty(payloads)) {
    return null;
  }
  const pending = _.filter(payloads, { started: false });
  const uploading = _.filter(payloads, { started: true, sent: false, failed: false });
  const processing =  _.filter(payloads, { sent: true, completed: false });
  const failed = _.filter(payloads, { failed: true });
  const completed = _.filter(payloads, { completed: true });
  return (
    <SettingsPanel className="payload-manager">
      <header>
        <i className="fa fa-gear" /> Payloads
      </header>
      <body>
        <DiagnosticsSection label="Pending payloads" hidden={_.isEmpty(pending)}>
          {_.map(pending, renderPayload)}
        </DiagnosticsSection>
        <DiagnosticsSection label="Payloads in transit" hidden={_.isEmpty(uploading)}>
          {_.map(uploading, renderPayload)}
        </DiagnosticsSection>
        <DiagnosticsSection label="Payloads in backend process" hidden={_.isEmpty(processing)}>
          {_.map(processing, renderPayload)}
        </DiagnosticsSection>
        <DiagnosticsSection label="Failed payloads" hidden={_.isEmpty(failed)}>
          {_.map(failed, renderPayload)}
        </DiagnosticsSection>
        <DiagnosticsSection label="Completed payloads" hidden={_.isEmpty(completed)}>
          {_.map(completed, renderPayload)}
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
          {_.map(payload.parts, renderPayloadPart)}
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
        speed = `(${fileSize(size / elapsed)} per sec)`;
      }
      const duration = _.round(elapsed, (elapsed < 1) ? 2 : 0) + 's';
      return <div>Upload duration: {duration} {speed}</div>;
    } else {
      const size = payload.getSize();
      const uploaded = payload.getUploaded();
      const progress = Math.round(uploaded / size * 100 || 0) + '%';
      return <div>Upload progress: {progress}</div>;
    }
  }

  function renderBackendStatus(payload) {
    if (!payload.sent) {
      return null;
    }
    if (payload.completed) {
      const elapsed = (Moment(payload.processEndTime) - Moment(payload.uploadEndTime)) * 0.001;
      const duration = _.round(elapsed, (elapsed < 1) ? 2 : 0) + 's';
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
      size = <span className="file-size">{fileSize(part.size)}</span>;
    }
    return (
      <li key={index}>
        {type} - {name} {size}
      </li>
    );
  }
}

function fileSize(bytes) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${_.round(bytes / (1024 * 1024 * 1024))} GB`;
  } else if (bytes >= 1024 * 1024) {
    return `${_.round(bytes / (1024 * 1024))} MB`;
  } else if (bytes >= 1024) {
    return `${_.round(bytes / 1024)} KB`;
  } else if (bytes > 0) {
    return `${bytes} bytes`;
  } else {
    return '0';
  }
}

export {
  PayloadManagerPanel as default,
  PayloadManagerPanel,
};

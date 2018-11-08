import _ from 'lodash';
import Moment from 'moment';
import React, { Component } from 'react';

// widgets
import SettingsPanel from 'widgets/settings-panel';
import DiagnosticsSection from 'widgets/diagnostics-section';

import './payload-manager-panel.scss';

class PayloadManagerPanel extends Component {
    static displayName = 'PayloadManagerPanel';

    /**
     * Render diagnostics
     *
     * @return {ReactElement|null}
     */
    render() {
        let { payloadManager } = this.props;
        let { payloads } = payloadManager;
        if (_.isEmpty(payloads)) {
            return null;
        }
        let pending = _.filter(payloads, { started: false });
        let uploading = _.filter(payloads, { started: true, sent: false, failed: false });
        let processing =  _.filter(payloads, { sent: true, completed: false });
        let failed = _.filter(payloads, { failed: true });
        let completed = _.filter(payloads, { completed: true });
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
    }
}

/**
 * Render diagnostics for a payload
 *
 * @param  {Payload} payload
 * @param  {Number} index
 *
 * @return {ReactElement}
 */
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

/**
 * Render either the upload progress or the duration if it's done
 *
 * @param  {[type]} payload
 *
 * @return {ReactElement|null}
 */
function renderTransferStatus(payload) {
    if (!payload.started) {
        return null;
    }
    if (payload.sent) {
        let elapsed = (Moment(payload.uploadEndTime) - Moment(payload.uploadStartTime)) * 0.001;
        let speed;
        let size = payload.getSize();
        if (size > 0) {
            speed = `(${fileSize(size / elapsed)} per sec)`;
        }
        let duration = _.round(elapsed, (elapsed < 1) ? 2 : 0) + 's';
        return <div>Upload duration: {duration} {speed}</div>;
    } else {
        let size = payload.getSize();
        let uploaded = payload.getUploaded();
        let progress = Math.round(uploaded / size * 100 || 0) + '%';
        return <div>Upload progress: {progress}</div>;
    }
}

/**
 * Render either the backend progress or the duration if it's done
 *
 * @param  {Payload} payload
 *
 * @return {ReactElement|null}
 */
function renderBackendStatus(payload) {
    if (!payload.sent) {
        return null;
    }
    if (payload.completed) {
        let elapsed = (Moment(payload.processEndTime) - Moment(payload.uploadEndTime)) * 0.001;
        let duration = _.round(elapsed, (elapsed < 1) ? 2 : 0) + 's';
        return <div>Backend duration: {duration}</div>;
    } else {
        let progress = payload.processed + '%';
        return <div>Backend progress: {progress}</div>;
    }
}

/**
 * Render diagnostics for a part of a payload
 *
 * @param  {Object} part
 * @param  {Number} index
 *
 * @return {ReactElement}
 */
function renderPayloadPart(part, index) {
    let type;
    let name = part.name;
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

import PayloadManager from 'transport/payload-manager';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    PayloadManagerPanel.propTypes = {
        payloadManager: PropTypes.instanceOf(PayloadManager),
    };
}

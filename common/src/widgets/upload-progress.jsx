import _ from 'lodash';
import React from 'react';

import './upload-progress.scss';

/**
 * A warning message that appears when file upload is in progress. Designed
 * to be shown when a beforeunload event occurs and we need to warn the user.
 */
function UploadProgress(props) {
    const { env, payloads } = props;
    const { t } = env.locale;
    if (!payloads.uploading) {
        return null;
    }
    const size = _.fileSize(payloads.uploading.bytes);
    const count = payloads.uploading.files;
    return (
        <div className="upload-progress">
            {t('upload-progress-uploading-$count-files-$size-remaining', count, size)}
        </div>
    );
}

export {
    UploadProgress,
};

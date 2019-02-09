import _ from 'lodash';
import React, { PureComponent } from 'react';

import './upload-progress.scss';

/**
 * A warning message that appears when file upload is in progress. Designed
 * to be shown when a beforeunload event occurs and we need to warn the user.
 *
 * @extends {PureComponent}
 */
class UploadProgress extends PureComponent {
    static displayName = 'UploadProgress';

    /**
     * Render component if uploading is in progress
     *
     * @return {ReactElement|null}
     */
    render() {
        let { env, payloads } = this.props;
        let { t } = env.locale;
        if (!payloads.uploading) {
            return null;
        }
        let size = _.fileSize(payloads.uploading.bytes);
        let count = payloads.uploading.files;
        return (
            <div className="upload-progress">
                {t('upload-progress-uploading-$count-files-$size-remaining', count, size)}
            </div>
        );
    }
}

import Environment from 'env/environment';
import Payloads from 'transport/payloads';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    UploadProgress.propTypes = {
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
    };
}

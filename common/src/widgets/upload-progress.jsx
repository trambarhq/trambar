var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Payloads = require('transport/payloads');

require('./upload-progress.scss');

module.exports = React.createClass({
    displayName: 'UploadProgress',
    propTypes: {
        payloads: PropTypes.instanceOf(Payloads).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
    },

    /**
     * Render component if uploading is in progress
     *
     * @return {ReactElement|null}
     */
    render: function() {
        var t = this.props.locale.translate;
        var uploading = this.props.payloads.uploading;
        if (!uploading) {
            return null;
        }
        var size = getFileSize(uploading.bytes);
        var count = uploading.files;
        return (
            <div className="upload-progress">
                {t('upload-progress-uploading-$count-files-$size-remaining', count, size)}
            </div>
        );
    },
})

function getFileSize(bytes) {
    if (bytes < 1024) {
        return bytes + 'B';
    }
    var kilobytes = bytes / 1024;
    if (kilobytes < 1024) {
        return _.round(kilobytes) + 'KB';
    }
    var megabytes = kilobytes / 1024;
    if (megabytes < 1024) {
        return _.round(megabytes, 1) + 'MB';
    }
    var gigabytes = megabytes / 1024;
    return _.round(gigabytes, 2) + 'GB';
}

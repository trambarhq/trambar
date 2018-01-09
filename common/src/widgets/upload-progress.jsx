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
        var size = _.fileSize(uploading.bytes);
        var count = uploading.files;
        return (
            <div className="upload-progress">
                {t('upload-progress-uploading-$count-files-$size-remaining', count, size)}
            </div>
        );
    },
})

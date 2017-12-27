var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var BlobManager = require('transport/blob-manager');

var Locale = require('locale/locale');

module.exports = React.createClass({
    displayName: 'VideoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,

        locale: PropTypes.instanceOf(Locale).isRequired,

        onCancel: PropTypes.func,
        onCapture: PropTypes.func,
    },

    statics: {
        /**
         * Return true if the browser has the necessary functionalities
         *
         * @return {Boolean}
         */
        isAvailable: function() {
            return true;
        },
    },

    /**
     * Render function
     *
     * @return {null}
     */
    render: function() {
        return null;
    }
});

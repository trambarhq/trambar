var React = require('react'), PropTypes = React.PropTypes;
var ComponentRefs = require('utils/component-refs');

// widgets
var Overlay = require('widgets/overlay');

require('./photo-capture-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'PhotoCaptureDialogBox',
    propTypes: {
        show: PropTypes.bool,
        onCancel: PropTypes.func,
        onCapture: PropTypes.func,
    },
    components: ComponentRefs({
        video: HTMLVideoElement
    }),

    render: function() {
        var setters = this.components.setters;
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.handleCancelClick,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="photo-capture-dialog">
                    <video ref={setters.video} />
                </div>
            </Overlay>
        );
    },

    componentDidUpdate: function(prevProps, prevState) {
        if (!prevProps.show && this.props.show) {
            var constraints = { video: true };
            navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
                var video = this.components.video;
                video.srcObject = stream;
                video.onloadedmetadata = function(e) {
                    video.play();
                };
            }).catch(function(err) {
            });
        }
    },

    handleCancelClick: function(evt) {
        if (this.props.onCancel) {
            this.props.onCancel({
                type: 'cancel',
                target: this,
            });
        }
    },
});

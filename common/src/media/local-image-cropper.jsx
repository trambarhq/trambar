var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

var LocalImageDisplay = require('media/local-image-display');

require('./local-image-cropper.scss');

module.exports = React.createClass({
    displayName: 'LocalImageDisplay',
    propTypes: {
        file: PropTypes.instanceOf(Blob).isRequired,
        clippingRect: PropTypes.object.isRequired,
        onChange: PropTypes.func,
    },

    getInitialState: function() {
        return {
            clippingRect: this.props.clippingRect
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.file !== nextProps.file || this.props.clippingRect !== nextProps.clippingRect) {
            this.setState({ clippingRect: nextProps.clippingRect });
        }
    },

    render: function() {
        var containerProps = {
            ref: this.setDOMNode,
            className: 'local-image-cropper',
            onMouseDown: this.handleMouseDown,
            onMouseUp: this.handleMouseUp,
            onWheel: this.handleMouseWheel,
        };
        var imageProps = {
            file: this.props.file,
            clippingRect: this.state.clippingRect,
            onLoad: this.handleImageLoad,
        };
        return (
            <div {...containerProps}>
                <LocalImageDisplay {...imageProps} />
            </div>
        );
    },

    setDOMNode: function(node) {
        this.domNode = node;
    },

    componentWillUnmount: function() {
        this.domNode = null;
        if (this.dragStart) {
            this.handleMouseUp();
        }
        if (this.changeTimeout) {
            clearTimeout(this.changeTimeout);
        }
    },

    triggerChangeEvent: function(clippingRect) {
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                rect: clippingRect,
            });
        }
    },

    triggerChangeEventDeferred: function(clippingRect) {
        if (this.changeTimeout) {
            clearTimeout(this.changeTimeout);
        }
        this.changeTimeout = setTimeout(() => {
            this.triggerChangeEvent(clippingRect);
        }, 1000)
    },

    handleImageLoad: function(evt) {
        this.imageSize = {
            width: evt.target.width,
            height: evt.target.height,
            naturalWidth: evt.target.naturalWidth,
            naturalHeight: evt.target.naturalHeight,
        };
    },

    handleMouseDown: function(evt) {
        var rect = this.domNode.getBoundingClientRect();
        this.dragStart = {
            clippingRect: this.state.clippingRect,
            pageX: evt.pageX,
            pageY: evt.pageY,
            scale: {
                x: this.imageSize.width / rect.width,
                y: this.imageSize.height / rect.height,
            }
        };
        document.addEventListener('mousemove', this.handleMouseMove);
    },

    handleMouseMove: function(evt) {
        evt.preventDefault();

        // just in case an event manages to slip through
        if (!this.dragStart) {
            return;
        }
        var diff = {
            x: evt.pageX - this.dragStart.pageX,
            y: evt.pageY - this.dragStart.pageY,
        };
        var clippingRect = _.clone(this.dragStart.clippingRect);
        clippingRect.left -= Math.round(diff.x * this.dragStart.scale.x);
        clippingRect.top -= Math.round(diff.y * this.dragStart.scale.y);

        // keep rect within the image
        constrainPosition(clippingRect, this.imageSize.naturalWidth, this.imageSize.naturalHeight);
        this.setState({ clippingRect });
    },

    handleMouseUp: function(evt) {
        document.removeEventListener('mousemove', this.handleMouseMove);
        if (!_.isEqual(this.props.clippingRect, this.state.clippingRect)) {
            this.triggerChangeEventDeferred(this.state.clippingRect);
        }
        this.dragStart = null;
    },

    handleMouseWheel: function(evt) {
        evt.preventDefault();

        var rect = this.domNode.getBoundingClientRect();
        var scale = {
            x: this.imageSize.width / rect.width,
            y: this.imageSize.height / rect.height,
        };
        var delta = (evt.deltaY * scale.y) / 4;
        var clippingRect = _.clone(this.state.clippingRect);
        // prevent expansion of the clipping rect that'd that it outside the image
        if (clippingRect.width + delta > this.imageSize.naturalWidth) {
            delta = this.imageSize.naturalWidth - clippingRect.width;
        }
        if (clippingRect.height + delta > this.imageSize.naturalHeight) {
            delta = this.imageSize.naturalHeight - clippingRect.height;
        }
        clippingRect.width += delta;
        clippingRect.height += delta;

        // center the change at the mouse cursor
        var cursorPos = {
            x: evt.pageX - rect.left,
            y: evt.pageY - rect.top
        };
        var diff = {
            x: cursorPos.x * (delta / this.imageSize.width),
            y: cursorPos.y * (delta / this.imageSize.height),
        };
        clippingRect.left -= Math.round(diff.x * scale.x);
        clippingRect.top -= Math.round(diff.y * scale.y);
        constrainPosition(clippingRect, this.imageSize.naturalWidth, this.imageSize.naturalHeight);
        this.setState({ clippingRect });
        this.triggerChangeEventDeferred(clippingRect);

        // if the zooming occur during dragging, update the drag-start state
        if (this.dragStart) {
            this.dragStart = {
                clippingRect,
                pageX: evt.pageX,
                pageY: evt.pageY,
                scale
            };
        }
    },
});

function constrainPosition(clippingRect, imageWidth, imageHeight) {
    if (clippingRect.left < 0) {
        clippingRect.left = 0;
    } else if (clippingRect.left + clippingRect.width > imageWidth) {
        clippingRect.left = imageWidth - clippingRect.width;
    }
    if (clippingRect.top < 0) {
        clippingRect.top = 0;
    } else if (clippingRect.top + clippingRect.height > imageHeight) {
        clippingRect.top = imageHeight - clippingRect.height;
    }
}

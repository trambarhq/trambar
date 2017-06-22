var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var ComponentRefs = require('utils/component-refs');

var LocalImageDisplay = require('media/local-image-display');

require('./local-image-cropper.scss');

module.exports = React.createClass({
    displayName: 'LocalImageDisplay',
    propTypes: {
        file: PropTypes.instanceOf(Blob).isRequired,
        clippingRect: PropTypes.object.isRequired,
        onChange: PropTypes.func,
    },
    components: ComponentRefs({
        container: HTMLElement,
        image: LocalImageDisplay,
    }),

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
        var setters = this.components.setters;
        var containerProps = {
            ref: setters.container,
            className: 'local-image-cropper',
            onMouseDown: this.handleMouseDown,
            onMouseUp: this.handleMouseUp,
            onWheel: this.handleMouseWheel,
        };
        var imageProps = {
            ref: setters.image,
            file: this.props.file,
            clippingRect: this.state.clippingRect,
        };
        return (
            <div {...containerProps}>
                <LocalImageDisplay {...imageProps} />
            </div>
        );
    },

    componentWillUnmount: function() {
        if (this.dragStart) {
            this.handleMouseUp();
        }
        if (this.changeTimeout) {
            clearTimeout(this.changeTimeout);
        }
    },

    triggerChangeEvent: function(clippingRect) {
        if (!_.isEqual(this.props.clippingRect, clippingRect)) {
            return;
        }
        if (this.props.onChange) {
            this.props.onChange({
                type: 'change',
                target: this,
                rect: clippingRect,
            });
        }
    },

    handleMouseDown: function(evt) {
        var image = this.components.image;
        var container = this.components.container;
        var rect = container.getBoundingClientRect();
        this.dragStart = {
            clippingRect: this.state.clippingRect,
            pageX: evt.pageX,
            pageY: evt.pageY,
            scale: {
                x: image.width / rect.width,
                y: image.height / rect.height,
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
        var image = this.components.image;
        var clippingRect = _.clone(this.dragStart.clippingRect);
        clippingRect.left -= Math.round(diff.x * this.dragStart.scale.x);
        clippingRect.top -= Math.round(diff.y * this.dragStart.scale.y);

        // keep rect within the image
        constrainPosition(clippingRect, image.naturalWidth, image.naturalHeight);
        this.setState({ clippingRect });
    },

    handleMouseUp: function(evt) {
        document.removeEventListener('mousemove', this.handleMouseMove);
        this.triggerChangeEvent(this.state.clippingRect);
        this.dragStart = null;
    },

    handleMouseWheel: function(evt) {
        evt.preventDefault();

        var image = this.components.image;
        var container = this.components.container;
        var rect = container.getBoundingClientRect();
        var scale = {
            x: image.width / rect.width,
            y: image.height / rect.height,
        };
        var delta = (evt.deltaY * scale.y) / 4;
        var clippingRect = _.clone(this.state.clippingRect);
        // prevent expansion of the clipping rect that'd that it outside the image
        if (clippingRect.width + delta > image.naturalWidth) {
            delta = image.naturalWidth - clippingRect.width;
        }
        if (clippingRect.height + delta > image.naturalHeight) {
            delta = image.naturalHeight - clippingRect.height;
        }
        clippingRect.width += delta;
        clippingRect.height += delta;

        // center the change at the mouse cursor
        var cursorPos = {
            x: evt.pageX - rect.left,
            y: evt.pageY - rect.top
        };
        var diff = {
            x: cursorPos.x * (delta / image.width),
            y: cursorPos.y * (delta / image.height),
        };
        clippingRect.left -= Math.round(diff.x * scale.x);
        clippingRect.top -= Math.round(diff.y * scale.y);
        constrainPosition(clippingRect, image.naturalWidth, image.naturalHeight);
        this.setState({ clippingRect });
        this.triggerChangeEvent(clippingRect);

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

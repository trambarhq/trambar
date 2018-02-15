var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');
var Hammer = require('hammerjs');
var ComponentRefs = require('utils/component-refs');

var ImageView = require('media/image-view');

require('./image-cropper.scss');

module.exports = React.createClass({
    displayName: 'ImageCropper',
    propTypes: {
        url: PropTypes.string.isRequired,
        clippingRect: PropTypes.object,
        aspectRatio: PropTypes.number,
        onChange: PropTypes.func,
        onLoad: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            aspectRatio: 1
        };
    },

    /**
     * Return inital state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            container: HTMLElement,
            image: ImageView,
        });
        return {
            clippingRect: this.props.clippingRect,
            hasFocus: false,
        };
    },

    /**
     * Update state when props changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.url !== nextProps.url || this.props.clippingRect !== nextProps.clippingRect) {
            if (this.zoomChangeTimeout) {
                // set the deferred zoom changes before we switch to a different image
                clearTimeout(this.zoomChangeTimeout);
                if (this.props.url !== nextProps.url) {
                    this.triggerChangeEvent(this.state.clippingRect);
                }
            }
            this.setState({ clippingRect: nextProps.clippingRect });
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var setters = this.components.setters;
        var containerProps = {
            ref: setters.container,
            className: 'image-cropper',
            tabIndex: 0,
            onMouseDown: this.handleMouseDown,
            onFocus: this.handleFocus,
            onBlur: this.handleBlur,
            onWheel: (this.state.hasFocus) ? this.handleMouseWheel : null,
            onKeyDown: (this.state.hasFocus) ? this.handleKeyDown : null,
        };
        var imageProps = {
            ref: setters.image,
            url: this.props.url,
            clippingRect: this.state.clippingRect,
            onLoad: this.props.onLoad,
        };
        return (
            <div {...containerProps}>
                <ImageView {...imageProps} />
            </div>
        );
    },

    /**
     * Add Hammer.js touch handling to container div
     */
    activateTouchHandling: function() {
        var container = this.components.container;
        if (!container) {
            return;
        }
        if (this.hammer) {
            return;
        }
        this.hammer = new Hammer(container);
        var pan = this.hammer.get('pan').set({
            direction: Hammer.DIRECTION_ALL,
            threshold: 5
        });
        var pinch = this.hammer.get('pinch').set({
            enable: true
        });
        pinch.recognizeWith(pan);
        this.hammer.on('panstart', this.handlePanStart);
        this.hammer.on('panmove', this.handlePanMove);
        this.hammer.on('panend', this.handlePanEnd);
        this.hammer.on('pinchstart', this.handlePinchStart);
        this.hammer.on('pinchmove', this.handlePinchMove);
        this.hammer.on('pinchend', this.handlePinchEnd)
    },

    /**
     * Remove Hammer.js touch handling from container div
     */
    deactivateTouchHandling: function() {
        if (!this.hammer) {
            return;
        }
        this.hammer.off('panstart', this.handlePanStart);
        this.hammer.off('panmove', this.handlePanMove);
        this.hammer.off('panend', this.handlePanEnd);
        this.hammer.off('pinchstart', this.handlePinchStart);
        this.hammer.off('pinchmove', this.handlePinchMove);
        this.hammer.off('pinchend', this.handlePinchEnd)
        this.hammer.stop(true);
        // Hammer.js doesn't clear this
        this.hammer.element.style.touchAction = '';
        this.hammer.destroy();
        this.hammer = null;
    },

    /**
     * Activate touch handling when container div gains focus
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!prevState.hasFocus && this.state.hasFocus) {
            this.activateTouchHandling();
        } else if (prevState.hasFocus && !this.state.hasFocus) {
            this.deactivateTouchHandling();
        }
    },

    /**
     * Remove handler and timeout function on unmount
     */
    componentWillUnmount: function() {
        if (this.dragStart) {
            this.handleMouseUp();
        }
        if (this.zoomChangeTimeout) {
            clearTimeout(this.zoomChangeTimeout);
            this.triggerChangeEvent(this.state.clippingRect);
        }
        this.deactivateTouchHandling();
    },

    /**
     * Inform parent component that clipping rect has changed
     *
     * @param  {Object} clippingRect
     */
    triggerChangeEvent: function(clippingRect) {
        if (_.isEqual(this.props.clippingRect, clippingRect)) {
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

    /**
     * Called when container div gains focus
     *
     * @param  {Event} evt
     */
    handleFocus: function(evt) {
        this.setState({ hasFocus: true });
    },

    /**
     * Called when container div loses focus
     *
     * @param  {Event} evt
     */
    handleBlur: function(evt) {
        this.setState({ hasFocus: false });
    },

    /**
     * Called when user presses down on mouse button
     *
     * @param  {Event} evt
     */
    handleMouseDown: function(evt) {
        if (evt.button !== 0) {
            // not the primary mouse button (usually left)
            return;
        }
        var image = this.components.image;
        var container = this.components.container;
        if (!image || !container || !this.state.clippingRect) {
            return;
        }
        var boundingRect = container.getBoundingClientRect();
        var clippingRect = this.state.clippingRect;
        this.dragStart = {
            clippingRect: clippingRect,
            boundingRect: boundingRect,
            pageX: evt.pageX,
            pageY: evt.pageY,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
        };
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    },

    /**
     * Called when user moves the mouse with button down
     *
     * @param  {Event} evt
     */
    handleMouseMove: function(evt) {
        evt.preventDefault();

        // just in case an event manages to slip through
        if (!this.dragStart) {
            return;
        }
        var offset = {
            x: this.dragStart.pageX - evt.pageX,
            y: this.dragStart.pageY - evt.pageY,
        };
        var boundingRect = this.dragStart.boundingRect;
        var clippingRect = _.clone(this.dragStart.clippingRect);
        var dX = offset.x * clippingRect.width / boundingRect.width;
        var dY = offset.y * clippingRect.height / boundingRect.height;
        clippingRect.left += Math.round(dX);
        clippingRect.top += Math.round(dY);

        // keep rect within the image
        constrainPosition(clippingRect, this.dragStart.naturalWidth, this.dragStart.naturalHeight);
        this.setState({ clippingRect });
    },

    /**
     * Called when user releases mouse button
     *
     * @param  {Event} evt
     */
    handleMouseUp: function(evt) {
        if (!this.dragStart) {
            return;
        }
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        this.triggerChangeEvent(this.state.clippingRect);
        this.dragStart = null;
    },

    /**
     * Called when user moves the mouse wheel
     *
     * @param  {Event} evt
     */
    handleMouseWheel: function(evt) {
        evt.preventDefault();

        var image = this.components.image;
        var container = this.components.container;
        if (!image || !container || !this.state.clippingRect) {
            return;
        }
        var divider = 4;
        if (evt.shiftKey) {
            // faster zoom when shift is pressed
            divider = 1;
        }
        var boundingRect = container.getBoundingClientRect();
        var clippingRect = _.clone(this.state.clippingRect);
        var deltaY;
        switch (evt.deltaMode) {
            case 0: // pixel
                deltaY = evt.deltaY;
                break;
            case 1: // line
                deltaY = evt.deltaY * 18;
                break;
            case 2: // page
                deltaY = evt.deltaY * 480;
                break;
        }
        var expansion = Math.round((deltaY * clippingRect.height / boundingRect.height) / divider);
        var newClippingWidth = clippingRect.width + expansion;
        // prevent expansion of the clipping rect that'd that it outside the image
        if (newClippingWidth > image.naturalWidth) {
            newClippingWidth = image.naturalWidth;
            expansion = newClippingWidth - clippingRect.width;
        }
        var newClippingHeight = clippingRect.height + expansion;
        if (newClippingHeight > image.naturalHeight) {
            newClippingHeight = image.naturalHeight;
            expansion = newClippingHeight - clippingRect.height;
            newClippingWidth = clippingRect.width + expansion;
        }

        // center the change at the mouse cursor
        var cursorPos = {
            x: evt.pageX - boundingRect.left,
            y: evt.pageY - boundingRect.top
        };
        var dX = - cursorPos.x * expansion / boundingRect.width;
        var dY = - cursorPos.y * expansion / boundingRect.height;
        clippingRect.left += Math.round(dX);
        clippingRect.top += Math.round(dY);
        clippingRect.width = newClippingWidth;
        clippingRect.height = newClippingHeight;
        constrainPosition(clippingRect, image.naturalWidth, image.naturalHeight);
        this.setState({ clippingRect }, () => {
            if (this.zoomChangeTimeout) {
                clearTimeout(this.zoomChangeTimeout);
            }
            this.zoomChangeTimeout = setTimeout(() => {
                this.triggerChangeEvent(clippingRect);
                this.zoomChangeTimeout = 0;
            }, 1000);
        });

        // if the zooming occur during dragging, update the drag-start state
        if (this.dragStart) {
            this.dragStart = {
                clippingRect,
                boundingRect,
                pageX: evt.pageX,
                pageY: evt.pageY,
                naturalWidth: image.naturalWidth,
                naturalHeight: image.naturalHeight,
            };
        }
    },

    /**
     * Called when multitouch panning starts
     *
     * @param  {HammerEvent} evt
     */
    handlePanStart: function(evt) {
        if (evt.pointerType === 'mouse') {
            // don't handle mouse events through Hammer
            return;
        }
        var image = this.components.image;
        var container = this.components.container;
        if (!image || !container || !this.state.clippingRect) {
            return;
        }
        var boundingRect = container.getBoundingClientRect();
        var clippingRect = this.state.clippingRect;
        this.panStart = {
            clippingRect: clippingRect,
            boundingRect: boundingRect,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
        };
        this.handlePanMove(evt);
    },

    /**
     * Called during multitouch panning
     *
     * @param  {HammerEvent} evt
     */
    handlePanMove: function(evt) {
        if (!this.panStart) {
            return;
        }
        var boundingRect = this.panStart.boundingRect;
        var clippingRect = _.clone(this.panStart.clippingRect);
        var dX = - evt.deltaX * clippingRect.width / boundingRect.width;
        var dY = - evt.deltaY * clippingRect.height / boundingRect.height;
        clippingRect.left += Math.round(dX);
        clippingRect.top += Math.round(dY);
        constrainPosition(clippingRect, this.panStart.naturalWidth, this.panStart.naturalHeight);
        this.setState({ clippingRect });
    },

    /**
     * Called when multitouch panning ends
     *
     * @param  {HammerEvent} evt
     */
    handlePanEnd: function(evt) {
        if (!this.panStart) {
            return;
        }
        this.triggerChangeEvent(this.state.clippingRect);
        this.panStart = null;
    },

    /**
     * Called when multitouch pinching starts
     *
     * @param  {HammerEvent} evt
     */
    handlePinchStart: function(evt) {
        if (evt.pointerType === 'mouse') {
            return;
        }
        var image = this.components.image;
        var container = this.components.container;
        if (!image || !container || !this.state.clippingRect) {
            return;
        }
        var boundingRect = container.getBoundingClientRect();
        var clippingRect = this.state.clippingRect;
        this.pinchStart = {
            clippingRect: clippingRect,
            boundingRect: boundingRect,
            pointers: _.map(evt.pointers, (pointer) => {
                return {
                    pageX: pointer.pageX,
                    pageY: pointer.pageY,
                };
            })
        };
        this.handlePinchMove(evt);
    },

    /**
     * Called during multitouch pinching
     *
     * @param  {HammerEvent} evt
     */
    handlePinchMove: function(evt) {
        if (!this.pinchStart) {
            return;
        }
        var image = this.components.image;
        var clippingRect = _.clone(this.pinchStart.clippingRect);
        var boundingRect = this.pinchStart.boundingRect;
        var scale = 1 / evt.scale;
        var newClippingWidth = Math.round(clippingRect.width * scale);
        if (newClippingWidth > image.naturalWidth) {
            newClippingWidth = image.naturalWidth;
            scale = newClippingWidth / clippingRect.width;
        }
        var newClippingHeight = Math.round(clippingRect.height * scale);
        if (newClippingHeight > image.naturalHeight) {
            newClippingHeight = image.naturalHeight;
            scale = newClippingHeight / clippingRect.height;
            newClippingWidth = Math.round(clippingRect.width * scale);
        }

        // try to keep the pointers to the same place on the image
        var p1B = {
            x: this.pinchStart.pointers[0].pageX - boundingRect.left,
            y: this.pinchStart.pointers[0].pageY - boundingRect.top,
        };
        var p2B = {
            x: this.pinchStart.pointers[1].pageX - boundingRect.left,
            y: this.pinchStart.pointers[1].pageY - boundingRect.top,
        };
        var p1A = {
            x: evt.pointers[0].pageX - boundingRect.left,
            y: evt.pointers[0].pageY - boundingRect.top,
        };
        var p2A = {
            x: evt.pointers[1].pageX - boundingRect.left,
            y: evt.pointers[1].pageY - boundingRect.top,
        };
        // calculate the offsets using each pointer
        var dX1 = (p1B.x * clippingRect.width - p1A.x * newClippingWidth) / boundingRect.width;
        var dX2 = (p2B.x * clippingRect.width - p2A.x * newClippingWidth) / boundingRect.width;
        var dY1 = (p1B.y * clippingRect.height - p1A.y * newClippingHeight) / boundingRect.height;
        var dY2 = (p2B.y * clippingRect.height - p2A.y * newClippingHeight) / boundingRect.height;
        // use the average of the two
        clippingRect.left += Math.round((dX1 + dX2) / 2);
        clippingRect.top += Math.round((dY1 + dY2) / 2);
        clippingRect.width = newClippingWidth;
        clippingRect.height = newClippingHeight;
        constrainPosition(clippingRect, image.naturalWidth, image.naturalHeight);
        this.setState({ clippingRect });
    },

    /**
     * Called when multitouch pinching ends
     *
     * @param  {HammerEvent} evt
     */
    handlePinchEnd: function(evt) {
        if (!this.pinchStart) {
            return;
        }
        this.triggerChangeEvent(this.state.clippingRect);
        this.pinchStart = null;
    },

    /**
     * Called when user press a key
     *
     * @param  {Event} evt
     */
    handleKeyDown: function(evt) {
        if (evt.keyCode === 27) {
            var container = this.components.container;
            container.blur();
        }
    },
});

/**
 * Keep clipping rect from going outside of the image
 *
 * @param  {Object} clippingRect
 * @param  {Number} imageWidth
 * @param  {Number} imageHeight
 */
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

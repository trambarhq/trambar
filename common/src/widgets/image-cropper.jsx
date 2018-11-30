import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import Hammer from 'hammerjs';
import ComponentRefs from 'utils/component-refs';

import BitmapView from 'widgets/bitmap-view';
import VectorView from 'widgets/vector-view';

import './image-cropper.scss';

/**
 * A component for cropping images. It handles both mouse and touch input.
 *
 * @extends {PureComponent}
 */
class ImageCropper extends PureComponent {
    static displayName = 'ImageCropper';

    constructor(props) {
        let { clippingRect } = props;
        super(props);
        this.components = ComponentRefs({
            container: HTMLElement,
            image: BitmapView,
        });
        this.state = {
            uncommittedClippingRect: null,
            hasFocus: false,
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { url, disabled, vector, onLoad } = this.props;
        let { hasFocus } = this.state;
        let { setters } = this.components;
        let clippingRect = this.getClippingRect();
        let containerProps = {
            ref: setters.container,
            className: 'image-cropper',
        };
        if (!disabled) {
            _.assign(containerProps, {
                tabIndex: 0,
                onMouseDown: this.handleMouseDown,
                onFocus: this.handleFocus,
                onBlur: this.handleBlur,
                onWheel: this.handleMouseWheel,
                onKeyDown: this.handleKeyDown,
            });
        }
        let imageProps = {
            ref: setters.image,
            url,
            clippingRect,
            onLoad,
        };
        let View = BitmapView;
        if (vector) {
            View = VectorView;
        }
        return (
            <div {...containerProps}>
                <View {...imageProps} />
            </div>
        );
    }

    /**
     * Activate touch handling when container div gains focus
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { clippingRect } = this.props;
        let { hasFocus, uncommittedClippingRect } = this.state;
        if (!prevState.hasFocus && hasFocus) {
            this.activateTouchHandling();
        } else if (prevState.hasFocus && !hasFocus) {
            this.deactivateTouchHandling();
        }
        if (prevProps.clippingRect !== clippingRect) {
            if (uncommittedClippingRect) {
                if (_.isEqual(uncommittedClippingRect, clippingRect)) {
                    // change has been committed
                    this.setState({ uncommittedClippingRect: null });
                }
            }
        }
    }

    /**
     * Remove handler and timeout function on unmount
     */
    componentWillUnmount() {
        if (this.dragStart) {
            this.handleMouseUp();
        }
        if (this.zoomChangeTimeout) {
            clearTimeout(this.zoomChangeTimeout);
            this.handleZoomTimeout();
        }
        this.deactivateTouchHandling();
    }

    /**
     * Set focus
     */
    focus() {
        let { container } = this.components;
        container.focus();
    }

    /**
     * Return clipping rect from either props or state
     *
     * @return {Object}
     */
    getClippingRect() {
        let { clippingRect } = this.props;
        let { uncommittedClippingRect } = this.state;
        return uncommittedClippingRect || clippingRect;
    }

    /**
     * Add Hammer.js touch handling to container div
     */
    activateTouchHandling() {
        let { container } = this.components;
        if (!container) {
            return;
        }
        if (this.hammer) {
            return;
        }
        this.hammer = new Hammer(container);
        let pan = this.hammer.get('pan').set({
            direction: Hammer.DIRECTION_ALL,
            threshold: 5
        });
        let pinch = this.hammer.get('pinch').set({
            enable: true
        });
        pinch.recognizeWith(pan);
        this.hammer.on('panstart', this.handlePanStart);
        this.hammer.on('panmove', this.handlePanMove);
        this.hammer.on('panend', this.handlePanEnd);
        this.hammer.on('pinchstart', this.handlePinchStart);
        this.hammer.on('pinchmove', this.handlePinchMove);
        this.hammer.on('pinchend', this.handlePinchEnd)
    }

    /**
     * Remove Hammer.js touch handling from container div
     */
    deactivateTouchHandling() {
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
    }

    /**
     * Inform parent component that clipping rect has changed
     */
    triggerChangeEvent() {
        let { onChange } = this.props;
        let { uncommittedClippingRect } = this.state;
        if (uncommittedClippingRect) {
            if (onChange) {
                onChange({
                    type: 'change',
                    target: this,
                    rect: uncommittedClippingRect,
                });
            }
        }
    }

    /**
     * Called when container div gains focus
     *
     * @param  {Event} evt
     */
    handleFocus = (evt) => {
        this.setState({ hasFocus: true });
    }

    /**
     * Called when container div loses focus
     *
     * @param  {Event} evt
     */
    handleBlur = (evt) => {
        this.setState({ hasFocus: false });
    }

    /**
     * Called when user presses down on mouse button
     *
     * @param  {Event} evt
     */
    handleMouseDown = (evt) => {
        let { image, container } = this.components;
        let clippingRect = this.getClippingRect();
        if (evt.button !== 0) {
            // not the primary mouse button (usually left)
            return;
        }
        if (!image || !container || !clippingRect) {
            return;
        }
        let boundingRect = container.getBoundingClientRect();
        this.dragStart = {
            clippingRect,
            boundingRect,
            pageX: evt.pageX,
            pageY: evt.pageY,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
        };
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    }

    /**
     * Called when user moves the mouse with button down
     *
     * @param  {Event} evt
     */
    handleMouseMove = (evt) => {
        evt.preventDefault();

        // just in case an event manages to slip through
        if (!this.dragStart) {
            return;
        }
        let offset = {
            x: this.dragStart.pageX - evt.pageX,
            y: this.dragStart.pageY - evt.pageY,
        };
        let boundingRect = this.dragStart.boundingRect;
        let clippingRect = _.clone(this.dragStart.clippingRect);
        let dX = offset.x * clippingRect.width / boundingRect.width;
        let dY = offset.y * clippingRect.height / boundingRect.height;
        clippingRect.left += Math.round(dX);
        clippingRect.top += Math.round(dY);

        // keep rect within the image
        constrainPosition(clippingRect, this.dragStart.naturalWidth, this.dragStart.naturalHeight);
        this.setState({ uncommittedClippingRect: clippingRect });
    }

    /**
     * Called when user releases mouse button
     *
     * @param  {Event} evt
     */
    handleMouseUp = (evt) => {
        if (!this.dragStart) {
            return;
        }
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        this.triggerChangeEvent();
        this.dragStart = null;
    }

    /**
     * Called when user moves the mouse wheel
     *
     * @param  {Event} evt
     */
    handleMouseWheel = (evt) => {
        let { hasFocus } = this.state;
        let { image, container } = this.components;
        let clippingRect = this.getClippingRect();
        evt.preventDefault();

        if (!image || !container || !clippingRect) {
            return;
        }
        if (!hasFocus) {
            this.focus();
        }
        let divider = 4;
        if (evt.shiftKey) {
            // faster zoom when shift is pressed
            divider = 1;
        }
        let boundingRect = container.getBoundingClientRect();
        let deltaY;
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
        let expansion = Math.round((deltaY * clippingRect.height / boundingRect.height) / divider);
        let newClippingWidth = clippingRect.width + expansion;
        // prevent expansion of the clipping rect that'd that it outside the image
        if (newClippingWidth > image.naturalWidth) {
            newClippingWidth = image.naturalWidth;
            expansion = newClippingWidth - clippingRect.width;
        }
        let newClippingHeight = clippingRect.height + expansion;
        if (newClippingHeight > image.naturalHeight) {
            newClippingHeight = image.naturalHeight;
            expansion = newClippingHeight - clippingRect.height;
            newClippingWidth = clippingRect.width + expansion;
        }

        // center the change at the mouse cursor
        let cursorPos = {
            x: evt.pageX - boundingRect.left,
            y: evt.pageY - boundingRect.top
        };
        let dX = - cursorPos.x * expansion / boundingRect.width;
        let dY = - cursorPos.y * expansion / boundingRect.height;
        clippingRect = _.clone(clippingRect);
        clippingRect.left += Math.round(dX);
        clippingRect.top += Math.round(dY);
        clippingRect.width = newClippingWidth;
        clippingRect.height = newClippingHeight;
        constrainPosition(clippingRect, image.naturalWidth, image.naturalHeight);
        this.setState({ uncommittedClippingRect: clippingRect }, () => {
            if (this.zoomChangeTimeout) {
                clearTimeout(this.zoomChangeTimeout);
            }
            this.zoomChangeTimeout = setTimeout(this.handleZoomTimeout, 1000);
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
    }

    /**
     * Called when zoom timeout ends
     */
    handleZoomTimeout = () => {
        this.triggerChangeEvent();
        this.zoomChangeTimeout = 0;
    }

    /**
     * Called when multitouch panning starts
     *
     * @param  {HammerEvent} evt
     */
    handlePanStart = (evt) => {
        let { image, container } = this.components;
        let { clippingRect } = this.state;
        if (evt.pointerType === 'mouse') {
            // don't handle mouse events through Hammer
            return;
        }
        if (!image || !container || !clippingRect) {
            return;
        }
        let boundingRect = container.getBoundingClientRect();
        this.panStart = {
            clippingRect,
            boundingRect,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
        };
        this.handlePanMove(evt);
    }

    /**
     * Called during multitouch panning
     *
     * @param  {HammerEvent} evt
     */
    handlePanMove = (evt) => {
        if (!this.panStart) {
            return;
        }
        let boundingRect = this.panStart.boundingRect;
        let clippingRect = _.clone(this.panStart.clippingRect);
        let dX = - evt.deltaX * clippingRect.width / boundingRect.width;
        let dY = - evt.deltaY * clippingRect.height / boundingRect.height;
        clippingRect.left += Math.round(dX);
        clippingRect.top += Math.round(dY);
        constrainPosition(clippingRect, this.panStart.naturalWidth, this.panStart.naturalHeight);
        this.setState({ uncommittedClippingRect: clippingRect });
    }

    /**
     * Called when multitouch panning ends
     *
     * @param  {HammerEvent} evt
     */
    handlePanEnd = (evt) => {
        if (!this.panStart) {
            return;
        }
        this.triggerChangeEvent();
        this.panStart = null;
    }

    /**
     * Called when multitouch pinching starts
     *
     * @param  {HammerEvent} evt
     */
    handlePinchStart = (evt) => {
        let { image, container } = this.components;
        let clippingRect = this.getClippingRect();
        if (evt.pointerType === 'mouse') {
            return;
        }
        if (!image || !container || !clippingRect) {
            return;
        }
        let boundingRect = container.getBoundingClientRect();
        this.pinchStart = {
            clippingRect,
            boundingRect,
            pointers: _.map(evt.pointers, (pointer) => {
                return {
                    pageX: pointer.pageX,
                    pageY: pointer.pageY,
                };
            })
        };
        this.handlePinchMove(evt);
    }

    /**
     * Called during multitouch pinching
     *
     * @param  {HammerEvent} evt
     */
    handlePinchMove = (evt) => {
        let { image } = this.components;
        if (!this.pinchStart) {
            return;
        }
        let clippingRect = _.clone(this.pinchStart.clippingRect);
        let boundingRect = this.pinchStart.boundingRect;
        let scale = 1 / evt.scale;
        let newClippingWidth = Math.round(clippingRect.width * scale);
        if (newClippingWidth > image.naturalWidth) {
            newClippingWidth = image.naturalWidth;
            scale = newClippingWidth / clippingRect.width;
        }
        let newClippingHeight = Math.round(clippingRect.height * scale);
        if (newClippingHeight > image.naturalHeight) {
            newClippingHeight = image.naturalHeight;
            scale = newClippingHeight / clippingRect.height;
            newClippingWidth = Math.round(clippingRect.width * scale);
        }

        // try to keep the pointers to the same place on the image
        let p1B = {
            x: this.pinchStart.pointers[0].pageX - boundingRect.left,
            y: this.pinchStart.pointers[0].pageY - boundingRect.top,
        };
        let p2B = {
            x: this.pinchStart.pointers[1].pageX - boundingRect.left,
            y: this.pinchStart.pointers[1].pageY - boundingRect.top,
        };
        let p1A = {
            x: evt.pointers[0].pageX - boundingRect.left,
            y: evt.pointers[0].pageY - boundingRect.top,
        };
        let p2A = {
            x: evt.pointers[1].pageX - boundingRect.left,
            y: evt.pointers[1].pageY - boundingRect.top,
        };
        // calculate the offsets using each pointer
        let dX1 = (p1B.x * clippingRect.width - p1A.x * newClippingWidth) / boundingRect.width;
        let dX2 = (p2B.x * clippingRect.width - p2A.x * newClippingWidth) / boundingRect.width;
        let dY1 = (p1B.y * clippingRect.height - p1A.y * newClippingHeight) / boundingRect.height;
        let dY2 = (p2B.y * clippingRect.height - p2A.y * newClippingHeight) / boundingRect.height;
        // use the average of the two
        clippingRect.left += Math.round((dX1 + dX2) / 2);
        clippingRect.top += Math.round((dY1 + dY2) / 2);
        clippingRect.width = newClippingWidth;
        clippingRect.height = newClippingHeight;
        constrainPosition(clippingRect, image.naturalWidth, image.naturalHeight);
        this.setState({ uncommittedClippingRect: clippingRect });
    }

    /**
     * Called when multitouch pinching ends
     *
     * @param  {HammerEvent} evt
     */
    handlePinchEnd = (evt) => {
        if (!this.pinchStart) {
            return;
        }
        this.triggerChangeEvent();
        this.pinchStart = null;
    }

    /**
     * Called when user press a key
     *
     * @param  {Event} evt
     */
    handleKeyDown = (evt) => {
        let { hasFocus } = this.state;
        let { container } = this.components;
        if (hasFocus && evt.keyCode === 27) {
            container.blur();
        }
    }
}

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

ImageCropper.defaultProps = {
    vector: false,
};

export {
    ImageCropper as default,
    ImageCropper,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    ImageCropper.propTypes = {
        url: PropTypes.string.isRequired,
        clippingRect: PropTypes.object,
        vector: PropTypes.bool,
        disabled: PropTypes.bool,
        onChange: PropTypes.func,
        onLoad: PropTypes.func,
    };
}

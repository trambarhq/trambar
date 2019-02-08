import _ from 'lodash';
import React, { PureComponent } from 'react';
import * as MediaLoader from 'media/media-loader';
import ComponentRefs from 'utils/component-refs';

/**
 * A component for displaying a SVG file, with proper support for zooming
 * and clipping.
 *
 * @extends {PureComponent}
 */
class VectorView extends PureComponent {
    static displayName = 'VectorView';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            svg: SVGGraphicsElement,
        });
    }

    /**
     * Load image on mount
     */
    componentWillMount() {
        let { url } = this.props;
        this.load(url);
    }

    /**
     * Update image when URL or clipping rect changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { url, clippingRect, title } = this.props;
        if (nextProps.url !== url) {
            this.load(nextProps.url);
        }
        if (nextProps.clippingRect !== clippingRect) {
            this.setViewBox(nextProps.clippingRect);
        }
        if (nextProps.title !== title) {
            this.setTitle(nextProps.title);
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { setters } = this.components;
        let props = _.omit(this.props, 'onLoad', 'url', 'clippingRect', 'title');
        return <svg ref={setters.svg} viewBox="0 0 4 4" width={4} height={4} {...props} />
    }

    /**
     * Inform parent component that loading is complete
     */
    triggerLoadEvent() {
        let { onLoad } = this.props;
        if (onLoad) {
            onLoad({
                type: 'load',
                target: this,
            });
        }
    }

    /**
     * Inform parent component that an error occurred
     *
     * @param  {Error} err
     */
    triggerErrorEvent(err) {
        let { onError } = this.props;
        if (onError) {
            onError({
                type: 'error',
                target: this,
                error: err
            });
        }
    }

    /**
     * Load file at given URL or clear the canvas if it's empty
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    async load(url) {
        let { title, clippingRect } = this.props;
        if (url) {
            try {
                let svgNew = await MediaLoader.loadSVG(url);
                let { svg } = this.components;
                if (!svg) {
                    throw new Error('Invalid missing container');
                }
                this.clear();
                this.addTitle(title);
                let child;
                while (child = svgNew.firstChild) {
                    svgNew.removeChild(child);
                    svg.appendChild(child);
                }
                let width = svgNew.width.baseVal.value;
                let height = svgNew.height.baseVal.value;
                let viewBox = svgNew.viewBox.baseVal;
                if (!width) {
                    width = viewBox.width;
                }
                if (!height) {
                    height = viewBox.height;
                }
                if (!width) {
                    width = 1000;
                }
                if (!height) {
                    height = 1000;
                }
                this.originX = viewBox.x;
                this.originY = viewBox.y;
                this.zoomX = (viewBox.width) ? viewBox.width / width : 1;
                this.zoomY = (viewBox.height) ? viewBox.height / height : 1;
                this.naturalWidth = width;
                this.naturalHeight = height;
                this.setViewBox(clippingRect);
                this.triggerLoadEvent();
            } catch (err) {
                this.triggerErrorEvent(err);
            }
        } else {
            this.clear();
            this.originX = 0;
            this.originY = 0;
            this.zoomX = 1;
            this.zoomY = 1;
            this.naturalWidth = 4;
            this.naturalHeight = 4;
            this.setViewBox();
            return;
        }
    }

    /**
     * Remove all elements from SVG graphic element
     */
    clear() {
        let { svg } = this.components;
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    }

    /**
     * Add title to SVG element
     *
     * @param  {String} title
     */
    addTitle(title) {
        let { svg } = this.components;
        if (title && svg) {
            let child = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            child.textContent = title;
            svg.appendChild(child);
        }
    }

    /**
     * Change title of SVG
     *
     * @param  {String} title
     */
    setTitle(title) {
        let child = svg.getElementByTagName('title');
        if (child) {
            if (title) {
                child.textContent = title;
            } else {
                svg.removeChild(child)
            }
        } else {
            this.addTitle(title);
        }
    }

    /**
     * Set view box of SVG graphic element
     *
     * @param {Object} clip
     */
    setViewBox(clip) {
        let { svg } = this.components;
        if (!clip) {
            clip = {
                left: 0,
                top: 0,
                width: this.naturalWidth,
                height: this.naturalHeight,
            };
        }
        let viewBox = svg.viewBox.baseVal;
        let width = svg.width.baseVal;
        let height = svg.height.baseVal;
        viewBox.x = clip.left * this.zoomX + this.originX;
        viewBox.y = clip.top * this.zoomX + this.originY;
        viewBox.width = clip.width * this.zoomX;
        viewBox.height = clip.height * this.zoomY;
        width.value = clip.width;
        height.value = clip.height;
    }
}

export {
    VectorView as default,
    VectorView,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    VectorView.propTypes = {
        url: PropTypes.string,
        clippingRect: PropTypes.object,
        title: PropTypes.string,
        onLoad: PropTypes.func,
        onError: PropTypes.func,
    };
}

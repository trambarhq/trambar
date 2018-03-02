var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;
var MediaLoader = require('media/media-loader');
var ComponentRefs = require('utils/component-refs');

module.exports = React.createClass({
    displayName: 'VectorView',
    propTypes: {
        url: PropTypes.string,
        clippingRect: PropTypes.object,
        onLoad: PropTypes.func,
        onError: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.components = ComponentRefs({
            svg: SVGGraphicsElement,
        });
        return {};
    },

    /**
     * Load image on mount
     */
    componentWillMount: function() {
        this.load(this.props.url);
    },

    /**
     * Update image when URL or clipping rect changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.url !== nextProps.url) {
            this.load(nextProps.url);
        }
        if (this.clippingRect !== nextProps.clippingRect) {
            this.setViewBox(nextProps.clippingRect);
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var setters = this.components.setters;
        var props = _.omit(this.props, 'onLoad', 'url', 'clippingRect');
        return <svg ref={setters.svg} viewBox="0 0 4 4" width={4} height={4} {...props} />
    },

    /**
     * Inform parent component that loading is complete
     */
    triggerLoadEvent: function() {
        if (this.props.onLoad) {
            this.props.onLoad({
                type: 'load',
                target: this,
            });
        }
    },

    /**
     * Inform parent component that an error occurred
     *
     * @param  {Error} err
     */
    triggerErrorEvent: function(err) {
        if (this.props.onError) {
            this.props.onError({
                type: 'error',
                target: this,
                error: err
            });
        }
    },

    /**
     * Load file at given URL or clear the canvas if it's empty
     *
     * @param  {String} url
     *
     * @return {Promise}
     */
    load: function(url) {
        if (url) {
            return MediaLoader.loadSVG(url).then((svgNew) => {
                var svg = this.components.svg;
                if (!svg) {
                    throw new Error('Invalid missing container');
                }
                var child;
                while (child = svgNew.firstChild) {
                    svgNew.removeChild(child);
                    svg.appendChild(child);
                }
                var width = svgNew.width.baseVal.value;
                var height = svgNew.height.baseVal.value;
                var viewBox = svgNew.viewBox.baseVal;
                if (!width) {
                    width = viewBox.width;
                }
                if (!height) {
                    height = viewBox.height;
                }
                this.originX = viewBox.x;
                this.originY = viewBox.y;
                this.zoomX = (viewBox.width) ? viewBox.width / width : 1;
                this.zoomY = (viewBox.height) ? viewBox.height / height : 1;
                this.naturalWidth = width;
                this.naturalHeight = height;
                this.setViewBox(this.props.clippingRect);
            }).catch((err) => {
                this.triggerErrorEvent(err);
            });
        } else {
            this.clear();
            this.originX = 0;
            this.originY = 0;
            this.zoomX = 1;
            this.zoomY = 1;
            this.naturalWidth = 4;
            this.naturalHeight = 4;
            this.setViewBox();
            return Promise.resolve();
        }
    },

    /**
     * Remove all elements from SVG graphic element
     */
    clear: function() {
        var svg = this.components.svg;
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
    },

    /**
     * Set view box of SVG graphic element
     *
     * @param {Object} clip
     */
    setViewBox: function(clip) {
        if (!clip) {
            clip = {
                left: 0,
                top: 0,
                width: this.naturalWidth,
                height: this.naturalHeight,
            };
        }
        var svg = this.components.svg;
        var viewBox = svg.viewBox.baseVal;
        var width = svg.width.baseVal;
        var height = svg.height.baseVal;
        viewBox.x = clip.left + this.originX;
        viewBox.y = clip.top + this.originY;
        viewBox.width = clip.width * this.zoomX;
        viewBox.height = clip.height * this.zoomY;
        width.value = clip.width;
        height.value = clip.height;
    },
});

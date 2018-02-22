var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react'), PropTypes = React.PropTypes;

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var PushButton = require('widgets/push-button');

require('./media-dialog-box.scss');

module.exports = React.createClass({
    displayName: 'MediaDialogBox',
    propTypes: {
        show: PropTypes.bool,
        resources: PropTypes.arrayOf(PropTypes.object).isRequired,
        selectedIndex: PropTypes.number.isRequired,

        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,

        onClose: PropTypes.func,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            selectedIndex: this.props.selectedIndex,
        };
    },

    /**
     * Return the number of resources
     *
     * @return {Number}
     */
    getResourceCount: function() {
        return this.props.resources.length;
    },

    /**
     * Return the currently selected resource
     *
     * @return {Number}
     */
    getSelectedResourceIndex: function() {
        var maxIndex = this.getResourceCount() - 1;
        var index = _.min([ this.state.selectedIndex, maxIndex ]);
        return index;
    },

    /**
     * Select a resource by index
     *
     * @param  {Number} index
     *
     * @return {Promise<Number>}
     */
    selectResource: function(index) {
        return new Promise((resolve, reject) => {
            var count = this.getResourceCount();
            if (index >= 0 && index < count) {
                this.setState({ selectedIndex: index }, () => {
                    resolve(index);
                });
            } else {
                resolve(this.getSelectedResourceIndex());
            }
        });
    },

    componentWillMount: function() {
        if (this.props.show) {
            document.body.addEventListener('keydown', this.handleKeyDown);
        }
    },

    /**
     * Set the selectedIndex when the dialog box becomes visible
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.show !== nextProps.show) {
            if (nextProps.show) {
                this.setState({
                    selectedIndex: nextProps.selectedIndex,
                });
                document.body.addEventListener('keydown', this.handleKeyDown);
            } else {
                var video = this.refs.video;
                if (video) {
                    video.pause();
                }
                document.body.removeEventListener('keydown', this.handleKeyDown);
            }
        }
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var overlayProps = {
            show: this.props.show,
            onBackgroundClick: this.props.onClose,
        };
        return (
            <Overlay {...overlayProps}>
                <div className="media-dialog-box">
                    {this.renderView()}
                    <div className="controls">
                        {this.renderThumbnails()}
                        {this.renderButtons()}
                    </div>
                </div>
            </Overlay>
        );
    },

    /**
     * Render either live or captured video
     *
     * @return {ReactElement}
     */
    renderView: function() {
        var index = this.getSelectedResourceIndex();
        var res = this.props.resources[index];
        if (res) {
            var viewport = document.body.parentNode;
            var viewportWidth = viewport.clientWidth;
            var viewportHeight = viewport.clientHeight;
            if (this.props.theme.mode === 'single-col') {
                viewportWidth -= 10;
                viewportHeight -= 100;
            } else {
                viewportWidth -= 100;
                viewportHeight -= 200;
            }
            var viewportAspect = viewportWidth / viewportHeight;
            var maxWidth, maxHeight;
            _.each(this.props.resources, (res) => {
                var dims = this.props.theme.getDimensions(res, { clip: null });
                if (!(maxWidth >= dims.width)) {
                    maxWidth = dims.width;
                }
                if (!(maxHeight >= dims.height)) {
                    maxHeight = dims.height;
                }
            });
            var maxAspect = maxWidth / maxHeight;
            if (viewportAspect > maxAspect) {
                if (maxHeight > viewportHeight) {
                    maxHeight = viewportHeight;
                    maxWidth = Math.round(maxHeight * maxAspect);
                }
            } else {
                if (maxWidth > viewportWidth) {
                    maxWidth = viewportWidth;
                    maxHeight = Math.round(maxWidth / maxAspect);
                }
            }
            var style = { width: maxWidth, height: maxHeight };
            var contents;
            switch (res.type) {
                case 'image':
                    contents = this.renderImage(res, maxWidth, maxHeight);
                    break;
                case 'video':
                    contents = this.renderVideo(res, maxWidth, maxHeight);
                    break;
            }
            return (
                <div className="container" style={style}>
                    {contents}
                </div>
            );
        }
    },

    /**
     * Render image
     *
     * @param  {Object} res
     * @param  {Number} maxWidth
     * @param  {Number} maxHeight
     *
     * @return {ReactElement}
     */
    renderImage: function(res, maxWidth, maxHeight) {
        var theme = this.props.theme;
        var width = res.width;
        var height = res.height;
        var url;
        // don't reencode when it's a GIF since it might be animated
        if (res.format === 'gif') {
            url = theme.getImageURL(res, { original: true });
        } else {
            if (width > maxWidth) {
                height = Math.round(maxWidth * (height / width));
                width = maxWidth;
            } else if (height > maxHeight) {
                width = Math.round(maxHeight * (width / height));
                height = maxHeight;
            }
            url = theme.getImageURL(res, { width, height, clip: null })
        }
        return <img src={url} width={width} height={height} />;
    },

    /**
     * Render video player
     *
     * @param  {Object} res
     * @param  {Number} maxWidth
     * @param  {Number} maxHeight
     *
     * @return {ReactElement}
     */
    renderVideo: function(res) {
        var theme = this.props.theme;
        var url = theme.getVideoURL(res);
        var dims = theme.getDimensions(res, { clip: null });
        var posterURL = theme.getImageURL(res, {
            width: dims.width,
            height: dims.height,
            clip: null,
            quality: 60
        });
        var props = {
            ref: 'video',
            src: url,
            controls: true,
            autoPlay: true,
            poster: posterURL,
        };
        return <video {...props} />;
    },

    /**
     * Render links
     *
     * @return {ReactElement|null}
     */
    renderThumbnails: function(index) {
        var t = this.props.locale.translate;
        var theme = this.props.theme;
        var selectedIndex = this.getSelectedResourceIndex();
        var thumbnails = _.map(this.props.resources, (res, index) => {
            var url = this.props.theme.getImageURL(res, { width: 28, height: 28 });
            var props = {
                className: 'thumbnail',
                'data-index': index,
                onClick: this.handleThumbnailClick,
            };
            if (index === selectedIndex) {
                props.className += ' selected';
            }
            return (
                <div key={index} {...props}>
                    <img src={url} />
                </div>
            );
        });
        return <div className="links">{thumbnails}</div>;
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var downloadButtonProps = {
            label: t('media-download-original'),
            emphasized: false,
            hidden: (this.props.theme.mode === 'single-col'),
            onClick: this.handleDownloadClick,
        };
        var closeButtonProps = {
            label: t('media-close'),
            emphasized: true,
            onClick: this.props.onClose,
        };
        return (
            <div className="buttons">
                <PushButton {...downloadButtonProps} />
                <PushButton {...closeButtonProps} />
            </div>
        );
    },

    /**
     * Remove event handler on unmount
     */
    componentWillUnmount: function() {
        document.body.removeEventListener('keydown', this.handleKeyDown);
    },

    /**
     * Called when user clicks on a thumbnail
     *
     * @param  {Event} evt
     */
    handleThumbnailClick: function(evt) {
        var index = parseInt(evt.currentTarget.getAttribute('data-index'));
        return this.selectResource(index);
    },

    /**
     * Called when user clicks on download button
     *
     * @param  {Evt} evt
     */
    handleDownloadClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        var res = this.props.resources[index];
        if (res) {
            // create a link then simulate a click
            var link = document.createElement('A');
            var theme = this.props.theme;
            var url;
            switch (res.type) {
                case 'image': url = theme.getImageURL(res, { original: true }); break;
                case 'video': url = theme.getVideoURL(res); break;
            }
            link.href = url;
            link.download = res.filename || true;   // only works when it's same origin
            link.click();
        }
    },

    /**
     * Called when user presses a key
     *
     * @param  {Event} evt
     */
    handleKeyDown: function(evt) {
        var diff = 0;
        if (evt.keyCode === 39) {           // right arrow
            diff = +1;
        } else if (evt.keyCode == 37) {     // left arrow
            diff = -1;
        }
        if (diff) {
            var count = this.getResourceCount();
            var index = this.getSelectedResourceIndex() + diff;
            if (index >= count) {
                index = 0;
            } else if (index < 0){
                index = count - 1;
            }
            this.selectResource(index);
            evt.preventDefault();
        }
    },
});

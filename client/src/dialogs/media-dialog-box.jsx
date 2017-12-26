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
                var dim;
                if (res.type === 'video') {
                    var version = chooseVideoVersion(res);
                    dim = getVideoVersionDimensions(res, version);
                } else {
                    dim = res;
                }
                if (!(maxWidth >= dim.width)) {
                    maxWidth = dim.width;
                }
                if (!(maxHeight >= dim.height)) {
                    maxHeight = dim.height;
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
            var style = { maxWidth: maxWidth, maxHeight: maxHeight };
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
        // don't resize when it's a GIF since it might be animated
        if (res.format === 'gif') {
            url = theme.getImageUrl(res, { clip: null });
        } else {
            if (width > maxWidth) {
                width = maxWidth;
                height = Math.round(height * (maxWidth / width));
            } else if (height > maxHeight) {
                height = maxHeight;
                width = Math.round(width * (maxHeight / height));
            }
            url = theme.getImageUrl(res, { width, height, clip: null })
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
        var video = res;
        var theme = this.props.theme;
        var version = chooseVideoVersion(res);
        var dims = getVideoVersionDimensions(res, version);
        var props = {
            ref: 'video',
            src: theme.getVideoUrl(video, { version }),
            controls: true,
            autoPlay: true,
            poster: theme.getImageUrl(video, { width: dims.width, height: dims.height, clip: null, quality: 60 }),
        };
        return <video {...props} />;
    },

    /**
     * Render links
     *
     * @return {ReactElement|null}
     */
    renderThumbnails: function() {
        var t = this.props.locale.translate;
        var theme = this.props.theme;
        var selectedIndex = this.getSelectedResourceIndex();
        var thumbnails = _.map(this.props.resources, (res, index) => {
            var props = {
                url: this.props.theme.getImageUrl(res, { width: 28, height: 28 }),
                selected: (index === selectedIndex),
                'data-index': index,
                onClick: this.handleThumbnailClick,
            };
            return <Thumbnail key={index} {...props} />;
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
                case 'image': url = theme.getImageUrl(res, { clip: null }); break;
                case 'video': url = theme.getVideoUrl(res); break;
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

function Thumbnail(props) {
    var classNames = [ 'thumbnail' ];
    if (props.selected) {
        classNames.push('selected');
    }
    return (
        <div className={classNames.join(' ')} id={props.id} onClick={props.onClick}>
            <img src={props.url} />
        </div>
    )
}

/**
 * Calculate the actual dimension of one version of the video
 *
 * (videoScaling contains boundary values)
 *
 * @param  {Object} res
 * @param  {Object} name
 *
 * @return {Object}
 */
function getVideoVersionDimensions(res, name) {
    var version = (res.versions) ? res.versions[name] : null;
    if (!version) {
        return {};
    }
    var originalWidth = res.width;
    var originalHeight = res.height;
    var maxWidth = version.videoScaling.width;
    var maxHeight = version.videoScaling.height;
    var scaling = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
    var width = Math.round(originalWidth * scaling);
    var height = Math.round(originalHeight * scaling);
    return { width, height };
}

/**
 * Choose a version of the video that's best suits the screen
 *
 * @param  {Object} res
 *
 * @return {String}
 */
function chooseVideoVersion(res) {
    var screenWidth = screen.width;
    var screenHeight = screen.height;
    var screenPixelCount = screenWidth * screenHeight;
    var choices = _.map(_.keys(res.versions), (name) => {
        var scaledDims = getVideoVersionDimensions(res, name);
        var scaledPixelCount = scaledDims.width * scaledDims.height;
        var diff = Math.abs(screenPixelCount - scaledPixelCount);
        return { name, diff };
    });
    var optimal = _.first(_.sortBy(choices, 'diff'));
    return (optimal) ? optimal.name : null;
}

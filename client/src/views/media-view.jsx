var React = require('react'), PropTypes = React.PropTypes;
var HttpRequest = require('transport/http-request');
var Memoize = require('utils/memoize');

var Locale = require('locale/locale');
var Theme = require('theme/theme');

// widgets
var Overlay = require('widgets/overlay');
var MediaButton = require('widgets/media-button');
var MediaDialogBox = require('dialogs/media-dialog-box');
var ImageView = require('media/image-view');

require('./media-view.scss');

module.exports = React.createClass({
    displayName: 'MediaView',
    propTypes: {
        resources: PropTypes.arrayOf(PropTypes.object).isRequired,
        locale: PropTypes.instanceOf(Locale).isRequired,
        theme: PropTypes.instanceOf(Theme).isRequired,
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            selectedIndex: 0,
            renderingDialogBox: false,
            showingDialogBox: false,
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

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="media-view">
                {this.renderResource()}
                {this.renderNavigation()}
                {this.renderDialogBox()}
            </div>
        );
    },

    /**
     * Render navigation bar when there are multiple resources
     *
     * @return {ReactElement}
     */
    renderNavigation: function() {
        var count = this.getResourceCount();
        if (count <= 1) {
            return null;
        }
        var index = _.min([ count - 1, this.state.selectedIndex ]);
        var directionProps = {
            index,
            count,
            onBackwardClick: this.handleBackwardClick,
            onForwardClick: this.handleForwardClick,
        };
        return (
            <div className="navigation">
                <div className="right">
                    <MediaButton.Direction {...directionProps} />
                </div>
            </div>
        );
    },

    /**
     * Render dialog box
     *
     * @return {ReactElement|null}
     */
    renderDialogBox: function() {
        if (!this.state.renderingDialogBox) {
            return null;
        }
        var zoomableResources = getZoomableResources(this.props.resources);
        var index = this.getSelectedResourceIndex();
        var zoomableIndex = _.indexOf(zoomableResources, this.props.resources[index]);
        var dialogProps = {
            show: this.state.showingDialogBox,
            resources: zoomableResources,
            selectedIndex: zoomableIndex,

            locale: this.props.locale,
            theme: this.props.theme,

            onClose: this.handleDialogClose,
        };
        return <MediaDialogBox {...dialogProps} />;
    },

    /**
     * Render image or video poster
     *
     * @return {ReactElement}
     */
    renderResource: function() {
        var count = this.props.resources.length;
        var index = _.min([ count - 1, this.state.selectedIndex ]);
        var res = this.props.resources[index];
        switch (res.type) {
            case 'image': return this.renderImage(res);
            case 'video': return this.renderVideo(res);
            case 'audio': return this.renderAudio(res);
            case 'website': return this.renderWebsite(res);
        }
    },

    /**
     * Render image
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderImage: function(res) {
        return (
            <div className="image" onClick={this.handleImageClick}>
                {this.renderImageElement(res)}
            </div>
        );
    },

    /**
     * Render video poster
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderVideo: function(res) {
        return (
            <div className="video" onClick={this.handleVideoClick}>
                {this.renderImageElement(res)}
                <i className="fa fa-play-circle-o icon" />
            </div>
        );
    },

    /**
     * Render audio player
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderAudio: function(res) {

    },

    /**
     * Render website poster
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderWebsite: function(res) {
        return (
            <div className="website">
                <a href={res.url} target="_blank">
                    {this.renderImageElement(res)}
                    <i className="fa fa-external-link icon" />
                </a>
            </div>
        );
    },

    renderImageElement: function(res, type) {
        var clip = res.clip;
        var width = 512;
        var height;
        var theme = this.props.theme;
        if (clip) {
            height = Math.round(width * clip.height / clip.width);
        } else {
            height = Math.round(width * res.height / res.width)
        }
        var url = theme.getImageUrl(res, { width, height });
        var file = theme.getImageFile(res);
        if (url) {
            // TODO: implement preloading
            return <img src={url} width={width} height={height} />;
        }

        // image isn't done uploading yet
        if (file instanceof Blob) {
            // use ImageView, which handles orientation
            url = URL.createObjectURL(file);
            return <ImageView url={url} clippingRect={clip} />;
        } else {
            // TODO: placeholder for pending images
            return null;
        }
    },

    /**
     * Called when user clicks backward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleBackwardClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        return this.selectResource(index - 1);
    },

    /**
     * Called when user clicks forward button
     *
     * @param  {Event} evt
     *
     * @return {Promise<Number>}
     */
    handleForwardClick: function(evt) {
        var index = this.getSelectedResourceIndex();
        return this.selectResource(index + 1);
    },

    handleImageClick: function(evt) {
        this.setState({
            showingDialogBox: true,
            renderingDialogBox: true,
        });
    },

    handleVideoClick: function(evt) {
        this.setState({
            showingDialogBox: true,
            renderingDialogBox: true,
        });
    },

    /**
     * Called when user closes dialog box
     *
     * @param  {Event} evt
     */
    handleDialogClose: function(evt) {
        this.setState({ showingDialogBox: false }, () => {
            setTimeout(() => {
                this.setState({ renderingDialogBox: false });
            }, 1000);
        });
    },
});

var getZoomableResources = Memoize(function(resources) {
    return _.filter(resources, (res) => {
        switch (res.type) {
            case 'image':
            case 'video':
                return true;
        }
    })
});

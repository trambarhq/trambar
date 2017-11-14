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
            if (this.props.theme.mode === 'columns-1') {
                viewportWidth -= 20;
                viewportHeight -= 100;
            } else {
                viewportWidth -= 100;
                viewportHeight -= 200;
            }
            var viewportAspect = viewportWidth / viewportHeight;
            var maxWidth = _.max(_.map(this.props.resources, 'width'));
            var maxHeight = _.max(_.map(this.props.resources, 'height'));
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
        var width, height;
        if (res.width > maxWidth) {
            width = maxWidth;
        } else if (res.height > maxHeight) {
            height = maxHeight;
        }
        var theme = this.props.theme;
        var image = _.omit(res, 'clip');
        var props = {
            src: theme.getImageUrl(image, { width, height })
        };
        return <img {...props} />;
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
        var props = {
            ref: 'video',
            src: theme.getVideoUrl(video),
            controls: true,
            autoPlay: true
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
                id: index,
                key: index,
                onClick: this.handleThumbnailClick,
            };
            return <Thumbnail {...props} />;
        });
        return (
            <div className="links">
                {thumbnails}
            </div>
        )
    },

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons: function() {
        var t = this.props.locale.translate;
        var closeButtonProps = {
            label: t('media-close'),
            emphasized: true,
            onClick: this.props.onClose,
        };
        return (
            <div className="buttons">
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
        var index = parseInt(evt.currentTarget.id);
        return this.selectResource(index);
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

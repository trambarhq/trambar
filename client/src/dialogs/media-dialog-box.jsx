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

    /**
     * Set the selectedIndex when the dialog box becomes visible
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (!this.props.show !== nextProps.show) {
            this.setState({
                selectedIndex: nextProps.selectedIndex,
            });
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
        var index = this.state.selectedIndex;
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
        var viewport = document.body.parentElement;
        var viewportWidth = viewport.clientWidth - 100;
        var viewportHeight = viewport.clientHeight - 200;
        var width, height;
        if (res.width > viewportWidth) {
            width = viewportWidth;
        } else if (res.height > viewportHeight) {
            height = viewportHeight;
        }
        var theme = this.props.theme;
        var image = _.omit(res, 'clip');
        var props = {
            src: theme.getImageUrl(image, width, height)
        };
        return (
            <div className="image">
                <img {...props} />
            </div>
        );
    },

    /**
     * Render video player
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderVideo: function(res) {
        var video = res;
        var theme = this.props.theme;
        var props = {
            src: theme.getVideoUrl(video),
            controls: true,
            autoPlay: true
        };
        return (
            <div className="container">
                <video {...props} />
            </div>
        );
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
            var url;
            if (res.type === 'image') {
                url = theme.getImageUrl(res, 28, 28);
            } else {
                url = theme.getPosterUrl(res, 28, 28);
            }
            var props = {
                url,
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
     * Called when user clicks on a thumbnail
     *
     * @param  {Event} evt
     */
    handleThumbnailClick: function(evt) {
        var index = parseInt(evt.currentTarget.id);
        return this.selectResource(index);
    }
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

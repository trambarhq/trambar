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
                        {this.renderLinks()}
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
        var props = {
            src: theme.getVideoUrl(video),
            controls: true,
            autoPlay: true
        };
        return (
            <div className="contaner">
                <video {...props} />
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
     * Render web-site screencap
     *
     * @param  {Object} res
     *
     * @return {ReactElement}
     */
    renderWebsite: function(res) {

    },

    /**
     * Render links
     *
     * @return {ReactElement|null}
     */
    renderLinks: function() {
        var t = this.props.locale.translate;
        var index = this.getSelectedResourceIndex();
        var res = this.props.resources[index];
        var theme = this.props.theme;
        var url;
        switch (res.type) {
            case 'image':
                url = theme.getImageUrl(_.omit(res, 'clip'));
                break;
            case 'video':
                url = theme.getVideoUrl(res);
                break;
            case 'audio':
                url = theme.getAudioUrl(res);
                break;
            case 'website':
                url = theme.getPosterUrl(_.omit(res, 'clip'));
                break;
        }
        var label = t('media-download-original');
        if (res.width && res.height) {
            label += ` (${res.width} × ${res.height})`;
        }
        if (!url) {
            return null;
        }
        var downloadProps = { url, label };
        return (
            <div className="links">
                <DownloadButton {...downloadProps}/>
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
        var count = this.getResourceCount();
        var index = this.getSelectedResourceIndex();
        var previousButtonProps = {
            label: t('media-previous'),
            hidden: (count <= 1),
            disabled: (index <= 0),
            onClick: this.handleBackwardClick,
        };
        var nextButtonProps = {
            label: t('media-next'),
            hidden: (count <= 1),
            disabled: (index >= count - 1),
            onClick: this.handleForwardClick,
        };
        var closeButtonProps = {
            label: t('media-close'),
            emphasized: true,
            onClick: this.props.onClose,
        };
        return (
            <div className="buttons">
                <PushButton {...previousButtonProps} />
                <PushButton {...nextButtonProps} />
                <PushButton {...closeButtonProps} />
            </div>
        );
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
});

function DownloadButton(props) {
    if (props.hidden) {
        return null;
    }
    return (
        <a className="download-button" href={props.url} download>
            <i className="fa fa-download"/>
            <span className="label">{props.label}</span>
        </a>
    );
}

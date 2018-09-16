import _ from 'lodash';
import Promise from 'bluebird';
import React, { PureComponent } from 'react';
import Hammer from 'hammerjs';

// widgets
import Overlay from 'widgets/overlay';
import PushButton from 'widgets/push-button';
import ResourceView from 'widgets/resource-view';

import './media-dialog-box.scss';

class MediaDialogBox extends PureComponent {
    static displayName = 'MediaDialogBox';

    constructor(props) {
        super(props);
        this.state = {
            selectedIndex: this.props.selectedIndex,
        };
    }

    /**
     * Return the number of resources
     *
     * @return {Number}
     */
    getResourceCount() {
        return this.props.resources.length;
    }

    /**
     * Return the currently selected resource
     *
     * @return {Number}
     */
    getSelectedResourceIndex() {
        let maxIndex = this.getResourceCount() - 1;
        let index = _.min([ this.state.selectedIndex, maxIndex ]);
        return index;
    }

    /**
     * Select a resource by index
     *
     * @param  {Number} index
     *
     * @return {Promise<Number>}
     */
    selectResource(index) {
        return new Promise((resolve, reject) => {
            let count = this.getResourceCount();
            if (index >= 0 && index < count) {
                this.setState({ selectedIndex: index }, () => {
                    resolve(index);
                });
            } else {
                resolve(this.getSelectedResourceIndex());
            }
        });
    }

    /**
     * Add event listeners
     */
    addListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('mousewheel', this.handleMouseWheel);

        this.hammer = new Hammer(document.body);
        this.hammer.on('swipeleft', this.handleSwipeLeft);
        this.hammer.on('swiperight', this.handleSwipeRight);
    }

    /**
     * Remove event listeners
     */
    removeListeners() {
        document.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('mousewheel', this.handleMouseWheel);

        if (this.hammer) {
            this.hammer.off('swipeleft', this.handleSwipeLeft);
            this.hammer.off('swiperight', this.handleSwipeRight);
            this.hammer.element.style.touchAction = '';
            this.hammer.destroy();
            this.hammer = null;
        }
    }

    /**
     * Add listeners on mount
     */
    componentWillMount() {
        if (this.props.show) {
            this.addListeners();
        }
    }

    /**
     * Set the selectedIndex when the dialog box becomes visible
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        if (this.props.show !== nextProps.show) {
            if (nextProps.show) {
                this.setState({
                    selectedIndex: nextProps.selectedIndex,
                });
                this.addListeners();
            } else {
                let video = this.refs.video;
                if (video) {
                    video.pause();
                }
                this.removeListeners();
            }
        }
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let overlayProps = {
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
    }

    /**
     * Render either live or captured video
     *
     * @return {ReactElement}
     */
    renderView() {
        let index = this.getSelectedResourceIndex();
        let res = this.props.resources[index];
        if (res) {
            let viewport = document.body.parentNode;
            let viewportWidth = viewport.clientWidth;
            let viewportHeight = viewport.clientHeight;
            if (this.props.theme.mode === 'single-col') {
                viewportWidth -= 10;
                viewportHeight -= 100;
            } else {
                viewportWidth -= 100;
                viewportHeight -= 200;
            }
            let viewportAspect = viewportWidth / viewportHeight;
            let maxWidth, maxHeight;
            _.each(this.props.resources, (res) => {
                let dims = this.props.theme.getDimensions(res, { clip: null });
                if (!(maxWidth >= dims.width)) {
                    maxWidth = dims.width;
                }
                if (!(maxHeight >= dims.height)) {
                    maxHeight = dims.height;
                }
            });
            let maxAspect = maxWidth / maxHeight;
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
            let style = { width: maxWidth, height: maxHeight };
            let contents;
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
    }

    /**
     * Render image
     *
     * @param  {Object} res
     * @param  {Number} maxWidth
     * @param  {Number} maxHeight
     *
     * @return {ReactElement}
     */
    renderImage(res, maxWidth, maxHeight) {
        let props = {
            // prevent image element from being reused, so when changing from
            // one image to the next the current image doesn't momentarily
            // appears with the dimensions of the next image
            key: this.getSelectedResourceIndex(),
            resource: res,
            width: res.width,
            height: res.height,
            theme: this.props.theme,
            clip: false,
            animation: true,
        };
        if (props.width > maxWidth) {
            props.height = Math.round(maxWidth * (props.height / props.width));
            props.width = maxWidth;
        }
        if (props.height > maxHeight) {
            props.width = Math.round(maxHeight * (props.width / props.height));
            props.height = maxHeight;
        }
        return <ResourceView {...props} />;
    }

    /**
     * Render video player
     *
     * @param  {Object} res
     * @param  {Number} maxWidth
     * @param  {Number} maxHeight
     *
     * @return {ReactElement}
     */
    renderVideo(res) {
        let theme = this.props.theme;
        let url = theme.getVideoURL(res);
        let dims = theme.getDimensions(res, { clip: null });
        let posterURL = theme.getImageURL(res, {
            width: dims.width,
            height: dims.height,
            clip: null,
            quality: 60
        });
        let props = {
            ref: 'video',
            src: url,
            controls: true,
            autoPlay: true,
            poster: posterURL,
        };
        return <video {...props} />;
    }

    /**
     * Render links
     *
     * @return {ReactElement|null}
     */
    renderThumbnails(index) {
        let selectedIndex = this.getSelectedResourceIndex();
        let thumbnails = _.map(this.props.resources, (res, index) => {
            let frameProps = {
                className: 'thumbnail',
                'data-index': index,
                onClick: this.handleThumbnailClick,
            };
            if (index === selectedIndex) {
                frameProps.className += ' selected';
            }
            let viewProps = {
                resource: res,
                theme: this.props.theme,
                width: 28,
                height: 28,
            };
            return (
                <div key={index} {...frameProps}>
                    <ResourceView {...viewProps} />
                </div>
            );
        });
        return <div className="links">{thumbnails}</div>;
    }

    /**
     * Render buttons
     *
     * @return {ReactElement}
     */
    renderButtons() {
        let t = this.props.locale.translate;
        let downloadButtonProps = {
            label: t('media-download-original'),
            emphasized: false,
            hidden: (this.props.theme.mode === 'single-col'),
            onClick: this.handleDownloadClick,
        };
        let closeButtonProps = {
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
    }

    /**
     * Remove event handler on unmount
     */
    componentWillUnmount() {
        this.removeListeners();
    }

    /**
     * Called when user clicks on a thumbnail
     *
     * @param  {Event} evt
     */
    handleThumbnailClick = (evt) => {
        let index = parseInt(evt.currentTarget.getAttribute('data-index'));
        return this.selectResource(index);
    }

    /**
     * Called when user clicks on download button
     *
     * @param  {Evt} evt
     */
    handleDownloadClick = (evt) => {
        let index = this.getSelectedResourceIndex();
        let res = this.props.resources[index];
        if (res) {
            // create a link then simulate a click
            let link = document.createElement('A');
            let theme = this.props.theme;
            let url;
            switch (res.type) {
                case 'image': url = theme.getImageURL(res, { original: true }); break;
                case 'video': url = theme.getVideoURL(res, { original: true }); break;
            }
            link.href = url;
            link.download = res.filename || true;   // only works when it's same origin
            link.click();
        }
    }

    /**
     * Change the selection index
     *
     * @param  {Number} diff
     */
    changeSelection(diff) {
        if (diff) {
            let count = this.getResourceCount();
            let index = this.getSelectedResourceIndex() + diff;
            if (index >= count) {
                index = 0;
            } else if (index < 0){
                index = count - 1;
            }
            this.selectResource(index);
        }
    }

    /**
     * Called when user presses a key
     *
     * @param  {Event} evt
     */
    handleKeyDown = (evt) => {
        let diff = 0;
        if (evt.keyCode === 39) {           // right arrow
            diff = +1;
        } else if (evt.keyCode == 37) {     // left arrow
            diff = -1;
        } else {
            return;
        }
        this.changeSelection(diff);
        evt.preventDefault();
    }

    /**
     * Called when user turns the mouse wheel
     *
     * @param  {Event} evt
     */
    handleMouseWheel = (evt) => {
        let diff = 0;
        let delta;
        if (Math.abs(evt.deltaX) >= Math.abs(evt.deltaY)) {
            delta = evt.deltaX;
        } else {
            delta = evt.deltaY;
        }
        if (delta > 0) {
            diff = +1;
        } else if (delta < 0) {
            diff = -1;
        } else {
            return;
        }
        this.changeSelection(diff);
        evt.preventDefault();
    }

    /**
     * Called when user swipe left
     */
    handleSwipeLeft = (evt) => {
        this.changeSelection(-1);
    }

    /**
     * Called when user swipe right
     */
    handleSwipeRight = (evt) => {
        this.changeSelection(+1);
    }
}

export {
    MediaDialogBox as default,
    MediaDialogBox,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    MediaDialogBox.propTypes = {
        show: PropTypes.bool,
        resources: PropTypes.arrayOf(PropTypes.object).isRequired,
        selectedIndex: PropTypes.number.isRequired,

        env: PropTypes.instanceOf(Environment).isRequired,

        onClose: PropTypes.func,
    };
}

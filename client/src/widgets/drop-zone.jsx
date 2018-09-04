import React, { PureComponent } from 'react';

import './drop-zone.scss';

class DropZone extends PureComponent {
    static displayName = 'DropZone';

    constructor(props) {
        super(props);
        this.state = {
            active: false
        };
    }

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="drop-zone" onDragEnter={this.handleDragEnter}>
                {this.props.children}
                {this.renderOverlay()}
            </div>
        );
    }

    /**
     * Render border over zone when there's an item over it
     *
     * @return {ReactElement|null}
     */
    renderOverlay() {
        if (!this.state.active) {
            return null;
        }
        var handlers = {
            onDragLeave: this.handleDragLeave,
            onDragOver: this.handleDragOver,
            onDrop: this.handleDrop,
        };
        return <div className="overlay" {...handlers} />;
    }

    /**
     * Called when user drag item into zone
     *
     * @param  {Event} evt
     */
    handleDragEnter = (evt) => {
        this.setState({ active: true });
    }

    /**
     * Called when user drag item out of zone
     *
     * @param  {Event} evt
     */
    handleDragLeave = (evt) => {
        this.setState({ active: false });
    }

    /**
     * Called when user moves the item within the zone
     *
     * @param  {Event} evt
     */
    handleDragOver = (evt) => {
        evt.preventDefault();
    }

    /**
     * Called when user releases the item
     *
     * @param  {Event} evt
     */
    handleDrop = (evt) => {
        evt.preventDefault();
        if (this.state.active) {
            if (this.props.onDrop) {
                this.props.onDrop({
                    type: 'drop',
                    files: evt.dataTransfer.files,
                    items: evt.dataTransfer.items,
                });
            }
        }
        this.setState({ active: false });
        return null;
    }
}

export {
    DropZone as default,
    DropZone,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    DropZone.propTypes = {
        onDrop: PropTypes.func,
    };
}

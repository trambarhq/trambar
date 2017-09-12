var React = require('react'), PropTypes = React.PropTypes;

require('./drop-zone.scss');

module.exports = React.createClass({
    displayName: 'DropZone',
    propTypes: {
        onDrop: PropTypes.func,
    },

    /**
     * Return initial state
     *
     * @return {Object}
     */
    getInitialState: function() {
        return {
            active: false
        };
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="drop-zone" onDragEnter={this.handleDragEnter}>
                {this.props.children}
                {this.renderOverlay()}
            </div>
        );
    },

    /**
     * Render border over zone when there's an item over it
     *
     * @return {ReactElement|null}
     */
    renderOverlay: function() {
        if (!this.state.active) {
            return null;
        }
        var handlers = {
            onDragLeave: this.handleDragLeave,
            onDragOver: this.handleDragOver,
            onDrop: this.handleDrop,
        };
        return <div className="overlay" {...handlers} />;
    },

    /**
     * Called when user drag item into zone
     *
     * @param  {Event} evt
     */
    handleDragEnter: function(evt) {
        this.setState({ active: true });
    },

    /**
     * Called when user drag item out of zone
     *
     * @param  {Event} evt
     */
    handleDragLeave: function(evt) {
        this.setState({ active: false });
    },

    /**
     * Called when user moves the item within the zone
     *
     * @param  {Event} evt
     */
    handleDragOver: function(evt) {
        evt.preventDefault();
    },

    /**
     * Called when user releases the item
     *
     * @param  {Event} evt
     */
    handleDrop: function(evt) {
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
    },
});

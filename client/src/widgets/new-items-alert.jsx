var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

require('./new-items-alert.scss');

module.exports = React.createClass({
    displayName: 'NewItemsAlertProxy',
    propTypes: {
        show: PropTypes.bool,
        onClick: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            show: false
        };
    },

    /**
     * Do not render anything
     *
     * @return {null}
     */
    render: function() {
        return null;
    },

    /**
     * Draw the alert if component is show on mount
     *
     * @return {[type]}
     */
    componentDidMount: function() {
        if (this.props.show) {
            this.show();
        }
    },

    /**
     * Show or hide the actual element when props.show changes
     *
     * @param  {Object} prevProps
     */
    componentDidUpdate: function(prevProps) {
        if (prevProps.show !== this.props.show) {
            if (this.props.show) {
                this.show();
            } else {
                this.hide();
            }
        } else if (prevProps.children !== this.props.children) {
            if (this.props.show) {
                this.redraw();
            }
        }
    },

    /**
     * Remove the alert on unmount
     */
    componentWillUnmount: function() {
        this.hide();
    },

    /**
     * Render the actual component into the viewport element
     */
    show: function() {
        if (!this.containerNode) {
            this.containerNode = document.createElement('DIV');
            var viewport = document.getElementById('page-view-port');
            viewport.appendChild(this.containerNode);
        } else {
            if (this.containerRemovalTimeout) {
                clearTimeout(this.containerRemovalTimeout);
                this.containerRemovalTimeout = 0;
            }
        }
        var props = {
            show: false,
            onClick: this.props.onClick,
            children: this.props.children
        };
        ReactDOM.render(<NewItemsAlert {...props} />, this.containerNode);
        setTimeout(() => {
            props.show = true;
            ReactDOM.render(<NewItemsAlert {...props} />, this.containerNode);
        }, 10);
    },

    /**
     * Redraw the actual component
     */
    redraw: function() {
        var props = {
            show: true,
            onClick: this.props.onClick,
            children: this.props.children
        };
        ReactDOM.render(<NewItemsAlert {...props} />, this.containerNode);
    },

    /**
     * Remove the actual component from the viewport element
     */
    hide: function() {
        if (!this.containerNode) {
            return;
        }
        if (!this.containerRemovalTimeout) {
            this.containerRemovalTimeout = setTimeout(() => {
                ReactDOM.unmountComponentAtNode(this.containerNode);
                var viewport = document.getElementById('page-view-port');
                viewport.removeChild(this.containerNode);
                this.containerNode = null;
                this.containerRemovalTimeout = 0;
            }, 500);
        }
        var props = {
            show: false,
            children: this.props.children
        };
        ReactDOM.render(<NewItemsAlert {...props} />, this.containerNode);
    },
});

function NewItemsAlert(props) {
    var classNames = [ 'new-items-alert', props.show ? 'show' : 'hide' ];
    return (
        <div className={classNames.join(' ')} onClick={props.onClick}>
            <i className="fa fa-arrow-up" />
            {props.children}
        </div>
    );
}

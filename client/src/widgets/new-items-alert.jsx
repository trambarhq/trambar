var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');


var Route = require('routing/route');

require('./new-items-alert.scss');

module.exports = React.createClass({
    displayName: 'NewItemsAlertProxy',
    propTypes: {
        hash: PropTypes.string,
        route: PropTypes.instanceOf(Route).isRequired,
        onClick: PropTypes.func,
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
     */
    componentDidMount: function() {
        if (this.props.hash) {
            this.show(this.props);
        }
    },

    /**
     * Show or hide the actual element when props.show changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (!this.props.hash && nextProps.hash) {
            this.show(nextProps);
        } else if (this.props.hash && !nextProps.hash) {
            this.hide(this.props);
        } else if (this.props.children !== nextProps.children || this.props.hash !== nextProps.hash) {
            if (nextProps.hash) {
                this.redraw(nextProps, true);
            }
        }
    },

    /**
     * Remove the alert on unmount
     */
    componentWillUnmount: function() {
        this.hide(this.props);
    },

    /**
     * Render the actual component into the viewport element
     *
     * @param  {Object} props
     */
    show: function(props) {
        if (!this.containerNode) {
            this.containerNode = document.createElement('DIV');
            this.viewport = document.getElementsByClassName('page-view-port')[0];
            this.viewport.appendChild(this.containerNode);
        } else {
            if (this.containerRemovalTimeout) {
                clearTimeout(this.containerRemovalTimeout);
                this.containerRemovalTimeout = 0;
            }
        }
        this.redraw(props, false);
        setTimeout(() => {
            this.redraw(props, true);
        }, 10);
    },

    /**
     * Redraw the actual component
     *
     * @param  {Object} props
     * @param  {Boolean} show
     */
    redraw: function(props, show) {
        var route = this.props.route;
        ReactDOM.render(<NewItemsAlert {...props} show={show} />, this.containerNode);
    },

    /**
     * Remove the actual component from the viewport element
     *
     * @param  {Object} props
     */
    hide: function(props) {
        if (!this.containerNode) {
            return;
        }
        if (!this.containerRemovalTimeout) {
            this.containerRemovalTimeout = setTimeout(() => {
                ReactDOM.unmountComponentAtNode(this.containerNode);
                this.viewport.removeChild(this.containerNode);
                this.viewport = null;
                this.containerNode = null;
                this.containerRemovalTimeout = 0;
            }, 500);
        }
        this.redraw(props, false);
    },
});

function NewItemsAlert(props) {
    var url = _.replace(props.route.url, /#(.*)/, '');
    var anchorProps = {
        className: `new-items-alert ${props.show ? 'show' : 'hide'}`,
        href: url + '#' + props.hash,
        onClick: props.onClick,
    };
    return (
        <a {...anchorProps}>
            <i className="fa fa-arrow-up" />
            {props.children}
        </a>
    );
}

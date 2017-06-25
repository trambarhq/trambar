var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

require('./overlay.scss');

module.exports = React.createClass({
    display: 'OverlayProxy',
    propTypes: {
        className: PropTypes.string,
        show: PropTypes.bool,
        onBackgroundClick: PropTypes.func,
    },

    getDefaultProps: function() {
        return {
            show: false
        };
    },

    componentWillMount: function() {
        if (this.props.show) {
            this.show();
        }
    },

    render: function() {
        return null;
    },

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

    componentWillUnmount: function() {
        this.hide();
    },

    show: function() {
        if (!this.containerNode) {
            this.containerNode = document.createElement('DIV');
            document.body.appendChild(this.containerNode);
        } else {
            if (this.containerRemovalTimeout) {
                clearTimeout(this.containerRemovalTimeout);
                this.containerRemovalTimeout = 0;
            }
        }
        var props = {
            show: false,
            onClick: this.handleClick,
            children: this.props.children
        };
        ReactDOM.render(<Overlay {...props} />, this.containerNode);
        setTimeout(() => {
            props.show = true;
            ReactDOM.render(<Overlay {...props} />, this.containerNode);
        }, 10);
    },

    redraw: function() {
        var props = {
            show: true,
            onClick: this.handleClick,
            children: this.props.children
        };
        ReactDOM.render(<Overlay {...props} />, this.containerNode);
    },

    hide: function() {
        if (!this.containerNode) {
            return;
        }
        if (!this.containerRemovalTimeout) {
            this.containerRemovalTimeout = setTimeout(() => {
                ReactDOM.unmountComponentAtNode(this.containerNode);
                document.body.removeChild(this.containerNode);
                this.containerNode = null;
                this.containerRemovalTimeout = 0;
            }, 1000);
        }
        var props = {
            show: false,
            children: this.props.children
        };
        ReactDOM.render(<Overlay {...props} />, this.containerNode);
    },

    handleClick: function(evt) {
        var targetClass = evt.target.className;
        if (targetClass === 'foreground' || targetClass === 'background') {
            if (this.props.onBackgroundClick) {
                this.props.onBackgroundClick(evt);
            }
        }
    },
});

function Overlay(props) {
    var classNames = [ 'overlay', props.show ? 'show' : 'hide' ];
    if (props.className) {
        classNames.push(props.className);
    }
    return (
        <div className={classNames.join(' ')} onClick={props.onClick}>
            <div className="background"/>
            <div className="foreground">{props.children}</div>
        </div>
    );
}

var React = require('react'), PropTypes = React.PropTypes;

require('./corner-pop-up.scss');

module.exports = React.createClass({
    displayName: 'CornerPopUp',

    getInitialState: function() {
        return {
            open: false,
        };
    },

    render: function() {
        return (
            <span ref="container" className="corner-pop-up">
                {this.renderIcon()}
                {this.renderMenu()}
            </span>
        );
    },

    renderIcon: function() {
        var iconclassNames = [ 'fa' ];
        if (this.state.open) {
            iconclassNames.push('fa-chevron-circle-left');
        } else {
            iconclassNames.push('fa-chevron-circle-down');
        }
        return (
            <span className="button" onClick={this.handleClick}>
                <i className={iconclassNames.join(' ')}  />
            </span>
        );
    },

    renderMenu: function() {
        if (!this.state.open) {
            return null;
        }
        return (
            <div className="menu">
                {this.props.children}
            </div>
        );
    },

    componentDidUpdate: function(prevProps, prevState) {
        if (!prevState.open && this.state.open) {
            document.body.addEventListener('mousedown', this.handleBodyMouseDown);
        } else if (prevState.open && !this.state.open) {
            document.body.removeEventListener('mousedown', this.handleBodyMouseDown);
        }
    },

    componentWillUnmount: function() {
        document.body.removeEventListener('mousedown', this.handleBodyMouseDown);
    },

    handleClick: function(evt) {
        this.setState({ open: !this.state.open });
    },

    handleBodyMouseDown: function(evt) {
        var containerNode = this.refs.container;
        var insideMenu = false;
        for (var n = evt.target; n !== document.body.parentNode; n = n.parentNode) {
            if (n === containerNode) {
                insideMenu = true;
                break;
            }
        }
        if (!insideMenu) {
            this.setState({ open: false });
        }
    },
});

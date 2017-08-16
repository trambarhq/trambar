var React = require('react'), PropTypes = React.PropTypes;

require('./sortable-table.scss');

module.exports = React.createClass({
    displayName: 'SortableTable',

    propTypes: {
        sortColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
        sortDirections: PropTypes.arrayOf(PropTypes.oneOf([ 'asc', 'desc' ])),
        onSort: PropTypes.func,
    },

    render: function() {
        var thead = this.getChild('thead');
        var tbody = this.getChild('tbody');
        if (thead) {
            thead = this.highlightHeading(thead);
        }
        var tableProps = _.omit(this.props, 'sortColumns', 'sortDirections', 'onSort');
        tableProps.onClick = this.handleClick;
        tableProps.className = 'sortable-table'
        if (this.props.className) {
            tableProps.className += ' ' + this.props.className;
        }
        return (
            <table {...tableProps}>
                {thead}
                {tbody}
            </table>
        );
    },

    getChild: function(tagName) {
        var children = React.Children.toArray(this.props.children);
        return _.find(children, { type: tagName });
    },

    highlightHeading: function(thead) {
        var sortColumn = _.get(this.props.sortColumns, 0);
        var sortDirection = _.get(this.props.sortDirections, 0, 'asc');
        var children = React.Children.toArray(thead.props.children);
        children = _.map(children, (child) => {
            if (child.props.id === sortColumn) {
                var className = child.props.className;
                if (className) {
                    className += ' ';
                }
                className += sortDirection;
                child = React.cloneElement(child, { className });
            }
        });
        thead = React.cloneElement(thead, {}, children);
        return thead;
    },

    handleClick: function(evt) {
        var target = evt.target;
        for (var n = evt.target; n && n.tagName !== 'TABLE'; n = n.parentNode) {
            if (n.tagName === 'TH') {
                var column = n.id;
                if (!column) {
                    return;
                }
                var sortColumns = _.slice(this.props.sortColumns);
                var sortDirections = _.slice(this.props.sortDirections);
                var index = _.indexOf(sortColumns);
                if (index !== -1) {
                    sortColumns.splice(index, 1);
                    sortDirections.splice(index, 1);
                }
                var dir = (index === 0) ? 'desc' : 'asc';
                sortColumns.unshift(column);
                sortDirections.unshift(dir);
                if (this.props.onSort) {
                    this.props.onSort({
                        type: 'sort',
                        target: this,
                        columns: sortColumns,
                        directions: sortDirections,
                    });
                }
            }
        }
    },
});

function TH(props) {
    return (
        <th {...props}>
            {props.children}
            <i className="fa fa-chevron-down arrow down"/>
            <i className="fa fa-chevron-down arrow up"/>
        </th>
    );
}

module.exports.TH = TH;

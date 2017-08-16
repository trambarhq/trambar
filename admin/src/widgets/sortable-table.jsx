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
        var thead = findChild(this.props.children, 'thead');
        var tbody = findChild(this.props.children, 'tbody');
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

    highlightHeading: function(thead) {
        var sortColumn = _.get(this.props.sortColumns, 0);
        var sortDirection = _.get(this.props.sortDirections, 0, 'asc');
        var tr = findChild(thead.props.children, 'tr');
        var children = React.Children.toArray(tr.props.children);
        children = _.map(children, (child) => {
            if (child.props.id === sortColumn) {
                var className = child.props.className || '';
                if (className) {
                    className += ' ';
                }
                className += sortDirection;
                child = React.cloneElement(child, { className });
            }
            return child;
        });
        tr = React.cloneElement(tr, {}, children);
        thead = React.cloneElement(thead, {}, [ tr ]);
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
                var index = _.indexOf(sortColumns, column);
                if (index !== -1) {
                    sortColumns.splice(index, 1);
                    sortDirections.splice(index, 1);
                }
                var dir = 'asc';
                if (index === 0) {
                    if (this.props.sortDirections[0] === 'asc') {
                        dir = 'desc';
                    }
                }
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

function findChild(children, tagName) {
    children = React.Children.toArray(children);
    return _.find(children, { type: tagName });
}

function TH(props) {
    return (
        <th {...props}>
            {props.children}
            <i className="fa fa-chevron-down arrow down"/>
            <i className="fa fa-chevron-up arrow up"/>
        </th>
    );
}

module.exports.TH = TH;

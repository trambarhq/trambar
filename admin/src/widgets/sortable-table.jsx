var React = require('react'), PropTypes = React.PropTypes;

require('./sortable-table.scss');

module.exports = React.createClass({
    displayName: 'SortableTable',
    propTypes: {
        sortColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
        sortDirections: PropTypes.arrayOf(PropTypes.oneOf([ 'asc', 'desc' ])),
        expanded: PropTypes.bool,
        onSort: PropTypes.func,
    },

    getInitialState: function() {
        return {
            action: null,
            cellHeights: null
        };
    },

    componentWillReceiveProps: function(nextProps) {
        if (this.props.expanded !== nextProps.expanded) {
            if (nextProps.expanded) {
                this.setState({ action: 'expanding' });
            } else {
                this.setState({ action: 'collapsing' });
            }
        }
        // clear the heights
        this.setState({ cellHeights: null });
    },

    render: function() {
        var thead = findChild(this.props.children, 'thead');
        var tbody = findChild(this.props.children, 'tbody');
        if (thead) {
            thead = this.highlightHeading(thead);
        }
        if (tbody && this.props.expanded != null) {
            tbody = this.wrapUnselectedRows(tbody);
        }
        var tableProps = _.omit(this.props, 'sortColumns', 'sortDirections', 'expanded', 'onSort');
        tableProps.onClick = this.handleClick;
        tableProps.className = 'sortable-table'
        if (this.props.expanded != null) {
            tableProps.className += ' expandable';
            if (this.props.expanded) {
                tableProps.className += ' expanded';
            }
        }
        if (this.props.className) {
            tableProps.className += ' ' + this.props.className;
        }
        return (
            <table ref="table" {...tableProps}>
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

    wrapUnselectedRows: function(tbody) {
        var cellHeights = this.state.cellHeights;
        // not using React.Children.toArray() on the rows, as that
        // leads to new keys and messes up CSS transition
        var trs = tbody.props.children;
        trs = _.map(trs, (tr, i) => {
            if (/selected/.test(tr.props.className)) {
                return tr;
            }
            var className;
            if (this.state.action === 'expanding') {
                // render row in collapsed state until the cell heights are known
                className = (cellHeights) ? 'expanded' : 'collapsed';
            } else if (this.state.action === 'collapsing') {
                //
                className = 'collapsed';
            } else {
                // render as expanded when component is mounted with expanded = true
                className = 'expanded';
            }
            var tds = React.Children.toArray(tr.props.children);
            tds = _.map(tds, (td, j) => {
                var id = `cell-${i}-${j}`;
                var height = (cellHeights) ? cellHeights[id] : undefined;
                var div = (
                    <div className="expanding-container" style={{ height }}>
                        <div className="expanding-contents" id={id}>
                            {td.props.children}
                        </div>
                    </div>
                );
                return React.cloneElement(td, {}, div);
            });
            return React.cloneElement(tr, { className }, tds);
        });
        tbody = React.cloneElement(tbody, {}, trs);
        return tbody;
    },

    componentDidUpdate: function(prevProps, prevState) {
        if (this.props.expanded) {
            // obtain the heights of the cells
            if (!this.state.cellHeights) {
                var table = this.refs.table;
                var cellHeights = {};
                var divs = table.getElementsByClassName('expanding-contents');
                _.each(divs, (div) => {
                    cellHeights[div.id] = div.offsetHeight;
                });
                if (!_.isEqual(cellHeights, this.state.cellHeights)) {
                    this.setState({ cellHeights });
                }
            }
        }
        if (!prevState.action && this.state.action) {
            // clear it after a second or so
            var action = this.state.action;
            setTimeout(() => {
                if (this.state.action == action) {
                    this.setState({ action: null });
                }
            }, 800);
        }
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

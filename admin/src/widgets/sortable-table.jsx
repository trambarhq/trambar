import _ from 'lodash';
import React, { PureComponent } from 'react';

import CollapsibleContainer from 'widgets/collapsible-container';

import './sortable-table.scss';

/**
 * A table with clickable headers that changes how sorting is performed. The
 * table can expand to show additional rows.
 *
 * @extends PureComponent
 */
class SortableTable extends PureComponent {
    static displayName = 'SortableTable';

    constructor(props) {
        super(props);
        this.state = {
            action: null,
        };
    }

    componentWillReceiveProps(nextProps) {
        let { expanded } = this.props;
        if (nextProps.expanded !== expanded) {
            if (nextProps.expanded) {
                this.setState({ action: 'expanding' });
            } else {
                this.setState({ action: 'collapsing' });
            }
        }
    }

    render() {
        let { children, expandable, expanded, selectable, className } = this.props;
        let thead = findChild(children, 'thead');
        let tbody = findChild(children, 'tbody');
        if (thead) {
            thead = this.highlightHeading(thead);
        }
        if (tbody && expanded != null) {
            tbody = this.wrapUnselectedRows(tbody);
        }
        let tableProps = _.omit(this.props, [ 'sortColumns', 'sortDirections', 'expandable', 'selectable', 'expanded', 'onSort' ]);
        tableProps.onClick = this.handleClick;
        tableProps.className = 'sortable-table'
        if (expandable) {
            tableProps.className += ' expandable';
            if (expanded) {
                tableProps.className += ' expanded';
            } else {
                tableProps.className += ' collapsed';
            }
        }
        if (selectable) {
            tableProps.className += ' selectable';
        }
        if (className) {
            tableProps.className += ' ' + className;
        }
        return (
            <table ref="table" {...tableProps}>
                {thead}
                {tbody}
            </table>
        );
    }

    highlightHeading(thead) {
        let { sortColumns, sortDirections } = this.props;
        let sortColumn = _.get(sortColumns, 0);
        let sortDirection = _.get(sortDirections, 0, 'asc');
        let tr = findChild(thead.props.children, 'tr');
        let children = React.Children.toArray(tr.props.children);
        children = _.map(children, (child) => {
            if (child.props.id === sortColumn) {
                let className = child.props.className || '';
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
    }

    wrapUnselectedRows(tbody) {
        let { expanded } = this.props;
        let { action, cellHeights } = this.state;
        // not using React.Children.toArray() on the rows, as that
        // leads to new keys and messes up CSS transition
        let trs = tbody.props.children;
        trs = _.map(trs, (tr, i) => {
            if (!tr) {
                return null;
            }
            if (/\bfixed\b/.test(tr.props.className)) {
                return tr;
            }
            let tds = React.Children.toArray(tr.props.children);
            let open;
            let className = tr.props.className;
            if (action === 'expanding') {
                // render in the closed state at start of transition
                open = false;
            } else if (action === 'collapsing') {
                // render in the open state at start of transition
                open = true;
            } else {
                open = expanded;
            }
            if (className) {
                className += ' ';
            } else {
                className = '';
            }
            className += (open) ? 'expanded' : 'collapsed';
            tds = _.map(tds, (td, j) => {
                let container = (
                    <CollapsibleContainer open={open}>
                        {td.props.children}
                    </CollapsibleContainer>
                );
                return React.cloneElement(td, {}, container);
            });
            return React.cloneElement(tr, { className }, tds);
        });
        tbody = React.cloneElement(tbody, {}, trs);
        return tbody;
    }

    componentDidUpdate(prevProps, prevState) {
        let { action } = this.state;
        if (action) {
            // clear the action and redraw, giving componentDidUpdate() of
            // CollapsibleContainer a chance to capture the height of its
            // contents first
            setImmediate(() => {
                this.setState({ action: null });
            });
        }
    }

    handleClick = (evt) => {
        let { sortColumns, sortDirections, onSort } = this.props;
        let target = evt.target;
        for (let n = evt.target; n && n.tagName !== 'TABLE'; n = n.parentNode) {
            if (n.tagName === 'TH') {
                let column = n.id;
                if (!column) {
                    return;
                }
                sortColumns = _.slice(sortColumns);
                sortDirections = _.slice(sortDirections);
                let index = _.indexOf(sortColumns, column);
                if (index !== -1) {
                    sortColumns.splice(index, 1);
                    sortDirections.splice(index, 1);
                }
                let dir = 'asc';
                if (index === 0) {
                    if (sortDirections[0] === 'asc') {
                        dir = 'desc';
                    }
                }
                sortColumns.unshift(column);
                sortDirections.unshift(dir);
                if (onSort) {
                    onSort({
                        type: 'sort',
                        target: this,
                        columns: sortColumns,
                        directions: sortDirections,
                    });
                }
            }
        }
    }
}

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

export {
    SortableTable as default,
    SortableTable,
    TH,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SortableTable.propTypes = {
        sortColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
        sortDirections: PropTypes.arrayOf(PropTypes.oneOf([ 'asc', 'desc' ])),
        expanded: PropTypes.bool,
        expandable: PropTypes.bool,
        selectable: PropTypes.bool,
        onSort: PropTypes.func,
    };
}

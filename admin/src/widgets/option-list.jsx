var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

var SortableTable = require('widgets/sortable-table');

require('./option-list.scss');

module.exports = React.createClass({
    displayName: 'OptionList',
    propTypes: {
        readOnly: PropTypes.bool,
        onOptionClick: PropTypes.func,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        var children = React.Children.toArray(this.props.children);
        var options = _.filter(children, { type: 'option' });
        var label = _.find(children, { type: 'label' });
        var classNames = [ 'option-list' ];
        if (this.props.readOnly) {
            classNames.push('readonly');
        }
        var tableProps = {
            expandable: true,
            selectable: !this.props.readOnly,
            expanded: !this.props.readOnly,
            sortColumns: [],
        };
        return (
            <div className={classNames.join(' ')}>
                <label>
                    {label ? label.props.children : null}
                </label>
                <div className="container">
                    <SortableTable {...tableProps}>
                        <tbody>
                            {_.map(options, this.renderRow)}
                        </tbody>
                    </SortableTable>
                </div>
            </div>
        );
    },

    renderRow: function(option, i) {
        if (option.props.hidden) {
            return null;
        }
        var classNames = [ 'option' ];
        if (option.props.selected) {
            classNames.push('fixed');
            if (!this.props.readOnly) {
                classNames.push('selected');
            }
        }
        var badge;
        if (!this.props.readOnly) {
            if (option.props.selected && !option.props.previous) {
                badge = <i className="fa fa-check-circle-o badge add" />;
            } else if (!option.props.selected && option.props.previous) {
                badge = <i className="fa fa-times-circle-o badge remove" />;
            }
        }
        var props = {
            className: classNames.join(' '),
            'data-name': option.props.name,
            onClick: this.handleClick,
        };
        if (this.props.readOnly) {
            props.onClick = undefined;
        }
        return (
            <tr key={i} {...props}>
                <td>
                    {option.props.children}
                    {badge}
                </td>
            </tr>
        );
    },

    handleClick: function(evt) {
        var name = evt.currentTarget.getAttribute('data-name');
        if (this.props.onOptionClick) {
            this.props.onOptionClick({
                type: 'optionclick',
                target: this,
                name,
            });
        }
    },
})

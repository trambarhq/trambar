import _ from 'lodash';
import React, { PureComponent, Children } from 'react';

import SortableTable from 'widgets/sortable-table';

import './option-list.scss';

class OptionList extends PureComponent {
    static displayName = 'OptionList';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        let { children, readOnly } = this.props;
        children = Children.toArray(children);
        let options = _.filter(children, { type: 'option' });
        let label = _.find(children, { type: 'label' });
        let classNames = [ 'option-list' ];
        if (readOnly) {
            classNames.push('readonly');
        }
        let tableProps = {
            expandable: true,
            selectable: !readOnly,
            expanded: !readOnly,
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
                        {
                            _.map(options, (option, i) => {
                                return this.renderRow(option, i);
                            })
                        }
                        </tbody>
                    </SortableTable>
                </div>
            </div>
        );
    }

    renderRow(option, i) {
        let { readOnly } = this.props;
        let { name, hidden, selected, previous, children } = option.props;
        if (hidden) {
            return null;
        }
        let classNames = [ 'option' ];
        if (selected) {
            classNames.push('fixed');
            if (!readOnly) {
                classNames.push('selected');
            }
        }
        let badge;
        if (!readOnly) {
            if (selected && !previous) {
                badge = <i className="fa fa-check-circle-o badge add" />;
            } else if (!selected && previous) {
                badge = <i className="fa fa-times-circle-o badge remove" />;
            }
        }
        let props = {
            className: classNames.join(' '),
            'data-name': name,
            onClick: this.handleClick,
        };
        if (readOnly) {
            props.onClick = undefined;
        }
        return (
            <tr key={i} {...props}>
                <td>
                    {children}
                    {badge}
                </td>
            </tr>
        );
    }

    handleClick = (evt) => {
        let { onOptionClick } = this.props;
        let name = evt.currentTarget.getAttribute('data-name');
        if (onOptionClick) {
            onOptionClick({
                type: 'optionclick',
                target: this,
                name,
            });
        }
    }
}

export {
    OptionList as default,
    OptionList,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    OptionList.propTypes = {
        readOnly: PropTypes.bool,
        onOptionClick: PropTypes.func,
    };
}

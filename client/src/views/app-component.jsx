import _ from 'lodash';
import React, { PureComponent } from 'react';
import MarkGor from 'mark-gor/react';

import Environment from 'env/environment';

// widgets
import ResourceView from 'widgets/resource-view';

import './app-component.scss';

class AppComponent extends PureComponent {
    static displayName = 'AppComponent';

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render() {
        return (
            <div className="app-component" onClick={this.handleClick}>
                {this.renderPicture()}
                {this.renderText()}
            </div>
        );
    }

    /**
     * Render icon or image
     *
     * @return {ReactElement}
     */
    renderPicture() {
        let component = this.props.component;
        if (component.image) {
            return (
                <div className="picture">
                    <ResourceView resource={component.image} height={48} theme={this.props.theme} />
                </div>
            );
        } else {
            let icon = component.icon || {};
            let iconClassName = icon.class || 'fa-cubes';
            let style = {
                color: icon.color,
                backgroundColor: icon.backgroundColor,
            };
            return (
                <div className="picture">
                    <div className="icon" style={style}>
                        <i className={`fa fa-fw ${iconClassName}`} />
                    </div>
                </div>
            );
        }
    }

    /**
     * Render text description of component, formatted as Markdown
     *
     * @return {ReactElement}
     */
    renderText() {
        let p = this.props.locale.pick;
        let text = p(this.props.component.text);
        let elements = MarkGor.parse(text);
        return (
            <div className="description">
                <div className="description-contents">
                    {elements}
                    <div className="ellipsis">
                        <i className="fa fa-ellipsis-h" />
                    </div>
                </div>
            </div>
        );
    }

    /**
     * Called when user clicks on component description
     *
     * @param  {Event} evt
     */
    handleClick = (evt) => {
        if (this.props.onSelect) {
            this.props.onSelect({
                type: 'select',
                target: this,
                component: this.props.component,
            });
        }
    }
}

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AppComponent.propTypes = {
        component: PropTypes.object.isRequired,
        theme: PropTypes.instanceOf(Theme),
        env: PropTypes.instanceOf(Environment).isRequired,
        onSelect: PropTypes.func,
    };
}

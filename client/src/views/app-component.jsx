import _ from 'lodash';
import React, { PureComponent } from 'react';
import MarkGor from 'mark-gor/react';

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
        let { env, component } = this.props;
        if (component.image) {
            return (
                <div className="picture">
                    <ResourceView resource={component.image} height={48} env={env} />
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
        let { env, component } = this.props;
        let { text } = component;
        let { p } = env.locale;
        let elements = MarkGor.parse(p(text));
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
        let { component, onSelect } = this.props;
        if (onSelect) {
            onSelect({
                type: 'select',
                target: this,
                component,
            });
        }
    }
}

export {
    AppComponent as default,
    AppComponent,
};

import Environment from 'env/environment';

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    AppComponent.propTypes = {
        component: PropTypes.object.isRequired,
        env: PropTypes.instanceOf(Environment).isRequired,
        onSelect: PropTypes.func,
    };
}

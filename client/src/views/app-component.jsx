import _ from 'lodash';
import React, { PureComponent } from 'react';
import MarkGor from 'mark-gor/react';

import Theme from 'theme/theme';
import Locale from 'locale/locale';

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
        var component = this.props.component;
        if (component.image) {
            return (
                <div className="picture">
                    <ResourceView resource={component.image} height={48} theme={this.props.theme} />
                </div>
            );
        } else {
            var icon = component.icon || {};
            var iconClassName = icon.class || 'fa-cubes';
            var style = {
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
        var p = this.props.locale.pick;
        var text = p(this.props.component.text);
        var elements = MarkGor.parse(text);
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
        locale: PropTypes.instanceOf(Locale),
        onSelect: PropTypes.func,
    };
}

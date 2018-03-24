var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var MarkGor = require('mark-gor/react');

var Theme = require('theme/theme');
var Locale = require('locale/locale');

// widgets
var ResourceView = require('widgets/resource-view');

require('./app-component.scss');

module.exports = React.createClass({
    displayName: 'AppComponent',
    propTypes: {
        component: PropTypes.object.isRequired,
        theme: PropTypes.instanceOf(Theme),
        locale: PropTypes.instanceOf(Locale),
        onSelect: PropTypes.func,
    },

    /**
     * Render component
     *
     * @return {ReactElement}
     */
    render: function() {
        return (
            <div className="app-component" onClick={this.handleClick}>
                {this.renderPicture()}
                {this.renderText()}
            </div>
        );
    },

    /**
     * Render icon or image
     *
     * @return {ReactElement}
     */
    renderPicture: function() {
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
    },

    /**
     * Render text description of component, formatted as Markdown
     *
     * @return {ReactElement}
     */
    renderText: function() {
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
    },

    /**
     * Called when user clicks on component description
     *
     * @param  {Event} evt
     */
    handleClick: function(evt) {
        if (this.props.onSelect) {
            this.props.onSelect({
                type: 'select',
                target: this,
                component: this.props.component,
            });
        }
    },
});

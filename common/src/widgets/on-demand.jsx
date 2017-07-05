var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;

module.exports = React.createClass({
    displayName: 'OnDemand',
    propTypes: {
        initial: React.PropTypes.bool,
        children: React.PropTypes.element,
        type: React.PropTypes.string.isRequired,
        tag: React.PropTypes.string,
        className: React.PropTypes.string,
    },

    getDefaultProps: function() {
        return {
            initial: false,
            tag: 'div',
        };
    },

    getInitialState: function() {
        this.containerNode = null;
        this.placeholderNode = null;
        this.insideViewPort = undefined;
        this.nearViewPort = undefined;
        this.actualHeight = undefined;
        this.heightEstimate = undefined;
        return {};
    },

    shouldRender: function() {
        // render initial elements when we don't know the height
        if (this.props.initial && this.actualHeight === undefined) {
            return true;
        } else {
            return this.nearViewPort;
        }
    },

    render: function() {
        var Tag = this.props.tag;
        var className = this.props.className;
        if (this.shouldRender()) {
            this.placeholderNode = null;
            return (
                <Tag className={className} ref={this.setContainerNode}>
                    {this.props.children}
                </Tag>
            );
        } else {
            this.containerNode = null;
            var height = this.actualHeight || this.estimatedHeight;
            if (height) {
                return <Tag className={className} ref={this.setPlaceholderNode} style={{ height }} />;
            } else {
                return null;
            }
        }
    },

    componentDidUpdate: function() {
        if (this.containerNode) {
            this.actualHeight = this.containerNode.offsetHeight;
        }
        if (this.nearViewPort === undefined) {
            var type = this.props.type;
            var list = componentLists[type];
            this.adjustVisibility(list.viewPortRect);
        }
    },

    componentDidMount: function() {
        var type = this.props.type;
        addComponent(type, this);
        if (this.containerNode) {
            this.actualHeight = this.containerNode.offsetHeight;
        } else if (!this.placeholderNode) {
            this.estimatedHeight = getHeightEstimate(type);
            this.forceUpdate();
        }
        if (this.nearViewPort === undefined) {
            var list = componentLists[type];
            this.adjustVisibility(list.viewPortRect, true);
        }
    },

    componentWillUnmount: function() {
        var type = this.props.type;
        removeComponent(type, this);
    },

    setContainerNode: function(node) {
        this.containerNode = node;
    },

    setPlaceholderNode: function(node) {
        this.placeholderNode = node;
    },

    adjustVisibility: function(viewPortRect, noRemoval) {
        if (!viewPortRect) {
            return false;
        }
        var node = this.containerNode || this.placeholderNode;
        if (!node) {
            return false;
        }
        var rect = node.getBoundingClientRect();
        var inside = false;
        var bottomLimit = viewPortRect.top;
        var topLimit = viewPortRect.bottom;
        var rightLimit = viewPortRect.left;
        var leftLimit = viewPortRect.right;
        if (rect.left < leftLimit) {
            if (rect.right > rightLimit) {
                if (rect.top < topLimit) {
                    if (rect.bottom > bottomLimit) {
                        inside = true;
                    }
                }
            }
        }
        this.insideViewPort = inside;
        this.rect = rect;

        var near = false;
        var bottomLimit = viewPortRect.top - 100;
        var topLimit = viewPortRect.bottom + 100;
        var rightLimit = viewPortRect.left - 100;
        var leftLimit = viewPortRect.right + 100;
        if (rect.left < leftLimit) {
            if (rect.right > rightLimit) {
                if (rect.top < topLimit) {
                    if (rect.bottom > bottomLimit) {
                        near = true;
                    }
                }
            }
        }
        if (this.nearViewPort !== near) {
            this.nearViewPort = near;
            if (!!this.containerNode !== near) {
                // don't remove node during initial mounting of components, as
                // layout could be in flux and the reported position might be
                // wrong
                if (!noRemoval || !this.containerNode) {
                    this.forceUpdate();
                    return true;
                }
            }
        }
        return false;
    },
});

function handleViewportScroll(evt) {
    for (var type in componentLists) {
        var list = componentLists[type];
        if (list.viewPort === evt.target) {
            for (var i = 0; i < list.components.length; i++) {
                var component = list.components[i];
                component.adjustVisibility(list.viewPortRect);
            }
        }
    }
}

function handleWindowResize(evt) {
    for (var type in componentLists) {
        var list = componentLists[type];
        if (!list.viewPort) {
            continue;
        }
        var rect = list.viewPort.getBoundingClientRect();
        if (!compareRect(rect, list.viewPort)) {
            var viewPortRectBefore = list.viewPortRect;
            list.viewPortRect = rect;

            // get new height of elements
            for (var i = 0; i < list.components.length; i++) {
                var component = list.components[i];
                if (component.containerNode) {
                    component.actualHeight = component.containerNode.offsetHeight;
                    component.adjustVisibility(list.viewPortRect);
                }
            }

            // rerender the placeholder with new height estimate
            list.heightEstimate = undefined;
            for (var i = 0; i < list.components.length; i++) {
                var component = list.components[i];
                if (component.placeholderNode) {
                    component.insideViewPort = undefined;
                    component.nearViewPort = undefined;
                    component.actualHeight = undefined;
                    component.estimatedHeight = getHeightEstimate(type);
                    component.forceUpdate();
                }
            }
        }
    }
}

var componentLists = {};

function addComponent(type, component) {
    var list = componentLists[type];
    if (!list) {
        list = componentLists[type] = {
            viewPort: null,
            viewPortRect: null,
            components: [],
            heightEstimate: undefined,
        };
    }
    list.components.push(component);

    // find the viewport
    if (!list.viewPort) {
        var node = component.containerNode || component.placeholderNode;
        if (node) {
            list.viewPort = findViewPort(node);
            if (list.viewPort) {
                list.viewPort.addEventListener('scroll', handleViewportScroll);
                list.viewPortRect = list.viewPort.getBoundingClientRect();
            }
        }
    }
}

function removeComponent(type, component) {
    var list = componentLists[type];
    if (!list) {
        return;
    }
    _.pull(list.components, component);
    if (list.components.length === 0) {
        if (list.viewPort) {
            list.viewPort.removeEventListener('scroll', handleViewportScroll);
        }
        componentLists = _.omit(componentLists, type);
    }
}

function getHeightEstimate(type) {
    var list = componentLists[type];
    if (list) {
        var height = list.heightEstimate;
        if (height === undefined) {
            var avg = 0;
            for (var i = 0, n = 1; i < list.components.length; i++, n++) {
                var component = list.components[i];
                var h = component.actualHeight;
                if (h !== undefined) {
                    avg  = avg * (n - 1) / n + (h / n)
                }
            }
            list.heightEstimate = height = Math.round(avg);
        }
        return height;
    }
}

function compareRect(rect1, rect2) {
    return rect1.left === rect2.left
        && rect1.top === rect2.top
        && rect1.right === rect2.right
        && rect1.bottom === rect2.bottom;
}

function findViewPort(node) {
    var html = document.body.parentNode;
    for (var p = node.parentNode; p !== html; p = p.parentNode) {
        var styles = getComputedStyle(p);
        if (styles.overflowY === 'auto' || styles.overflowY === 'scroll') {
            return p;
        }
        if (styles.overflowX === 'auto' || styles.overflowX === 'scroll') {
            return p;
        }
    }
    return null;
}

window.addEventListener('resize', handleWindowResize);

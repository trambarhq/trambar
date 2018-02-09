var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

module.exports = React.createClass({
    displayName: 'SmartList',
    propTypes: {
        items: PropTypes.arrayOf(PropTypes.object),
        fresh: PropTypes.bool,
        behind: PropTypes.number,
        ahead: PropTypes.number,
        anchor: PropTypes.string,
        offset: PropTypes.number,
        inverted: PropTypes.bool,

        onIdentity: PropTypes.func.isRequired,
        onRender: PropTypes.func.isRequired,
        onAnchorChange: PropTypes.func,
        onBeforeAnchor: PropTypes.func,
    },

    /**
     * Return default props
     *
     * @return {Object}
     */
    getDefaultProps: function() {
        return {
            fresh: false,
            behind: 5,
            ahead: 10,
            offset: 0,
            inverted: false,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        this.itemHeights = {};
        this.itemNodes = {};
        this.anchorOffset = this.props.offset;
        return {
            currentAnchor: this.props.anchor,
            estimatedHeight: undefined,
        };
    },

    /**
     * Change state.currentAnchor when props.anchor changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        if (this.props.anchor !== nextProps.anchor) {
            this.setState({ currentAnchor: nextProps.anchor });
            this.anchorOffset = nextProps.offset;
        }
        if (this.props.fresh) {
            this.stillFresh = true;
            // reset the anchor
            this.setState({ currentAnchor: nextProps.anchor });
            this.anchorOffset = nextProps.offset;

            if (!nextProps.anchor) {
                if (this.scrollContainer) {
                    // make sure we're at the top when rendering a branch new list
                    if (this.scrollContainer.scrollTop > 0) {
                        this.scrollContainer.scrollTop = 0;
                    }
                }
            }
        }
    },

    /**
     * Render list items, with the help of callbacks
     *
     * @return {ReactElement}
     */
    render: function() {
        // first, get the ids of the items
        var items = this.props.items;
        var onIdentity = this.props.onIdentity;
        var ids = _.map(items, (item, index) => {
            return onIdentity({
                type: 'identity',
                target: this,
                item: item,
                currentIndex: index,
            });
        });
        var anchorIndex = (this.state.currentAnchor) ? _.indexOf(ids, this.state.currentAnchor) : 0;
        if (anchorIndex === -1 && items) {
            // anchor item has vanished--find the closest one that still exists
            var previousIds = _.keys(this.itemNodes);
            var previousAnchorIndex = _.indexOf(previousIds, this.state.currentAnchor);
            for (var i = previousAnchorIndex + 1; i < previousIds.length; i++) {
                var newAnchorIndex = _.indexOf(ids, previousIds[i]);
                if (newAnchorIndex !== -1) {
                    // pretend the value was correct all along by modifying
                    // the state directly
                    anchorIndex = newAnchorIndex;
                    this.state.currentAnchor = ids[newAnchorIndex];
                    setImmediate(() => {
                        this.triggerAnchorChangeEvent(ids[newAnchorIndex]);
                    });
                    break;
                }
            }
            if (anchorIndex === -1) {
                this.state.currentAnchor = undefined;
                setImmediate(() => {
                    this.triggerAnchorChangeEvent(undefined);
                });
            }
        }
        // render some items behind (i.e. above) the anchored item
        var startIndex = Math.max(0, anchorIndex - this.props.behind);
        // render some items ahead of (i.e. below) the anchored item
        // (presumably the number is sufficient to fill the viewport)
        var endIndex = Math.min(_.size(items), anchorIndex + this.props.ahead + 1);

        var onRender = this.props.onRender;
        var children = _.map(this.props.items, (item, index) => {
            var id = ids[index];
            var evt = {
                type: 'render',
                target: this,
                item: item,
                needed: (startIndex <= index && index < endIndex),
                startIndex: startIndex,
                currentIndex: index,
                endIndex: endIndex,
                previousHeight: this.itemHeights[id],
                estimatedHeight: this.state.estimatedHeight,
            };
            var contents = onRender(evt);
            return (
                <div key={id} id={id}>
                    {contents}
                </div>
            );
        });
        // remember the range where we have fully rendered the items
        this.startIndex = startIndex;
        this.endIndex = endIndex;
        if (this.props.inverted) {
            _.reverse(children);
        }
        return <div className="smart-list">{children}</div>;
    },

    /**
     * Find DOM nodes and add event listeners on mount
     */
    componentDidMount: function() {
        // find the list's DOM node and its scroll container
        this.container = ReactDOM.findDOMNode(this);
        for (var p = this.container.parentNode; p; p = p.parentNode) {
            var style = getComputedStyle(p);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                this.scrollContainer = p;
                break;
            }
        }
        this.scrollContainerWidth = this.scrollContainer.clientWidth;
        this.scrollContainer.addEventListener('scroll', this.handleScroll);
        window.addEventListener('resize', this.handleWindowResize);
        this.scanItemNodes();
    },

    /**
     * Scan the DOM nodes after we've rendered them
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!this.stillFresh) {
            var updatingList = !_.isEmpty(this.itemNodes);
            var newItemIndices = this.scanItemNodes();
            if (this.state.currentAnchor && updatingList) {
                // see which new items are behind (i.e. above) the anchor element
                var ids = _.keys(this.itemNodes);
                var anchorIndex = _.indexOf(ids, this.state.currentAnchor);
                var items = _.transform(newItemIndices, (list, index) => {
                    if (index < anchorIndex) {
                        list.push(this.props.items[index]);
                    }
                }, []);
                if (!_.isEmpty(items)) {
                    this.triggerBeforeAnchorEvent(items);
                }
            }
        }
        this.stillFresh = false;
    },

    /**
     * Remove listeners on unmount
     */
    componentWillUnmount: function() {
        this.scrollContainer.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleWindowResize);
    },

    /**
     * Find DOM nodes, record their heights, as well as maintaining the position
     * of the anchored element. Return indices new nodes
     *
     * @return {Array<Number>}
     */
    scanItemNodes: function() {
        var startIndex = this.startIndex;
        var endIndex = this.endIndex;
        var index = 0;
        var itemNodesBefore = this.itemNodes;
        var newItemIndices = []
        this.itemNodes = {};
        for (var c = this.container.firstChild; c; c = c.nextSibling) {
            var id = c.id;
            this.itemNodes[id] = c;
            if (startIndex <= index && index < endIndex) {
                this.itemHeights[id] = c.offsetHeight;
            }
            if (!itemNodesBefore[id]) {
                newItemIndices.push(index);
            }
            index++;
        }
        if (this.state.estimatedHeight === undefined) {
            var heights = _.values(this.itemHeights);
            if (!_.isEmpty(heights)) {
                var avg = _.sum(heights) / heights.length;
                var estimatedHeight = Math.round(avg);
                this.setState({ estimatedHeight })
            }
        } else if (!this.scrolling) {
            // maintain the position of the anchor node
            var anchorNode, anchorOffset;
            if (this.state.currentAnchor) {
                anchorNode = this.itemNodes[this.state.currentAnchor];
                anchorOffset = this.anchorOffset;
            } else if (this.props.inverted) {
                // scroll down all the way to the bottom
                anchorNode = this.container.lastChild;
                anchorOffset = Infinity;
            }
            if (anchorNode) {
                if (anchorNode && anchorOffset !== undefined) {
                    var containerOffsetTop = this.scrollContainer.offsetTop;
                    var containerScrollTop = this.scrollContainer.scrollTop;
                    var anchorTop = anchorNode.offsetTop - containerOffsetTop;
                    if (!this.props.inverted) {
                        var actualOffset = anchorTop - containerScrollTop;
                        if (actualOffset !== anchorOffset) {
                            // don't reposition when it's at the top
                            var newScrollTop = Math.max(0, anchorTop - anchorOffset);
                            this.scrollContainer.scrollTop = newScrollTop;
                        }
                    } else {
                        // calculate the equivalent of offsetTop and scrollTop,
                        // measured from the bottom of the container
                        var containerScrollHeight = this.scrollContainer.scrollHeight;
                        var containerOffsetHeight = this.scrollContainer.offsetHeight;
                        var containerScrollBottom = containerScrollHeight - containerScrollTop - containerOffsetHeight;
                        var anchorHeight = anchorNode.offsetHeight;
                        var anchorBottom = containerScrollHeight - anchorTop - anchorHeight;

                        var actualOffset = anchorBottom - containerScrollBottom;
                        if (actualOffset !== anchorOffset) {
                            var newScrollBottom = Math.max(0, anchorBottom - anchorOffset);
                            var newScrollTop = containerScrollHeight - newScrollBottom - containerOffsetHeight
                            this.scrollContainer.scrollTop = newScrollTop;
                        }
                    }
                }
            }
        }
        return newItemIndices;
    },

    /**
     * Clear the saved item heights and force rerender
     */
    resetHeights: function() {
        this.itemHeights = {};
        this.setState({ estimatedHeight: undefined });
    },

    /**
     * Inform parent component that the anchor has changed
     *
     * @param  {String} anchor
     */
    triggerAnchorChangeEvent: function(anchor) {
        if (this.props.onAnchorChange) {
            var ids = _.keys(this.itemNodes);
            var anchorIndex = _.indexOf(ids, this.state.currentAnchor);
            if (anchorIndex !== -1) {
                var item = this.props.items[anchorIndex];
                this.props.onAnchorChange({
                    type: 'anchorchange',
                    target: this,
                    anchor,
                    item,
                });
            }
        }
    },

    /**
     * Inform parent component that so items were rendered behind the anchor
     *
     * @param  {String} anchor
     */
    triggerBeforeAnchorEvent: function(items) {
        if (this.props.onBeforeAnchor) {
            this.props.onBeforeAnchor({
                type: 'beforeanchor',
                target: this,
                items,
            });
        }
    },

    /**
     * Called after scrolling has occurred
     *
     * @param  {Event} evt
     */
    handleScroll: function(evt) {
        var containerScrollTop = this.scrollContainer.scrollTop;
        var containerOffsetTop = this.scrollContainer.offsetTop;
        var anchorNode;
        if (!this.props.inverted) {
            // release the anchor when user scrolls to the very top
            var anchorTop;
            if (containerScrollTop > 0) {
                var ids = _.keys(this.itemNodes);
                for (var i = 0; i < ids.length; i++) {
                    var id = ids[i];
                    anchorNode = this.itemNodes[id];
                    anchorTop = anchorNode.offsetTop - containerOffsetTop;
                    if (anchorTop > containerScrollTop) {
                        break;
                    }
                }
            }
            this.anchorOffset = (anchorNode) ? anchorTop - containerScrollTop : undefined;
        } else {
            var containerScrollHeight = this.scrollContainer.scrollHeight;
            var containerOffsetHeight = this.scrollContainer.offsetHeight;
            var containerScrollBottom = containerScrollHeight - containerScrollTop - containerOffsetHeight;

            var anchorBottom;
            // release the anchor when user scrolls to the very bottom
            if (containerScrollBottom > 0) {
                var ids = _.keys(this.itemNodes);
                for (var i = ids.length - 1; i >= 0; i--) {
                    var id = ids[i];
                    anchorNode = this.itemNodes[id];
                    var anchorTop = anchorNode.offsetTop - containerOffsetTop;
                    var anchorHeight = anchorNode.offsetHeight;
                    var anchorBottom = containerScrollHeight - anchorTop - anchorHeight;
                    if (anchorBottom > containerScrollBottom) {
                        break;
                    }
                }
            }
            this.anchorOffset = (anchorNode) ? anchorBottom - containerScrollBottom : undefined;
        }

        var currentAnchor = (anchorNode) ? anchorNode.id : undefined;
        if (this.state.currentAnchor !== currentAnchor) {
            this.setState({ currentAnchor });
            this.triggerAnchorChangeEvent(currentAnchor);
        }
        this.scrolling = true;
        if (this.scrollingEndTimeout) {
            clearTimeout(this.scrollingEndTimeout);
        }
        this.scrollingEndTimeout = setTimeout(() => {
            this.scrolling = false;
            this.scrollingEndTimeout = 0;
        }, 500);
    },

    /**
     * Called after browser window has been resized
     *
     * @param  {Event} evt
     */
    handleWindowResize: function() {
        // recalculate heights if the container width is different
        if (this.scrollContainerWidth !== this.scrollContainer.clientWidth) {
            this.scrollContainerWidth = this.scrollContainer.clientWidth;
            this.resetHeights();
        }
    },
});

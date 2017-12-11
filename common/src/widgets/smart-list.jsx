var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

module.exports = React.createClass({
    displayName: 'SmartList',
    propTypes: {
        items: PropTypes.arrayOf(PropTypes.object),
        behind: PropTypes.number,
        ahead: PropTypes.number,
        anchor: PropTypes.string,
        offset: PropTypes.number,

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
            behind: 5,
            ahead: 10,
            offset: 0,
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
                    this.triggerAnchorChangeEvent(ids[newAnchorIndex]);
                    break;
                }
            }
            if (anchorIndex === -1) {
                this.state.currentAnchor = undefined;
                this.triggerAnchorChangeEvent(undefined);
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
        return <div className="smart-list">{children}</div>;
    },

    /**
     * Find DOM nodes and add event listeners on mount
     */
    componentDidMount: function() {
        // find the list's DOM node and its scroll container
        this.container = ReactDOM.findDOMNode(this);
        for (var p = this.container.parentNode; p; p = p.offsetParent) {
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
            if (this.state.currentAnchor) {
                var anchorNode = this.itemNodes[this.state.currentAnchor];
                var anchorOffset = this.anchorOffset;
                if (anchorNode && anchorOffset !== undefined) {
                    var containerOffsetTop = this.scrollContainer.offsetTop;
                    var top = anchorNode.offsetTop - containerOffsetTop;
                    var actualOffset = top - this.scrollContainer.scrollTop;
                    if (actualOffset !== anchorOffset) {
                        // don't reposition when it's at the top
                        var newScrollTop = top - anchorOffset;
                        this.scrollContainer.scrollTop = Math.max(0, newScrollTop);
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
            var item = this.props.items[anchorIndex];
            this.props.onAnchorChange({
                type: 'anchorchange',
                target: this,
                anchor,
                item,
            });
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
        var scrollTop = this.scrollContainer.scrollTop;
        var containerOffsetTop = this.scrollContainer.offsetTop;
        var anchorNode, anchorTop;
        if (scrollTop > 0) {
            // release the anchor when user scrolls to the very top
            for (var id in this.itemNodes) {
                anchorNode = this.itemNodes[id];
                anchorTop = anchorNode.offsetTop - containerOffsetTop;
                if (anchorTop > scrollTop) {
                    break;
                }
            }
        }
        var currentAnchor = (anchorNode) ? anchorNode.id : undefined;
        this.anchorOffset = (anchorNode) ? anchorTop - scrollTop : undefined;
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

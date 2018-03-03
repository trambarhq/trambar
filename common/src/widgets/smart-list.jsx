var _ = require('lodash');
var React = require('react'), PropTypes = React.PropTypes;
var ReactDOM = require('react-dom');

require('./smart-list.scss');

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
        loadDuration: PropTypes.number,

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
            loadDuration: 2000,
        };
    },

    /**
     * Return initial state of component
     *
     * @return {Object}
     */
    getInitialState: function() {
        var nextState = {};
        this.updateAnchor(this.props, nextState);
        this.updateSlots(this.props, nextState);
        return nextState;
    },

    /**
     * Change state.currentAnchor when props.anchor changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps: function(nextProps) {
        var nextState = _.clone(this.state);
        if (this.props.anchor !== nextProps.anchor) {
            this.updateAnchor(nextProps, nextState);
        }
        if (this.props.items !== nextProps.items) {
            this.updateSlots(nextProps, nextState);
        }
        var changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    },

    /**
     * Update anchor
     *
     * @param  {Object} nextProps
     * @param  {Object} nextState
     */
    updateAnchor: function(nextProps, nextState) {
        nextState.currentAnchor = nextProps.anchor;
        this.anchorOffset = nextProps.offset;
    },

    /**
     * Assign items passed as prop to slots
     *
     * @param  {Object} nextProps
     * @param  {Object} nextState
     */
    updateSlots: function(nextProps, nextState) {
        var now = new Date;
        var items = nextProps.items;
        var identity = (item, index, alt) => {
            return nextProps.onIdentity({
                type: 'identity',
                target: this,
                item: item,
                currentIndex: index,
                alternative: alt,
            });
        };
        if (_.isEmpty(nextState.slots)) {
            nextState.slots = _.map(items, (item, index) => {
                var id = identity(item, index);
                return this.createSlot(id, item, index, 'present', now);
            });
        } else {
            var slots = nextState.slots = _.slice(nextState.slots);
            var then = _.minBy(slots, 'created').created;
            var elapsed = now - then;
            var newSlotState = 'appearing';
            if (elapsed < this.props.loadDuration) {
                // consider items that appear within a certain time to be part
                // of the initial load; don't transition them in and don't
                // trigger onBeforeAnchor on them
                newSlotState = 'present;'
            }
            var slotHash = _.transform(slots, (hash, slot) => {
                hash[slot.id] = slot;
            }, {});
            // find existing slots and get a list of new slots
            var isPresent = {};
            var newSlots = [];
            _.each(items, (item, index) => {
                var id = identity(item, index);
                var slot = slotHash[id];
                if (!slot) {
                    var prevId = identity(item, index, true);
                    slot = slotHash[prevId];
                }
                if (slot) {
                    slot.id = id;
                    slot.item = item;
                    slot.index = index;
                    if (slot.state === 'disappearing') {
                        slot.state = 'present';
                        slot.removed = null;
                    }
                } else {
                    slot = this.createSlot(id, item, index, newSlotState, now);
                    newSlots.push(slot);
                }
                isPresent[id] = true;
            });

            // see which slots are disappearing
            var oldSlots = [];
            _.each(slots, (slot) => {
                if (!isPresent[slot.id]) {
                    if (this.isSlotVisible(slot)) {
                        // use transition animation
                        slot.state = 'disappearing';
                        slot.removed = now;
                    } else {
                        // don't bother
                        oldSlots.push(slot);
                    }
                }
            });
            _.pullAll(slots, oldSlots);

            if (_.some(oldSlots, { unseen: true })) {
                // items were deleted before the user has a chance to see them
                var unseenSlots = _.filter(slots, { unseen: true });
                this.triggerBeforeAnchorEvent(unseenSlots);
            }

            // add new slots
            _.each(newSlots, (slot) => {
                var index = _.sortedIndexBy(slots, slot, 'index');
                slots.splice(index, 0, slot);
            });
        }
        if (nextProps.fresh) {
            // reset the anchor
            nextState.currentAnchor = nextProps.anchor;
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
     * Create a slot object
     *
     * @param  {String} id
     * @param  {Object} item
     * @param  {Number} index
     * @param  {String} state
     * @param  {Date} time
     *
     * @return {Object}
     */
    createSlot: function(id, item, index, state, time) {
        var slot = {
            id: id,
            key: id,
            index: index,
            state: state,
            item: item,
            created: time,
            removed: null,
            transition: false,
            rendering: undefined,
            unseen: false,
            height: undefined,
            node: null,
            setter: null,
        };
        slot.setter = setter.bind(slot);
        return slot;
    },

    /**
     * Render list items, with the help of callbacks
     *
     * @return {ReactElement}
     */
    render: function() {
        var slots = this.state.slots;
        var anchorIndex = 0;
        if (this.state.currentAnchor) {
            anchorIndex = _.findIndex(slots, { id: this.state.currentAnchor });
        }

        // render some items behind (i.e. above) the anchored item
        var startIndex = Math.max(0, anchorIndex - this.props.behind);
        // render some items ahead of (i.e. below) the anchored item
        // (presumably the number is sufficient to fill the viewport)
        var endIndex = Math.min(_.size(slots), anchorIndex + this.props.ahead + 1);

        var onRender = this.props.onRender;
        var children = _.map(slots, (slot, index) => {
            var rendering = (startIndex <= index && index < endIndex);
            var evt = {
                type: 'render',
                target: this,
                item: slot.item,
                needed: rendering,
                startIndex: startIndex,
                currentIndex: index,
                endIndex: endIndex,
                previousHeight: slot.height,
                estimatedHeight: this.state.estimatedHeight,
            };
            var contents = onRender(evt);
            if (rendering) {
                slot.rendering = true;
            }
            var className = 'slot';
            var style;
            if (slot.state === 'appearing') {
                className += ' transition in';
                if (slot.transition) {
                    style = { height: slot.height };
                } else {
                    className += ' hidden';
                }
            } else if (slot.state === 'disappearing') {
                className += ' transition out';
                if (slot.transition) {
                    className += ' hidden';
                } else {
                    style = { height: slot.height };
                }
            }
            return (
                <div key={slot.key} ref={slot.setter} className={className} style={style}>
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
        return (
            <div className="smart-list" onTransitionEnd={this.handleTransitionEnd}>
                {children}
            </div>
        );
    },

    /**
     * Find DOM nodes on mount, add event listeners, and set initial scroll
     * position based on given anchor
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

        this.maintainScrollPosition();
        this.setSlotHeights();
    },

    /**
     * Adjust scroll position and trigger transitions on update
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate: function(prevProps, prevState) {
        if (!this.scrolling) {
            this.maintainScrollPosition();
        }
        this.setSlotHeights();
        this.markUnseenSlots();
        this.setTransitionState();
    },

    /**
     * Adjust scroll position so anchor remains at the same on-screen location
     */
    maintainScrollPosition: function() {
        // maintain the position of the anchor node
        var anchorSlot, anchorOffset;
        if (this.state.currentAnchor) {
            anchorSlot = _.find(this.state.slots, { id: this.state.currentAnchor });
            anchorOffset = this.anchorOffset;
        } else {
            if (this.props.inverted) {
                // the first slot is at the bottom
                anchorSlot = _.first(this.state.slots);
                anchorOffset = Infinity;
            }
        }
        if (anchorSlot) {
            if (anchorOffset !== undefined) {
                var containerOffsetTop = this.scrollContainer.offsetTop;
                var containerScrollTop = this.scrollContainer.scrollTop;
                var anchorTop = anchorSlot.node.offsetTop - containerOffsetTop;
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
                    var anchorHeight = anchorSlot.node.offsetHeight;
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
    },

    /**
     * Return true if a slot if visible
     *
     * @param  {Object} slot
     *
     * @return {Boolean}
     */
    isSlotVisible: function(slot) {
        if (!slot.rendering || !slot.node) {
            return false;
        }
        if (slot.transition) {
            // if the slot is already in transition, don't end it
            return true;
        }
        if (this.scrollContainer) {
            var containerOffsetHeight = this.scrollContainer.offsetHeight;
            var containerOffsetTop = this.scrollContainer.offsetTop;
            var visibleTop = this.scrollContainer.scrollTop;
            var visibleBottom = visibleTop + containerOffsetHeight;
            var slotTop = slot.node.offsetTop - containerOffsetTop;
            if (visibleTop < slotTop && slotTop <= visibleBottom) {
                return true;
            }
            var slotBottom = slotTop + slot.height;
            if (visibleTop < slotBottom && slotBottom <= visibleBottom) {
                return true;
            }
        }
        return false;
    },

    /**
     * Remember height of items that're being rendered
     */
    setSlotHeights: function() {
        var heights = [];
        _.each(this.state.slots, (slot) => {
            if (slot.rendering) {
                var child = slot.node.firstChild;
                var height = (child) ? child.offsetHeight : 0;
                slot.height = height;
                heights.push(height);
            }
        });
        if (!this.state.estimatedHeight) {
            if (!_.isEmpty(heights)) {
                var avg = _.sum(heights) / heights.length;
                var estimatedHeight = Math.round(avg);
                this.setState({ estimatedHeight })
            }
        }
    },

    /**
     * Mark new slots that cannot be seen currently, firing an event when the
     * list of unseen items changes
     */
    markUnseenSlots: function() {
        var slots = this.state.slots;
        var anchorSlotIndex = _.findIndex(slots, { id: this.state.currentAnchor });
        var changed = false;
        _.each(slots, (slot, index) => {
            if (slot.state === 'appearing') {
                if (index < anchorSlotIndex) {
                    // if the slot is behind the anchor (i.e. above it when
                    // inverted = false; below it when inverted = true)
                    // then the user won't see it yet
                    //
                    // we're not tracking items appearing from the other
                    // direction at the moment
                    if (!this.isSlotVisible(slot)) {
                        slot.unseen = true;
                        changed = true;
                    }
                }
            } else if (slot.unseen) {
                if (slot.rendering) {
                    // if we're rendering the item and it's ahead of the anchor
                    // consider it seen
                    if (index >= anchorSlotIndex) {
                        slot.unseen = false;
                        changed = true;
                    }
                }
            }
        });
        if (changed) {
            // see which ones are before the anchor
            var unseenSlots = _.filter(slots, { unseen: true });
            this.triggerBeforeAnchorEvent(unseenSlots);
        }
    },

    /**
     * Trigger transitions of slots that are appearing or disappearing
     */
    setTransitionState: function() {
        var slots = _.clone(this.state.slots);
        var changed = false;
        _.each(slots, (slot) => {
            if (slot.state !== 'present') {
                if (!slot.transition) {
                    var useTransition = this.isSlotVisible(slot);
                    if (this.props.inverted) {
                        if (slot.state === 'appearing' && !this.state.currentAnchor) {
                            // need to update the scroll position continually
                            // as the slot expands so the bottom of the container
                            // is visible
                            if (!this.scrollPositionInterval) {
                                this.scrollPositionInterval = setInterval(this.maintainScrollPosition, 10);
                            }
                            this.scrollToAnchorNode = slot.node;
                            useTransition = true;
                        }
                    }
                    if (useTransition) {
                        slot.transition = true;
                    } else {
                        // don't bother transitioning when it can't be seen
                        slot.state = 'present';
                    }
                    changed = true;
                }
            }
        });
        if (changed) {
            this.setState({ slots });
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
     * Inform parent component that the anchor has changed
     *
     * @param  {Object} slot
     */
    triggerAnchorChangeEvent: function(slot) {
        if (this.props.onAnchorChange) {
            this.props.onAnchorChange({
                type: 'anchorchange',
                target: this,
                anchor: (slot) ? slot.id : null,
                item: (slot) ? slot.item : null,
            });
        }
    },

    /**
     * Inform parent component that new items were rendered before the anchor
     * and therefore cannot be seen
     *
     * @param  {Array<Object>} slots
     */
    triggerBeforeAnchorEvent: function(slots) {
        if (this.props.onBeforeAnchor) {
            this.props.onBeforeAnchor({
                type: 'beforeanchor',
                target: this,
                items: _.map(slots, 'item'),
            });
        }
    },

    /**
     * Find the slot that's current at the top (or bottom if inverted = true)
     * of the scroll box's viewable area
     *
     * @param  {Array<Object>} slots
     *
     * @return {Object|null}
     */
    findAnchorSlot: function(slots) {
        var containerScrollTop = this.scrollContainer.scrollTop;
        var containerOffsetTop = this.scrollContainer.offsetTop;
        var anchorSlot;
        if (!this.props.inverted) {
            // release the anchor when user scrolls to the very top
            var anchorTop;
            if (containerScrollTop > 0) {
                for (var i = 0; i < slots.length; i++) {
                    var slot =  slots[i];
                    anchorSlot = slot;
                    anchorTop = anchorSlot.node.offsetTop - containerOffsetTop;
                    if (anchorTop > containerScrollTop) {
                        break;
                    }
                }
            }
            this.anchorOffset = (anchorSlot) ? anchorTop - containerScrollTop : undefined;
        } else {
            var containerScrollHeight = this.scrollContainer.scrollHeight;
            var containerOffsetHeight = this.scrollContainer.offsetHeight;
            var containerScrollBottom = containerScrollHeight - containerScrollTop - containerOffsetHeight;

            var anchorBottom;
            // release the anchor when user scrolls to the very bottom
            if (containerScrollBottom > 0) {
                for (var i = 0; i < slots.length; i++) {
                    var slot = slots[i];
                    anchorSlot = slot;
                    var anchorTop = anchorSlot.node.offsetTop - containerOffsetTop;
                    var anchorHeight = anchorSlot.node.offsetHeight;
                    var anchorBottom = containerScrollHeight - anchorTop - anchorHeight;
                    if (anchorBottom > containerScrollBottom) {
                        break;
                    }
                }
            }
            this.anchorOffset = (anchorSlot) ? anchorBottom - containerScrollBottom : undefined;
        }
        return anchorSlot;
    },

    /**
     * Called after scrolling has occurred
     *
     * @param  {Event} evt
     */
    handleScroll: function(evt) {
        if (this.scrollPositionInterval) {
            // don't do anything if the event is trigger by interval function
            return;
        }
        if (this.resizing) {
            // counteract scrolling due to resizing
            this.maintainScrollPosition();
            return;
        }
        var anchorSlot = this.findAnchorSlot(this.state.slots);
        var currentAnchor = (anchorSlot) ? anchorSlot.id : undefined;
        if (this.state.currentAnchor !== currentAnchor) {
            this.setState({ currentAnchor });
            this.triggerAnchorChangeEvent(anchorSlot);
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
            var slots = _.slice(this.state.slots);
            _.each(slots, (slot) => {
                slot.height = undefined;
            });
            this.setState({ slots, estimatedHeight: undefined });

            this.resizing = true;
            if (this.resizingEndTimeout) {
                clearTimeout(this.resizingEndTimeout);
            }
            this.resizingEndTimeout = setTimeout(() => {
                this.resizing = false;
                this.resizingEndTimeout = 0;
            }, 50);
        }
    },

    /**
     * Called when transition is done
     *
     * @return {Event}
     */
    handleTransitionEnd: function(evt) {
        var slots = _.slice(this.state.slots);
        if (evt.propertyName === 'opacity') {
            var slot = _.find(slots, { node: evt.target });
            if (slot) {
                if (slot.state === 'appearing') {
                    // slot has transitioned in--render normally from now on
                    slot.state = 'present';
                    slot.transition = false;
                    this.setState({ slots });

                    if (this.scrollToAnchorNode === evt.target) {
                        this.maintainScrollPosition();
                        clearInterval(this.scrollPositionInterval);
                        this.scrollPositionInterval = null;
                        this.scrollToAnchorNode = null;
                    }
                }
            }
        } else if (evt.propertyName === 'height') {
            var slot = _.find(slots, { node: evt.target });
            if (slot) {
                if (slot.state === 'disappearing') {
                    // slot has transitioned out--remove it
                    var index = _.indexOf(slots, slot);
                    slots.splice(index, 1);

                    // find a new anchor
                    var anchorSlot = this.findAnchorSlot(slots);
                    var currentAnchor = (anchorSlot) ? anchorSlot.id : undefined;
                    if (currentAnchor !== this.state.currentAnchor) {
                        this.triggerAnchorChangeEvent(anchorSlot);
                    }
                    this.setState({ slots, currentAnchor });
                }
            }
        }
    },
});

function setter(node) {
    this.node = node;
}

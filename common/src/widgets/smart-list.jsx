import _ from 'lodash';
import React, { Component } from 'react';
import ComponentRefs from 'utils/component-refs';

import './smart-list.scss';

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * A component for rendering a list that can be very long. Items are rendered
 * only when the current scroll position make them visible (or likely to be
 * visible in the near future).
 *
 * @extends {Component}
 */
class SmartList extends Component {
    static displayName = 'SmartList';

    constructor(props) {
        super(props);
        this.components = ComponentRefs({
            container: HTMLDivElement,
        });
        this.state = {};
        this.scrolling = false;
        this.scrollContainer = null;
        this.scrollContainerWidth = 0;
        this.scrollPositionInterval = 0;
        this.scrollToAnchorNode = null;
        this.lastReportedAnchor = null;
        this.updateAnchor(props, this.state);
        this.updateSlots(props, this.state);
    }

    /**
     * Reset scroll position
     */
    releaseAnchor() {
        this.setState({ currentAnchor: null });
    }

    /**
     * Change state.currentAnchor when props.anchor changes
     *
     * @param  {Object} nextProps
     */
    componentWillReceiveProps(nextProps) {
        let { anchor, items } = this.props;
        let nextState = _.clone(this.state);
        if (nextProps.anchor !== anchor) {
            if (nextProps.anchor || !nextProps.noReset) {
                this.updateAnchor(nextProps, nextState);
            }
        }
        if (nextProps.items !== items) {
            this.updateSlots(nextProps, nextState);
        }
        let changes = _.shallowDiff(nextState, this.state);
        if (!_.isEmpty(changes)) {
            this.setState(changes);
        }
    }

    shouldComponentUpdate(props, state) {
        if (this.lastReportedAnchor) {
            if (this.lastReportedAnchor === state.currentAnchor) {
                this.lastReportedAnchor = null;
                return false;
            }
        }
        return true;
    }

    /**
     * Update anchor
     *
     * @param  {Object} nextProps
     * @param  {Object} nextState
     */
    updateAnchor(nextProps, nextState) {
        if (nextState.currentAnchor !== nextProps.anchor) {
            nextState.currentAnchor = nextProps.anchor || null;
            this.anchorOffset = nextProps.offset;
        }
    }

    /**
     * Assign items passed as prop to slots
     *
     * @param  {Object} nextProps
     * @param  {Object} nextState
     */
    updateSlots(nextProps, nextState) {
        let { transitioning } = this.props;
        let items = nextProps.items;
        let identity = (item, index, alt) => {
            return nextProps.onIdentity({
                type: 'identity',
                target: this,
                item: item,
                currentIndex: index,
                alternative: alt || false,
            });
        };
        let transition = (item, index) => {
            if (!nextProps.onTransition) {
                return true;
            }
            return nextProps.onTransition({
                type: 'transition',
                target: this,
                item: item,
                currentIndex: index,
            });
        };
        // consider items that appear within a certain time to be part
        // of the initial load; don't transition them in and don't
        // trigger onBeforeAnchor on them
        let slots = _.slice(nextState.slots);
        let slotHash = _.transform(slots, (hash, slot) => {
            hash[slot.id] = slot;
        }, {});
        let useTransition = !_.isEmpty(slots);
        let isPresent = {};
        _.each(items, (item, index) => {
            // look for existing slot
            let id = identity(item, index);
            let slot = slotHash[id];
            if (!slot) {
                // maybe item was rendered under a different id
                let prevId = identity(item, index, true);
                if (prevId) {
                    slot = slotHash[prevId];
                    if (slot) {
                        // use new id from now on
                        slot.id = id;
                    }
                }
            }
            if (slot) {
                slot.item = item;
                slot.index = index;
                if (slot.state === 'disappearing') {
                    slot.state = 'present';
                }
            } else {
                // parent component might choose to not transition in item
                let state = 'present'
                if (useTransition && transition(item, index)) {
                    state = 'appearing';
                }
                slot = this.createSlot(id, item, index, state);
                slots.push(slot);
            }
            isPresent[id] = true;
        });

        // see which slots are disappearing
        _.each(slots, (slot) => {
            if (!isPresent[slot.id]) {
                if (useTransition && this.isSlotVisible(slot)) {
                    // use transition animation
                    slot.state = 'disappearing';
                } else {
                    // don't bother
                    slot.state = 'gone';
                }
            }
        });

        // limit the number of transitioning elements
        let appearing = 0;
        let disappearing = 0;
        _.each(slots, (slot) => {
            if (slot.state === 'appearing') {
                if (appearing < transitioning) {
                    appearing++;
                } else {
                    slot.state = 'present';
                }
            } else if (slot.state === 'disappearing') {
                if (disappearing < transitioning) {
                    disappearing++;
                } else {
                    slot.state = 'gone';
                }
            }
        });

        // take out slots that are no longer used
        let oldSlots = _.remove(slots, { state: 'gone' });
        if (_.some(oldSlots, { unseen: true })) {
            // items were deleted before the user has a chance to see them
            let unseenSlots = _.filter(slots, { unseen: true });
            this.triggerBeforeAnchorEvent(unseenSlots);
        }

        nextState.slots = _.sortBy(slots, 'index');
    }

    /**
     * Create a slot object
     *
     * @param  {String} id
     * @param  {Object} item
     * @param  {Number} index
     * @param  {String} state
     *
     * @return {Object}
     */
    createSlot(id, item, index, state) {
        let slot = {
            id: id,
            key: id,
            index: index,
            state: state,
            item: item,
            transition: false,
            rendering: undefined,
            contents: null,
            unseen: false,
            height: undefined,
            node: null,
            setter: null,
        };
        slot.setter = setter.bind(slot);
        return slot;
    }

    /**
     * Render list items, with the help of callbacks
     *
     * @return {ReactElement}
     */
    render() {
        let { onRender, ahead, behind, inverted } = this.props;
        let { slots, currentAnchor, estimatedHeight } = this.state;
        let { setters } = this.components;
        let anchorIndex = 0;
        if (currentAnchor) {
            anchorIndex = _.findIndex(slots, { id: currentAnchor });
        }

        // render some items behind (i.e. above) the anchored item
        let startIndex = Math.max(0, anchorIndex - behind);
        // render some items ahead of (i.e. below) the anchored item
        // (presumably the number is sufficient to fill the viewport)
        let endIndex = Math.min(_.size(slots), anchorIndex + ahead + 1);

        let children = _.map(slots, (slot, index) => {
            let rendering = (startIndex <= index && index < endIndex);
            let contents;
            if (slot.state !== 'disappearing') {
                let evt = {
                    type: 'render',
                    target: this,
                    item: slot.item,
                    needed: rendering,
                    startIndex: startIndex,
                    currentIndex: index,
                    endIndex: endIndex,
                    previousHeight: slot.height,
                    estimatedHeight,
                };
                contents = slot.contents = onRender(evt)
            } else {
                // use what was rendered before, since parent component might
                // not be able to render something that's no longer there
                contents = slot.contents;
            }
            if (rendering) {
                slot.rendering = true;
            }
            let className = 'slot';
            let style;
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
        if (inverted) {
            _.reverse(children);
        }
        return (
            <div ref={setters.container} className="smart-list" onTransitionEnd={this.handleTransitionEnd}>
                {children}
            </div>
        );
    }

    /**
     * Find DOM nodes on mount, add event listeners, and set initial scroll
     * position based on given anchor
     */
    componentDidMount() {
        // find the list's DOM node and its scroll container
        let { container } = this.components;
        for (let p = container.parentNode; p; p = p.parentNode) {
            let style = getComputedStyle(p);
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
    }

    /**
     * Adjust scroll position and trigger transitions on update
     *
     * @param  {Object} prevProps
     * @param  {Object} prevState
     */
    componentDidUpdate(prevProps, prevState) {
        let { currentAnchor } = this.state;
        if (!this.scrolling || (prevState.currentAnchor && !currentAnchor)) {
            this.maintainScrollPosition();
        }
        this.setSlotHeights();
        this.markUnseenSlots();
        this.setTransitionState();
    }

    /**
     * Adjust scroll position so anchor remains at the same on-screen location
     */
    maintainScrollPosition() {
        let { inverted } = this.props;
        let { slots, currentAnchor } = this.state;
        // maintain the position of the anchor node
        let anchorSlot, anchorOffset;
        if (currentAnchor) {
            anchorSlot = _.find(slots, { id: currentAnchor });
            anchorOffset = this.anchorOffset;
        } else {
            if (inverted) {
                // the first slot is at the bottom
                anchorSlot = _.first(slots);
                anchorOffset = Infinity;
            }
        }
        if (anchorSlot && anchorSlot.node) {
            if (anchorOffset !== undefined) {
                let containerOffsetTop = this.scrollContainer.offsetTop;
                let containerScrollTop = this.scrollContainer.scrollTop;
                let anchorTop = anchorSlot.node.offsetTop - containerOffsetTop;
                if (!inverted) {
                    let actualOffset = anchorTop - containerScrollTop;
                    if (actualOffset !== anchorOffset) {
                        // don't reposition when it's at the top
                        let newScrollTop = Math.max(0, anchorTop - anchorOffset);
                        this.scrollContainer.scrollTop = newScrollTop;
                    }
                } else {
                    // calculate the equivalent of offsetTop and scrollTop,
                    // measured from the bottom of the container
                    let containerScrollHeight = this.scrollContainer.scrollHeight;
                    let containerOffsetHeight = this.scrollContainer.offsetHeight;
                    let containerScrollBottom = containerScrollHeight - containerScrollTop - containerOffsetHeight;
                    let anchorHeight = anchorSlot.node.offsetHeight;
                    let anchorBottom = containerScrollHeight - anchorTop - anchorHeight;

                    let actualOffset = anchorBottom - containerScrollBottom;
                    if (actualOffset !== anchorOffset) {
                        let newScrollBottom = Math.max(0, anchorBottom - anchorOffset);
                        let newScrollTop = containerScrollHeight - newScrollBottom - containerOffsetHeight
                        this.scrollContainer.scrollTop = newScrollTop;
                    }
                }
            }
        } else {
            // scroll back to top
            if (isIOS && this.scrolling) {
                // stop momentum scrolling
                this.scrollContainer.style.overflowY = 'hidden';
                this.scrollContainer.scrollTop = 0;
                this.scrollContainer.style.overflowY = 'scroll';
            } else {
                this.scrollContainer.scrollTop = 0;
            }
        }
    }

    /**
     * Return true if a slot if visible
     *
     * @param  {Object} slot
     *
     * @return {Boolean}
     */
    isSlotVisible(slot) {
        if (!slot.rendering || !slot.node) {
            return false;
        }
        if (slot.transition) {
            // if the slot is already in transition, don't end it
            return true;
        }
        if (this.scrollContainer) {
            let containerOffsetHeight = this.scrollContainer.offsetHeight;
            let containerOffsetTop = this.scrollContainer.offsetTop;
            let visibleTop = this.scrollContainer.scrollTop;
            let visibleBottom = visibleTop + containerOffsetHeight;
            let slotTop = slot.node.offsetTop - containerOffsetTop;
            if (visibleTop < slotTop && slotTop <= visibleBottom) {
                return true;
            }
            let slotBottom = slotTop + slot.height;
            if (visibleTop < slotBottom && slotBottom <= visibleBottom) {
                return true;
            }
        }
        return false;
    }

    /**
     * Remember height of items that're being rendered
     */
    setSlotHeights() {
        let { slots, estimatedHeight } = this.state;
        let heights = [];
        _.each(slots, (slot) => {
            if (slot.rendering) {
                let child = slot.node.firstChild;
                let height = (child) ? child.offsetHeight : 0;
                slot.height = height;
                heights.push(height);
            }
        });
        if (estimatedHeight === undefined) {
            if (!_.isEmpty(heights)) {
                let avg = _.sum(heights) / heights.length;
                let estimatedHeight = Math.round(avg);
                if (estimatedHeight !== 0) {
                    this.setState({ estimatedHeight })
                }
            }
        }
    }

    /**
     * Mark new slots that cannot be seen currently, firing an event when the
     * list of unseen items changes
     */
    markUnseenSlots() {
        let { slots, currentAnchor } = this.state;
        let anchorSlotIndex = _.findIndex(slots, { id: currentAnchor });
        let changed = false;
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
                // if it's ahead of the anchor consider it seen
                if (index >= anchorSlotIndex) {
                    slot.unseen = false;
                    changed = true;
                }
            }
        });
        if (changed) {
            // see which ones are before the anchor
            let unseenSlots = _.filter(slots, { unseen: true });
            this.triggerBeforeAnchorEvent(unseenSlots);
        }
    }

    /**
     * Trigger transitions of slots that are appearing or disappearing
     */
    setTransitionState() {
        let { inverted } = this.props;
        let { slots, currentAnchor } = this.state;
        let changed = false;
        _.each(slots, (slot) => {
            if (slot.state === 'appearing' || slot.state === 'disappearing') {
                if (!slot.transition) {
                    let useTransition = this.isSlotVisible(slot);
                    if (inverted) {
                        if (slot.state === 'appearing' && !currentAnchor) {
                            // need to update the scroll position continually
                            // as the slot expands so the bottom of the container
                            // is visible
                            if (!this.scrollPositionInterval) {
                                this.scrollPositionInterval = setInterval(() => {
                                    this.maintainScrollPosition();
                                }, 10);
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
    }

    /**
     * Remove listeners on unmount
     */
    componentWillUnmount() {
        this.scrollContainer.removeEventListener('scroll', this.handleScroll);
        window.removeEventListener('resize', this.handleWindowResize);
    }

    /**
     * Inform parent component that the anchor has changed
     *
     * @param  {Object} slot
     */
    triggerAnchorChangeEvent(slot) {
        let { onAnchorChange } = this.props;
        if (onAnchorChange) {
            let item = (slot) ? slot.item : null;
            let anchor = this.lastReportedAnchor = (slot) ? slot.id : null;
            onAnchorChange({
                type: 'anchorchange',
                target: this,
                anchor,
                item,
            });
        }
    }

    /**
     * Inform parent component that new items were rendered before the anchor
     * and therefore cannot be seen
     *
     * @param  {Array<Object>} slots
     */
    triggerBeforeAnchorEvent(slots) {
        let { onBeforeAnchor } = this.props;
        if (onBeforeAnchor) {
            onBeforeAnchor({
                type: 'beforeanchor',
                target: this,
                items: _.map(slots, 'item'),
            });
        }
    }

    /**
     * Find the slot that's current at the top (or bottom if inverted = true)
     * of the scroll box's viewable area
     *
     * @param  {Array<Object>} slots
     *
     * @return {Object|null}
     */
    findAnchorSlot(slots) {
        let { inverted } = this.props;
        let containerScrollTop = this.scrollContainer.scrollTop;
        let containerOffsetTop = this.scrollContainer.offsetTop;
        let anchorSlot;
        if (!inverted) {
            // release the anchor when user scrolls to the very top
            let anchorTop;
            if (containerScrollTop > 0) {
                for (let i = 0; i < slots.length; i++) {
                    let slot =  slots[i];
                    anchorSlot = slot;
                    anchorTop = anchorSlot.node.offsetTop - containerOffsetTop;
                    if (anchorTop > containerScrollTop) {
                        break;
                    }
                }
            }
            this.anchorOffset = (anchorSlot) ? anchorTop - containerScrollTop : undefined;
        } else {
            let containerScrollHeight = this.scrollContainer.scrollHeight;
            let containerOffsetHeight = this.scrollContainer.offsetHeight;
            let containerScrollBottom = containerScrollHeight - containerScrollTop - containerOffsetHeight;

            let anchorBottom;
            // release the anchor when user scrolls to the very bottom
            if (containerScrollBottom > 0) {
                for (let i = 0; i < slots.length; i++) {
                    let slot = slots[i];
                    anchorSlot = slot;
                    let anchorTop = anchorSlot.node.offsetTop - containerOffsetTop;
                    let anchorHeight = anchorSlot.node.offsetHeight;
                    let anchorBottom = containerScrollHeight - anchorTop - anchorHeight;
                    if (anchorBottom > containerScrollBottom) {
                        break;
                    }
                }
            }
            this.anchorOffset = (anchorSlot) ? anchorBottom - containerScrollBottom : undefined;
        }
        return anchorSlot;
    }

    /**
     * Called after scrolling has occurred
     *
     * @param  {Event} evt
     */
    handleScroll = (evt) => {
        let { slots, currentAnchor } = this.state;
        if (this.scrollPositionInterval) {
            // don't do anything if the event is trigger by interval function
            return;
        }
        if (this.resizing) {
            // counteract scrolling due to resizing
            this.maintainScrollPosition();
            return;
        }
        let anchorSlot = this.findAnchorSlot(slots);
        if (anchorSlot && anchorSlot.id !== currentAnchor) {
            currentAnchor = anchorSlot.id;
            this.setState({ currentAnchor }, () => {
                this.triggerAnchorChangeEvent(anchorSlot);
            });
        }
        this.scrolling = true;
        if (this.scrollingEndTimeout) {
            clearTimeout(this.scrollingEndTimeout);
        }
        this.scrollingEndTimeout = setTimeout(() => {
            this.scrolling = false;
            this.scrollingEndTimeout = 0;
        }, 500);
    }

    /**
     * Called after browser window has been resized
     *
     * @param  {Event} evt
     */
    handleWindowResize = (evt) => {
        let { slots }= this.state;
        // recalculate heights if the container width is different
        if (this.scrollContainerWidth !== this.scrollContainer.clientWidth) {
            this.scrollContainerWidth = this.scrollContainer.clientWidth;
            slots = _.slice(slots);
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
    }

    /**
     * Called when transition is done
     *
     * @param  {Event}
     */
    handleTransitionEnd = (evt) => {
        let { slots, currentAnchor } = this.state;
        slots = _.slice(slots);
        if (evt.propertyName === 'opacity') {
            let slot = _.find(slots, { node: evt.target });
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
            let slot = _.find(slots, { node: evt.target });
            if (slot) {
                if (slot.state === 'disappearing') {
                    // slot has transitioned out--remove it
                    let index = _.indexOf(slots, slot);
                    slots.splice(index, 1);

                    // find a new anchor
                    let anchorSlot = this.findAnchorSlot(slots);
                    if (anchorSlot && anchorSlot.id !== currentAnchor) {
                        currentAnchor = anchorSlot.id;
                        this.triggerAnchorChangeEvent(anchorSlot);
                    }
                    this.setState({ slots, currentAnchor });
                }
            }
        }
    }
}

function setter(node) {
    this.node = node;
}

SmartList.defaultProps = {
    behind: 5,
    ahead: 10,
    offset: 0,
    inverted: false,
    transitioning: 5,
    noReset: false,
};

export {
    SmartList as default,
    SmartList,
};

if (process.env.NODE_ENV !== 'production') {
    const PropTypes = require('prop-types');

    SmartList.propTypes = {
        items: PropTypes.arrayOf(PropTypes.object),
        behind: PropTypes.number,
        ahead: PropTypes.number,
        anchor: PropTypes.string,
        offset: PropTypes.number,
        inverted: PropTypes.bool,
        transitioning: PropTypes.number,
        noReset: PropTypes.bool,

        onIdentity: PropTypes.func.isRequired,
        onTransition: PropTypes.func,
        onRender: PropTypes.func.isRequired,
        onAnchorChange: PropTypes.func,
        onBeforeAnchor: PropTypes.func,
    };
}

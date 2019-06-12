import _ from 'lodash';
import React, { useState, useRef, useEffect } from 'react';
import { useListener, useComputed, useSaveBuffer } from 'relaks';

import './smart-list.scss';

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

/**
 * A component for rendering a list that can be very long. Items are rendered
 * only when the current scroll position make them visible (or likely to be
 * visible in the near future).
 */
function SmartList(props) {
    const { items, behind, ahead, anchor, offset, inverted, transitioning, noReset } = props;
    const { onIdentity, onTransition, onRender, onAnchorChange, onBeforeAnchor } = props;
    const containerRef = useRef();
    const scrollContainerRef = useRef();
    const { current: scrollState } = useRef({
        scrolling: false,
        endTimeout: 0,
    });
    const [ estimatedHeight, setEstimatedHeight ] = useState();
    const [ slotHash ] = useComputed((hashBefore) => {
        if (!items) {
            return null;
        }

        const identity = (item, index, alt) => {
            return onIdentity({
                item: item,
                currentIndex: index,
                alternative: alt || false,
            });
        };
        const transition = (item, index) => {
            if (!onTransition) {
                return true;
            }
            return onTransition({
                item: item,
                currentIndex: index,
            });
        };

        const useTransition = !!hashBefore;
        const hash = {};
        for (let [ index, item ] of items.entries()) {
            // look for existing slot
            const id = identity(item, index);
            let slot;
            if (hashBefore) {
                slot = hashBefore[id];
                if (!slot) {
                    // maybe item was rendered under a different id
                    const prevID = identity(item, index, true);
                    if (prevID) {
                        slot = hashBefore[prevID];
                        if (slot) {
                            // use new id from now on
                            slot.id = id;
                        }
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
                slot = createSlot(id, item, index, state);
            }
            hash[slot.id] = slot;
        }

        // see which slots are disappearing
        if (hashBefore) {
            for (let key in hashBefore) {
                if (!hash[key]) {
                    const slot = hashBefore[key];
                    // use transition animation
                    slot.state = 'disappearing';
                    slot.transition = false;
                    hash[slot.id] = slot;
                }
            }
        }
        return hash;
    }, [ items ]);
    const [ slots, updateSlots ] = useComputed(() => {
        const slots = [];
        const scrollWindow = getScrollWindow(scrollContainerRef);
        for (let slot of _.values(slotHash)) {
            if (!slot.transition && slot.node) {
                if (slot.state === 'apppearing') {
                    if (isSlotVisible(slot, scrollWindow)) {
                        slot.transition = true;
                    } else {
                        slot.state = 'present';
                    }
                } else if (slot.state === 'disappearing') {
                    if (isSlotVisible(slot, scrollWindow)) {
                        slot.transition = true;
                    } else {
                        slot.state = 'gone';
                    }
                }
            }

            if (slot.state !== 'gone') {
                const index = _.sortedIndexBy(slots, slot, 'index');
                slots.splice(index, 0, slot);
            }
        }
        return slots;
    }, [ slotHash ]);
    const anchorBuffer = useSaveBuffer({
        original: anchor || '',
    });
    const anchorSlot = slotHash[anchorBuffer.current];
    const anchorIndex = (anchorSlot) ? anchorSlot.index : 0;

    const handleScroll = useListener((evt) => {
        const scrollWindow = getScrollWindow(scrollContainerRef);
        const slot = findAnchorSlot(slots, scrollWindow, inverted);
        if (slot) {
            const newAnchor = (slot.index > 0) ? slot.id : '';
            anchorBuffer.update(newAnchor);
        }

        scrollState.scrolling = true;
        clearTimeout(scrollState.endTimeout);
        scrollState.endTimeout = setTimeout(() => {
            scrollState.scrolling = false;
        }, 500);
    });
    const handleWindowResize = useListener((evt) => {
        // recalculate heights if the container width is different

        /*
        if (this.scrollContainerWidth !== this.scrollContainer.clientWidth) {
            this.scrollContainerWidth = this.scrollContainer.clientWidth;
            slots = _.slice(slots);
            for (let slot of slots) {
                slot.height = undefined;
            }
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
        */
    })
    const handleTransitionEnd = useListener(() => {
        const slot = _.find(slots, { node: evt.target });
        if (slot) {
            if (slot.state === 'appearing') {
                if (evt.propertyName === 'opacity') {
                    // slot has transitioned in--render normally from now on
                    slot.state = 'present';
                    slot.transition = false;
                }
            } else if (slot.state === 'disappearing') {
                if (evt.propertyName === 'height' || slot.node.clientHeight === 0) {
                    slots.state = 'gone';
                }
            }
        }
    });

    useEffect(() => {
        // trigger transitioning of slots once they've been rendered
        const needTransition = _.some(slots, (slot) => {
            if (slot.state === 'appearing' || slot.state === 'disappearing') {
                if (!slot.transition) {
                    return true;
                }
            }
        });
        if (needTransition) {
            updateSlots();
        }
    }, [ slots ]);
    useEffect(() => {
        // interrupt momentum scrolling when parent passes a new anchor
    }, [ anchor ]);
    useEffect(() => {
        // find scroll container and attach scroll handler
        let scrollContainer;
        for (let p = containerRef.current.parentNode; p; p = p.parentNode) {
            const style = getComputedStyle(p);
            if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                scrollContainer = p;
                break;
            }
        }
        scrollContainerRef.current = scrollContainer;
        scrollContainer.addEventListener('scroll', handleScroll);
        return () => {
            scrollContainer.removeEventListener('scroll', handleScroll);
        }
    }, []);
    useEffect(() => {
        // attach resize handler
        window.addEventListener('resize', handleWindowResize);
        return () => {
            window.removeEventListener('resize', handleWindowResize);
        };
    }, []);
    useEffect(() => {
        if (!anchorSlot || scrollState.scrolling) {
            return;
        }
        const scrollWindow = getScrollWindow(scrollContainerRef);
        const pos = getSlotPosition(anchorSlot);
        const offsets = getScrollOffsets(pos, scrollWindow);
        const adjustment = anchorSlot.offset - offsets.fromTop;
        if (adjustment !== 0) {
            scrollContainer.scrollTop += adjustment;
        }
    });
    useEffect(() => {
        const heights = [];
        for (let slot of slots) {
            if (slot.rendering) {
                const child = slot.node.firstChild;
                slot.height = (child) ? child.offsetHeight : 0;
            }
            heights.push(slot.height);
        }
        /*
        if (estimatedHeight === undefined) {
            if (!_.isEmpty(heights)) {
                const avg = _.sum(heights) / heights.length;
                const estimatedHeight = Math.round(avg);
                if (estimatedHeight !== 0) {
                    setEstimatedHeight(estimatedHeight);
                }
            }
        }
        */
    });
    useEffect(() => {
        /*
        for (let [ index, slot ] of slots.entries()) {
            if (slot.state === 'appearing') {
                if (index < anchorIndex) {
                    // if the slot is behind the anchor (i.e. above it when
                    // inverted = false; below it when inverted = true)
                    // then the user won't see it yet
                    //
                    // we're not tracking items appearing from the other
                    // direction at the moment
                    if (!isSlotVisible(slot)) {
                        slot.unseen = true;
                    }
                }
            } else if (slot.unseen) {
                // if it's ahead of the anchor consider it seen
                if (index >= anchorSlotIndex) {
                    slot.unseen = false;
                }
            }
        }
        */
    }, []);

    // render some items behind (i.e. above) the anchored item
    const startIndex = Math.max(0, anchorIndex - behind);
    // render some items ahead of (i.e. below) the anchored item
    // (presumably the number is sufficient to fill the viewport)
    const endIndex = Math.min(_.size(slots), anchorIndex + ahead + 1);
    return (
        <div ref={containerRef} className="smart-list" onTransitionEnd={handleTransitionEnd}>
            {_.map(slots, renderSlot)}
        </div>
    );

    function renderSlot(slot, index) {
        slot.rendering = (startIndex <= index && index < endIndex);
        if (slot.state !== 'disappearing') {
            const evt = {
                item: slot.item,
                needed: slot.rendering,
                startIndex,
                currentIndex: index,
                endIndex,
                previousHeight: slot.height,
                estimatedHeight,
            };
            slot.contents = onRender(evt)
        } else {
            // use what was rendered before, since parent component might
            // not be able to render something that's no longer there
            slot.contents;
        }
        const classNames = [ 'slot' ];
        let style;
        if (slot.state === 'appearing') {
            classNames.push('transition', 'in');
            if (slot.transition) {
                style = { height: slot.height };
            } else {
                classNames.push('hidden');
            }
        } else if (slot.state === 'disappearing') {
            classNames.push('transition', 'out');
            if (slot.transition) {
                classNames.push('hidden');
            } else {
                style = { height: slot.height };
            }
        }
        return (
            <div key={slot.key} ref={slot.setter} className={classNames.join(' ')} style={style}>
                {slot.contents}
            </div>
        );
    }
}

function getScrollWindow(ref) {
    let top, bottom, height, scrollTop, scrollBottom;
    if (ref.current) {
        top = ref.current.offsetTop;
        height = ref.current.offsetHeight;
        scrollTop = top + ref.current.scrollTop;
        scrollBottom = scrollTop + height;
        bottom = top + ref.current.scrollHeight;
    }
    return { top, bottom, height, scrollTop, scrollBottom };
}

function getSlotPosition(slot) {
    let top, bottom, height;
    if (slot.node) {
        top = slot.node.offsetTop;
        height = slot.node.offsetHeight;
        bottom = top + height;
    }
    return { top, bottom, height };
}

function findAnchorSlot(slots, scrollWindow, inverted) {
    for (let slot of slots) {
        const pos = getSlotPosition(slot);
        if (pos.top >= scrollWindow.scrollTop) {
            return slot;
        }
    }
}

function isSlotVisible(slot, scrollWindow) {
    for (let slot of slots) {
        const pos = getSlotPosition(slot);
        if (slot.bottom > scrollWindow.scrollTop && slot.top < scrollWindow.scrollBottom) {
            return true;
        }
    }
    return false;
}

function createSlot(id, item, index, state) {
    let slot = {
        id: id,
        key: id,
        index: index,
        state: state,
        item: item,
        transition: false,
        rendering: undefined,
        visibility: undefined,
        contents: null,
        offset: 0,
        unseen: false,
        height: undefined,
        node: null,
        setter: null,
    };
    slot.setter = setter.bind(slot);
    return slot;
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

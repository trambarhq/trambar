import _ from 'lodash';
import React, { useState, useRef, useEffect } from 'react';
import { useListener, useComputed, useSaveBuffer, useAutoSave } from 'relaks';
import { sortedIndexBy } from '../utils/array-utils.js';

import './smart-list.scss';

/**
 * A component for rendering a list that can be very long. Items are rendered
 * only when the current scroll position make them visible (or likely to be
 * visible in the near future).
 */
export function SmartList(props) {
  const { items, behind, ahead, anchor, offset, inverted, noReset } = props;
  const { onIdentity, onTransition, onRender, onAnchorChange, onBeforeAnchor } = props;
  const containerRef = useRef();
  const scrollContainerRef = useRef();
  const { current: scrollState } = useRef({
    scrolling: false,
    endTimeout: 0,
    unseenItems: [],
  });
  const [ estimatedHeight, setEstimatedHeight ] = useState();
  const [ slotHash ] = useComputed((hashBefore) => {
    // create a slot for each item
    if (!items) {
      return null;
    }
    const useTransition = !!hashBefore;
    const hash = {}, moved = {};
    for (let [ index, item ] of items.entries()) {
      // look for existing slot
      const id = onIdentity({ item, currentIndex: index });
      let slot;
      if (hashBefore) {
        slot = hashBefore[id];
        if (!slot) {
          // maybe item was rendered under a different id
          const prevID = onIdentity({ item, currentIndex: index, alternative: true });
          if (prevID) {
            slot = hashBefore[prevID];
            if (slot) {
              // use new id from now on
              slot.id = id;
              moved[prevID] = true;
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
        slot = createSlot(id, item, index, offset);

        // parent component might choose to not transition in item
        let transitionItem = useTransition;
        if (transitionItem && onTransition) {
          transitionItem = onTransition({ item, currentIndex: index });
        }
        if (transitionItem) {
          slot.state = 'appearing';
          slot.transition = 'decide';
        } else {
          slot.state = 'present';
        }
      }
      hash[slot.id] = slot;
    }

    // see which slots are disappearing
    if (hashBefore) {
      for (let key in hashBefore) {
        if (!hash[key] && !moved[key]) {
          const slot = hashBefore[key];
          if (slot.state === 'present') {
            slot.state = 'disappearing';
            slot.transition = 'decide';
            hash[slot.id] = slot;
          } else if (slot.state === 'appearing') {
            if (slot.transition === 'run') {
              slot.state = 'disappearing';
              hash[slot.id] = slot;
            }
          }
        }
      }
    }
    return hash;
  }, [ items ]);
  const [ slots, updateSlots ] = useComputed(() => {
    const slots = [];
    const scrollWindow = getScrollWindow(scrollContainerRef);
    for (let slot of Object.values(slotHash)) {
      if (slot.transition === 'decide' && slot.node) {
        const slotPos = getSlotPosition(slot);
        if (isWithin(slotPos, scrollWindow)) {
          slot.transition = 'prepare';
        } else {
          slot.transition = '';
          if (slot.state === 'appearing') {
            slot.state = 'present';
            slot.unseen = true;
          } else {
            slot.state = 'gone';
          }
        }
      } else if (slot.transition === 'prepare') {
        slot.transition = 'run';
      }
      if (slot.state !== 'gone') {
        const index = sortedIndexBy(slots, slot, 'index');
        slots.splice(index, 0, slot);
      }
    }
    return slots;
  }, [ slotHash ]);
  const anchorBuffer = useSaveBuffer({ original: anchor || '' });
  const anchorSlot = (slotHash) ? slotHash[anchorBuffer.current] : null;
  const anchorIndex = (anchorSlot) ? anchorSlot.index : -1;
  useAutoSave(anchorBuffer, 500, () => {
    const item = _.get(anchorSlot, 'item', null);
    if (onAnchorChange) {
      onAnchorChange({ item });
    }
  });
  const transitioning = slots.some(s => s.transition === 'run');

  const handleScroll = useListener((evt) => {
    if (updateScrollState(scrollContainerRef, scrollState, inverted)) {
      const scrollWindow = getScrollWindow(scrollContainerRef);
      const slot = findAnchorSlot(slots, scrollWindow, inverted);
      let newAnchor = '';
      if (slot && slot.index > 0) {
        newAnchor = slot.key;
      }
      anchorBuffer.update(newAnchor);
    }
  });
  const handleWindowResize = useListener((evt) => {
    // recalculate heights
    setEstimatedHeight(undefined);
  });
  const handleTransitionEnd = useListener((evt) => {
    const slot = _.find(slots, { node: evt.target });
    if (slot) {
      if (slot.state === 'appearing') {
        if (evt.propertyName === 'opacity') {
          // slot has transitioned in--render normally from now on
          slot.state = 'present';
          slot.transition = '';
          updateSlots();
        }
      } else if (slot.state === 'disappearing') {
        if (evt.propertyName === 'height' || slot.node.clientHeight === 0) {
          slot.state = 'gone';
          slot.transition = '';
          updateSlots();
        }
      }
    }
  });

  useEffect(() => {
    // trigger transitioning of slots once they've been rendered
    const startTransition = slots.some((slot) => {
      if (slot.state === 'appearing' || slot.state === 'disappearing') {
        if (slot.transition !== 'run') {
          return true;
        }
      }
    });
    if (startTransition) {
      updateSlots();
    }
  }, [ slots ]);
  useEffect(() => {
    const scrollWindow = getScrollWindow(scrollContainerRef);
    const unseenSlots = [];
    for (let slot of slots) {
      if (slot.unseen) {
        const slotPos = getSlotPosition(slot);
        if (isWithin(slotPos, scrollWindow)) {
          slot.unseen = false;
        } else {
          // if the slot is behind the anchor (i.e. above it when
          // inverted = false; below it when inverted = true)
          // then the user won't see it yet
          //
          // we're not tracking items appearing from the other
          // direction at the moment
          if (slot.index < anchorIndex) {
            unseenSlots.push(slot);
          }
        }
      }
    }
    const unseenItems = unseenSlots.map(s => s.item);
    if (_.xor(scrollState.unseenItems, unseenItems).length > 0) {
      if (onBeforeAnchor) {
        onBeforeAnchor({ items: unseenItems });
      }
      scrollState.unseenItems = unseenItems;
    }
  }, [ slots, anchorIndex ]);
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
    if (!anchor) {
      resetScrollPosition(scrollContainerRef, scrollState, inverted);
    }
  }, [ anchor ]);
  useEffect(() => {
    // maintain scroll position based on anchor
    maintainAnchorPosition(anchorSlot, scrollContainerRef, scrollState, inverted);
  });
  useEffect(() => {
    // continually adjust scroll position when transitioning
    if (inverted && transitioning) {
      let end = false;
      function adjust() {
        if (!end) {
          maintainAnchorPosition(anchorSlot, scrollContainerRef, scrollState, inverted);
          requestAnimationFrame(adjust);
        }
      }
      adjust();
      return () => { end = true };
    }
  }, [ transitioning, inverted ]);
  useEffect(() => {
    // update slot height (for transition purpose)
    for (let slot of slots) {
      if (slot.rendering) {
        const child = slot.node.firstChild;
        slot.height = (child) ? child.offsetHeight : 0;
      }
    }
    if (estimatedHeight === undefined) {
      const heights = slots.map(s => s.height).filter(Boolean);
      if (heights.length > 0) {
        const estimatedHeight = Math.round(_.mean(heights));
        if (estimatedHeight > 0) {
          setEstimatedHeight(estimatedHeight);
        }
      }
    }
  });

  // render some items behind (i.e. above) the anchored item
  const startIndex = Math.max(0, anchorIndex - behind);
  // render some items ahead of (i.e. below) the anchored item
  // (presumably the number is sufficient to fill the viewport)
  const endIndex = Math.min(slots.length, anchorIndex + ahead + 1);
  const list = (inverted) ? slots.slice().reverse() : slots;
  return (
    <div ref={containerRef} className="smart-list" onTransitionEnd={handleTransitionEnd}>
      {list.map(renderSlot)}
    </div>
  );

  function renderSlot(slot, index) {
    slot.rendering = (startIndex <= slot.index && slot.index < endIndex);
    if (slot.state !== 'disappearing') {
      const evt = {
        item: slot.item,
        needed: slot.rendering,
        startIndex,
        currentIndex: slot.index,
        endIndex,
        previousHeight: slot.height,
        estimatedHeight,
      };
      slot.contents = onRender(evt)
    } else {
      // use what was rendered before, since parent component might
      // not be able to render something that's no longer there
    }
    const classNames = [ 'slot' ];
    let style;
    if (slot.state === 'appearing') {
      classNames.push('transition', 'in');
      if (slot.transition === 'run') {
        style = { height: slot.height };
      } else {
        classNames.push('hidden');
      }
    } else if (slot.state === 'disappearing') {
      classNames.push('transition', 'out');
      if (slot.transition === 'run') {
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

function getScrollWindow(scrollContainerRef) {
  let top, bottom, height, scrollTop, scrollBottom;
  const container = scrollContainerRef.current;
  if (container) {
    top = container.offsetTop;
    height = container.offsetHeight;
    scrollTop = top + container.scrollTop;
    scrollBottom = scrollTop + height;
    bottom = top + container.scrollHeight;
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

function getSlotOffset(slot, scrollWindow, inverted) {
  const slotPos = getSlotPosition(slot);
  if (!inverted) {
    return (slotPos.top - scrollWindow.scrollTop);
  } else {
    return (scrollWindow.scrollBottom - slotPos.bottom);
  }
}

function findAnchorSlot(slots, scrollWindow, inverted) {
  for (let slot of slots) {
    const offset = getSlotOffset(slot, scrollWindow, inverted);
    if (offset > 0) {
      slot.offset = offset;
      return slot;
    }
  }
}

function isWithin(pos, scrollWindow) {
  if (pos.bottom > scrollWindow.scrollTop && pos.top < scrollWindow.scrollBottom) {
    return true;
  }
  return false;
}

function createSlot(id, item, index, offset) {
  let slot = {
    id,
    key: id,
    index,
    state: '',
    item: item,
    transition: '',
    rendering: undefined,
    visibility: undefined,
    contents: null,
    offset,
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

function maintainAnchorPosition(anchorSlot, scrollContainerRef, scrollState, inverted) {
  if (scrollState.scrolling) {
    return;
  }
  const scrollWindow = getScrollWindow(scrollContainerRef);
  let adjustment = 0;
  if (anchorSlot) {
    // adjust based on anchor
    const offset = getSlotOffset(anchorSlot, scrollWindow, inverted);
    adjustment = offset - anchorSlot.offset;
  } else {
    // reapply previous scroll amount
    const currentAmount = getScrollAmount(scrollContainerRef, inverted);
    adjustment = scrollState.amount - currentAmount;
  }
  if (adjustment !== 0) {
    if (inverted) {
      adjustment *= -1;
    }
    applyScrollPosition(scrollContainerRef, scrollState, scrollWindow.scrollTop + adjustment);
    scrollState.amount = getScrollAmount(scrollContainerRef, inverted);
  }
}

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

function resetScrollPosition(scrollContainerRef, scrollState, inverted) {
  const container = scrollContainerRef.current;
  const newScrollTop = (inverted) ? container.scrollHeight - container.clientHeight : 0;
  if (container.scrollTop !== newScrollTop) {
    // stop momentum scrolling if active
    const haltMomentum = isIOS && scrollState.scrolling;
    if (haltMomentum) {
      container.style.overflowY = 'hidden';
    }
    applyScrollPosition(scrollContainerRef, scrollState, newScrollTop);
    if (haltMomentum) {
      container.style.overflowY = 'scroll';
    }
  }
  scrollState.amount = 0;
  scrollState.scrolling = false;
}

function updateScrollState(scrollContainerRef, scrollState, inverted) {
  if (scrollState.skipEvent) {
    scrollState.skipEvent = false;
    return false;
  }
  scrollState.scrolling = true;
  scrollState.amount = getScrollAmount(scrollContainerRef, inverted);
  clearTimeout(scrollState.endTimeout);
  scrollState.endTimeout = setTimeout(() => {
    scrollState.scrolling = false;
  }, 500);
  return true;
}

function applyScrollPosition(scrollContainerRef, scrollState, scrollTop) {
  scrollState.skipEvent = true;
  scrollContainerRef.current.scrollTop = scrollTop;
}

function getScrollAmount(scrollContainerRef, inverted) {
  const container = scrollContainerRef.current;
  if (container) {
    if (!inverted) {
      return container.scrollTop;
    } else {
      return container.scrollHeight - container.scrollTop - container.clientHeight;
    }
  }
  return 0;
}

SmartList.defaultProps = {
  behind: 5,
  ahead: 10,
  offset: 0,
  inverted: false,
  noReset: false,
};

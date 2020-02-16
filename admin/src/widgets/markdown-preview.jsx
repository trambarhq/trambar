import _ from 'lodash';
import React, { useState, useEffect, useMemo } from 'react';
import { usePlainText, useRichText } from 'trambar-www';
import * as PlainText from 'common/utils/plain-text.mjs';

import './markdown-preview.scss';

function MarkdownPreview(props) {
  const { page, localized, env, onReference } = props;
  const [ limit, setLimit ] = useState(50);
  const pt = usePlainText();
  const rt = useRichText({
    devicePixelRatio: env.devicePixelRatio,
    imageHeight: 24,
    imageFilters: {
      sharpen: true
    },
    imageBaseURL: env.address,
    richTextAdjust: (type, props, children) => {
      if (type === 'a') {
        if (/^[\w\-]+$/.test(props.href)) {
          if (onReference) {
            props.href = onReference({ href: props.href })
          }
        } else {
          props.target = '_blank';
        }
      }
      return { type, props, children };
    },
  });
  const directions = useMemo(() => {
    return _.map(page.blocks, (block) => {
      return PlainText.detectDirection(pt(block));
    });
  }, [ page ]);

  useEffect(() => {
    if (page?.blocks.length > limit) {
      setTimeout(() => {
        setLimit(Infinity);
      }, 50);
    }
  }, [ page, limit ]);

  return (
    <div className="markdown-preview">
      {renderBlocks()}
    </div>
  );

  function renderBlocks() {
    let blocks;
    if (page) {
      if (page.blocks.length > limit) {
        blocks = _.slice(page.blocks, 0, limit);
      } else {
        blocks = page.blocks;
      }
    }
    return _.map(blocks, renderBlock);
  }

  function renderBlock(block, i) {
    let classNames = [ 'block' ];
    if (!localized.includes(block)) {
      const language = block.language();
      if (language) {
        // it's a language indicator
        classNames.push('language');
        if (language === 'zz') {
          classNames.push('off');
        }
        if (directions[i + 1] === 'rtl') {
          classNames.push('rtl');
        }
      } else {
        classNames.push('foreign');
      }
    }
    if (directions[i] === 'rtl') {
      classNames.push('rtl');
    }
    const code = block.code();
    if (code?.language === 'json') {
      try {
        JSON.parse(code.text);
      } catch (err) {
        classNames.push('broken');
      }
    }
    return (
      <div key={i} className={classNames.join(' ')}>
        {rt(block)}
      </div>
    )
  }
}

export {
  MarkdownPreview,
};

import _ from 'lodash';
import React, { useState, useEffect, useMemo } from 'react';
import { usePlainText, useRichText } from 'trambar-www';
import { chooseLanguageVersion } from 'trambar-www/src/text.mjs';
import { detectDirection } from 'common/utils/plain-text.js';

import 'prismjs/themes/prism.css';
import './markdown-preview.scss';

export function MarkdownPreview(props) {
  const { page, env, onReference } = props;
  const { localeCode } = env.locale;
  const adjustFunc = (node) => {
    let { type, props, children } = node;
    if (type === 'a' && props.href) {
      if (/^[\w\-]+$/.test(href)) {
        if (onReference) {
          props = { ...props, href: onReference(props) };
        }
      } else {
        props = { ...props, target: '_blank' };
      }
      return { type, props, children };
    }
  };
  const rt = useRichText({
    devicePixelRatio: env.devicePixelRatio,
    imageHeight: 24,
    imageFilters: {
      sharpen: true
    },
    imageBaseURL: env.address,
    adjustFunc,
  });

  const sections = page.content.getLanguageSpecificSections(localeCode);
  return (
    <div className="markdown-preview">
      {_.map(sections, renderSection)}
    </div>
  );

  function renderSection(section, i) {
    const { content, languages, match } = section;
    let classNames = [ 'section' ];
    if (!match) {
      classNames.push('foreign');
    }
    const direction = detectDirection(content);
    if (direction === 'rtl') {
      classNames.push('rtl');
    }
    return (
      <div key={i} className={classNames.join(' ')}>
        <div className="languages">
          {_.map(languages, renderLanguageTag)}
        </div>
        {rt(section.content)}
      </div>
    );
  }

  function renderLanguageTag(lang, i) {
    return <span className="language">{lang}</span>;
  }
}

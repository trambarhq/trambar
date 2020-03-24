import React from 'react';
import { usePlainText, useRichText } from 'trambar-www';
import { detectDirection } from 'common/utils/plain-text.js';

import 'prismjs/themes/prism.css';
import './markdown-preview.scss';

export function MarkdownPreview(props) {
  const { page, env, onReference } = props;
  const { localeCode } = env.locale;
  const adjustFunc = (node) => {
    let { type, props, children } = node;
    if (type === 'a' && props.href) {
      if (/^[\w\-]+$/.test(props.href)) {
        if (onReference) {
          props = { ...props, href: onReference(props) };
        }
      } else {
        props = { ...props, target: '_blank' };
      }
      return { type, props, children };
    }
  };
  const imageTransform = (node, context) => {
    const ratio = env.devicePixelRatio;
    const server = env.address;
    let width, height;
    if (context.hasText()) {
      height = 24;
    } else {
      const count = context.countImages();
      if (count === 1) {
        width = 300;
      } else {
        height = 100;
      }
    }
    return { width, height, ratio, server, sharpen: true }
  };
  const rt = useRichText({
    adjustFunc,
    imageTransform,
  });

  const sections = page.content.getLanguageSpecificSections(localeCode);
  return (
    <div className="markdown-preview">
      {sections.map(renderSection)}
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
          {languages.map(renderLanguageTag)}
        </div>
        {rt(section.content)}
      </div>
    );
  }

  function renderLanguageTag(lang, i) {
    return <span className="language">{lang}</span>;
  }
}

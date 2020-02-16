import _ from 'lodash';
import React from 'react';
import Relaks, { useProgress } from 'relaks';
import MarkGor from 'mark-gor/react';

// widgets
import CollapsibleContainer from 'common/widgets/collapsible-container.jsx';

import './instruction-block.scss';

async function InstructionBlock(props) {
  const { env, topic, folder, hidden } = props;
  const { languageCode } = env.locale;
  const [ show ] = useProgress();

  render();
  const contents = await loadMarkdown(folder, topic, languageCode);
  render();

  function render() {
    if (!contents) {
      show(null);
    } else {
      const classNames = [ 'instruction-block' ];
      if (hidden) {
        classNames.push('hidden')
      }
      show(
        <div className={classNames.join(' ')}>
          <CollapsibleContainer open={!hidden}>
            <div className="contents">{contents}</div>
          </CollapsibleContainer>
        </div>
      );
    }
  }
}

/**
 * Load and parse instruction text
 *
 * @param  {String} folder
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise<ReactElement>}
 */
async function loadMarkdown(folder, topic, lang) {
  const text = await loadText(folder, topic, lang);
  const contents = MarkGor.parse(text);
  return loadImages(contents, folder);
}

/**
 * Load instruction text
 *
 * @param  {String} folder
 * @param  {String} topic
 * @param  {String} lang
 *
 * @return {Promise}
 */
async function loadText(folder, topic, lang) {
  try {
    const module = await import(`../instructions/${folder}/${topic}.${lang}.md`);
    return module.default || '';
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`Missing instructions for topic "${topic}" in language "${lang}"`);
    }
    if (lang !== 'en') {
      return loadText(folder, topic, 'en');
    } else {
      return '';
    }
  }
}

/**
 * Load images used by img tags
 *
 * @param  {ReactElement} element
 * @param  {String} folder
 *
 * @return {ReactElement}
 */
async function loadImages(element, folder) {
  if (typeof(element) === 'string') {
    return element;
  } else if (element instanceof Array) {
    const results = [];
    for (let e of element) {
      const result = await loadImages(e, folder);
      results.push(result)
    }
    return results;
  } else if (element.type === 'img') {
    const filename = element.props.src;
    if (filename && !/^\w+:/.test(filename)) {
      try {
        const module = await import(`../instructions/${folder}/${filename}`);
        const url = module.default;
        return React.cloneElement(element, { src: url });
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Unable to find image: ${url}`);
        }
      }
    }
    return element;
  } else if (element.type === 'a') {
    const url = element.props.href;
    if (url && !/^\w+:/.test(url)) {
      try {
        const module = await import(`../instructions/${folder}/${url}`);
        const fileURL = module.default;
        const props = { href: url };
        if (/\.html$/.test(url)) {
          props.target = '_blank';
        } else {
          props.download = url;
        }
        return React.cloneElement(element, props);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Unable to find link: ${url}`);
        }
        return element;
      }
    } else {
      return React.cloneElement(element, { target: '_blank' });
    }
  } else if (!_.isEmpty(element.props?.children)) {
    const newChildren = [];
    for (let child of element.props.children) {
      const newChild = await loadImages(child, folder);
      newChildren.push(newChild);
    }
    return React.cloneElement(element, {}, newChildren);
  } else {
    return element;
  }
}

InstructionBlock.defaultProps = {
  hidden: false,
};

const component = Relaks.memo(InstructionBlock);

export {
  component as default,
  component as InstructionBlock,
};

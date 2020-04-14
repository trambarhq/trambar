import React, { useState, useMemo, useRef, useImperativeHandle, useEffect } from 'react';
import { useListener } from 'relaks';

// widgets
import { AutosizeTextArea } from 'common/widgets/autosize-text-area.jsx';

import './multilingual-text-field.scss';

/**
 * A text field that accepts text in multiple languages.
 */
export const MultilingualTextField = React.forwardRef((props, ref) => {
  const { env, type, id, readOnly, autofocus, value, availableLanguageCodes, children, onChange, ...otherProps } = props;
  const { t, languageCode, directory } = env.locale;
  const [ selectedLanguageCode, setSelectedLanguageCode ] = useState();
  const currentLanguageCode = useMemo(() => {
    if (!readOnly) {
      // use selected language if it's among the ones available
      if (availableLanguageCodes.includes(selectedLanguageCode)) {
        return selectedLanguageCode;
      }
    }

    const existingLanguageCodes = Object.keys(value);
    if (existingLanguageCodes.includes(languageCode)) {
      // if there's existing text of the current language, use it
      return languageCode;
    } else if (existingLanguageCodes.length > 0) {
      // otherwise choose the first language of any existing text
      return existingLanguageCodes[0];
    } else if (availableLanguageCodes.includes(languageCode)) {
      // if there's no text, use the current language if it's in the list
      // of available languages
      return languageCode;
    } else if (availableLanguageCodes.length > 0) {
      // otherwise use the first language on that list
      return availableLanguageCodes[0];
    } else {
      // if all else failed, use current language
      return languageCode;
    }
  }, [ selectedLanguageCode, languageCode, availableLanguageCodes, readOnly ]);
  const [ hoverState, setHoverState ] = useState(null);
  const languageCodes = useMemo(() => {
    const list = [];
    const existingLanguageCodes = Object.keys(value);
    const supportedLanguageCodes = directory.map(l => l.code);
    for (let code of [ ...existingLanguageCodes, ...availableLanguageCodes ]) {
      // include only codes of support languages
      if (supportedLanguageCodes.includes(code)) {
        if (!list.includes(code)) {
          list.push(code);
        }
      }
    }
    return list;
  }, [ env, availableLanguageCodes ]);
  const [ instance ] = useState({ value });
  const inputRef = useRef();

  useImperativeHandle(ref, () => {
    return instance;
  });

  const handleTextChange = useListener((evt) => {
    const text = evt.target.value;
    let newValue;
    if (text) {
      if (value instanceof Object) {
        newValue = { ...value };
      } else {
        newValue = {};
        if (typeof(value) === 'string') {
          // convert a string to a multi-lingual object
          for (let code of availableLanguageCodes) {
            text[code] = value;
          }
        }
      }
      newValue[currentLanguageCode] = text;
    } else {
      if (value instanceof Object) {
        newValue = { ...value };
        delete newValue[currentLanguageCode];
        if (!availableLanguageCodes.includes(currentLanguageCode)) {
          // choose a new language when text of a no-longer-available
          // language is removed
          const language = languageCodes[0];
          if (language) {
            setSelectedLanguageCode(language.code);
          }
        }
      } else {
        newValue = {};
      }
    }
    instance.value = newValue;
    if (onChange) {
      onChange({ type: 'change', target: instance });
    }
  });
  const handleLanguageClick = useListener((evt) => {
    const lang = evt.currentTarget.lang;
    setSelectedLanguageCode(lang);
    setHoverState(null);
  });
  const handleLanguageMouseOver = useListener((evt) => {
    const tab = evt.currentTarget;
    const tabs = tab.parentNode;
    const tabsRect = tabs.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const pos = tabRect.left + (tabRect.width / 2) - tabsRect.left;
    const lang = tab.lang;
    setHoverState({ languageCode: lang, arrowPosition: pos });
  });
  const handleLanguageMouseOut = useListener((evt) => {
    let tab = evt.currentTarget;
    let lang = tab.lang;
    if (lang === hoverState.languageCode) {
      setHoverState(null);
    }
  });

  useEffect(() => {
    // switch to the language of the new locale if it's
    // one of the available languages
    if (availableLanguageCodes.includes(languageCode)) {
      setSelectedLanguageCode(languageCode);
    }
  }, [ languageCode ])
  useEffect(() => {
    if (autofocus) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  }, []);

  const classNames = [ 'multilingual-text-field' ];
  let Input;
  let inputProps = { id, ...otherProps };
  if (type === 'textarea') {
    Input = AutosizeTextArea;
  } else {
    Input = 'input';
    inputProps.type = type;
  }
  if (readOnly) {
    classNames.push('readonly', 'collapsed');
    inputProps.placeholder = t('text-field-placeholder-none');
    inputProps.spellCheck = false;
    inputProps.readOnly = true;
  }
  if (languageCodes.length > 1) {
    classNames.push('multiple-languages');
  }
  if (value instanceof Object) {
    inputProps.value = value[currentLanguageCode] || '';
  } else if (typeof(value) === 'string') {
    inputProps.value = value;
  } else {
    inputProps.value = '';
  }
  inputProps.lang = currentLanguageCode;
  inputProps.onChange = handleTextChange;
  return (
    <div className={classNames.join(' ')}>
      <label htmlFor={id}>{children}</label>
      <Input ref={inputRef} {...inputProps} />
      {renderTabs()}
    </div>
  );

  function renderTabs() {
    if (languageCodes.length <= 1) {
      return null;
    }
    return (
      <div className="tabs">
        {languageCodes.map(renderTab)}
        {renderPopup()}
      </div>
    );
  }

  function renderTab(languageCode, i) {
    const language = directory.find(l => l.code === languageCode);
    const props = {
      className: 'tab',
      lang: language.code,
    };
    if (language.code === currentLanguageCode) {
      props.className += ' selected';
    } else {
      props.onClick = handleLanguageClick;
      props.onMouseOver = handleLanguageMouseOver;
      props.onMouseOut = handleLanguageMouseOut;
    }
    return <div key={i} {...props}>{language.name}</div>;
  }

  function renderPopup() {
    if (!hoverState || readOnly) {
      return null;
    }
    const contents = value[hoverState.languageCode] || '';
    if (!contents.trim()) {
      return null;
    }
    return (
      <div className="bubble">
        <div className="arrow" style={{ left: hoverState.arrowPosition }} />
        <div className="box">
          {contents}
        </div>
      </div>
    );
  }
});

MultilingualTextField.defaultProps = {
  type: 'text',
  value: {},
  availableLanguageCodes: [],
};

import {
  cardinal,
  gender,
  genderize,
  pastTenseEnding,
} from '../../../../../localization/grammars/russian.mjs';

const phrases = {
  '$name drank too much and died': (name) => {
    let e = pastTenseEnding(name);
    return `${name} выпи${e} слишком много и умер${e.length > 1 ? e : ''}`;
  },
  '$num beers': (num) => {
    return cardinal(num, '1 пиво', '2 пива', '5 пив');
  },
  'hello': 'привет',
};

function returnPhrases(countryCode) {
  return phrases;
}

export {
  returnPhrases as phrases,
  genderize,
};

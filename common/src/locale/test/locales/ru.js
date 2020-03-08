import {
  cardinal,
  gender,
  genderize,
  pastTenseEnding,
} from '../../../../../localization/grammars/polish.mjs';

let phrases = {
  'hello': 'привет',
  '$num beers': function(num) {
    return cardinal(num, '1 пиво', '2 пива', '5 пив');
  },
  '$name drank too much and died': (name) => {
    let e = pastTenseEnding(name);
    return `${name} выпи${e} слишком много и умер${e.length > 1 ? e : ''}`;
  }
};

function returnPhrases(countryCode) {
  return phrases;
}

export {
  returnPhrases as phrases,
  genderize,
};

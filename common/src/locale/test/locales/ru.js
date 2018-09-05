import {
    cardinal,
    gender,
    genderize,
    pastTenseEnding,
} from 'locale/grammars/russian';

let phrases = {
    'hello': 'привет',
    '$num beers': function(num) {
        if (num === 1) {
            return `1 пиво`;
        } else if (num === 2 || num === 3 || num === 4) {
            return `${num} пива`;
        } else {
            return `${num} пив`;
        }
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

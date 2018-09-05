import {
    cardinal,
    gender,
    genderize,
    pastTenseEnding,
} from 'locale/grammars/polish';

let phrases = {
    'hello': 'cześć',
    '$num beers': (num) => {
        return cardinal(num, 'piwo', 'piwa', 'piw');
    },
    '$name drank too much and died': (name) => {
        let e = pastTenseEnding(name, 3);
        return `${name} wypi${e} za dużo i umar${e}`;
    }
};

export {
    phrases,
    genderize,
};

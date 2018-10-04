import {
    cardinal,
    gender,
    genderize,
    pastTenseEnding,
} from 'locale/grammars/polish';

let phrases = {
    'hello': 'cześć',
    '$num beers': (num) => {
        return cardinal(num, '1 piwo', '2 piwa', '5 piw');
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

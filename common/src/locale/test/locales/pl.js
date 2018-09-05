let phrases = {
    'hello': 'cześć',
    '$num beers': (num) => {
        let ld = num % 10;
        if (num === 1) {
            return `1 piwo`;
        } else if ((num < 10 || (num > 20 && num < 100)) && (ld === 2 || ld === 3 || ld === 4)) {
            return `${num} piwa`;
        } else {
            return `${num} piw`;
        }
    },
    '$name drank too much and died': (name) => {
        let a = '';
        if (gender(name) === 'female') {
            a = 'a';
        }
        return `${name} wypił${a} za dużo i umarł${a}`;
    }
};

let nameGenders = {};

function genderize(name, gender) {
    nameGenders[name] = gender;
}

function gender(name) {
    let gender = nameGenders[name];
    if (!gender) {
        gender = /a$/.test(name) ? 'female' : 'male';
    }
    return gender;
}

export {
    phrases,
    genderize,
};

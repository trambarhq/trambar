function singular(n) {
    return n === 1;
}

function plural(n) {
    if (n < 10 || (n > 20 && n < 100)) {
        var ld = n % 10;
        if (ld === 2 || ld === 3 || ld === 4) {
            return true;
        }
    }
    return false;
}

function cardinal(num, sg, pl, plGenitive, omitDigitOne) {
    if (singular(num)) {
        if (omitDigitOne) {
            if (sg instanceof Array) {
                return sg[0] + ' ' + sg[1];
            } else {
                return sg;
            }
        }  else {
            if (sg instanceof Array) {
                return sg[0] + ' 1 ' + sg[1];
            } else {
                return '1 ' + sg;
            }
        }
        return (omitDigitOne) ? sg : `1 ${sg}`;
    } else if (plural(num)) {
        if (pl instanceof Array) {
            return pl[0] + ' ' + num + ' ' + pl[1];
        } else {
            return num + ' ' + pl;
        }
    } else {
        if (plGenitive instanceof Array) {
            return plGenitive[0] + ' ' + num + ' ' + plGenitive[1];
        } else {
            return num + ' ' + plGenitive;
        }
    }
}

var nameGenders = {};

function genderize(name, gender) {
    nameGenders[name] = gender;
}

function gender(name) {
    // handle multiple names
    if (name instanceof Array) {
        for (var i = 0; i < name.length; i++) {
            if (gender(name[i]) === 'male') {
                return 'male';
            }
        }
        return 'female';
    }

    if (name) {
        // use value from prior call to genderize()
        var gender = nameGenders[name];
        if (gender) {
            return gender;
        }

        // see if the first name ends in an 'a', taking exceptions into consideration
        var parts = name.split(/\s+/);
        var fname = parts[0].toLocaleLowerCase();
        if (/a$/.test(fname)) {
            if (!isMasculine[fname]) {
                return 'female';
            }
        } else {
            if (isFeminine[fname]) {
                return 'female';
            }
        }
    }
    return 'male';
}

function pastTenseEnding(name, person, plural) {
    if (gender(name) === 'female') {
        if (plural) {
            switch (person) {
                case 1: return 'łyśmy';
                case 2: return 'łyścue';
                case 3: return 'ły';
            }
        } else {
            switch (person) {
                case 1: return 'łam';
                case 2: return 'łaś';
                case 3: return 'ła';
            }
        }
    } else {
        if (plural) {
            switch (person) {
                case 1: return 'liśmy';
                case 2: return 'liście';
                case 3: return 'li';
            }
        } else {
            switch (person) {
                case 1: return 'łem';
                case 2: return 'łeś';
                case 3: return 'ł';
            }
        }
    }
}

function list(items) {
    items = items.map((item) => {
        return `${item}`;
    });
    if (items.length >= 2) {
        var lastItem = items.pop();
        items[items.length - 1] += ` i ${lastItem}`;
    }
    return items.join(', ');
}

// żeńskie imiona nie kończące się na a
var isFeminine = {};
[
    'Abigail',
    'Beatrycze',
    'Bogudać',
    'Bogudarz',
    'Dobrowieść',
    'Dobrożyźń',
    'Miriam',
    'Noemi',
    'Przybycześć',
    'Świętożyźń',
].forEach((name) => {
    isFeminine[name.toLocaleLowerCase()] = true;
});

// męskie imiona kończące się na a
var isMasculine = {};
[
    'Barnaba',
    'Bodzęta',
    'Bogdała',
    'Bogwidza',
    'Bonawentura',
    'Brzezdoma',
    'Dyzma',
    'Jarema',
    'Kuba',
    'Lasota',
    'Niegodoma',
    'Niemsta',
    'Niepełka',
    'Niewsza',
    'Strachota',
    'Zawisza',
    'Żegota',
].forEach((name) => {
    isMasculine[name.toLocaleLowerCase()] = true;
});

module.exports = {
    singular,
    plural,
    cardinal,
    genderize,
    gender,
    pastTenseEnding,
    list,
};

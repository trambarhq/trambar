function singular(n) {
    return n === 1;
}

function plural(n) {
    if (n > 2 && n < 5) {
        return true;
    }
    return false;
}

function cardinal(num, sg, pl, plGenitive) {
    if (singular(num)) {
        return replaceNumber(sg, num);
    } else if (plural(num)) {
        return replaceNumber(pl || sg, num);
    } else {
        return replaceNumber(plGenitive || pl || sg, num);
    }
}

var numberRegExp = /\d+/;

function replaceNumber(s, n) {
    return s.replace(numberRegExp, n);
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

function pastTenseEnding(name, plural) {
    if (plural) {
        return 'li';
    } else {
        if (gender(name) === 'female') {
            return 'la';
        } else {
            return 'l';
        }
    }
}

function list(items) {
    if (items.length >= 2) {
        var lastItem = items.pop();
        items[items.length - 1] += ' a ' + lastItem;
    }
    return items.join(', ');
}

var isFeminine = {};
[
    'Abigail',
    'Adél',
    'Adele',
    'Agnes',
    'Alice',
    'Amalie',
    'Amálie',
    'Amelie',
    'Amélie',
    'Amy',
    'Anabel',
    'Anastazie',
    'Anastázie',
    'Anette',
    'Annabel',
    'Annabell',
    'Annabelle',
    'Annemarie',
    'Annie',
    'Antonie',
    'Ashley',
    'Aylin',
    'Beatrice',
    'Beatris',
    'Björn',
    'Carmen',
    'Caroline',
    'Cecílie',
    'Charlotte',
    'Christine',
    'Claudie',
    'Dagmar',
    'Dani',
    'Edvin',
    'Eleanor',
    'Elen',
    'Eleni',
    'Elin',
    'Elisabet',
    'Elisabeth',
    'Elizabet',
    'Elizabeth',
    'Ellen',
    'Elli',
    'Ellie',
    'Emili',
    'Emilie',
    'Emílie',
    'Emilly',
    'Emily',
    'Ester',
    'Evelin',
    'Eveline',
    'Evelyn',
    'Felipe',
    'Grace',
    'Helen',
    'Ines',
    'Inés',
    'Ingrid',
    'Isabel',
    'Isabell',
    'Isabelle',
    'Izabel',
    'Jasmin',
    'Jasmine',
    'Jenifer',
    'Jennifer',
    'Julie',
    'Karin',
    'Kate',
    'Katie',
    'Katrin',
    'Ketrin',
    'Kim',
    'Klaudie',
    'Kristin',
    'Leticie',
    'Libuše',
    'Lili',
    'Lilian',
    'Lilien',
    'Lillian',
    'Lilly',
    'Lily',
    'Livie',
    'Lucie',
    'Lýdie',
    'Madeleine',
    'Madlen',
    'Mariam',
    'Marie',
    'Marlen',
    'Megan',
    'Melanie',
    'Melánie',
    'Michelle',
    'Miluše',
    'Miriam',
    'Molly',
    'Nancy',
    'Naomi',
    'Natali',
    'Natalie',
    'Natálie',
    'Nataly',
    'Nathalie',
    'Nathaly',
    'Nelli',
    'Nelly',
    'Nicol',
    'Nicole',
    'Nicolette',
    'Nicoll',
    'Niki',
    'Noemi',
    'Olivie',
    'Olívie',
    'Patricie',
    'Rachel',
    'Ráchel',
    'Rosalie',
    'Rozálie',
    'Rozárie',
    'Rút',
    'Sami',
    'Sarah',
    'Scarlett',
    'Silvie',
    'Skarlet',
    'Sofie',
    'Sophie',
    'Stefani',
    'Stefanie',
    'Sylvie',
    'Terezie',
    'Tiffany',
    'Valerie',
    'Valérie',
    'Valery',
    'Victorie',
    'Viktorie',
    'Violet',
    'Vivien',
    'Vivienne',
    'Yasmin',
    'Yasmine',
    'Zoe',
    'Žofie',
].forEach((name) => {
    isFeminine[name.toLocaleLowerCase()] = true;
});

var isMasculine = {};
[
    'Honza',
    'Jožka',
    'Jura',
    'Nikola',
    'Nikolka',
    'Peťulka',
    'Sáva',
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

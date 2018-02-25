module.exports = {
    fromTitle,
    fromPersonalName,
};

function fromTitle(title) {
    if (typeof(title) === 'string') {
        title = { en: title };
    }
    var name = '';
    var lang;
    for (var lang in title) {
        name = String(title[lang]);
        name = removeDiacritics(name).toLowerCase();
        name = name.replace(/\s+/g, '-');
        name = name.replace(/[^0-9a-z\-]/g, '');
        if (/^\-+$/.test(name)) {
            name = '';
        }
        if (name) {
            break;
        }
    }
    if (name.length > 32) {
        name = name.substr(0, 32);
    }
    return name;
}

function fromPersonalName(fullName) {
    if (typeof(fullName) === 'string') {
        fullName = { en: fullName };
    }
    var name = '';
    var lang;
    for (var lang in fullName) {
        var parts = String(fullName[lang]).split(/\s+/).map((s) => {
            return removeDiacritics(s).toLowerCase().replace(/[^a-z]/g, '');
        }).filter(Boolean);
        if (parts.length > 0) {
            // last name plus initials of other names
            var last = parts[parts.length - 1];
            var initials = '';
            for (var i = 0; i < parts.length - 1; i++) {
                initials += parts[i].charAt(0);
            }
            name = initials + last;
            if (name) {
                break;
            }
        }
    }
    return name;
}

function removeDiacritics(s) {
    return String(s)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

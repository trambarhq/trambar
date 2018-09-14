function fromTitle(title) {
    if (typeof(title) === 'string') {
        title = { en: title };
    }
    let name = '';
    let lang;
    for (let lang in title) {
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
    let name = '';
    let lang;
    for (let lang in fullName) {
        let parts = String(fullName[lang]).split(/\s+/).map((s) => {
            return removeDiacritics(s).toLowerCase().replace(/[^a-z]/g, '');
        }).filter(Boolean);
        if (parts.length > 0) {
            // last name plus initials of other names
            let last = parts[parts.length - 1];
            let initials = '';
            for (let i = 0; i < parts.length - 1; i++) {
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

export {
    fromTitle,
    fromPersonalName,
    exports as default,
};

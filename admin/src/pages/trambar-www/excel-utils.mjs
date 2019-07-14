function chooseLanguageVersion(objects, options) {
    const lang =  options.language;
    const [ reqLC, reqCC ] = (lang) ? lang.toLowerCase().split('-') : [];
    const list = [];
    const scores = {};
    for (let object of objects) {
        const score = getLanguageMatch(object, reqLC, reqCC);
        const previousScore = scores[object.name];
        if (!(previousScore >= score)) {
            list.push(object);
            scores[object.name] = score;
        }
    }
    return list;
}

const localeRegExp = /^\w{2}(\-\w{2})?$/;

function getLanguageMatch(object, reqLC, reqCC) {
    let highest = 0;
    if (reqLC) {
        for (let flag of object.flags) {
            if (localeRegExp.test(flag)) {
                const [ lc, cc ] = lang.toLowerCase().split('-');
                if (lc === reqLC) {
                    let score = 50;
                    if (cc === reqCC) {
                        score = 100;
                    }
                    if (score > highest) {
                        highest = score;
                    }
                }
            }
        }
    }
    return highest;
}

export {
    chooseLanguageVersion,
};

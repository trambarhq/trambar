var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var LocaleManager = require('locale/locale-manager.jsx');

describe('LocaleManager', () => {
    var changeCount = 0;
    var managerReady = new Promise((resolve, reject) => {
        var props = {
            defaultLanguageCode: 'pl-pl',
            onChange: (evt) => {
                if (resolve) {
                    resolve(evt.target);
                    resolve = null; // don't call this again
                }
                changeCount++;
            },
            onModuleRequest: (evt) => {
                var languageCode = evt.languageCode.substr(0, 2);
                return new Promise((resolve, reject) => {
                    var Promise = window.Promise || require('bluebird');
                    switch (languageCode) {
                        case 'pl': require.ensure([ './locales/pl' ], () => { try { resolve(require('./locales/pl')) } catch(err) { reject(err) } }); break;
                        case 'ru': require.ensure([ './locales/ru' ], () => { try { resolve(require('./locales/ru')) } catch(err) { reject(err) } }); break;
                        default: reject(new Error('No module for language: ' + languageCode));
                    }
                });
            },
        };
        var wrapper = Enzyme.mount(<LocaleManager {...props} />);

        setTimeout(() => {
            reject(new Error('onChange not called within 1000ms'));
        }, 1000);
    });

    it('should call onChange() at some point', () => {
        return managerReady;
    })
    it('should default to Polish as English is not supported', () => {
        return managerReady.then((manager) => {
            expect(manager.getLanguageCode()).to.equal('pl-pl');
        });
    })
    describe('#change', () => {
        it('should be able to switch to Russian', () => {
            return managerReady.then((manager) => {
                return manager.change('ru-ua').then(() => {
                    expect(manager.getLanguageCode()).to.equal('ru-ua');
                });
            });
        })
        it('should be able to switch back to Polish', () => {
            return managerReady.then((manager) => {
                return manager.change('pl-pl').then(() => {
                    expect(manager.getLanguageCode()).to.equal('pl-pl');
                });
            });
        })
        it('should be able to switch country code only', () => {
            return managerReady.then((manager) => {
                return manager.change('pl-ua').then(() => {
                    expect(manager.getLanguageCode()).to.equal('pl-ua');
                });
            });
        })
        it('should trigger onChange each time it succeeds', () => {
            expect(changeCount).to.be.above(3);
        })
    });
    describe('#translate', () => {
        it('should produce the test phrase in Polish', () => {
            return managerReady.then((manager) => {
                return manager.change('pl-pl').then(() => {
                    expect(manager.translate('hello')).to.equal('cześć');
                });
            });
        })
        it('should produce test phrases with a numeric argument in Polish', () => {
            return managerReady.then((manager) => {
                return manager.change('pl-pl').then(() => {
                    expect(manager.translate('$1 beers', 1)).to.equal('1 piwo');
                    expect(manager.translate('$1 beers', 21)).to.equal('21 piw');
                    expect(manager.translate('$1 beers', 24)).to.equal('24 piwa');
                    expect(manager.translate('$1 beers', 25)).to.equal('25 piw');
                    expect(manager.translate('$1 beers', 124)).to.equal('124 piw');
                });
            });
        })
        it('should produce the test phrase in Russian', () => {
            return managerReady.then((manager) => {
                return manager.change('ru-ua').then(() => {
                    expect(manager.translate('hello')).to.equal('привет');
                });
            });
        })
        it('should produce test phrases with a numeric argument in Russian', () => {
            return managerReady.then((manager) => {
                return manager.change('ru-ua').then(() => {
                    expect(manager.translate('$1 beers', 1)).to.equal('1 пиво');
                    expect(manager.translate('$1 beers', 4)).to.equal('4 пива');
                    expect(manager.translate('$1 beers', 25)).to.equal('25 пив');
                });
            });
        })
    });
    describe('#pick', () => {
        it('should pick the Polish version when the language is set to Polish', () => {
            var phrase = {
                en: 'I love the smell of napalm in the morning',
                pl: 'Kobieta mnie bije. Poddaję się!',
            };
            return managerReady.then((manager) => {
                return manager.change('pl-pl').then(() => {
                    expect(manager.pick(phrase)).to.contain('Kobieta');
                });
            });
        })
        it('should pick the Polish version when the language is set to Russian', () => {
            var phrase = {
                en: 'I love the smell of napalm in the morning',
                pl: 'Kobieta mnie bije. Poddaję się!',
            };
            return managerReady.then((manager) => {
                return manager.change('ru-ua').then(() => {
                    expect(manager.pick(phrase)).to.contain('Kobieta');
                });
            });
        })
        it('should pick the English version when the language is set to Polish', () => {
            var phrase = {
                en: 'I love the smell of napalm in the morning',
                ru: 'Доброе утро последний герой',
            };
            return managerReady.then((manager) => {
                return manager.change('pl-pl').then(() => {
                    expect(manager.pick(phrase)).to.contain('napalm');
                });
            });
        })
    })
})

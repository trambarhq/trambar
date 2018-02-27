var _ = require('lodash');
var Promise = require('bluebird');
var React = require('react');
var Chai = require('chai'), expect = Chai.expect;
var Enzyme = require('enzyme');

var LocaleManager = require('locale/locale-manager.jsx');

var directory = [
    {
        code: 'pl',
        defaultCountry: 'pl',
        module: () => import('./locales/pl'),
    },
    {
        code: 'ru',
        defaultCountry: 'ru',
        module: () => import('./locales/ru'),
    }
];

describe('LocaleManager', function() {
    var changeCount = 0;
    var managerReady = new Promise((resolve, reject) => {
        var props = {
            defaultLanguageCode: 'pl-pl',
            directory: directory,
            onChange: (evt) => {
                if (resolve) {
                    resolve(evt.target);
                    resolve = null; // don't call this again
                }
                changeCount++;
            },
        };
        var wrapper = Enzyme.mount(<LocaleManager {...props} />);

        setTimeout(() => {
            reject(new Error('onChange not called within 1000ms'));
        }, 1000);
    });

    it('should call onChange() at some point', function() {
        return managerReady;
    })
    it('should default to Polish as English is not supported', function() {
        return managerReady.then((manager) => {
            expect(manager.getLocaleCode()).to.equal('pl-pl');
        });
    })
    describe('#change()'), function() {
        it('should be able to switch to Russian', function() {
            return managerReady.then((manager) => {
                return manager.change('ru-ua').then(() => {
                    expect(manager.getLocaleCode()).to.equal('ru-ua');
                });
            });
        })
        it('should be able to switch back to Polish', function() {
            return managerReady.then((manager) => {
                return manager.change('pl-pl').then(() => {
                    expect(manager.getLocaleCode()).to.equal('pl-pl');
                });
            });
        })
        it('should be able to switch country code only', function() {
            return managerReady.then((manager) => {
                return manager.change('pl-ua').then(() => {
                    expect(manager.getLocaleCode()).to.equal('pl-ua');
                });
            });
        })
        it('should trigger onChange each time it succeeds', function() {
            expect(changeCount).to.be.above(3);
        })
    });
    describe('#translate()'), function() {
        it('should produce the test phrase in Polish', function() {
            return managerReady.then((manager) => {
                return manager.change('pl-pl').then(() => {
                    expect(manager.translate('hello')).to.equal('cześć');
                });
            });
        })
        it('should produce test phrases with a numeric argument in Polish', function() {
            return managerReady.then((manager) => {
                return manager.change('pl-pl').then(() => {
                    expect(manager.translate('$num beers', 1)).to.equal('1 piwo');
                    expect(manager.translate('$num beers', 21)).to.equal('21 piw');
                    expect(manager.translate('$num beers', 24)).to.equal('24 piwa');
                    expect(manager.translate('$num beers', 25)).to.equal('25 piw');
                    expect(manager.translate('$num beers', 124)).to.equal('124 piw');
                });
            });
        })
        it('should produce the test phrase in Russian', function() {
            return managerReady.then((manager) => {
                return manager.change('ru-ua').then(() => {
                    expect(manager.translate('hello')).to.equal('привет');
                });
            });
        })
        it('should produce test phrases with a numeric argument in Russian', function() {
            return managerReady.then((manager) => {
                return manager.change('ru-ua').then(() => {
                    expect(manager.translate('$num beers', 1)).to.equal('1 пиво');
                    expect(manager.translate('$num beers', 4)).to.equal('4 пива');
                    expect(manager.translate('$num beers', 25)).to.equal('25 пив');
                });
            });
        })
    });
    describe('#pick()'), function() {
        it('should pick the Polish version when the language is set to Polish', function() {
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
        it('should pick the Polish version when the language is set to Russian', function() {
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
        it('should pick the English version when the language is set to Polish', function() {
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

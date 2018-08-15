var _ = require('lodash');
var Chai = require('chai'), expect = Chai.expect;

var Whitelist = require('utils/whitelist');

describe('Whitelist', function() {
    describe('#match()', function() {
        it ('should return true when a email address has a domain that is on the list', function() {
            var whitelist = `
                yahoo.com
                hotmail.com
            `;
            var email = 'chernyshevsky@hotmail.com';
            var result = Whitelist.match(email, whitelist);
            expect(result).to.be.true;
        })
        it ('should return false when a email address has a domain that is not on the list', function() {
            var whitelist = `
                yahoo.com
                google.com
            `;
            var email = 'chernyshevsky@hotmail.com';
            var result = Whitelist.match(email, whitelist);
            expect(result).to.be.false;
        })
        it ('should return true when a email address has a domain that commented out', function() {
            var whitelist = `
                yahoo.com
                #hotmail.com
            `;
            var email = 'chernyshevsky@hotmail.com';
            var result = Whitelist.match(email, whitelist);
            expect(result).to.be.false;
        })
        it ('should return true when a email address is on the list', function() {
            var whitelist = `
                yahoo.com
                chernyshevsky@hotmail.com
            `;
            var email = 'chernyshevsky@hotmail.com';
            var result = Whitelist.match(email, whitelist);
            expect(result).to.be.true;
        })
        it ('should return false when a email address is not the list', function() {
            var whitelist = `
                yahoo.com
                dostoevsky@hotmail.com
            `;
            var email = 'chernyshevsky@hotmail.com';
            var result = Whitelist.match(email, whitelist);
            expect(result).to.be.false;
        })
    })
});

import { expect } from 'chai';

import * as Whitelist from '../whitelist.mjs';

describe('Whitelist', function() {
    describe('#match()', function() {
        it ('should return true when a email address has a domain that is on the list', function() {
            let whitelist = `
                yahoo.com
                hotmail.com
            `;
            let email = 'chernyshevsky@hotmail.com';
            let result = Whitelist.match(email, whitelist);
            expect(result).to.be.true;
        })
        it ('should return false when a email address has a domain that is not on the list', function() {
            let whitelist = `
                yahoo.com
                google.com
            `;
            let email = 'chernyshevsky@hotmail.com';
            let result = Whitelist.match(email, whitelist);
            expect(result).to.be.false;
        })
        it ('should return true when a email address has a domain that commented out', function() {
            let whitelist = `
                yahoo.com
                #hotmail.com
            `;
            let email = 'chernyshevsky@hotmail.com';
            let result = Whitelist.match(email, whitelist);
            expect(result).to.be.false;
        })
        it ('should return true when a email address is on the list', function() {
            let whitelist = `
                yahoo.com
                chernyshevsky@hotmail.com
            `;
            let email = 'chernyshevsky@hotmail.com';
            let result = Whitelist.match(email, whitelist);
            expect(result).to.be.true;
        })
        it ('should return false when a email address is not the list', function() {
            let whitelist = `
                yahoo.com
                dostoevsky@hotmail.com
            `;
            let email = 'chernyshevsky@hotmail.com';
            let result = Whitelist.match(email, whitelist);
            expect(result).to.be.false;
        })
    })
});

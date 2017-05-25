var Chai = require('chai'), expect = Chai.expect;

var Triggers = require('../triggers');
var Runtime = require('../runtime');

function initPLV8() {
    var stmts = [];
    global.plv8 = {
        execute: function(sql) {
            stmts.push(sql);
        },
        quote_literal: function(s) {
            return s.replace(/'/g, "''");
        },
    };
    return stmts;
}

describe('Triggers', () => {
    for (var name in Runtime) {
        global[name] = Runtime[name];
    }
    describe('#indicateDataChange()', () => {
        it('should increment gn and update mtime when new row is different', () => {
            var mtime = new Date('2017');
            var OLD = { id: 1, gn: 1, mtime: mtime, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 1, mtime: mtime, details: { a: 'bingo' } };
            Triggers.indicateDataChange(OLD, NEW);
            expect(NEW.gn).to.equal(OLD.gn + 1);
            expect(NEW.mtime).to.not.equal(OLD.mtime);
        })
        it('should keep gn and mtime the same when new row contains no change', () => {
            var mtime = new Date('2017');
            var OLD = { id: 1, gn: 1, mtime: mtime, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 1, mtime: mtime, details: { a: 'dingo' } };
            Triggers.indicateDataChange(OLD, NEW);
            expect(NEW.gn).to.equal(OLD.gn);
            expect(NEW.mtime).to.equal(OLD.mtime);
        })
    })
    describe('#indicateLiveDataChange()', () => {
        it('should increment gn and update mtime when new row is different', () => {
            var mtime = new Date('2017');
            var OLD = { id: 1, gn: 1, mtime, ltime: null, atime: null, dirty: false, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 1, mtime, ltime: null, atime: null, dirty: false, details: { a: 'bingo' } };
            Triggers.indicateLiveDataChange(OLD, NEW);
            expect(NEW.gn).to.equal(OLD.gn + 1);
            expect(NEW.mtime).to.not.equal(OLD.mtime);
        })
        it('should return ignore changes to ltime, atime, and dirty', () => {
            var mtime = new Date('2017');
            var ltime = new Date('2017-06');
            var atime = new Date('2017-06-04');
            var OLD = { id: 1, gn: 1, mtime, ltime: null, atime: null, dirty: false, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 1, mtime, ltime: ltime, atime: atime, dirty: true, details: { a: 'dingo' } };
            Triggers.indicateLiveDataChange(OLD, NEW);
            expect(NEW.gn).to.equal(OLD.gn);
            expect(NEW.mtime).to.equal(OLD.mtime);
        })
    })
    describe('#notifyDataChange', () => {
        it('should send change notification on update', () => {
            var stmts = initPLV8();
            var mtime = new Date('2017');
            var OLD = { id: 1, gn: 1, mtime: mtime, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 2, mtime: mtime, details: { a: 'bingo' } };
            Triggers.notifyDataChange(OLD, NEW, 'UPDATE', 'schema', 'table');
            expect(stmts[0]).to.contain('NOTIFY').to.contain('{"a":"dingo"},{"a":"bingo"}');
        })
        it('should send change notification on insert', () => {
            var stmts = initPLV8();
            var mtime = new Date('2017');
            var NEW = { id: 1, gn: 1, mtime: mtime, details: { a: 'bingo' } };
            Triggers.notifyDataChange(null, NEW, 'INSERT', 'schema', 'table');
            expect(stmts[0]).to.contain('NOTIFY').to.contain('null,{"a":"bingo"}');
        })
        it('should send change notification on delete', () => {
            var stmts = initPLV8();
            var mtime = new Date('2017');
            var OLD = { id: 1, gn: 1, mtime: mtime, details: { a: 'dingo' } };
            Triggers.notifyDataChange(OLD, null, 'DELETE', 'schema', 'table');
            expect(stmts[0]).to.contain('NOTIFY').to.contain('{"a":"dingo"},null');
        })
    })
    describe('#notifyLiveDataChange', () => {
        it('should send change notification on update', () => {
            var stmts = initPLV8();
            var mtime = new Date('2017');
            var OLD = { id: 1, gn: 1, mtime, ltime: null, atime: null, dirty: false, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 1, mtime, ltime: null, atime: null, dirty: false, details: { a: 'bingo' } };
            Triggers.notifyLiveDataChange(OLD, NEW, 'UPDATE', 'schema', 'table');
            expect(stmts[0]).to.contain('NOTIFY').to.contain('{"a":"dingo"},{"a":"bingo"}');
        })
        it('should ignore changes to dirty', () => {
            var stmts = initPLV8();
            var mtime = new Date('2017');
            var OLD = { id: 1, gn: 1, mtime, ltime: null, atime: null, dirty: false, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 1, mtime, ltime: null, atime: null, dirty: true, details: { a: 'dingo' } };
            Triggers.notifyLiveDataChange(OLD, NEW, 'UPDATE', 'schema', 'table');
            expect(stmts).to.be.empty;
        })
        it('should send clean notification on atime change', () => {
            var stmts = initPLV8();
            var mtime = new Date('2017');
            var atime = new Date('2017-06-04');
            var OLD = { id: 1, gn: 1, mtime, ltime: null, atime: null, dirty: true, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 1, mtime, ltime: null, atime, dirty: true, details: { a: 'dingo' } };
            Triggers.notifyLiveDataChange(OLD, NEW, 'UPDATE', 'schema', 'table');
            expect(stmts[0]).to.contain('NOTIFY').to.contain('clean');
        })
        it('should not send clean notification when ltime is set', () => {
            var stmts = initPLV8();
            var mtime = new Date('2017');
            var ltime = new Date('2017-06');
            var atime = new Date('2017-06-04');
            var OLD = { id: 1, gn: 1, mtime, ltime, atime: null, dirty: true, details: { a: 'dingo' } };
            var NEW = { id: 1, gn: 1, mtime, ltime, atime, dirty: true, details: { a: 'dingo' } };
            Triggers.notifyLiveDataChange(OLD, NEW, 'UPDATE', 'schema', 'table');
            expect(stmts).to.be.empty;
        })
    })
})

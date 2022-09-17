var assert = require('assert');
var jthml = require('../index.js');
describe('Error', function () {
    describe('#constructor()', function () {
        it('should create a error object with message "hello"', function () {
            assert.equal(new jthml.Error("hello").msg, "hello");
        });
    });
});

describe('Parser', function () {
    describe('#parse()', function () {
        it('should return a object', function () {
            assert.equal(typeof (new jthml.Parser()).parse("hello"), "object");
        });
        
    });
});
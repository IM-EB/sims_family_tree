#!/usr/bin/env node

/**
 * Main Test Runner Script
 * 
 * This script runs all tests for the Sims Family Tree project:
 * - Data validation tests
 * - Tree logic tests
 * - Integration tests
 */

const FamilyDataValidator = require('./validate-data');
const FamilyTreeLogicTester = require('./test-tree-logic');

class TestRunner {
    constructor() {
        this.results = {
            dataValidation: null,
            treeLogic: null,
            overall: false
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Sims Family Tree Test Suite');
        console.log('='.repeat(60));
        
        try {
            // Run data validation tests
            console.log('\n📋 PHASE 1: Data Validation Tests');
            console.log('-'.repeat(40));
            const validator = new FamilyDataValidator();
            this.results.dataValidation = await validator.validate();
            
            // Run tree logic tests
            console.log('\n🧪 PHASE 2: Tree Logic Tests');
            console.log('-'.repeat(40));
            const tester = new FamilyTreeLogicTester();
            this.results.treeLogic = await tester.runTests();
            
            // Calculate overall result
            this.results.overall = this.results.dataValidation && this.results.treeLogic;
            
            this.printFinalResults();
            return this.results.overall;
            
        } catch (error) {
            console.error('❌ Test suite failed with error:', error.message);
            this.results.overall = false;
            return false;
        }
    }

    printFinalResults() {
        console.log('\n🏁 FINAL TEST RESULTS');
        console.log('='.repeat(60));
        
        console.log(`📋 Data Validation: ${this.results.dataValidation ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`🧪 Tree Logic Tests: ${this.results.treeLogic ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`🎯 Overall Result: ${this.results.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        if (this.results.overall) {
            console.log('\n🎉 Congratulations! Your family tree is ready for production!');
            console.log('   • Data integrity verified');
            console.log('   • Tree logic validated');
            console.log('   • All relationships consistent');
        } else {
            console.log('\n⚠️ Please fix the failing tests before deploying:');
            if (!this.results.dataValidation) {
                console.log('   • Fix data validation issues');
            }
            if (!this.results.treeLogic) {
                console.log('   • Fix tree logic issues');
            }
        }
        
        console.log('\n📊 Test Summary:');
        console.log(`   • Data Validation: ${this.results.dataValidation ? 'PASS' : 'FAIL'}`);
        console.log(`   • Tree Logic: ${this.results.treeLogic ? 'PASS' : 'FAIL'}`);
        console.log(`   • Overall Status: ${this.results.overall ? 'PASS' : 'FAIL'}`);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = TestRunner;

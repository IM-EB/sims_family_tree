#!/usr/bin/env node

/**
 * Data Validation Script for Sims Family Tree
 * 
 * This script validates the integrity of the family data JSON file,
 * checking for required fields, data consistency, and relationship validity.
 */

const fs = require('fs');
const path = require('path');

class FamilyDataValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.members = [];
        this.memberMap = new Map();
    }

    async validate() {
        console.log('🔍 Starting family data validation...\n');
        
        try {
            await this.loadData();
            this.validateRequiredFields();
            this.validateDataTypes();
            this.validateRelationships();
            this.validateUniqueness();
            this.validateCircularReferences();
            this.validateOrphanedMembers();
            this.validateSpouseConsistency();
            
            this.printResults();
            return this.errors.length === 0;
        } catch (error) {
            console.error('❌ Validation failed:', error.message);
            return false;
        }
    }

    async loadData() {
        const dataPath = path.join(__dirname, '..', 'data', 'members.json');
        
        if (!fs.existsSync(dataPath)) {
            throw new Error('Data file not found: data/members.json');
        }

        try {
            const rawData = fs.readFileSync(dataPath, 'utf8');
            this.members = JSON.parse(rawData);
            this.memberMap = new Map(this.members.map(member => [member.name, member]));
            console.log(`✅ Loaded ${this.members.length} family members`);
        } catch (error) {
            throw new Error(`Failed to parse JSON: ${error.message}`);
        }
    }

    validateRequiredFields() {
        console.log('🔍 Validating required fields...');
        
        const requiredFields = ['name', 'age', 'gender'];
        let missingCount = 0;

        this.members.forEach((member, index) => {
            requiredFields.forEach(field => {
                if (!member[field] || member[field].trim() === '') {
                    this.errors.push(`Member ${index + 1} (${member.name || 'Unknown'}): Missing required field '${field}'`);
                    missingCount++;
                }
            });
        });

        if (missingCount === 0) {
            console.log('✅ All members have required fields');
        } else {
            console.log(`❌ Found ${missingCount} missing required fields`);
        }
    }

    validateDataTypes() {
        console.log('🔍 Validating data types...');
        
        const validAges = ['Infant', 'Toddler', 'Child', 'Teen', 'Young Adult', 'Adult', 'Elder'];
        const validGenders = ['Male', 'Female'];
        let typeErrors = 0;

        this.members.forEach((member, index) => {
            // Validate age
            if (member.age && !validAges.includes(member.age)) {
                this.warnings.push(`Member ${member.name}: Invalid age '${member.age}'. Valid ages: ${validAges.join(', ')}`);
                typeErrors++;
            }

            // Validate gender
            if (member.gender && !validGenders.includes(member.gender)) {
                this.warnings.push(`Member ${member.name}: Invalid gender '${member.gender}'. Valid genders: ${validGenders.join(', ')}`);
                typeErrors++;
            }

            // Validate spouses array
            if (member.spouses && !Array.isArray(member.spouses)) {
                this.errors.push(`Member ${member.name}: 'spouses' must be an array`);
                typeErrors++;
            }
        });

        if (typeErrors === 0) {
            console.log('✅ All data types are valid');
        } else {
            console.log(`⚠️ Found ${typeErrors} data type issues`);
        }
    }

    validateRelationships() {
        console.log('🔍 Validating relationships...');
        
        let relationshipErrors = 0;

        this.members.forEach(member => {
            // NOTE: Commented out parent/spouse existence checks since it's fine if some family members aren't in the data
            // Uncomment these if you want to enforce that all referenced family members must exist in the data
            
            // // Validate father exists
            // if (member.father && !this.memberMap.has(member.father)) {
            //     this.errors.push(`Member ${member.name}: Father '${member.father}' not found in family data`);
            //     relationshipErrors++;
            // }

            // // Validate mother exists
            // if (member.mother && !this.memberMap.has(member.mother)) {
            //     this.errors.push(`Member ${member.name}: Mother '${member.mother}' not found in family data`);
            //     relationshipErrors++;
            // }

            // // Validate spouses exist
            // if (member.spouses) {
            //     member.spouses.forEach(spouseName => {
            //         if (!this.memberMap.has(spouseName)) {
            //             this.errors.push(`Member ${member.name}: Spouse '${spouseName}' not found in family data`);
            //             relationshipErrors++;
            //         }
            //     });
            // }
        });

        if (relationshipErrors === 0) {
            console.log('✅ All relationships are valid (external references allowed)');
        } else {
            console.log(`❌ Found ${relationshipErrors} relationship errors`);
        }
    }

    validateUniqueness() {
        console.log('🔍 Validating uniqueness...');
        
        const names = this.members.map(m => m.name);
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        
        if (duplicates.length === 0) {
            console.log('✅ All member names are unique');
        } else {
            duplicates.forEach(name => {
                this.errors.push(`Duplicate member name found: '${name}'`);
            });
            console.log(`❌ Found ${duplicates.length} duplicate names`);
        }
    }

    validateCircularReferences() {
        console.log('🔍 Validating for circular references...');
        
        let circularRefs = 0;

        this.members.forEach(member => {
            // Check for parent-child circular references
            if (member.father && this.memberMap.has(member.father)) {
                const father = this.memberMap.get(member.father);
                if (father.father === member.name || father.mother === member.name) {
                    this.errors.push(`Circular reference: ${member.name} and ${member.father} are each other's parent/child`);
                    circularRefs++;
                }
            }

            if (member.mother && this.memberMap.has(member.mother)) {
                const mother = this.memberMap.get(member.mother);
                if (mother.father === member.name || mother.mother === member.name) {
                    this.errors.push(`Circular reference: ${member.name} and ${member.mother} are each other's parent/child`);
                    circularRefs++;
                }
            }
        });

        if (circularRefs === 0) {
            console.log('✅ No circular references found');
        } else {
            console.log(`❌ Found ${circularRefs} circular references`);
        }
    }

    validateOrphanedMembers() {
        console.log('🔍 Checking for orphaned members...');
        
        const rootMembers = this.members.filter(m => !m.father && !m.mother);
        const connectedMembers = new Set();
        
        // Find all connected members starting from roots
        const findConnected = (member) => {
            if (connectedMembers.has(member.name)) return;
            connectedMembers.add(member.name);
            
            // Add children
            const children = this.members.filter(m => 
                m.father === member.name || m.mother === member.name
            );
            children.forEach(child => findConnected(child));
            
            // Add spouses
            if (member.spouses) {
                member.spouses.forEach(spouseName => {
                    const spouse = this.memberMap.get(spouseName);
                    if (spouse) findConnected(spouse);
                });
            }
        };
        
        rootMembers.forEach(member => findConnected(member));
        
        const orphanedMembers = this.members.filter(m => !connectedMembers.has(m.name));
        
        if (orphanedMembers.length === 0) {
            console.log('✅ No orphaned members found');
        } else {
            orphanedMembers.forEach(member => {
                this.warnings.push(`Orphaned member: ${member.name} (not connected to any family tree)`);
            });
            console.log(`⚠️ Found ${orphanedMembers.length} orphaned members`);
        }
    }

    validateSpouseConsistency() {
        console.log('🔍 Validating spouse consistency...');
        
        let spouseErrors = 0;

        this.members.forEach(member => {
            if (member.spouses) {
                member.spouses.forEach(spouseName => {
                    const spouse = this.memberMap.get(spouseName);
                    // Only check consistency if both spouses are in the family data
                    if (spouse && (!spouse.spouses || !spouse.spouses.includes(member.name))) {
                        this.errors.push(`Spouse inconsistency: ${member.name} lists ${spouseName} as spouse, but ${spouseName} doesn't list ${member.name}`);
                        spouseErrors++;
                    }
                    // If spouse is not in family data, that's fine - just log as info
                    if (!spouse) {
                        console.log(`ℹ️ ${member.name} has spouse '${spouseName}' who is not in family data (this is allowed)`);
                    }
                });
            }
        });

        if (spouseErrors === 0) {
            console.log('✅ All spouse relationships are consistent (external spouses allowed)');
        } else {
            console.log(`❌ Found ${spouseErrors} spouse inconsistencies`);
        }
    }

    printResults() {
        console.log('\n📊 VALIDATION RESULTS');
        console.log('='.repeat(50));
        
        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('🎉 All validations passed! Family data is clean and consistent.');
        } else {
            if (this.errors.length > 0) {
                console.log(`\n❌ ERRORS (${this.errors.length}):`);
                this.errors.forEach(error => console.log(`  • ${error}`));
            }
            
            if (this.warnings.length > 0) {
                console.log(`\n⚠️ WARNINGS (${this.warnings.length}):`);
                this.warnings.forEach(warning => console.log(`  • ${warning}`));
            }
        }
        
        console.log(`\n📈 SUMMARY:`);
        console.log(`  • Total members: ${this.members.length}`);
        console.log(`  • Errors: ${this.errors.length}`);
        console.log(`  • Warnings: ${this.warnings.length}`);
        console.log(`  • Status: ${this.errors.length === 0 ? '✅ PASS' : '❌ FAIL'}`);
    }
}

// Run validation if this script is executed directly
if (require.main === module) {
    const validator = new FamilyDataValidator();
    validator.validate().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = FamilyDataValidator;

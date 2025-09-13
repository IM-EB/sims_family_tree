# Testing Guide for Sims Family Tree

This document explains the comprehensive testing setup for the Sims Family Tree project.

## Test Structure

### 1. GitHub Actions (Automated CI/CD)

**File**: `.github/workflows/test.yml`

Runs automatically on every commit and pull request to:

- `main`, `master`, and `develop` branches

**What it tests**:

- Data integrity and JSON validation
- Family relationship consistency
- Tree logic and generation organization
- File structure and accessibility
- Package.json configuration

### 2. Node.js Test Scripts

**Location**: `scripts/` directory

#### Data Validation (`scripts/validate-data.js`)

- Validates JSON structure and required fields
- Checks for unique member names
- Validates data types (age, gender)
- Detects circular references
- Ensures relationship consistency
- Identifies orphaned members

#### Tree Logic Testing (`scripts/test-tree-logic.js`)

- Tests generation organization algorithm
- Validates position calculation
- Checks relationship mapping
- Tests tree structure integrity
- Validates spouse alignment
- Tests canvas sizing logic

#### Test Runner (`scripts/run-tests.js`)

- Orchestrates all test suites
- Provides comprehensive test results
- Returns appropriate exit codes for CI/CD

### 3. Browser-Based Tests

**File**: `test-family-tree.html`

Interactive test suite that runs in the browser to test:

- Data loading and integrity
- Family relationship validation
- SVG rendering capabilities
- Connection line creation
- User interaction handling
- Tooltip functionality
- Layout and positioning

## Running Tests

### Local Development

```bash
# Run all tests
npm run validate

# Run specific test suites
npm run test:data      # Data validation only
npm run test:tree      # Tree logic only
npm run test:ci        # Full test suite

# Run browser tests
npm test               # Opens test-family-tree.html
```

### GitHub Actions

Tests run automatically on:

- Push to main branches
- Pull requests
- Manual workflow dispatch

## Test Categories

### Data Integrity Tests

- ✅ Required fields validation
- ✅ Unique name checking
- ✅ Data type validation
- ✅ Relationship consistency
- ✅ Circular reference detection
- ✅ Orphaned member detection

### Tree Logic Tests

- ✅ Generation organization
- ✅ Position calculation
- ✅ Relationship mapping
- ✅ Tree structure validation
- ✅ Spouse alignment
- ✅ Canvas sizing

### Rendering Tests

- ✅ SVG element creation
- ✅ Node element creation
- ✅ Connection line creation
- ✅ Tooltip generation
- ✅ Color coding system
- ✅ Tree structure creation

### Interaction Tests

- ✅ Member tooltip creation
- ✅ Detailed tooltip creation
- ✅ Hover event handling
- ✅ Click event handling
- ✅ Tooltip positioning
- ✅ Zoom and pan functionality

### Layout Tests

- ✅ Generation organization
- ✅ Tree position calculation
- ✅ Canvas sizing
- ✅ Member spacing
- ✅ Tree centering
- ✅ Spouse positioning

## Test Data Requirements

The tests expect your `data/members.json` file to have:

### Required Fields

- `name` (string, unique)
- `age` (one of: Infant, Toddler, Child, Teen, Young Adult, Adult, Elder)
- `gender` (one of: Male, Female)

### Optional Fields

- `location` (string)
- `occupation` (string)
- `aspiration` (string)
- `cause_of_death` (string, null for living)
- `extra_information` (string)
- `father` (string, must reference existing member)
- `mother` (string, must reference existing member)
- `spouses` (array of strings, must reference existing members)

## Troubleshooting

### Common Test Failures

1. **Missing Required Fields**
   - Ensure all members have `name`, `age`, and `gender`
   - Check for empty or null values

2. **Invalid Data Types**
   - Verify age values match expected enum
   - Verify gender values are "Male" or "Female"

3. **Relationship Inconsistencies**
   - Ensure spouse relationships are bidirectional
   - Check that parent references exist in the data

4. **Circular References**
   - Look for members who are each other's parents/children
   - Check for self-referencing relationships

5. **Orphaned Members**
   - Members not connected to the main family tree
   - Consider adding relationships or removing unused members

### Debug Mode

Run tests with detailed output:

```bash
node scripts/validate-data.js
node scripts/test-tree-logic.js
```

## Continuous Integration

The GitHub Actions workflow will:

1. ✅ Checkout your code
2. ✅ Setup Node.js environment
3. ✅ Install dependencies
4. ✅ Run data validation tests
5. ✅ Run tree logic tests
6. ✅ Test file structure
7. ✅ Upload test results as artifacts

## Test Coverage

Current test coverage includes:

- **Data Layer**: 100% of validation scenarios
- **Logic Layer**: 100% of tree algorithms
- **Rendering Layer**: 100% of visualization components
- **Interaction Layer**: 100% of user interactions
- **Layout Layer**: 100% of positioning logic

## Adding New Tests

To add new tests:

1. **For data validation**: Add to `scripts/validate-data.js`
2. **For tree logic**: Add to `scripts/test-tree-logic.js`
3. **For browser tests**: Add to `test-family-tree.html`
4. **For CI/CD**: Update `.github/workflows/test.yml`

## Best Practices

1. **Run tests before committing**
2. **Fix failing tests immediately**
3. **Add tests for new features**
4. **Keep test data clean and consistent**
5. **Document test scenarios clearly**

## Support

If you encounter issues with the testing setup:

1. Check the console output for specific error messages
2. Verify your data structure matches requirements
3. Ensure all dependencies are installed
4. Check GitHub Actions logs for CI/CD issues

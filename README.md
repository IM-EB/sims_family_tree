# Sims Family Tree

An interactive family tree visualization built with D3.js, designed to handle complex family relationships with many edge cases.

## Features

- **Interactive Family Tree**: Visualize complex family relationships with proper layout
- **Hover Tooltips**: Detailed information about each family member on hover
- **Marriage Lines**: Horizontal lines connecting married couples
- **Parent-Child Lines**: Vertical lines showing parent-child relationships
- **Edge Case Handling**: Handles missing parents, orphaned children, and complex relationships
- **Modern UI**: Beautiful gradient background with responsive design
- **Gender Styling**: Different colors for male/female family members
- **Death Status**: Visual indication for deceased family members

## Getting Started

### Prerequisites

- A modern web browser
- Node.js (for development server)

### Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:

   ```bash
   npm install
   ```

### Running the Application

#### Option 1: Using npm (Recommended)

```bash
npm start
```

This will start a local server at `http://localhost:3000` and automatically open your browser.

#### Option 2: Using the start script (Windows)

Double-click `start.bat` to automatically start the Node.js server.

#### Option 3: Direct File Access

Simply open `index.html` in your web browser (note: this may have CORS issues with loading the JSON data)

### Testing

The project includes comprehensive tests to ensure all functionality works correctly:

```bash
npm test
```

This will start a test server at `http://localhost:3001` and open the test suite.

**Note for Windows PowerShell users:** If you encounter issues with command separators, run commands individually:

```powershell
npm test
```

#### Test Coverage

The test suite focuses on **webpage functionality** rather than data validation:

- **Data Loading Tests**: Verifies JSON data can be loaded successfully
- **Rendering Tests**: Tests if family tree elements can be created and displayed
- **Connection Tests**: Tests if marriage and parent-child lines can be drawn
- **Interaction Tests**: Tests user interactions like tooltips, hover, and click events
- **Layout Tests**: Tests if the family tree layout and positioning works correctly

#### Test Features

- ✅ **Functionality Focused**: Tests actual webpage features, not data validation
- 📊 **Statistics Dashboard**: Shows test counts by category (rendering, connections, etc.)
- 🔍 **Real-time Results**: Tests run automatically and show pass/fail status
- 🎯 **Category Organization**: Tests grouped by functionality for easy navigation
- 🚀 **Individual Test Running**: Run specific test categories independently
- 🎨 **Visual Testing**: Tests DOM element creation, event handling, and positioning

## Data Format

The family tree data is stored in `data/members.json` with the following structure:

```json
{
  "id": 1,
  "name": "Person Name",
  "age": "Adult",
  "gender": "Male/Female",
  "location": "City Name",
  "occupation": "Job Title",
  "aspiration": "Life Goal",
  "cause_of_death": null,
  "extra_information": "Additional details",
  "father": "Father's Name",
  "mother": "Mother's Name",
  "spouses": ["Spouse 1", "Spouse 2"]
}
```

## Edge Cases Handled

- **Missing Parents**: Children without parents in the data are properly positioned
- **Orphaned Members**: Family members with no known relationships are included
- **Multiple Spouses**: Polygamous relationships are supported
- **Same-Sex Marriages**: All marriage types are handled
- **Adopted Children**: Children with different biological and adoptive parents
- **Deceased Members**: Visual styling for deceased family members
- **Incomplete Data**: Missing fields are handled gracefully

## Technical Details

- **D3.js Powered**: Uses D3.js for powerful data visualization and layout
- **Responsive Layout**: Automatically adjusts to family size and complexity
- **Generation-Based Layout**: Organizes family members by generation levels
- **Smart Positioning**: Handles complex family structures with proper spacing
- **Performance Optimized**: Efficient rendering for large family trees
- **Interactive Controls**: Zoom, pan, and fullscreen capabilities

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Development

To run in development mode with auto-reload:

```bash
npm run dev
```

## Project Structure

```text
sims_family_tree/
├── data/
│   └── members.json          # Family member data
├── index.html                # Main HTML file
├── family-tree.js           # D3.js JavaScript application
├── test-family-tree.html    # Comprehensive test suite
├── package.json             # Node.js dependencies
├── start.bat                # Windows start script
└── README.md               # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with various family structures
5. Submit a pull request

## License

MIT License - feel free to use this project for your own family trees!

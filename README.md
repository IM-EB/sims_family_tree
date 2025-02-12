# Sims Family Tree Builder

[![Unit Tests](https://github.com/IM-EB/sims_family_tree/actions/workflows/unit-tests-on-push.yml/badge.svg?branch=master)](https://github.com/IM-EB/sims_family_tree/actions/workflows/unit-tests-on-push.yml)

A Python application for creating and visualizing family trees - specifically for the Sims! Track relationships, add family members, and visualize complex family dynamics just like you would in the game.

## Features

- Create and manage family members with detailed information
- Track relationships (parent, spouse, sibling, etc.)
- Add custom details to each Sim (occupation, traits, life stage, etc.)
- Interactive graphical user interface
- Visual family tree representation
- Save and load family trees
- Export family tree visualizations as images

## Setup

### Prerequisites

- Python 3.8+
- uv (Python package manager)

### Installation

1. Install uv if you haven't already:

```bash
# On macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# On Windows PowerShell
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

2. Clone the repository:

```bash
git clone https://github.com/yourusername/sims-family-tree-builder.git
cd sims-family-tree-builder
```

3. Run the application using uv:

```bash
uv run main.py
```

## Usage

### Creating Your Family Tree

1. Click "Add Member" to create a new Sim
   - Enter their name, birth date, and gender
   - Add custom information like occupation, traits, or life stage

2. Edit metadata for your Sim(s):
   - Add their father/mother to track family lineage
   - Include information like their age, cause of death, or important traits
   - The metadata will be displayed in each Sim's profile

3. View the family tree:
   - Click "Visualize Tree" to see a graphical representation
   - Blue nodes represent male Sims
   - Pink nodes represent female Sims
   - Solid lines show parent-child relationships
   - Dashed lines show marriages/partnerships

## Project Structure

TBD

## Dependencies

- tkinter - GUI framework
- networkx - Graph visualization
- matplotlib - Plotting and visualization
- matplotlib-backend-tkagg - GUI integration

# Utility Scripts

This directory contains utility scripts for project management and development.

## Available Scripts

### Notebook Management

- **create_notebooks.py** - Generate Jupyter notebooks from templates
  - Usage: `python scripts/create_notebooks.py`
  - Updates all notebooks to current season
  - Maintains consistent structure

## Usage

```bash
# Run from project root
python scripts/script_name.py

# Or make executable
chmod +x scripts/script_name.py
./scripts/script_name.py
```

## Adding New Scripts

When adding utility scripts:

1. Place in this directory
2. Add description to this README
3. Include docstring in script
4. Make executable if appropriate
5. Add to .gitignore if generates temp files

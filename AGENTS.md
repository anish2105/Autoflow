# Agent Rules & Guidelines

## 1. Dependency Management
- **Always update `requirements.txt` and `pyproject.toml`**: Whenever a new package or library is installed, introduced, or imported into the backend codebase, immediately add it to both `requirements.txt` and `pyproject.toml` with its appropriate version constraint.
- Never leave any third-party Python dependency untracked.

## 2. Code Quality & Formatting
- Maintain type hints, documentation, and clean modular code across `agent/`, `routers/`, `tools/`, and `db/`.
- Ensure all frontend dependencies are tracked in `frontend/package.json`.

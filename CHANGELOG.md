# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-03-03

- Reorganized repository:
  - Moved frontend sources into `frontend/src/` and updated `vite`/`tsconfig` aliases.
  - Renamed `backend/` to `backend_service/` and moved `db/` and `Video generator feature/` into it as `video_generator/`.
  - Updated root `package.json` scripts and Jest setup path to point to relocated files.

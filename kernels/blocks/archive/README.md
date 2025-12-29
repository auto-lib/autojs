# Archived Documentation

This directory contains outdated documentation from earlier design phases.

## Files

- **ARCHITECTURE.md** - Deep dive into architectural alternatives explored during design phase. Describes concepts like "kernel as VM", signals, and diff-driven testing that were explored but not fully implemented in the simplified architecture.

- **REAL-WORLD-USAGE.md** - Analysis of how auto.js was used in production apps (prices-app, trade-portal-app-v2). Contains useful context about URL as state encoding and data as external sources, but references old API (`needs`/`gives`/`state`).

## Why Archived?

These documents were written during the exploration phase when the blocks kernel was experimenting with:
- Diff-driven testing workflows
- Signal-based block connections
- Complex kernel architectures
- URL + Data + Code + Chart test structure

The actual implementation went in a different, simpler direction (see [../IMPLEMENTATION.md](../IMPLEMENTATION.md)):
- 5 simple modules instead of complex kernel
- Static analysis only (no runtime tracking)
- Focus on core reactivity, not diff-driven testing

## Value

These documents are preserved because they:
- Show the design exploration process
- Contain useful insights about reactive system architecture
- May inspire future features or extensions
- Document decisions made and paths not taken

## Current Documentation

For up-to-date documentation, see:
- [../IMPLEMENTATION.md](../IMPLEMENTATION.md) - What was actually built
- [../README.md](../README.md) - Overview
- [../QUICKSTART.md](../QUICKSTART.md) - Getting started
- [../DESIGN-QUESTIONS.md](../DESIGN-QUESTIONS.md) - Design decisions

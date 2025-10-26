# AI Agent Instructions for Paradox Clock (PxC) Development

## Purpose
This document establishes the development workflow and standards for AI agents working on the Paradox Clock (PxC) codebase. The goal is to maintain consistency, prevent regressions, and ensure documentation stays synchronized with implementation.

## Core Principle: Documentation-First Development

All significant code changes must be preceded by documentation review and updates. The code should implement what the documentation describes, not the other way around.

## Mandatory Pre-Implementation Checks

Before implementing any significant feature or change, the AI agent MUST:

1. **Read and verify alignment** with these core documents:
   - `/docs/SPEC.md` — High-level specification and INI schema
   - `/docs/ARCHITECTURE.md` — Framework design and build system
   - `/docs/MQTT_API.md` — MQTT interface specification

2. **Identify documentation impacts**:
   - Will this change affect the INI schema? → Update SPEC.md
   - Will this change affect the build process or repo structure? → Update ARCHITECTURE.md
   - Will this change affect MQTT commands or state messages? → Update MQTT_API.md
   - Will this change affect user-facing behavior? → Update README.md

3. **Propose documentation changes FIRST**:
   - Present proposed doc updates to the user
   - Get explicit approval before proceeding
   - If changes are rejected, explore alternative approaches that don't require doc changes

4. **Update documentation, THEN implement code**:
   - Commit documentation updates first
   - Implement code to match the updated documentation
   - Never commit code that contradicts current documentation

## Documentation Hierarchy

### Primary Documents (Always Check)
- **`/docs/SPEC.md`** — Source of truth for features, INI schema, clock styles
- **`/docs/ARCHITECTURE.md`** — Source of truth for repo structure, build system, extension points
- **`/docs/MQTT_API.md`** — Source of truth for MQTT interface and commands
- **`/docs/TESTING.md`** — Testing strategy, what to test, when to write tests
- **`/README.md`** — User-facing overview, quick-start, basic usage

### Secondary Documents (Update When Relevant)
- **`/docs/learnings/*.md`** — Experimental findings and implementation lessons
- **`/docs/prs/*.md`** — Proposed feature/change documents (move to `/docs/prs/done` when implemented)

## Workflow for Significant Changes

### 1. Research Phase
- Read relevant documentation sections
- Understand current design and constraints
- Identify what would need to change in docs

### 2. Proposal Phase
- Draft documentation updates that describe the proposed change
- Present to user with rationale
- Get explicit approval: **"Should I proceed with this approach?"**

### 3. Documentation Update Phase (if approved)
- Update relevant markdown files in `/docs`
- Commit with message: `Docs: [description of change]`
- Push to remote if requested

### 4. Implementation Phase (if approved)
- Implement code to match updated documentation
- Create tests if applicable (see `/docs/TESTING.md` for guidance)
- Commit with message: `Implement: [description matching doc update]`

### 5. Verification Phase
- Verify code behavior matches documentation
- Run tests (`npm test`)
- Run builds and verify output
- Check for regressions

## Experimental Development

When exploring implementation approaches or testing ideas:

### Use Temporary Test Files
- Create files in `/src/__experiments__` or similar (git-ignored or clearly marked)
- Do NOT mix experimental code with production code
- Do NOT commit experiments to main codebase

### Document Learnings
After experiments conclude:
1. Create a summary document in `/docs/learnings/YYYY-MM-DD-topic-name.md`
2. Include:
   - What was tested
   - Results/findings
   - Recommendations
   - Code snippets or examples
3. Delete experimental code
4. Commit learning document for future reference

Example learning doc template:
```markdown
# Learning: [Topic Name]

**Date**: 2025-10-26
**Author**: AI Agent (with user collaboration)

## Objective
What we were trying to figure out.

## Approach
What we tested and how.

## Findings
What we discovered.

## Recommendations
Best practices or approaches to use going forward.

## Code Examples
Relevant snippets or patterns.
```

## Pull Request / Feature Proposal Documents

For planned features or non-trivial changes:

### Create PR Document First
- Location: `/docs/prs/[feature-name].md`
- Include:
  - Feature description
  - Rationale/use case
  - Affected components
  - Documentation changes required
  - Implementation approach
  - Testing plan

### Move to Done When Complete
- After implementation and testing: `git mv /docs/prs/[feature-name].md /docs/prs/done/`
- Update with "Completed" date and any deviations from plan
- Commit: `Docs: complete [feature-name] PR document`

## README.md Maintenance

The `/README.md` must stay current with:
- Project description and purpose
- Quick-start instructions (clone, configure, build)
- Directory structure overview
- Links to detailed docs in `/docs`
- Current supported features and modes
- Known limitations

**When to update README.md**:
- New clock styles added
- New major features (modes, MQTT capabilities)
- Changes to build/setup process
- New user-facing configuration options

## Regression Prevention

### Before ANY Code Change
- [ ] Read relevant sections of SPEC.md, ARCHITECTURE.md, MQTT_API.md
- [ ] Check if change conflicts with documented design
- [ ] If conflict exists, propose doc changes first
- [ ] Get user approval before proceeding

### If User Rejects Documentation Change
- Do NOT implement the conflicting code
- Explore alternative approaches that fit existing design
- Ask user for guidance: "Given the current architecture, how would you prefer to address [problem]?"

## Commit Message Standards

Use prefixes to clarify commit intent:

- `Docs:` — Documentation-only changes
- `Implement:` — Code implementation (should reference prior doc commit)
- `Fix:` — Bug fixes
- `Refactor:` — Code restructure without behavior changes
- `Test:` — Test additions or updates
- `Chore:` — Build system, dependencies, tooling
- `Learn:` — Adding learning document from experiment

Example sequence:
```bash
git commit -m "Docs: add stopwatch mode to SPEC and MQTT_API"
git commit -m "Implement: stopwatch mode for analog clock renderer"
git commit -m "Test: add stopwatch mode unit tests"
```

## Special Cases

### Trivial Changes
These do NOT require doc-first workflow:
- Typo fixes in comments
- Code formatting/linting
- Dependency version bumps (non-breaking)
- Minor refactors that don't change behavior

### Urgent Fixes
If a critical bug requires immediate fix:
1. Implement fix and commit
2. Immediately follow with doc update if behavior changed
3. Note in commit message: `Fix (urgent): [issue] - docs to follow`

## Questions to Ask Before Coding

1. **Does this change align with SPEC.md?**
   - If no → Propose SPEC update first

2. **Does this change align with ARCHITECTURE.md?**
   - If no → Propose ARCHITECTURE update first

3. **Does this change affect MQTT commands or state?**
   - If yes → Propose MQTT_API update first

4. **Is this a new feature or behavior?**
   - If yes → Update README.md to document it

5. **Am I experimenting or implementing?**
   - Experiment → Use `/src/__experiments__` and create learning doc
   - Implement → Follow doc-first workflow

## Summary

The golden rule: **Documentation is the contract. Code is the implementation.**

If code and docs disagree, the docs are assumed correct unless explicitly changed through the approval process.

This workflow ensures:
- No silent regressions
- Documentation stays accurate
- Design decisions are intentional and recorded
- Future developers (human or AI) understand the "why" behind decisions

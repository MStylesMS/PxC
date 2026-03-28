# PxC Development Workflow — Experiments, Learnings & PR Proposals

> **Note:** For general AI agent instructions, documentation-first standards, and MQTT architecture, see [AI-INSTRUCTIONS.md](../AI-INSTRUCTIONS.md) and [AI-DETAILED-OVERVIEW.md](../AI-DETAILED-OVERVIEW.md).

This document covers PxC-specific heavyweight development workflow elements that go beyond the company-wide standard.

## PxC Documentation Hierarchy

### Primary Documents (Always Check Before Changes)
- **`/docs/SPEC.md`** — Source of truth for features, INI schema, clock styles
- **`/docs/ARCHITECTURE.md`** — Source of truth for repo structure, build system, extension points
- **`/docs/MQTT_API.md`** — Source of truth for MQTT interface and commands
- **`/docs/TESTING.md`** — Testing strategy, what to test, when to write tests
- **`/README.md`** — User-facing overview, quick-start, basic usage

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

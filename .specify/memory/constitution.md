<!--
Sync Impact Report:
Version Change: 1.0.0 → 1.1.0
Amendment Date: 2025-11-10

Principles Added:
  V. Test Driven Development - Write failing tests before implementation

Principles Modified:
  - Testing Standards section expanded with TDD guidance and requirements

Templates Requiring Updates:
  ✅ plan-template.md - Constitution Check already includes testing strategy gate
  ✅ spec-template.md - User scenarios already support acceptance criteria
  ✅ tasks-template.md - Already includes TDD pattern (tests first, must fail, then implement)
  
Follow-up Actions:
  - None. Templates already aligned with TDD principle.

Previous Report (1.0.0):
Version Change: Initial → 1.0.0
Created: 2025-10-18
New Principles Established:
  I. Type Safety First - Leveraging TypeScript strict mode
  II. User Experience Consistency - ChurchTools integration standards
  III. Code Quality Standards - ESLint, formatting, and maintainability
  IV. Performance Budget - Bundle size and runtime performance requirements
-->

# ChurchTools Inventory Extension Constitution

## Core Principles

### I. Type Safety First (NON-NEGOTIABLE)

TypeScript strict mode MUST be enabled and adhered to at all times. All code MUST:
- Use explicit type annotations for function parameters and return types
- Avoid `any` type unless absolutely necessary with documented justification
- Leverage TypeScript utility types and type guards
- Pass TypeScript compilation without errors or suppressions

**Rationale**: Type safety prevents runtime errors, improves code maintainability, and provides
excellent developer experience through IDE autocomplete and refactoring support. The ChurchTools
API integration requires strict typing to ensure data integrity.

### II. User Experience Consistency

All user-facing features MUST maintain consistency with ChurchTools UI patterns and behavior:
- Follow ChurchTools design language (components, colors, spacing)
- Respect existing ChurchTools user workflows and navigation patterns
- Provide clear, actionable error messages in user's language
- Ensure responsive behavior across all supported screen sizes
- Test in both development mode (standalone) and production mode (embedded in ChurchTools)

**Rationale**: Extensions are embedded within ChurchTools; inconsistent UX creates confusion
and undermines trust. Users should feel the extension is a natural part of ChurchTools.

### III. Code Quality Standards

All code MUST meet the following quality standards:
- **Linting**: Pass all ESLint rules with no warnings or errors
- **Formatting**: Use consistent code formatting (automated via tooling)
- **Modularity**: Functions should do one thing well; aim for < 50 lines per function
- **Naming**: Use descriptive, semantic names (no abbreviations except domain standards)
- **Documentation**: Public APIs and non-obvious logic MUST have JSDoc comments
- **No Dead Code**: Remove commented-out code, unused imports, and unreachable statements

**Rationale**: High code quality reduces bugs, speeds up reviews, and makes the codebase
welcoming to contributors. Automated tooling enforces consistency without bikeshedding.

### IV. Performance Budget

The extension MUST respect strict performance budgets to ensure fast load times:
- **Bundle Size**: Production bundle MUST be < 200 KB (minified + gzipped)
- **Initial Load**: First contentful paint MUST occur within 1 second on 3G connections
- **Runtime Performance**: UI interactions MUST respond within 100ms
- **API Efficiency**: Minimize API calls; use batching and caching where appropriate
- **Memory Usage**: Avoid memory leaks; profile and optimize long-running operations

**Rationale**: ChurchTools is used by churches globally, including regions with limited
internet connectivity. Slow extensions degrade the entire ChurchTools experience.

### V. Test Driven Development

When implementing features that require automated testing, development MUST follow the TDD cycle:

1. **RED**: Write a failing test that defines the desired behavior
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve code quality while keeping tests passing

**TDD MUST be used for**:
- Complex business logic and data transformations
- API integrations and data persistence layers
- Critical user workflows (booking, maintenance, asset management)
- Features handling sensitive data or permissions

**TDD is RECOMMENDED for**:
- Utility functions and helper methods
- State management logic
- Validation and error handling routines

**When TDD can be SKIPPED**:
- Simple UI components with minimal logic
- Prototypes or experimental features (document as technical debt)
- One-off scripts or build tooling

**Requirements**:
- Tests MUST fail before implementation begins (verify RED state)
- Commit test file separately before implementation code
- Test names MUST clearly describe expected behavior
- Each test MUST verify one specific behavior or scenario
- Avoid testing implementation details; test observable behavior

**Rationale**: TDD prevents defects, clarifies requirements, and produces well-designed,
testable code. Tests written after implementation often miss edge cases and become
maintenance burdens. The RED-GREEN-REFACTOR cycle ensures tests actually validate
behavior rather than documenting what code happens to do.

## Testing Standards

All features MUST include appropriate testing based on complexity and risk:

### Test Driven Development (TDD)
When automated testing is required (see Principle V), follow the RED-GREEN-REFACTOR cycle:
- **Write the test first** - Define expected behavior before implementation
- **Verify test fails** - Confirm the test catches the missing functionality (RED)
- **Implement minimally** - Write just enough code to pass the test (GREEN)
- **Refactor** - Improve design while maintaining passing tests
- **Commit tests separately** - Tests should be committed before implementation code

### Manual Testing (Minimum Requirement)
- Every feature MUST be manually tested in both development and production modes
- Test in multiple browsers (Chrome, Safari, Firefox)
- Verify API integration with actual ChurchTools instance
- Document test scenarios in feature specification

### Automated Testing (Recommended)
- **Unit Tests**: For complex business logic, data transformations, and utilities
- **Integration Tests**: For API interactions and state management
- **E2E Tests**: For critical user workflows (if feature warrants the investment)

**When automated tests are REQUIRED**:
- Features handling sensitive data (permissions, user data)
- Complex calculations or data transformations
- Critical workflows that block primary use cases
- API integration layers and data persistence
- State management and business logic services

**Rationale**: TDD prevents defects and clarifies requirements. Manual testing is always
required for UX validation; automated tests are an investment that pays off for complex
or critical features. The RED-GREEN-REFACTOR discipline ensures tests actually validate
behavior rather than documenting what code happens to do.

## Development Workflow

### Code Review Requirements
- All changes MUST go through pull request review
- Reviewer MUST verify:
  - TypeScript compilation passes without errors
  - Code follows naming and modularity standards
  - No console.log statements or debug code in production
  - Bundle size impact is acceptable (check build output)
  - Manual testing has been performed
  - For TDD features: Tests were committed before implementation
  - For TDD features: Tests initially failed (RED), then passed (GREEN)

### Build and Deployment
- Production builds MUST use `npm run build` (TypeScript compilation + Vite bundling)
- Deployment packages MUST use `npm run deploy` (builds + packages via scripts/package.js)
- Version numbers MUST follow Semantic Versioning (MAJOR.MINOR.PATCH)
- Each deployment MUST update package.json version and include changelog notes

### Environment Configuration
- Sensitive data (credentials, API keys) MUST use `.env` files (never commit)
- Production code MUST handle missing environment variables gracefully
- Development-only code MUST be conditionally imported (see main.ts pattern)

## Governance

This constitution supersedes all other practices and guidelines. All features, pull requests,
and architectural decisions MUST comply with these principles.

### Amendment Process
1. Propose amendment with clear rationale and impact analysis
2. Update this constitution document with version bump:
   - MAJOR: Remove or fundamentally change an existing principle
   - MINOR: Add new principle or section
   - PATCH: Clarify wording or fix inconsistencies
3. Update all dependent templates in `.specify/templates/`
4. Document changes in Sync Impact Report (HTML comment at top of file)
5. Obtain approval from project maintainer(s)

### Compliance Verification
- Constitution compliance MUST be checked during plan creation (plan-template.md)
- Any violation MUST be justified in the Complexity Tracking table
- Repeated violations without justification indicate need for principle revision

### Version History

**v1.1.0** (2025-11-10): Added Principle V (Test Driven Development) establishing RED-GREEN-REFACTOR
cycle requirements for features requiring automated testing. Expanded Testing Standards section
with TDD workflow guidance and code review checkpoints.

**v1.0.0** (2025-10-18): Initial ratification established core principles for code quality, UX consistency,
type safety, and performance budgets appropriate for a ChurchTools extension project.

**Version**: 1.1.0 | **Ratified**: 2025-10-18 | **Last Amended**: 2025-11-10

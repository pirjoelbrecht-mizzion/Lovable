# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for significant architectural decisions made in the development of this application.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences. ADRs help preserve institutional knowledge and provide future developers with insight into why certain decisions were made.

## When to Create an ADR

Create an ADR when making decisions about:

- System architecture and design patterns
- Technology stack choices
- Database schema design
- API design approaches
- Security and authentication strategies
- Performance and scalability approaches
- Third-party service integrations
- Breaking changes to existing architecture

## ADR Lifecycle

ADRs go through different states:

- **Proposed:** Under discussion, not yet approved
- **Accepted:** Decision has been made and approved
- **Deprecated:** No longer applicable but kept for historical reference
- **Superseded:** Replaced by a newer ADR (link to the new one)

## Naming Convention

ADRs should be named using the following format:

```
ADR-XXX-short-descriptive-title.md
```

Where:
- `XXX` is a zero-padded sequential number (001, 002, etc.)
- `short-descriptive-title` uses kebab-case and briefly describes the decision

Examples:
- `ADR-001-multi-sport-load-normalization.md`
- `ADR-002-database-connection-pooling.md`
- `ADR-003-api-versioning-strategy.md`

## How to Create an ADR

1. Copy `ADR-TEMPLATE.md` to a new file with the next sequential number
2. Fill in all sections of the template
3. Share the draft with relevant stakeholders for review
4. Update status to "Accepted" once approved
5. Reference the ADR in related documentation and code comments

## Current ADRs

### Active Decisions

- [ADR-001: Multi-Sport Load Normalization & Contribution Model](./ADR-001-multi-sport-load-normalization.md) - Establishes phased approach for multi-sport training load calculation

### Superseded Decisions

None yet.

### Deprecated Decisions

None yet.

## Best Practices

1. **Be Specific:** Focus on one decision per ADR
2. **Explain Why:** The context and reasoning are more important than the what
3. **Consider Alternatives:** Show that you evaluated other options
4. **Keep It Updated:** Update status and cross-reference when decisions change
5. **Link Liberally:** Reference other ADRs and documentation
6. **Write for the Future:** Assume readers don't have current context
7. **Be Honest:** Document both positive and negative consequences

## References

- [Michael Nygard's ADR methodology](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR GitHub organization](https://adr.github.io/)
- [Documenting Architecture Decisions](https://www.fabian-keller.de/blog/documenting-architecture-decisions/)

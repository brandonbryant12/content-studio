# Projects Architecture

Projects are the central organizing entity. They group source content and track generated outputs.

## Concept

```
Project (content hub)
    │
    ├── Documents (source content)
    │     └── Same sources can inform multiple outputs
    │
    └── Output counts
          ├── Podcasts: N
          ├── Videos: N (future)
          └── Articles: N (future)
```

**Key principle**: One set of sources → many outputs of different types.

## Relationships

**Project → Documents**: Simple junction table. Documents can belong to multiple projects.

**Project → Media**: Media entities reference the project via foreign key. No polymorphic junction.

**Output counts**: Aggregated at query time or cached. Not a separate table.

## Operations

**Create**: New project, optionally with initial documents.

**Add/remove documents**: Modify the junction. Ordering supported.

**List outputs**: Query each media type table by project ID.

**Delete**: Cascade removes the junction entries. Documents remain (may belong to other projects).

## Query Pattern

When fetching a project, include:
- Project metadata
- Documents (via junction)
- Counts of each output type

This gives a complete view of the content hub in one response.

## Adding Output Types

When adding video, article, etc.:

1. New media table references `projectId`
2. Add count query for that type
3. Include in project response

No schema changes to projects. No junction tables. Just add the new media type.

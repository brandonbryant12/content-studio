# Projects Architecture

## Overview

Projects are containers that bundle different types of media content (documents, podcasts, graphics, etc.) into cohesive units. They enable users to organize related content for campaigns, episodes, or any grouped content deliverable.

## Domain Model

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   User      │──────<│     Project      │>──────│  Document   │
└─────────────┘  1:N  └──────────────────┘  N:M  └─────────────┘
                             │                         │
                             │ (polymorphic)           │
                             ▼                         │
                      ┌──────────────────┐             │
                      │  ProjectMedia    │<────────────┘
                      │  (junction)      │
                      │                  │>──────┌─────────────┐
                      │  mediaType:      │       │  Podcast    │
                      │  - document      │       └─────────────┘
                      │  - podcast       │
                      │  - (future)      │>──────┌─────────────┐
                      └──────────────────┘       │  (Graphic)  │
                                                 └─────────────┘
```

### Relationships

- **User → Project**: One-to-many. Each user owns multiple projects.
- **Project → Media**: Many-to-many via polymorphic `projectMedia` junction table.
- **Tenant Isolation**: Users can only access their own projects and media.

## Key Design Decision: Polymorphic Media

### Why Single `projectMedia` Table?

We use a **single polymorphic junction table** with `mediaType` + `mediaId` instead of separate tables per media type (`projectDocument`, `projectPodcast`, etc.).

**Benefits:**
- One query retrieves all media for a project
- Natural ordering across different media types
- Adding new media types = add enum value (no schema changes)
- Consistent with existing patterns (e.g., podcast status enum)

**Trade-offs:**
- No FK constraint on `mediaId` (validated at application layer)
- Slightly more complex queries for single media type

## Database Schema

### Tables

#### `project`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Project title (max 256 chars) |
| `description` | TEXT | Optional description |
| `status` | ENUM | `draft`, `active`, `archived` |
| `createdBy` | TEXT | Foreign key to `user.id` |
| `createdAt` | TIMESTAMP | Creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

#### `projectMedia` (Polymorphic Junction)
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `projectId` | UUID | Foreign key to `project.id` |
| `mediaType` | ENUM | `document`, `podcast` (extensible) |
| `mediaId` | UUID | Reference to actual media item |
| `order` | INTEGER | Display order within project |
| `createdAt` | TIMESTAMP | Link creation timestamp |

#### `projectDocument` (Legacy)
Deprecated - use `projectMedia` with `mediaType='document'` instead.

### Enums

```typescript
projectStatusEnum: 'draft' | 'active' | 'archived'
mediaTypeEnum: 'document' | 'podcast'  // Extensible for future types
```

### Indexes
- `project_created_by_idx` on `project.createdBy`
- `project_created_at_idx` on `project.createdAt`
- `project_status_idx` on `project.status`
- `project_media_project_id_idx` on `projectMedia.projectId`
- `project_media_media_type_idx` on `projectMedia.mediaType`

## Package Structure

```
packages/project/
├── src/
│   ├── index.ts          # Public exports
│   ├── service.ts        # Service interface & types
│   ├── repository.ts     # Database operations
│   ├── live.ts           # Effect layer implementation
│   ├── types.ts          # Discriminated unions & type guards
│   └── media-resolver.ts # Batch media resolution
├── package.json
├── tsconfig.json
├── eslint.config.js
└── jest.config.js
```

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    API Router                            │
│              (packages/api/src/server/router)           │
├─────────────────────────────────────────────────────────┤
│                   Service Layer                          │
│                (ProjectsService)                         │
│   - Authorization (requireOwnership)                     │
│   - Business logic                                       │
│   - Tenant isolation                                     │
├─────────────────────────────────────────────────────────┤
│                  Repository Layer                        │
│   - Database queries (Drizzle ORM)                      │
│   - CRUD operations                                      │
│   - Media link management                                │
├─────────────────────────────────────────────────────────┤
│                 Media Resolver                           │
│   - Batch-resolves media by type                        │
│   - Groups queries for efficiency                        │
│   - Returns discriminated union types                    │
├─────────────────────────────────────────────────────────┤
│                   Database (PostgreSQL)                  │
└─────────────────────────────────────────────────────────┘
```

## Type System

### Discriminated Union for Media Items

```typescript
interface BaseProjectMedia {
  id: string;
  projectId: string;
  mediaId: string;
  order: number;
  createdAt: Date;
}

interface DocumentMediaItem extends BaseProjectMedia {
  mediaType: 'document';
  media: Document;
}

interface PodcastMediaItem extends BaseProjectMedia {
  mediaType: 'podcast';
  media: Podcast;
}

// Discriminated union
type ProjectMediaItem = DocumentMediaItem | PodcastMediaItem;

// Type guards
function isDocumentMedia(item: ProjectMediaItem): item is DocumentMediaItem;
function isPodcastMedia(item: ProjectMediaItem): item is PodcastMediaItem;
```

### Project Types

```typescript
type ProjectStatus = 'draft' | 'active' | 'archived';

interface ProjectWithMedia extends Project {
  media: ProjectMediaItem[];
}
```

## Service Interface

```typescript
interface ProjectsService {
  // Core CRUD
  create(input: CreateProject): Effect<ProjectFull, ProjectError>;
  list(options?: { limit?; offset?; status? }): Effect<Project[], ProjectError>;
  findById(id: string): Effect<ProjectFull, ProjectError>;
  update(id: string, input: UpdateProject): Effect<ProjectFull, ProjectError>;
  delete(id: string): Effect<void, ProjectError>;

  // Polymorphic Media (NEW)
  findByIdWithMedia(id: string): Effect<ProjectWithMedia, ProjectError>;
  addMedia(projectId: string, input: AddMediaInput): Effect<ProjectMediaItem, ProjectError>;
  removeMedia(projectId: string, mediaId: string): Effect<void, ProjectError>;
  reorderMedia(projectId: string, mediaIds: string[]): Effect<ProjectMediaItem[], ProjectError>;

  // Status Management (NEW)
  setStatus(id: string, status: ProjectStatus): Effect<Project, ProjectError>;
}
```

## API Endpoints

### Core CRUD
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all projects for current user |
| GET | `/projects/{id}` | Get project with documents (legacy) |
| POST | `/projects` | Create new project |
| PATCH | `/projects/{id}` | Update project |
| DELETE | `/projects/{id}` | Delete project |

### Polymorphic Media
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/{id}/full` | Get project with resolved media items |
| POST | `/projects/{id}/media` | Add media item to project |
| DELETE | `/projects/{id}/media/{mediaId}` | Remove media item |
| PUT | `/projects/{id}/media/order` | Reorder media items |

### Status Management
| Method | Path | Description |
|--------|------|-------------|
| PATCH | `/projects/{id}/status` | Update project status |

## Error Handling

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| `PROJECT_NOT_FOUND` | 404 | Project does not exist |
| `DOCUMENT_NOT_FOUND` | 404 | Referenced document does not exist or access denied |
| `MEDIA_NOT_FOUND` | 404 | Media item not found or inaccessible |
| `FORBIDDEN` | 403 | User does not own the project |
| `INTERNAL_ERROR` | 500 | Database or policy error |

## Security

### Authorization
- All operations require authentication
- Ownership check via `requireOwnership()` for get/update/delete
- Media validation ensures user owns referenced media before linking

### Tenant Isolation
- `list()` automatically filters by `currentUser.id`
- `create()` sets `createdBy` to current user
- No cross-tenant data access possible

## Adding New Media Types

To add a new media type (e.g., `graphic`):

1. **Add enum value**:
   ```sql
   ALTER TYPE media_type ADD VALUE 'graphic';
   ```

2. **Create schema** in `packages/db/src/schemas/graphics.ts`

3. **Create package** `@repo/graphic` with service, repository, live layer

4. **Update discriminated union** in `packages/project/src/types.ts`:
   ```typescript
   interface GraphicMediaItem extends BaseProjectMedia {
     mediaType: 'graphic';
     media: Graphic;
   }
   type ProjectMediaItem = DocumentMediaItem | PodcastMediaItem | GraphicMediaItem;
   ```

5. **Update MediaResolver** to handle the new type

6. **Add API contract/router** for graphics CRUD

**No changes needed to:**
- `projectMedia` table structure
- Core project service logic
- Existing API endpoints

## Future Considerations

1. **Project Templates**: Pre-defined project structures
2. **Sharing/Collaboration**: Multi-user project access
3. **Tagging**: Categorization and search
4. **Bulk Operations**: Add/remove multiple media items at once
5. **Media Constraints**: Limit media types per project template

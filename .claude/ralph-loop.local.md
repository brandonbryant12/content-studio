# Ralph Loop State

## Configuration
- **Max Iterations:** 40
- **Current Iteration:** 1
- **Completion Promise:** REFACTORED
- **Started:** 2026-01-01

## Prompt

Internal Refactor Proposal: Simplifying our Data Architecture

The Context: We have been building a Content Studio where the primary workflow is "Create a Job -> Server Processes -> User Views Result."

Where we over-engineered: We implemented ElectricSQL and TanStack DB to provide a "Local-first" architecture. While powerful, this introduced significant friction for our specific use case:

Infrastructure Complexity: We are running a dedicated Electric Sync Service (Elixir) and managing Postgres logical replication for what is essentially a standard fetch-and-display workflow.

Type System Friction: We've had to implement custom wrappers (like useTypedLiveQuery) and manual type assertions to bypass the "Index Signature" issues created by the Electric sync layer.

State Mismatch: Using a local reactive database (TanStack DB) is overkill for tracking job statuses that are managed and updated by the server.

The Refactor Plan: We are moving to a "Server-State" model using TanStack Query (React Query) and Drizzle.

Remove ElectricSQL: Decommission the Electric Sync Service. We no longer need the Elixir-based sync layer between Postgres and the Client.

Replace TanStack DB with TanStack Query: Instead of syncing a local database, we will use standard hooks to fetch Job data. This provides built-in loading states, caching, and polling without the overhead.

Keep Effect + Drizzle (Backend): We will continue using Effect on the server to manage the complexity of job processing, retries, and Drizzle for type-safe database interactions.

Restore Type Safety: By removing the sync engine, we can use Drizzle-generated types directly in the frontend without "unknown" wrappers or brittle type assertions.

The Goal: Reduce the codebase size, eliminate unnecessary infrastructure, and allow the team to focus on the Content Studio logic rather than the mechanics of data synchronization.

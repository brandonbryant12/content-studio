import { Projects } from '@repo/project';
import { Effect } from 'effect';
import { handleEffect } from '../effect-handler';
import { protectedProcedure } from '../orpc';

/* eslint-disable @typescript-eslint/no-explicit-any */
const serializeProject = (project: any): any => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
});

const serializeProjectFull = (project: any): any => ({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    documents: project.documents.map((d: any) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
    })),
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const projectRouter = {
    list: protectedProcedure.projects.list.handler(async ({ context, input, errors }) => {
        return handleEffect(
            Effect.gen(function* () {
                const projects = yield* Projects;
                const result = yield* projects.list(input);
                return result.map(serializeProject);
            }).pipe(Effect.provide(context.layers)),
            {
                DbError: (e) => {
                    console.error('[DbError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
                },
                PolicyError: (e) => {
                    console.error('[PolicyError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
                },
                ForbiddenError: (e) => {
                    throw errors.FORBIDDEN({ message: e.message });
                },
                // These shouldn't happen in list but required by type definition of ProjectError
                ProjectNotFound: (e) => { throw errors.NOT_FOUND({ message: e.message }); },
                DocumentNotFound: (e) => { throw errors.NOT_FOUND({ message: e.message }); },
            },
        );
    }),

    get: protectedProcedure.projects.get.handler(async ({ context, input, errors }) => {
        return handleEffect(
            Effect.gen(function* () {
                const projects = yield* Projects;
                return serializeProjectFull(yield* projects.findById(input.id));
            }).pipe(Effect.provide(context.layers)),
            {
                ProjectNotFound: (e) => {
                    throw errors.PROJECT_NOT_FOUND({
                        message: e.message ?? `Project ${e.props.id} not found`,
                        data: { projectId: e.props.id },
                    });
                },
                DbError: (e) => {
                    console.error('[DbError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
                },
                ForbiddenError: (e) => {
                    throw errors.FORBIDDEN({ message: e.message });
                },
                PolicyError: (e) => {
                    console.error('[PolicyError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
                },
                DocumentNotFound: (e) => { throw errors.NOT_FOUND({ message: e.message }); },
            },
        );
    }),

    create: protectedProcedure.projects.create.handler(async ({ context, input, errors }) => {
        return handleEffect(
            Effect.gen(function* () {
                const projects = yield* Projects;
                const result = yield* projects.create(input);
                return serializeProjectFull(result);
            }).pipe(Effect.provide(context.layers)),
            {
                DocumentNotFound: (e) => {
                    throw errors.DOCUMENT_NOT_FOUND({
                        message: e.message ?? `Document ${e.id} not found`,
                        data: { documentId: e.id },
                    });
                },
                DbError: (e) => {
                    console.error('[DbError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
                },
                PolicyError: (e) => {
                    console.error('[PolicyError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
                },
                ForbiddenError: (e) => { throw errors.FORBIDDEN({ message: e.message }); },
                ProjectNotFound: (e) => { throw errors.NOT_FOUND({ message: e.message }); },
            },
        );
    }),

    update: protectedProcedure.projects.update.handler(async ({ context, input, errors }) => {
        const { id, ...data } = input;
        return handleEffect(
            Effect.gen(function* () {
                const projects = yield* Projects;
                const result = yield* projects.update(id, data);
                return serializeProject(result);
            }).pipe(Effect.provide(context.layers)),
            {
                ProjectNotFound: (e) => {
                    throw errors.PROJECT_NOT_FOUND({
                        message: e.message ?? `Project ${e.props.id} not found`,
                        data: { projectId: e.props.id },
                    });
                },
                DbError: (e) => {
                    console.error('[DbError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
                },
                ForbiddenError: (e) => {
                    throw errors.FORBIDDEN({ message: e.message });
                },
                PolicyError: (e) => {
                    console.error('[PolicyError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
                },
                DocumentNotFound: (e) => { throw errors.NOT_FOUND({ message: e.message }); },
            },
        );
    }),

    delete: protectedProcedure.projects.delete.handler(async ({ context, input, errors }) => {
        return handleEffect(
            Effect.gen(function* () {
                const projects = yield* Projects;
                yield* projects.delete(input.id);
                return {};
            }).pipe(Effect.provide(context.layers)),
            {
                ProjectNotFound: (e) => {
                    throw errors.PROJECT_NOT_FOUND({
                        message: e.message ?? `Project ${e.props.id} not found`,
                        data: { projectId: e.props.id },
                    });
                },
                DbError: (e) => {
                    console.error('[DbError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Database operation failed' });
                },
                ForbiddenError: (e) => {
                    throw errors.FORBIDDEN({ message: e.message });
                },
                PolicyError: (e) => {
                    console.error('[PolicyError]', e.message, e.cause);
                    throw errors.INTERNAL_ERROR({ message: 'Authorization check failed' });
                },
                DocumentNotFound: (e) => { throw errors.NOT_FOUND({ message: e.message }); },
            },
        );
    }),
};

export default projectRouter;

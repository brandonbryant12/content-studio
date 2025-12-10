import { CurrentUser, requireOwnership } from '@repo/auth-policy';
import { Db } from '@repo/effect/db';
import { Context, Effect, Layer } from 'effect';
import type { ProjectsService } from './service';
import {
    verifyDocumentsExistForProject,
    insertProject,
    listProjects,
    findProjectById,
    updateProject,
    deleteProject
} from './repository';

export class Projects extends Context.Tag('@repo/project/Projects')<
    Projects,
    ProjectsService
>() { }

export const ProjectsLive = Layer.effect(
    Projects,
    Effect.gen(function* () {
        const db = yield* Db;
        const currentUser = yield* CurrentUser;

        const service: ProjectsService = {
            create: (input) =>
                Effect.gen(function* () {
                    const { documentIds, ...data } = input;

                    if (documentIds && documentIds.length > 0) {
                        yield* verifyDocumentsExistForProject(documentIds, currentUser.id).pipe(
                            Effect.provideService(Db, db),
                            Effect.provideService(CurrentUser, currentUser),
                        );
                    }

                    return yield* insertProject(
                        {
                            ...data,
                            createdBy: currentUser.id,
                        },
                        documentIds ?? [],
                    ).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );
                }),

            list: (options) =>
                listProjects({
                    ...options,
                    createdBy: currentUser.id, // Enforce tenant isolation
                }).pipe(
                    Effect.provideService(Db, db),
                    Effect.provideService(CurrentUser, currentUser),
                ),

            findById: (id) =>
                Effect.gen(function* () {
                    const project = yield* findProjectById(id).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );
                    yield* requireOwnership(project.createdBy).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );
                    return project;
                }),

            update: (id, input) =>
                Effect.gen(function* () {
                    const project = yield* findProjectById(id).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );
                    yield* requireOwnership(project.createdBy).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );

                    if (input.documentIds && input.documentIds.length > 0) {
                        yield* verifyDocumentsExistForProject(input.documentIds, currentUser.id).pipe(
                            Effect.provideService(Db, db),
                            Effect.provideService(CurrentUser, currentUser),
                        );
                    }

                    return yield* updateProject(id, input).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );
                }),

            delete: (id) =>
                Effect.gen(function* () {
                    const project = yield* findProjectById(id).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );
                    yield* requireOwnership(project.createdBy).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );
                    yield* deleteProject(id).pipe(
                        Effect.provideService(Db, db),
                        Effect.provideService(CurrentUser, currentUser),
                    );
                }),
        };

        return service;
    }),
);

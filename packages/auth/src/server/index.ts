// Auth configuration
export {
  createAuth,
  getBaseOptions,
  type AuthOptions,
  type AuthInstance,
} from './auth';

// Effect-based session wrappers
export { getSession, getSessionWithRole, requireSession } from './session';

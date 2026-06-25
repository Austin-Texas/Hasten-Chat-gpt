import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const forceLocalAuth = import.meta.env.VITE_HASTEN_LOCAL_AUTH === 'true';
const disableLocalAuth = import.meta.env.VITE_HASTEN_LOCAL_AUTH === 'false';

export const isLocalDemoMode = forceLocalAuth || (!disableLocalAuth && isLocalHost && !appParams.appId);

const readLocalUser = () => {
  if (!isBrowser) return null;

  try {
    const raw = window.localStorage.getItem('hasten_user');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const email = String(parsed.email || '').toLowerCase();
    const isDriver = email === 'driver@hasten.com';

    return {
      id: isDriver ? 'local-driver-user' : 'local-admin-user',
      full_name: isDriver ? 'Demo Driver' : 'Brian M',
      email,
      role: isDriver ? 'driver' : 'admin',
      businessRole: isDriver ? 'driver' : 'super_admin',
      accountType: isDriver ? 'driver' : 'admin',
      localDemo: true,
      ...parsed,
      // Re-apply canonical local roles after spreading legacy stored data.
      role: isDriver ? 'driver' : 'admin',
      businessRole: isDriver ? 'driver' : 'super_admin',
      accountType: isDriver ? 'driver' : 'admin'
    };
  } catch (error) {
    console.warn('[base44Client] Invalid local HASTEN session. Clearing it.', error);
    window.localStorage.removeItem('hasten_user');
    return null;
  }
};

const makeLocalEntity = (entityName) => ({
  list: async () => [],
  filter: async () => [],
  get: async (id) => ({ id, localDemo: true, entityName }),
  create: async (payload = {}) => ({
    id: `local-${entityName.toLowerCase()}-${Date.now()}`,
    ...payload,
    localDemo: true
  }),
  update: async (id, payload = {}) => ({ id, ...payload, localDemo: true }),
  delete: async () => ({ success: true, localDemo: true }),
  bulkCreate: async (items = []) => items,
  updateMany: async () => ({ success: true, localDemo: true }),
  deleteMany: async () => ({ success: true, localDemo: true })
});

const makeLocalBase44 = () => ({
  auth: {
    me: async () => {
      const user = readLocalUser();
      if (!user) {
        const error = new Error('Local demo user is not signed in');
        error.status = 401;
        throw error;
      }
      return user;
    },
    logout: () => {
      if (isBrowser) window.localStorage.removeItem('hasten_user');
    },
    redirectToLogin: () => {
      if (isBrowser) window.location.href = '/login';
    },
    loginWithProvider: () => {
      throw new Error('Provider login requires Base44 env variables. Use local demo login on localhost.');
    }
  },
  entities: new Proxy({}, {
    get: (_target, entityName) => {
      if (typeof entityName === 'symbol') return undefined;
      return makeLocalEntity(String(entityName));
    }
  }),
  functions: {
    invoke: async (name, payload = {}) => ({ success: true, name, data: null, payload, localDemo: true })
  },
  integrations: new Proxy({}, {
    get: () => new Proxy({}, {
      get: () => async () => ({ success: true, localDemo: true })
    })
  }),
  files: {
    uploadFile: async () => ({ file_url: '', localDemo: true })
  }
});

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = isLocalDemoMode
  ? makeLocalBase44()
  : createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl
    });

import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const forceLocalAuth = import.meta.env.VITE_HASTEN_LOCAL_AUTH === 'true';
const disableLocalAuth = import.meta.env.VITE_HASTEN_LOCAL_AUTH === 'false';
const LOCAL_ENTITY_PREFIX = 'hasten_local_entity_';

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

const entityKey = (entityName) => `${LOCAL_ENTITY_PREFIX}${entityName}`;

const readLocalEntityRecords = (entityName) => {
  if (!isBrowser) return [];
  try {
    return JSON.parse(window.localStorage.getItem(entityKey(entityName)) || '[]');
  } catch (error) {
    console.warn(`[base44Client] Invalid local records for ${entityName}. Resetting.`, error);
    window.localStorage.removeItem(entityKey(entityName));
    return [];
  }
};

const writeLocalEntityRecords = (entityName, records) => {
  if (!isBrowser) return records;
  window.localStorage.setItem(entityKey(entityName), JSON.stringify(records));
  window.dispatchEvent(new CustomEvent(`hasten_local_entity_changed_${entityName}`, { detail: records }));
  return records;
};

const sortRecords = (records, sort = '') => {
  if (!sort) return records;
  const desc = String(sort).startsWith('-');
  const field = String(sort).replace(/^-/, '');
  return [...records].sort((a, b) => {
    const av = a?.[field] ?? '';
    const bv = b?.[field] ?? '';
    if (av === bv) return 0;
    return (av > bv ? 1 : -1) * (desc ? -1 : 1);
  });
};

const matchesFilter = (record, filter = {}) => Object.entries(filter || {}).every(([key, value]) => {
  if (Array.isArray(value)) return value.includes(record?.[key]);
  return record?.[key] === value;
});

const makeLocalEntity = (entityName) => ({
  list: async (sort = '', limit) => {
    const records = sortRecords(readLocalEntityRecords(entityName), sort);
    return limit ? records.slice(0, limit) : records;
  },
  filter: async (filter = {}, sort = '', limit) => {
    const records = sortRecords(readLocalEntityRecords(entityName).filter((record) => matchesFilter(record, filter)), sort);
    return limit ? records.slice(0, limit) : records;
  },
  get: async (id) => readLocalEntityRecords(entityName).find((record) => record.id === id) || { id, localDemo: true, entityName },
  create: async (payload = {}) => {
    const record = {
      id: payload.id || `local-${entityName.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      created_date: payload.created_date || new Date().toISOString(),
      updated_at: payload.updated_at || new Date().toISOString(),
      ...payload,
      localDemo: true
    };
    const existing = readLocalEntityRecords(entityName).filter((item) => item.id !== record.id);
    writeLocalEntityRecords(entityName, [record, ...existing]);
    return record;
  },
  update: async (id, payload = {}) => {
    const records = readLocalEntityRecords(entityName);
    const next = records.map((record) => record.id === id ? { ...record, ...payload, id, updated_at: new Date().toISOString(), localDemo: true } : record);
    const updated = next.find((record) => record.id === id) || { id, ...payload, updated_at: new Date().toISOString(), localDemo: true };
    writeLocalEntityRecords(entityName, next.some((record) => record.id === id) ? next : [updated, ...records]);
    return updated;
  },
  delete: async (id) => {
    writeLocalEntityRecords(entityName, readLocalEntityRecords(entityName).filter((record) => record.id !== id));
    return { success: true, localDemo: true };
  },
  bulkCreate: async (items = []) => {
    const created = items.map((item, index) => ({
      id: item.id || `local-${entityName.toLowerCase()}-${Date.now()}-${index}`,
      created_date: item.created_date || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
      ...item,
      localDemo: true
    }));
    const existing = readLocalEntityRecords(entityName).filter((record) => !created.some((item) => item.id === record.id));
    writeLocalEntityRecords(entityName, [...created, ...existing]);
    return created;
  },
  updateMany: async (items = []) => {
    const records = readLocalEntityRecords(entityName);
    const next = records.map((record) => {
      const patch = items.find((item) => item.id === record.id);
      return patch ? { ...record, ...patch, updated_at: new Date().toISOString(), localDemo: true } : record;
    });
    writeLocalEntityRecords(entityName, next);
    return { success: true, localDemo: true };
  },
  deleteMany: async (ids = []) => {
    writeLocalEntityRecords(entityName, readLocalEntityRecords(entityName).filter((record) => !ids.includes(record.id)));
    return { success: true, localDemo: true };
  },
  subscribe: (callback) => {
    if (!isBrowser) return () => undefined;
    const eventName = `hasten_local_entity_changed_${entityName}`;
    const handler = (event) => callback?.(event.detail || []);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }
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

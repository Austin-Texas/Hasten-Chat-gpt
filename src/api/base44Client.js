import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const isBrowser = typeof window !== 'undefined';
const isLocalHost = isBrowser && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const forceLocalAuth = import.meta.env.VITE_HASTEN_LOCAL_AUTH === 'true';
const disableLocalAuth = import.meta.env.VITE_HASTEN_LOCAL_AUTH === 'false';
const LOCAL_ENTITY_PREFIX = 'hasten_local_entity_';

export const isLocalDemoMode = forceLocalAuth || (!disableLocalAuth && isLocalHost && !appParams.appId);

const now = () => new Date().toISOString();

const readLocalUser = () => {
  if (!isBrowser) return null;

  try {
    const raw = window.localStorage.getItem('hasten_user');
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const email = String(parsed.email || '').toLowerCase();
    const isDriver = email === 'driver@hasten.com';

    return {
      ...parsed,
      id: parsed.id || (isDriver ? 'local-driver-user' : 'local-admin-user'),
      full_name: parsed.full_name || (isDriver ? 'Demo Driver' : 'Brian M'),
      email,
      role: isDriver ? 'driver' : 'admin',
      businessRole: isDriver ? 'driver' : (parsed.businessRole || 'super_admin'),
      accountType: isDriver ? 'driver' : 'admin',
      linkedDriverId: isDriver ? 'local-driver-profile' : parsed.linkedDriverId,
      localDemo: true,
    };
  } catch (error) {
    console.warn('[base44Client] Invalid local HASTEN session. Clearing it.', error);
    window.localStorage.removeItem('hasten_user');
    return null;
  }
};

const demoRecords = {
  Driver: [
    {
      id: 'local-driver-profile',
      user_id: 'local-driver-user',
      name: 'Demo Driver',
      full_name: 'Demo Driver',
      email: 'driver@hasten.com',
      phone: '(910) 555-0199',
      driver_type: 'owner_operator',
      vehicle_type: 'Sprinter',
      trailer_type: 'Cargo Van',
      max_payload: 3200,
      cargo_length: 144,
      cargo_width: 70,
      cargo_height: 72,
      dock_high: false,
      liftgate: false,
      reefer: false,
      hazmat: false,
      team_driver: false,
      current_location: 'Fayetteville, NC',
      home_location: 'Fayetteville, NC',
      preferred_lanes: ['NC', 'SC', 'GA', 'VA'],
      availability: 'available',
      compliance_status: 'valid',
      settlement_status: 'pending_review',
      localDemoSeed: true,
    },
  ],
  Load: [
    {
      id: 'local-load-sprinter-001',
      load_number: 'HC-DEMO-001',
      driver_id: 'local-driver-profile',
      status: 'assigned',
      origin_city: 'Fayetteville',
      origin_state: 'NC',
      destination_city: 'Raleigh',
      destination_state: 'NC',
      equipment_type: 'Sprinter',
      required_equipment: 'Sprinter',
      weight: 1800,
      miles_total: 68,
      pickup_datetime_start: '2026-06-25T09:00:00-04:00',
      delivery_datetime_end: '2026-06-25T13:30:00-04:00',
      broker_rate_hidden: true,
      driver_rate: 450,
      localDemoSeed: true,
    },
    {
      id: 'local-load-hotshot-001',
      load_number: 'HC-DEMO-002',
      driver_id: 'local-driver-profile',
      status: 'in_transit',
      origin_city: 'Charlotte',
      origin_state: 'NC',
      destination_city: 'Columbia',
      destination_state: 'SC',
      equipment_type: 'Hot Shot',
      required_equipment: 'Hot Shot',
      weight: 6400,
      miles_total: 93,
      pickup_datetime_start: '2026-06-25T11:00:00-04:00',
      delivery_datetime_end: '2026-06-25T18:00:00-04:00',
      broker_rate_hidden: true,
      driver_rate: 725,
      localDemoSeed: true,
    },
  ],
  ExternalLoad: [
    {
      id: 'local-external-load-001',
      source_provider: 'DAT Sandbox',
      external_load_id: 'DAT-DEMO-1001',
      broker_name: 'Demo Broker LLC',
      pickup_city: 'Fayetteville',
      pickup_state: 'NC',
      pickup_zip: '28301',
      delivery_city: 'Raleigh',
      delivery_state: 'NC',
      delivery_zip: '27601',
      required_equipment: 'Sprinter',
      trailer_type: 'Cargo Van',
      weight: 1800,
      miles_total: 68,
      rate_available: 650,
      broker_rate_hidden: true,
      normalized_status: 'available',
      imported_at: now(),
      expires_at: '2026-06-26T17:00:00-04:00',
      raw_payload_json: { source: 'local-demo' },
      localDemoSeed: true,
    },
    {
      id: 'local-external-load-002',
      source_provider: 'Truckstop Sandbox',
      external_load_id: 'TS-DEMO-2001',
      broker_name: 'Blue Ridge Shipper',
      pickup_city: 'Charlotte',
      pickup_state: 'NC',
      pickup_zip: '28202',
      delivery_city: 'Columbia',
      delivery_state: 'SC',
      delivery_zip: '29201',
      required_equipment: 'Hot Shot',
      trailer_type: 'Gooseneck / Fifth Wheel',
      weight: 6400,
      miles_total: 93,
      rate_available: 980,
      broker_rate_hidden: true,
      normalized_status: 'available',
      imported_at: now(),
      expires_at: '2026-06-26T17:00:00-04:00',
      raw_payload_json: { source: 'local-demo' },
      localDemoSeed: true,
    },
  ],
  Settlement: [
    {
      id: 'local-settlement-001',
      driver_id: 'local-driver-profile',
      load_id: 'local-load-sprinter-001',
      gross_load_revenue: 650,
      dispatch_company_fee: 130,
      factoring_fee: 19.5,
      fuel_advance: 0,
      toll_advance: 0,
      approved_deductions: 0,
      bonus: 0,
      final_driver_net_pay: 500.5,
      HASTEN_net_revenue: 110.5,
      payment_status: 'pending_review',
      payout_recipient: 'Demo Driver',
      localDemoSeed: true,
    },
  ],
  LoadDocument: [
    {
      id: 'local-doc-001',
      load_id: 'local-load-sprinter-001',
      driver_id: 'local-driver-profile',
      document_type: 'POD',
      status: 'pending_review',
      confidence_score: 94,
      signature_detected: true,
      localDemoSeed: true,
    },
  ],
};

const getLocalSeedRecords = (entityName) => (demoRecords[entityName] || []).map((record) => ({
  created_date: record.created_date || now(),
  updated_at: record.updated_at || now(),
  localDemo: true,
  ...record,
}));

const entityKey = (entityName) => `${LOCAL_ENTITY_PREFIX}${entityName}`;

const readLocalEntityRecords = (entityName) => {
  if (!isBrowser) return [];

  try {
    const raw = window.localStorage.getItem(entityKey(entityName));
    if (!raw) {
      const seeds = getLocalSeedRecords(entityName);
      if (seeds.length) {
        window.localStorage.setItem(entityKey(entityName), JSON.stringify(seeds));
      }
      return seeds;
    }

    return JSON.parse(raw || '[]');
  } catch (error) {
    console.warn(`[base44Client] Invalid local records for ${entityName}. Resetting.`, error);
    window.localStorage.removeItem(entityKey(entityName));
    return getLocalSeedRecords(entityName);
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

const findDuplicateDriverLoadBid = (records, payload = {}) => {
  if (!payload.external_load_id || !payload.driver_id) return null;
  return records.find((record) => record.external_load_id === payload.external_load_id && record.driver_id === payload.driver_id);
};

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
    const existingRecords = readLocalEntityRecords(entityName);

    if (entityName === 'DriverLoadBid') {
      const duplicate = findDuplicateDriverLoadBid(existingRecords, payload);
      if (duplicate) {
        const updated = { ...duplicate, ...payload, id: duplicate.id, updated_at: now(), duplicateGuard: true, localDemo: true };
        writeLocalEntityRecords(entityName, existingRecords.map((record) => record.id === duplicate.id ? updated : record));
        return updated;
      }
    }

    const record = {
      id: payload.id || `local-${entityName.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      created_date: payload.created_date || now(),
      updated_at: payload.updated_at || now(),
      ...payload,
      localDemo: true
    };
    const existing = existingRecords.filter((item) => item.id !== record.id);
    writeLocalEntityRecords(entityName, [record, ...existing]);
    return record;
  },
  update: async (id, payload = {}) => {
    const records = readLocalEntityRecords(entityName);
    const next = records.map((record) => record.id === id ? { ...record, ...payload, id, updated_at: now(), localDemo: true } : record);
    const updated = next.find((record) => record.id === id) || { id, ...payload, updated_at: now(), localDemo: true };
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
      created_date: item.created_date || now(),
      updated_at: item.updated_at || now(),
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
      return patch ? { ...record, ...patch, updated_at: now(), localDemo: true } : record;
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

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
      first_name: 'Demo',
      last_name: 'Driver',
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
      current_city: 'Fayetteville',
      current_state: 'NC',
      home_location: 'Fayetteville, NC',
      home_city: 'Fayetteville',
      home_state: 'NC',
      preferred_lanes: ['NC', 'SC', 'GA', 'VA'],
      status: 'available',
      availability: 'available',
      availability_status: 'available',
      compliance_status: 'valid',
      license_status: 'valid',
      insurance_status: 'valid',
      w9_status: 'valid',
      contract_status: 'valid',
      settlement_status: 'pending_review',
      localDemoSeed: true,
    },
  ],
  Truck: [
    {
      id: 'local-truck-001',
      unit_number: 'HC-TRK-001',
      type: 'Sprinter',
      status: 'available',
      assigned_driver_id: 'local-driver-profile',
      maintenance_status: 'ok',
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
      miles: 68,
      miles_total: 68,
      rate: 650,
      total_revenue: 650,
      pickup_date: '2026-06-25',
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
      miles: 93,
      miles_total: 93,
      rate: 980,
      total_revenue: 980,
      pickup_date: '2026-06-25',
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

const ENTITY_ALIASES = {
  Customer: ['Customer', 'Client'],
  Client: ['Client', 'Customer'],
  LoadTemplate: ['LoadTemplate', 'LoadTemplates', 'Template'],
  LoadTemplates: ['LoadTemplates', 'LoadTemplate', 'Template'],
  QuoteRequest: ['QuoteRequest', 'Quote'],
  ExternalLoad: ['ExternalLoad', 'MarketplaceLoad'],
  MarketplaceLoad: ['MarketplaceLoad', 'ExternalLoad'],
};

const getEntityAliases = (entityName) => ENTITY_ALIASES[entityName] || [entityName];

const getLocalSeedRecords = (entityName, seedLocalDemo = isLocalDemoMode) => {
  if (!seedLocalDemo) return [];
  return (demoRecords[entityName] || []).map((record) => ({
    created_date: record.created_date || now(),
    updated_at: record.updated_at || now(),
    localDemo: true,
    ...record,
  }));
};

const entityKey = (entityName) => `${LOCAL_ENTITY_PREFIX}${entityName}`;

const readLocalEntityRecords = (entityName, { seedLocalDemo = isLocalDemoMode } = {}) => {
  if (!isBrowser) return [];

  try {
    const raw = window.localStorage.getItem(entityKey(entityName));
    if (!raw) {
      const seeds = getLocalSeedRecords(entityName, seedLocalDemo);
      if (seeds.length) {
        window.localStorage.setItem(entityKey(entityName), JSON.stringify(seeds));
      }
      return seeds;
    }

    return JSON.parse(raw || '[]');
  } catch (error) {
    console.warn(`[base44Client] Invalid local records for ${entityName}. Resetting.`, error);
    window.localStorage.removeItem(entityKey(entityName));
    return getLocalSeedRecords(entityName, seedLocalDemo);
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

const makeLocalEntity = (entityName, { seedLocalDemo = isLocalDemoMode } = {}) => ({
  list: async (sort = '', limit) => {
    const records = sortRecords(readLocalEntityRecords(entityName, { seedLocalDemo }), sort);
    return limit ? records.slice(0, limit) : records;
  },
  filter: async (filter = {}, sort = '', limit) => {
    const records = sortRecords(readLocalEntityRecords(entityName, { seedLocalDemo }).filter((record) => matchesFilter(record, filter)), sort);
    return limit ? records.slice(0, limit) : records;
  },
  get: async (id) => readLocalEntityRecords(entityName, { seedLocalDemo }).find((record) => record.id === id) || { id, localDemo: true, entityName },
  create: async (payload = {}) => {
    const existingRecords = readLocalEntityRecords(entityName, { seedLocalDemo });

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
      localDemo: true,
    };
    const existing = existingRecords.filter((item) => item.id !== record.id);
    writeLocalEntityRecords(entityName, [record, ...existing]);
    return record;
  },
  update: async (id, payload = {}) => {
    const records = readLocalEntityRecords(entityName, { seedLocalDemo });
    const next = records.map((record) => record.id === id ? { ...record, ...payload, id, updated_at: now(), localDemo: true } : record);
    const updated = next.find((record) => record.id === id) || { id, ...payload, updated_at: now(), localDemo: true };
    writeLocalEntityRecords(entityName, next.some((record) => record.id === id) ? next : [updated, ...records]);
    return updated;
  },
  delete: async (id) => {
    writeLocalEntityRecords(entityName, readLocalEntityRecords(entityName, { seedLocalDemo }).filter((record) => record.id !== id));
    return { success: true, localDemo: true };
  },
  bulkCreate: async (items = []) => {
    const created = items.map((item, index) => ({
      id: item.id || `local-${entityName.toLowerCase()}-${Date.now()}-${index}`,
      created_date: item.created_date || now(),
      updated_at: item.updated_at || now(),
      ...item,
      localDemo: true,
    }));
    const existing = readLocalEntityRecords(entityName, { seedLocalDemo }).filter((record) => !created.some((item) => item.id === record.id));
    writeLocalEntityRecords(entityName, [...created, ...existing]);
    return created;
  },
  updateMany: async (items = []) => {
    const records = readLocalEntityRecords(entityName, { seedLocalDemo });
    const next = records.map((record) => {
      const patch = items.find((item) => item.id === record.id);
      return patch ? { ...record, ...patch, updated_at: now(), localDemo: true } : record;
    });
    writeLocalEntityRecords(entityName, next);
    return { success: true, localDemo: true };
  },
  deleteMany: async (ids = []) => {
    writeLocalEntityRecords(entityName, readLocalEntityRecords(entityName, { seedLocalDemo }).filter((record) => !ids.includes(record.id)));
    return { success: true, localDemo: true };
  },
  subscribe: (callback) => {
    if (!isBrowser) return () => undefined;
    const eventName = `hasten_local_entity_changed_${entityName}`;
    const handler = (event) => callback?.(event.detail || []);
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  },
});

const isRecoverableBase44Error = (error) => {
  const status = error?.status || error?.response?.status || error?.data?.status || error?.error_http_status_code;
  const message = String(error?.message || error?.response?.data?.message || error || '').toLowerCase();
  return status === 404 || message.includes('404') || message.includes('not found') || message.includes('does not exist') || message.includes('undefined');
};

const callRealEntity = async (realClient, entityName, method, args) => {
  const entity = realClient?.entities?.[entityName];
  const fn = entity?.[method];
  if (typeof fn !== 'function') {
    throw new Error(`Base44 entity method missing: ${entityName}.${method}`);
  }
  return fn(...args);
};

const callRealEntityWithAliases = async (realClient, requestedEntityName, method, args) => {
  const aliases = getEntityAliases(requestedEntityName);
  let emptyResult = null;
  let lastError = null;

  for (const alias of aliases) {
    try {
      const result = await callRealEntity(realClient, alias, method, args);
      if ((method === 'list' || method === 'filter') && Array.isArray(result) && result.length === 0) {
        emptyResult = result;
        continue;
      }
      return result;
    } catch (error) {
      lastError = error;
      if (!isRecoverableBase44Error(error)) throw error;
    }
  }

  if (emptyResult) return emptyResult;
  throw lastError || new Error(`Base44 entity unavailable: ${requestedEntityName}.${method}`);
};

const makeResilientEntity = (realClient, entityName) => {
  const localEntity = makeLocalEntity(entityName, { seedLocalDemo: false });
  const handler = {};

  ['list', 'filter', 'get', 'create', 'update', 'delete', 'bulkCreate', 'updateMany', 'deleteMany'].forEach((method) => {
    handler[method] = async (...args) => {
      try {
        const result = await callRealEntityWithAliases(realClient, entityName, method, args);
        if ((method === 'list' || method === 'filter') && Array.isArray(result) && result.length === 0) {
          const localRecords = await localEntity[method](...args);
          if (localRecords.length) return localRecords;
        }
        return result;
      } catch (error) {
        if (!isRecoverableBase44Error(error)) throw error;
        console.warn(`[base44Client] ${entityName}.${method} falling back to resilient local store:`, error?.message || error);
        return localEntity[method](...args);
      }
    };
  });

  handler.subscribe = (callback) => {
    try {
      const primary = getEntityAliases(entityName)[0];
      const realSubscribe = realClient?.entities?.[primary]?.subscribe;
      if (typeof realSubscribe === 'function') return realSubscribe(callback);
    } catch (error) {
      console.warn(`[base44Client] ${entityName}.subscribe falling back to local listener:`, error?.message || error);
    }
    return localEntity.subscribe(callback);
  };

  return handler;
};

const mergeById = (existing = [], incoming = []) => {
  const map = new Map(existing.map((item) => [item.id, item]));
  incoming.forEach((item) => map.set(item.id, { ...map.get(item.id), ...item }));
  return [...map.values()];
};

const seedExternalLoadFallback = () => {
  const externalLoads = getLocalSeedRecords('ExternalLoad', true).map((load) => ({
    ...load,
    imported_at: now(),
    synced_at: now(),
    normalized_status: load.normalized_status || 'available',
  }));

  const sources = [...new Set(externalLoads.map((load) => load.source_provider).filter(Boolean))].map((sourceProvider) => ({
    id: `local-source-${sourceProvider.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: sourceProvider,
    provider: sourceProvider,
    status: 'active',
    configured: false,
    source_type: 'fallback_demo',
    last_sync_at: now(),
    created_date: now(),
    updated_at: now(),
    localDemo: true,
  }));

  writeLocalEntityRecords('ExternalLoad', mergeById(readLocalEntityRecords('ExternalLoad', { seedLocalDemo: false }), externalLoads));
  writeLocalEntityRecords('MarketplaceLoad', mergeById(readLocalEntityRecords('MarketplaceLoad', { seedLocalDemo: false }), externalLoads));
  writeLocalEntityRecords('MarketplaceSource', mergeById(readLocalEntityRecords('MarketplaceSource', { seedLocalDemo: false }), sources));
  writeLocalEntityRecords('MarketplaceSyncJob', [
    {
      id: `local-sync-${Date.now()}`,
      status: 'success',
      mode: 'fallback_demo',
      source_count: sources.length,
      load_count: externalLoads.length,
      message: 'Fallback marketplace sync loaded demo records because provider API is not configured.',
      started_at: now(),
      completed_at: now(),
      created_date: now(),
      updated_at: now(),
      localDemo: true,
    },
    ...readLocalEntityRecords('MarketplaceSyncJob', { seedLocalDemo: false }),
  ]);

  return { externalLoads, sources };
};

const createDispatcherEventFallback = (eventType, payload = {}) => {
  const event = {
    id: `local-dispatch-event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    event_type: eventType,
    type: eventType,
    title: payload.title || eventType,
    description: payload.description || payload.title || eventType,
    entity_type: payload.entity_type || 'Load',
    entity_id: payload.entity_id || payload.load_id || payload.driver_id || payload.customer_id,
    load_id: payload.load_id,
    driver_id: payload.driver_id,
    customer_id: payload.customer_id,
    metadata: JSON.stringify(payload),
    created_date: now(),
    created_at: now(),
    updated_at: now(),
    localDemo: true,
  };
  const entity = makeLocalEntity('DispatcherEvent', { seedLocalDemo: false });
  entity.create(event).catch(() => undefined);
  const timeline = makeLocalEntity('TimelineEvent', { seedLocalDemo: false });
  timeline.create(event).catch(() => undefined);
  return event;
};

const makeResilientFunctions = (realClient) => ({
  invoke: async (name, payload = {}) => {
    try {
      const result = await realClient?.functions?.invoke?.(name, payload);
      if (name === 'updateLoadStatus' && payload?.load_id) {
        createDispatcherEventFallback('LOAD_STATUS_UPDATED', {
          load_id: payload.load_id,
          driver_id: payload.driver_id,
          title: `Load status updated to ${payload.new_status || payload.status}`,
          source: 'updateLoadStatus',
        });
      }
      return result;
    } catch (error) {
      if (!isRecoverableBase44Error(error)) throw error;
      console.warn(`[base44Client] function ${name} falling back to local dispatcher behavior:`, error?.message || error);

      if (name === 'syncExternalLoads') {
        const { externalLoads, sources } = seedExternalLoadFallback();
        createDispatcherEventFallback('MARKETPLACE_SYNC', {
          entity_type: 'MarketplaceSyncJob',
          title: 'Marketplace fallback sync completed',
          description: `${externalLoads.length} demo loads from ${sources.length} fallback sources`,
          load_count: externalLoads.length,
          source_count: sources.length,
          mode: payload?.mode || 'manual',
        });
        return {
          success: true,
          data: {
            success: true,
            localFallback: true,
            imported: externalLoads.length,
            sources: sources.length,
          },
          localDemo: true,
        };
      }

      if (name === 'updateLoadStatus' && payload?.load_id) {
        const patch = {
          status: payload.new_status || payload.status,
          driver_id: payload.driver_id,
          truck_id: payload.truck_id,
          updated_at: now(),
        };
        Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);
        const updated = await makeLocalEntity('Load', { seedLocalDemo: false }).update(payload.load_id, patch);
        createDispatcherEventFallback('LOAD_STATUS_UPDATED', {
          load_id: payload.load_id,
          driver_id: payload.driver_id,
          title: `Load status updated to ${patch.status}`,
          source: 'updateLoadStatusFallback',
        });
        return { success: true, data: updated, localDemo: true };
      }

      if (name === 'matchExternalLoadsToDrivers') {
        return { success: true, data: { matches: [] }, localDemo: true };
      }

      return { success: true, name, data: null, payload, localDemo: true, recovered: true };
    }
  },
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
    },
  },
  entities: new Proxy({}, {
    get: (_target, entityName) => {
      if (typeof entityName === 'symbol') return undefined;
      return makeLocalEntity(String(entityName), { seedLocalDemo: true });
    },
  }),
  functions: {
    invoke: async (name, payload = {}) => {
      if (name === 'syncExternalLoads') {
        const { externalLoads, sources } = seedExternalLoadFallback();
        return { success: true, name, data: { success: true, localFallback: true, imported: externalLoads.length, sources: sources.length }, payload, localDemo: true };
      }
      if (name === 'updateLoadStatus' && payload?.load_id) {
        const updated = await makeLocalEntity('Load', { seedLocalDemo: true }).update(payload.load_id, { status: payload.new_status || payload.status, driver_id: payload.driver_id, updated_at: now() });
        return { success: true, name, data: updated, payload, localDemo: true };
      }
      return { success: true, name, data: null, payload, localDemo: true };
    },
  },
  integrations: new Proxy({}, {
    get: () => new Proxy({}, {
      get: () => async () => ({ success: true, localDemo: true }),
    }),
  }),
  files: {
    uploadFile: async () => ({ file_url: '', localDemo: true }),
  },
});

const makeResilientBase44 = (realClient) => ({
  ...realClient,
  entities: new Proxy({}, {
    get: (_target, entityName) => {
      if (typeof entityName === 'symbol') return undefined;
      return makeResilientEntity(realClient, String(entityName));
    },
  }),
  functions: makeResilientFunctions(realClient),
  integrations: realClient?.integrations || new Proxy({}, {
    get: () => new Proxy({}, {
      get: () => async () => ({ success: true }),
    }),
  }),
  files: realClient?.files || {
    uploadFile: async () => ({ file_url: '' }),
  },
});

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const realBase44Client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl,
});

export const base44 = isLocalDemoMode ? makeLocalBase44() : makeResilientBase44(realBase44Client);

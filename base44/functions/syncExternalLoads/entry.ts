import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Simulates importing loads from external load board APIs (DAT, Truckstop, etc.)
// In production, this would make real API calls to each provider

const PROVIDER_CONFIGS = {
  'DAT': { capabilities: ['get_loads', 'get_details', 'submit_bid', 'bid_status', 'documents', 'webhooks'] },
  'Truckstop': { capabilities: ['get_loads', 'get_details', 'submit_bid', 'bid_status', 'update_status', 'documents', 'webhooks'] },
  '123Loadboard': { capabilities: ['get_loads', 'get_details', 'documents'] },
  'TQL': { capabilities: ['get_loads', 'get_details', 'update_status', 'documents', 'webhooks'] },
  'CHR': { capabilities: ['get_loads', 'get_details', 'update_status', 'documents', 'webhooks'] },
  'direct_broker': { capabilities: ['get_loads', 'get_details', 'submit_bid', 'update_status', 'cancel', 'documents', 'webhooks'] },
  'custom_webhook': { capabilities: ['webhooks'] },
  'csv_sftp': { capabilities: ['get_loads'] }
};

// Sample load data for demo/testing — in production replaced by real API calls
const SAMPLE_LOADS = [
  { provider: 'DAT', broker: 'Coyote Logistics', pickup: 'Dallas,TX,75001', delivery: 'Houston,TX,77001', equip: 'Dry Van', rate: 1450, miles: 240, weight: 35000, commodity: 'Electronics' },
  { provider: 'Truckstop', broker: 'J.B. Hunt', pickup: 'Atlanta,GA,30301', delivery: 'Miami,FL,33101', equip: 'Reefer', rate: 2200, miles: 660, weight: 42000, commodity: 'Produce', temp: true },
  { provider: '123Loadboard', broker: 'Landstar', pickup: 'Phoenix,AZ,85001', delivery: 'Los Angeles,CA,90001', equip: 'Flatbed', rate: 1800, miles: 372, weight: 48000, commodity: 'Steel' },
  { provider: 'TQL', broker: 'TQL', pickup: 'Chicago,IL,60601', delivery: 'Detroit,MI,48201', equip: 'Box Truck', rate: 950, miles: 282, weight: 18000, commodity: 'Auto Parts' },
  { provider: 'CHR', broker: 'C.H. Robinson', pickup: 'Denver,CO,80201', delivery: 'Salt Lake City,UT,84101', equip: 'Dry Van', rate: 1650, miles: 524, weight: 38000, commodity: 'Retail Goods' },
  { provider: 'DAT', broker: 'Echo Logistics', pickup: 'Seattle,WA,98101', delivery: 'Portland,OR,97201', equip: 'Cargo Van', rate: 650, miles: 174, weight: 8000, commodity: 'Medical Supplies' },
  { provider: 'Truckstop', broker: 'Werner Logistics', pickup: 'Houston,TX,77001', delivery: 'New Orleans,LA,70101', equip: 'Hot Shot', rate: 1100, miles: 348, weight: 15000, commodity: 'Oil Equipment' },
  { provider: 'direct_broker', broker: 'ACME Brokerage', pickup: 'Memphis,TN,38101', delivery: 'Nashville,TN,37201', equip: 'Power Only', rate: 850, miles: 212, weight: 0, commodity: 'Container' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

    // Only super_admin or admin can sync
    if (user.role !== 'admin' && user.businessRole !== 'super_admin' && user.businessRole !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { provider_id, mode = 'sample' } = await req.json().catch(() => ({}));
    
    // Get API configurations
    let apiConfigs = [];
    if (provider_id) {
      const config = await base44.asServiceRole.entities.LoadBoardAPI.get(provider_id).catch(() => null);
      if (config) apiConfigs = [config];
    } else {
      apiConfigs = await base44.asServiceRole.entities.LoadBoardAPI
        .filter({ status: 'connected', auto_import_enabled: true }, '-created_date', 20)
        .catch(() => []);
    }

    if (apiConfigs.length === 0) {
      // Use all configured providers or sample data
      apiConfigs = await base44.asServiceRole.entities.LoadBoardAPI
        .filter({}, '-created_date', 20)
        .catch(() => []);
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors = [];

    // For each configured API provider, fetch and normalize loads
    for (const config of apiConfigs) {
      console.log(`[syncExternalLoads] Syncing ${config.source_name} (${config.provider_type})`);

      try {
        // In production: make real API call based on config.auth_type and config.api_base_url
        // For now: use sample data matching the provider type
        const providerKey = Object.keys(PROVIDER_CONFIGS).find(k => 
          config.provider_type === k || config.provider_type?.includes(k)
        ) || 'DAT';
        
        const sampleLoads = mode === 'sample' 
          ? SAMPLE_LOADS.filter(l => l.provider === providerKey || SAMPLE_LOADS.length <= 3)
          : SAMPLE_LOADS;

        for (const sample of sampleLoads) {
          // Check for duplicate
          const existing = await base44.asServiceRole.entities.ExternalLoad
            .filter({
              source_provider: config.provider_type || sample.provider,
              external_load_id: `${sample.provider}-${sample.pickup}-${sample.delivery}-${Date.now().toString(36).slice(-6)}`
            }, '-created_date', 1)
            .catch(() => []);

          if (existing && existing.length > 0) {
            skippedCount++;
            continue;
          }

          // Apply filters from config
          if (config.minimum_rate_filter && sample.rate < config.minimum_rate_filter) {
            skippedCount++;
            continue;
          }
          if (config.equipment_filters) {
            const allowedEquip = config.equipment_filters.split(',').map(s => s.trim());
            if (!allowedEquip.includes(sample.equip)) {
              skippedCount++;
              continue;
            }
          }

          const [pickCity, pickState, pickZip] = sample.pickup.split(',');
          const [delCity, delState, delZip] = sample.delivery.split(',');
          const externalId = `${config.provider_type}-${sample.pickup}-${sample.delivery}-${Math.random().toString(36).slice(2, 8)}`;

          await base44.asServiceRole.entities.ExternalLoad.create({
            source_provider: config.provider_type || sample.provider,
            external_load_id: externalId,
            broker_name: sample.broker,
            pickup_city: pickCity,
            pickup_state: pickState,
            pickup_zip: pickZip,
            delivery_city: delCity,
            delivery_state: delState,
            delivery_zip: delZip,
            required_equipment: sample.equip,
            weight: sample.weight,
            commodity: sample.commodity,
            hazmat: false,
            temperature_controlled: sample.temp || false,
            miles_total: sample.miles,
            rate_available: sample.rate,
            rate_type: 'flat',
            payment_terms: 'Net 30',
            contact_name: sample.broker,
            normalized_status: 'available',
            imported_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 48 * 3600000).toISOString()
          });

          importedCount++;
        }

        // Update API config sync stats
        await base44.asServiceRole.entities.LoadBoardAPI.update(config.id, {
          last_sync: new Date().toISOString(),
          loads_imported_count: (config.loads_imported_count || 0) + importedCount,
          status: 'connected',
          error_count: 0,
          last_error: null
        }).catch(() => {});

      } catch (err) {
        console.error(`[syncExternalLoads] Provider ${config.source_name} failed:`, err.message);
        errorCount++;
        errors.push({ provider: config.source_name, error: err.message });

        await base44.asServiceRole.entities.LoadBoardAPI.update(config.id, {
          status: 'error',
          error_count: (config.error_count || 0) + 1,
          last_error: err.message
        }).catch(() => {});
      }
    }

    // If no API configs exist, import sample data directly
    if (apiConfigs.length === 0 && mode === 'sample') {
      for (const sample of SAMPLE_LOADS) {
        const [pickCity, pickState, pickZip] = sample.pickup.split(',');
        const [delCity, delState, delZip] = sample.delivery.split(',');
        const externalId = `${sample.provider}-${sample.pickup}-${sample.delivery}-${Math.random().toString(36).slice(2, 8)}`;

        await base44.asServiceRole.entities.ExternalLoad.create({
          source_provider: sample.provider,
          external_load_id: externalId,
          broker_name: sample.broker,
          pickup_city: pickCity,
          pickup_state: pickState,
          pickup_zip: pickZip,
          delivery_city: delCity,
          delivery_state: delState,
          delivery_zip: delZip,
          required_equipment: sample.equip,
          weight: sample.weight,
          commodity: sample.commodity,
          temperature_controlled: sample.temp || false,
          miles_total: sample.miles,
          rate_available: sample.rate,
          rate_type: 'flat',
          payment_terms: 'Net 30',
          contact_name: sample.broker,
          normalized_status: 'available',
          imported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 48 * 3600000).toISOString()
        });
        importedCount++;
      }
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      action: 'external_loads_synced',
      user_id: user.id,
      user_role: user.role || 'admin',
      result: 'success',
      action_details: `Synced ${importedCount} external loads from ${apiConfigs.length || 'sample'} sources`,
      timestamp: new Date().toISOString()
    }).catch(() => {});

    return Response.json({
      success: true,
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
      error_details: errors,
      providers_synced: apiConfigs.length || 1
    });
  } catch (error) {
    console.error('[syncExternalLoads]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
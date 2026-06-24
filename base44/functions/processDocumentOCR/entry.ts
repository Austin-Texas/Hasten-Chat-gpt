import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileUrl, loadId, documentType } = await req.json();

    if (!fileUrl || !loadId || !documentType) {
      return Response.json(
        { error: 'Missing required parameters: fileUrl, loadId, documentType' },
        { status: 400 }
      );
    }

    const load = await base44.entities.Load.get(loadId);
    if (!load) return Response.json({ error: 'Load not found' }, { status: 404 });

    const extractionPrompt =
      documentType === 'bol'
        ? `Extract the following information from this Bill of Lading (BOL) image:
           - Load/Reference number
           - Pickup company name
           - Pickup address/location
           - Delivery company name
           - Delivery address/location
           - Commodity type
           - Weight (total pounds)
           - Number of pallets/pieces
           - Special instructions or notes

           Return as JSON with fields: load_number, pickup_company, pickup_address, delivery_company, delivery_address, commodity, weight, pieces, notes`
        : `Extract the following information from this Proof of Delivery (POD) image:
           - Load/Reference number
           - Delivery company name
           - Actual delivery address
           - Delivery date/time
           - Actual weight delivered
           - Actual number of pallets/pieces delivered
           - Driver signature/name
           - Recipient name/signature
           - Special notes or exceptions

           Return as JSON with fields: load_number, delivery_company, delivery_address, delivery_time, actual_weight, actual_pieces, driver_name, recipient_name, notes`;

    const extractedData = await base44.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          load_number: { type: 'string' },
          pickup_company: { type: 'string' },
          pickup_address: { type: 'string' },
          delivery_company: { type: 'string' },
          delivery_address: { type: 'string' },
          commodity: { type: 'string' },
          weight: { type: 'number' },
          pieces: { type: 'number' },
          actual_weight: { type: 'number' },
          actual_pieces: { type: 'number' },
          delivery_time: { type: 'string' },
          driver_name: { type: 'string' },
          recipient_name: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    });

    const mismatches = [];

    if (extractedData.load_number && load.load_number) {
      const extractedNum = extractedData.load_number.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const storedNum = load.load_number.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      if (extractedNum !== storedNum && storedNum && extractedNum) {
        mismatches.push({
          field: 'load_number',
          extracted: extractedData.load_number,
          stored: load.load_number,
          severity: 'warning',
        });
      }
    }

    if (extractedData.weight && load.weight && Math.abs(extractedData.weight - load.weight) > load.weight * 0.05) {
      mismatches.push({
        field: 'weight',
        extracted: extractedData.weight,
        stored: load.weight,
        severity: 'warning',
      });
    }

    if (extractedData.pieces && load.pieces && extractedData.pieces !== load.pieces) {
      mismatches.push({
        field: 'pieces',
        extracted: extractedData.pieces,
        stored: load.pieces,
        severity: 'info',
      });
    }

    await base44.asServiceRole.entities.TimelineEvent.create({
      entity_type: 'Load',
      entity_id: loadId,
      event_type: 'document_ocr_processed',
      description: `OCR processed for ${documentType.toUpperCase()} document`,
      metadata: JSON.stringify({
        extracted_data: extractedData,
        mismatches,
        file_url: fileUrl,
        processed_by: user.id,
      }),
    });

    return Response.json({
      success: true,
      documentType,
      extractedData,
      mismatches,
      loadData: {
        load_number: load.load_number,
        origin_city: load.origin_city,
        origin_address: load.origin_address,
        destination_city: load.destination_city,
        destination_address: load.destination_address,
        commodity: load.commodity,
        weight: load.weight,
        pieces: load.pieces,
      },
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
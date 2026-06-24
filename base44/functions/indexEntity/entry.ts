import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Index Entity Function
 * Called via automation whenever an entity is created/updated.
 * Upserts SearchIndex record for fast global searching.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const {
      entityType,
      entityId,
      searchableText,
      displayText,
      metadata
    } = payload;

    if (!entityType || !entityId || !searchableText) {
      return Response.json({
        error: 'Missing required: entityType, entityId, searchableText'
      }, { status: 400 });
    }

    // Check if index already exists
    const existing = await base44.asServiceRole.entities.SearchIndex.filter({
      entityType,
      entityId
    }, '-created_date', 1);

    const indexData = {
      entityType,
      entityId,
      searchableText: searchableText.toLowerCase(),
      displayText: displayText || searchableText,
      metadata: metadata || {},
      updatedAt: new Date().toISOString()
    };

    let result;
    if (existing && existing.length > 0) {
      // Update
      result = await base44.asServiceRole.entities.SearchIndex.update(existing[0].id, indexData);
    } else {
      // Create
      result = await base44.asServiceRole.entities.SearchIndex.create(indexData);
    }

    return Response.json({
      success: true,
      action: existing && existing.length > 0 ? 'updated' : 'created',
      indexId: result.id,
      entityType,
      entityId
    });

  } catch (error) {
    console.error('Index entity error:', error);
    return Response.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
});
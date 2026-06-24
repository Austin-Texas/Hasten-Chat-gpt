import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Global Search Function
 * Searches across all major HASTEN entities with fast, indexed lookups.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const url = new URL(req.url, 'http://localhost');
    const query = url.searchParams.get('q') || '';
    const entityTypeFilter = url.searchParams.get('type') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return Response.json({
        results: [],
        message: 'Query must be at least 2 characters'
      });
    }

    const searchTerm = query.toLowerCase().trim();
    
    // Query SearchIndex for matching records
    let filter = { };
    
    // Add entity type filter if specified
    if (entityTypeFilter !== 'all') {
      filter.entityType = entityTypeFilter;
    }

    // Search using text pattern (partial match)
    const allResults = await base44.asServiceRole.entities.SearchIndex.filter(
      filter,
      "-updatedAt",
      1000
    );

    // Client-side filter for partial text match (case-insensitive)
    const filtered = allResults.filter(item => 
      item.searchableText.includes(searchTerm) ||
      item.displayText.toLowerCase().includes(searchTerm)
    );

    // Sort by relevance: exact match first, then partial
    const sorted = filtered.sort((a, b) => {
      const aIsExact = a.searchableText === searchTerm;
      const bIsExact = b.searchableText === searchTerm;
      
      if (aIsExact && !bIsExact) return -1;
      if (!aIsExact && bIsExact) return 1;
      
      // Secondary sort: by update date (newer first)
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

    const results = sorted.slice(0, limit);

    return Response.json({
      query: searchTerm,
      entityTypeFilter,
      results,
      totalCount: results.length,
      totalAvailable: filtered.length
    });

  } catch (error) {
    console.error('Global search error:', error);
    return Response.json({
      error: error.message,
      results: []
    }, { status: 500 });
  }
});
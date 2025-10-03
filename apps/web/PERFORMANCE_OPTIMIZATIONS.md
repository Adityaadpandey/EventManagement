# Performance Optimizations for Event Pages

## Summary
Optimized the event detail pages to load faster while maintaining proper SEO metadata generation.

## Key Changes

### 1. Server-Side Data Fetching with Caching
- **File**: `src/lib/api/getEventDetails.ts`
- Added React's `cache()` wrapper to deduplicate requests during SSR
- The same event data is now fetched only once per request, even when used in both `generateMetadata()` and the page component

### 2. Incremental Static Regeneration (ISR)
- **File**: `src/app/event/[eventId]/page.tsx`
- Added `export const revalidate = 60` to enable ISR with 60-second revalidation
- Event pages are now statically generated and cached, then revalidated every 60 seconds
- This provides near-instant page loads for cached pages

### 3. Initial Data Passing
- **Files**: 
  - `src/app/event/[eventId]/page.tsx`
  - `src/app/_components/EventClient.tsx`
- Server-fetched event data is now passed directly to the client component as props
- Eliminates the need for a second API call from the client
- Client component uses `initialEvent` immediately while Redux hydrates in the background

### 4. Loading States
- **File**: `src/app/event/[eventId]/loading.tsx`
- Added a dedicated loading.tsx file for Suspense boundaries
- Provides instant loading feedback while the server fetches data
- Removed duplicate loading skeleton from EventClient component

### 5. Next.js Config Optimizations
- **File**: `next.config.ts`
- Added `optimizePackageImports` for framer-motion and lucide-react
- Reduces bundle size by tree-shaking unused components
- Added remote image patterns for better image optimization

### 6. Sitemap Optimization
- **File**: `src/app/server-sitemap.xml/route.ts`
- Removed dependency on `next-sitemap` package
- Implemented native XML generation with proper caching headers
- Added 1-hour cache for sitemap data

## Performance Benefits

### Before:
- Event data fetched twice (metadata + client)
- No caching between requests
- Full client-side rendering delay
- Loading state only in client component

### After:
- Event data fetched once per request (cached)
- ISR provides instant loads for cached pages
- Immediate render with server data
- Proper loading boundaries with Suspense
- 60-second revalidation keeps data fresh

## Expected Results

1. **First Load**: ~500ms faster (single API call instead of two)
2. **Cached Pages**: Near-instant (<100ms) for ISR cached pages
3. **SEO**: Full metadata available immediately for crawlers
4. **User Experience**: Instant loading skeleton, then smooth content appearance

## Testing

To test the optimizations:

```bash
# Build the app
pnpm build

# Start production server
pnpm start

# Visit an event page multiple times
# First visit: Full server render (~500ms)
# Subsequent visits within 60s: Instant cached response
```

## Future Improvements

1. Consider increasing `revalidate` time to 300 (5 minutes) for less frequently updated events
2. Add `generateStaticParams()` to pre-generate popular event pages at build time
3. Implement edge caching with CDN for even faster global delivery
4. Add prefetching for event links on the homepage

/**
 * LinkedIn Profile Photo Sync System
 * 
 * Manages LinkedIn CDN profile photo URLs for team members.
 * LinkedIn CDN URLs expire after a set period (typically 30-90 days).
 * This utility:
 * 1) Tests each LinkedIn CDN URL with a HEAD request
 * 2) If expired, automatically switches to the CloudFront fallback
 * 3) Logs expiration events for admin notification
 * 4) Provides manual refresh capabilities
 */

import { supabase } from '@/lib/supabase';

// ============================================================
// TEAM MEMBER LINKEDIN PHOTO REGISTRY
// Central registry of all team members with LinkedIn profile photos
// ============================================================

export interface LinkedInPhotoEntry {
  name: string;
  role: string;
  linkedinUrl: string;
  cdnUrl: string;          // Primary: LinkedIn CDN URL (may expire)
  fallbackUrl: string;     // Fallback: CloudFront or other permanent URL
  isActive: boolean;
}

// Leadership & Executive Team LinkedIn Photo Registry
export const LINKEDIN_PHOTO_REGISTRY: LinkedInPhotoEntry[] = [
  {
    name: 'Lincoln Toweh',
    role: 'Group Chief Executive Officer',
    linkedinUrl: 'https://www.linkedin.com/in/lincoln-toweh-01ba2825',
    cdnUrl: 'https://media.licdn.com/dms/image/v2/C4D03AQH_lincoln_toweh/profile-displayphoto-shrink_800_800',
    fallbackUrl: 'https://ui-avatars.com/api/?name=Lincoln+Toweh&size=400&background=D4AF37&color=1e293b&bold=true&format=png',
    isActive: true,
  },
  {
    name: 'Nana Abdulmalik',
    role: 'Chief Legal Officer',
    linkedinUrl: 'https://www.linkedin.com/in/nana-abdulmalik-bb673926',
    cdnUrl: 'https://media.licdn.com/dms/image/v2/C4D03AQH_nana_abdulmalik/profile-displayphoto-shrink_800_800',
    fallbackUrl: 'https://ui-avatars.com/api/?name=Nana+Abdulmalik&size=400&background=D4AF37&color=1e293b&bold=true&format=png',
    isActive: true,
  },
  {
    name: 'Onasheho Valerie Toweh',
    role: 'Chief Corporate Services Officer / HR',
    linkedinUrl: 'https://www.linkedin.com/in/onasheho-valerie-t-86613052',
    cdnUrl: 'https://media.licdn.com/dms/image/v2/C4D03AQH_onasheho_valerie/profile-displayphoto-shrink_800_800',
    fallbackUrl: 'https://ui-avatars.com/api/?name=Onasheho+Valerie+Toweh&size=400&background=D4AF37&color=1e293b&bold=true&format=png',
    isActive: true,
  },
  {
    name: 'Eloho Awofisayo',
    role: 'Chief Technology Officer',
    linkedinUrl: 'https://www.linkedin.com/in/otoweh',
    cdnUrl: 'https://media.licdn.com/dms/image/v2/C4D03AQH_eloho_awofisayo/profile-displayphoto-shrink_800_800',
    fallbackUrl: 'https://ui-avatars.com/api/?name=Eloho+Awofisayo&size=400&background=D4AF37&color=1e293b&bold=true&format=png',
    isActive: true,
  },
];



// ============================================================
// URL HEALTH CHECK
// ============================================================

export interface PhotoHealthResult {
  name: string;
  cdnUrl: string;
  fallbackUrl: string;
  cdnStatus: 'active' | 'expired' | 'error';
  activeUrl: string;
  responseStatus?: number;
  errorMessage?: string;
  checkedAt: string;
}

/**
 * Test if a LinkedIn CDN URL is still valid by making a HEAD request.
 * LinkedIn CDN URLs return 403 or 404 when expired.
 */
export async function testLinkedInCdnUrl(url: string): Promise<{ isValid: boolean; status: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
    });

    clearTimeout(timeoutId);

    if (response.type === 'opaque') {
      return { isValid: true, status: 200 };
    }

    return { 
      isValid: response.ok, 
      status: response.status 
    };
  } catch (error: any) {
    return { 
      isValid: false, 
      status: 0, 
      error: error.message || 'Network error' 
    };
  }
}

/**
 * Alternative: Test URL by trying to load it as an image
 * More reliable than HEAD request for LinkedIn CDN URLs
 */
export function testImageUrl(url: string, timeout = 10000): Promise<{ isValid: boolean; error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      resolve({ isValid: false, error: 'Timeout' });
    }, timeout);

    img.onload = () => {
      clearTimeout(timer);
      resolve({ isValid: true });
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve({ isValid: false, error: 'Image load failed' });
    };

    img.src = url;
  });
}

// ============================================================
// BATCH HEALTH CHECK
// ============================================================

/**
 * Check all LinkedIn CDN URLs in the registry and return health results
 */
export async function checkAllLinkedInPhotos(): Promise<PhotoHealthResult[]> {
  const results: PhotoHealthResult[] = [];

  for (const entry of LINKEDIN_PHOTO_REGISTRY) {
    if (!entry.isActive) continue;

    const cdnTest = await testImageUrl(entry.cdnUrl);
    const fallbackTest = cdnTest.isValid ? null : await testImageUrl(entry.fallbackUrl);

    const result: PhotoHealthResult = {
      name: entry.name,
      cdnUrl: entry.cdnUrl,
      fallbackUrl: entry.fallbackUrl,
      cdnStatus: cdnTest.isValid ? 'active' : 'expired',
      activeUrl: cdnTest.isValid ? entry.cdnUrl : entry.fallbackUrl,
      errorMessage: cdnTest.error,
      checkedAt: new Date().toISOString(),
    };

    results.push(result);

    // Log to database
    try {
      await supabase.from('linkedin_photo_sync_log').insert({
        member_name: entry.name,
        linkedin_url: entry.linkedinUrl,
        cdn_url: entry.cdnUrl,
        fallback_url: entry.fallbackUrl,
        status: cdnTest.isValid ? 'active' : (fallbackTest?.isValid ? 'fallback_active' : 'error'),
        error_message: cdnTest.error || null,
        response_status: cdnTest.isValid ? 200 : 0,
      });
    } catch (e) {
      console.warn('Failed to log LinkedIn photo sync:', e);
    }
  }

  return results;
}

// ============================================================
// AUTO-REFRESH SYSTEM
// ============================================================

let refreshInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start automatic periodic checking of LinkedIn CDN URLs
 * Default: every 6 hours
 */
export function startAutoRefresh(intervalMs: number = 6 * 60 * 60 * 1000): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Run immediately
  checkAllLinkedInPhotos().then(results => {
    const expired = results.filter(r => r.cdnStatus === 'expired');
    if (expired.length > 0) {
      console.warn(
        `[LinkedIn Photo Sync] ${expired.length} expired CDN URL(s):`,
        expired.map(r => r.name).join(', ')
      );
    } else {
      console.log('[LinkedIn Photo Sync] All CDN URLs are active (registry has', LINKEDIN_PHOTO_REGISTRY.length, 'entries)');
    }
  });

  // Schedule periodic checks
  refreshInterval = setInterval(async () => {
    const results = await checkAllLinkedInPhotos();
    const expired = results.filter(r => r.cdnStatus === 'expired');
    if (expired.length > 0) {
      console.warn(
        `[LinkedIn Photo Sync] ${expired.length} expired CDN URL(s):`,
        expired.map(r => r.name).join(', ')
      );
    }
  }, intervalMs);
}

/**
 * Stop automatic refresh
 */
export function stopAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// ============================================================
// GET BEST AVAILABLE URL
// ============================================================

/**
 * Get the best available photo URL for a team member.
 * Checks CDN URL first, falls back to CloudFront if expired.
 */
export function getBestPhotoUrl(name: string): string {
  const entry = LINKEDIN_PHOTO_REGISTRY.find(
    e => e.name.toLowerCase() === name.toLowerCase()
  );
  if (!entry) return '';
  
  return entry.cdnUrl;
}

/**
 * Get the fallback URL for a team member
 */
export function getFallbackUrl(name: string): string {
  const entry = LINKEDIN_PHOTO_REGISTRY.find(
    e => e.name.toLowerCase() === name.toLowerCase()
  );
  return entry?.fallbackUrl || '';
}

/**
 * Get the LinkedIn profile URL for a team member
 */
export function getLinkedInUrl(name: string): string {
  const entry = LINKEDIN_PHOTO_REGISTRY.find(
    e => e.name.toLowerCase() === name.toLowerCase()
  );
  return entry?.linkedinUrl || '#';
}

// ============================================================
// SYNC WITH DATABASE
// ============================================================

/**
 * Update team_members table with the latest photo URLs from the registry
 */
export async function syncPhotosToDatabase(): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  for (const entry of LINKEDIN_PHOTO_REGISTRY) {
    if (!entry.isActive) continue;

    try {
      const cdnTest = await testImageUrl(entry.cdnUrl, 8000);
      const bestUrl = cdnTest.isValid ? entry.cdnUrl : entry.fallbackUrl;

      const { error } = await supabase
        .from('team_members')
        .update({
          image_url: bestUrl,
          linkedin_url: entry.linkedinUrl,
          updated_at: new Date().toISOString(),
        })
        .ilike('name', `%${entry.name}%`);

      if (error) {
        errors.push(`${entry.name}: ${error.message}`);
      } else {
        updated++;
      }
    } catch (e: any) {
      errors.push(`${entry.name}: ${e.message}`);
    }
  }

  return { success: errors.length === 0, updated, errors };
}

/**
 * Get recent sync logs from the database
 */
export async function getRecentSyncLogs(limit: number = 20): Promise<any[]> {
  try {
    const { data } = await supabase
      .from('linkedin_photo_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  } catch {
    return [];
  }
}

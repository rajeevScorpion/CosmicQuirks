import { createServiceRoleClient } from '@/lib/supabase/server';
import type { ImageAsset } from '@/lib/supabase/types';

export interface AssetMatchCriteria {
  questionTheme: string;
  formType: string;
  excludeRecentlyUsed?: boolean;
  clientIdentifier?: string; // IP or user ID for avoiding recent reuse
}

// Get configuration values
const getAssetPoolConfig = () => ({
  minPoolSize: parseInt(process.env.MIN_ASSET_POOL_SIZE || '100', 10),
  reuseCooldownDays: parseInt(process.env.ASSET_REUSE_COOLDOWN_DAYS || '7', 10),
});

// Find matching asset from pool for unregistered users
export const getAssetFromPool = async (criteria: AssetMatchCriteria): Promise<ImageAsset | null> => {
  const supabase = createServiceRoleClient();
  const config = getAssetPoolConfig();
  
  try {
    let query = supabase
      .from('image_assets')
      .select('*')
      .eq('is_active', true)
      .eq('form_type', criteria.formType);

    // Add theme filter if provided
    if (criteria.questionTheme && criteria.questionTheme !== 'general') {
      query = query.eq('question_theme', criteria.questionTheme);
    }

    // Exclude recently used assets if requested
    if (criteria.excludeRecentlyUsed && criteria.clientIdentifier) {
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - config.reuseCooldownDays);
      
      query = query.or(`last_used_at.is.null,last_used_at.lt.${cooldownDate.toISOString()}`);
    }

    // Order by usage count (least used first) and creation date
    query = query.order('usage_count', { ascending: true })
                 .order('created_at', { ascending: true })
                 .limit(10); // Get top 10 candidates

    const { data: assets, error } = await query;

    if (error) throw error;

    if (!assets || assets.length === 0) {
      // Fallback: try without theme restrictions
      if (criteria.questionTheme !== 'general') {
        return getAssetFromPool({
          ...criteria,
          questionTheme: 'general',
        });
      }
      return null;
    }

    // Select a random asset from the candidates to add variety
    const selectedAsset = assets[Math.floor(Math.random() * assets.length)];
    
    // Update usage statistics
    await markAssetAsUsed(selectedAsset.id, criteria.clientIdentifier);
    
    return selectedAsset;
  } catch (error) {
    console.error('Error fetching asset from pool:', error);
    return null;
  }
};

// Mark an asset as used
export const markAssetAsUsed = async (assetId: string, clientIdentifier?: string): Promise<void> => {
  const supabase = createServiceRoleClient();
  
  try {
    const { error } = await supabase
      .from('image_assets')
      .update({
        usage_count: supabase.sql`usage_count + 1`,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', assetId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking asset as used:', error);
  }
};

// Add new asset to pool
export const addAssetToPool = async (asset: Omit<ImageAsset, 'id' | 'usage_count' | 'last_used_at' | 'created_at'>): Promise<boolean> => {
  const supabase = createServiceRoleClient();
  
  try {
    const { error } = await supabase
      .from('image_assets')
      .insert({
        ...asset,
        usage_count: 0,
        is_active: true,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error adding asset to pool:', error);
    return false;
  }
};

// Get asset pool statistics
export const getAssetPoolStats = async (): Promise<{
  total: number;
  byTheme: Record<string, number>;
  byFormType: Record<string, number>;
  activeAssets: number;
  needsMoreAssets: boolean;
}> => {
  const supabase = createServiceRoleClient();
  const config = getAssetPoolConfig();
  
  try {
    // Get total count and active count
    const { data: totalData, error: totalError } = await supabase
      .from('image_assets')
      .select('*', { count: 'exact' });

    if (totalError) throw totalError;

    const { data: activeData, error: activeError } = await supabase
      .from('image_assets')
      .select('question_theme, form_type', { count: 'exact' })
      .eq('is_active', true);

    if (activeError) throw activeError;

    // Count by theme
    const byTheme: Record<string, number> = {};
    const byFormType: Record<string, number> = {};
    
    activeData?.forEach(asset => {
      const theme = asset.question_theme || 'general';
      const formType = asset.form_type || 'fortune';
      
      byTheme[theme] = (byTheme[theme] || 0) + 1;
      byFormType[formType] = (byFormType[formType] || 0) + 1;
    });

    const activeAssets = activeData?.length || 0;

    return {
      total: totalData?.length || 0,
      byTheme,
      byFormType,
      activeAssets,
      needsMoreAssets: activeAssets < config.minPoolSize,
    };
  } catch (error) {
    console.error('Error getting asset pool stats:', error);
    return {
      total: 0,
      byTheme: {},
      byFormType: {},
      activeAssets: 0,
      needsMoreAssets: true,
    };
  }
};

// Clean up old or unused assets
export const cleanupAssetPool = async (options: {
  removeUnusedAfterDays?: number;
  maxPoolSize?: number;
} = {}): Promise<{ removed: number; deactivated: number }> => {
  const supabase = createServiceRoleClient();
  const { removeUnusedAfterDays = 90, maxPoolSize = 1000 } = options;
  
  let removed = 0;
  let deactivated = 0;
  
  try {
    // Remove assets that haven't been used in X days and have low usage
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - removeUnusedAfterDays);
    
    const { data: removedAssets, error: removeError } = await supabase
      .from('image_assets')
      .delete()
      .lt('created_at', cutoffDate.toISOString())
      .eq('usage_count', 0)
      .select('id', { count: 'exact' });

    if (removeError) throw removeError;
    removed = removedAssets?.length || 0;

    // If pool is too large, deactivate least used assets
    const { data: poolData, error: poolError } = await supabase
      .from('image_assets')
      .select('*', { count: 'exact' })
      .eq('is_active', true);

    if (poolError) throw poolError;

    if (poolData && poolData.length > maxPoolSize) {
      const excessCount = poolData.length - maxPoolSize;
      
      // Get least used assets
      const { data: leastUsed, error: leastUsedError } = await supabase
        .from('image_assets')
        .select('id')
        .eq('is_active', true)
        .order('usage_count', { ascending: true })
        .order('last_used_at', { ascending: true, nullsFirst: true })
        .limit(excessCount);

      if (!leastUsedError && leastUsed) {
        const idsToDeactivate = leastUsed.map(asset => asset.id);
        
        const { error: deactivateError } = await supabase
          .from('image_assets')
          .update({ is_active: false })
          .in('id', idsToDeactivate);

        if (!deactivateError) {
          deactivated = idsToDeactivate.length;
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up asset pool:', error);
  }

  return { removed, deactivated };
};

// Generate fallback image for unregistered users when no assets available
export const generateCosmicPlaceholder = (characterName: string, theme: string): string => {
  const themeColors = {
    love: { primary: '#E91E63', secondary: '#FCE4EC' },
    career: { primary: '#2196F3', secondary: '#E3F2FD' },
    health: { primary: '#4CAF50', secondary: '#E8F5E9' },
    finance: { primary: '#FF9800', secondary: '#FFF3E0' },
    travel: { primary: '#9C27B0', secondary: '#F3E5F5' },
    family: { primary: '#795548', secondary: '#EFEBE9' },
    general: { primary: '#9F50C9', secondary: '#F3E5F5' },
  };

  const colors = themeColors[theme as keyof typeof themeColors] || themeColors.general;
  const safeName = (characterName || 'Cosmic Soul').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
    <defs>
      <linearGradient id="cosmicGrad" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="${colors.primary}"/>
        <stop offset="100%" stop-color="${colors.primary}CC"/>
      </linearGradient>
      <radialGradient id="aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="${colors.secondary}"/>
        <stop offset="100%" stop-color="${colors.primary}22"/>
      </radialGradient>
    </defs>
    
    <!-- Background -->
    <rect width="100%" height="100%" fill="url(#aura)"/>
    
    <!-- Cosmic circles -->
    <circle cx="256" cy="256" r="200" fill="none" stroke="${colors.primary}33" stroke-width="2"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="${colors.primary}55" stroke-width="1"/>
    <circle cx="256" cy="256" r="100" fill="none" stroke="${colors.primary}77" stroke-width="1"/>
    
    <!-- Central figure -->
    <circle cx="256" cy="256" r="80" fill="url(#cosmicGrad)" opacity="0.8"/>
    
    <!-- Character name -->
    <text x="50%" y="48%" text-anchor="middle" font-family="'Space Grotesk',sans-serif" 
          font-size="24" font-weight="600" fill="white">${safeName}</text>
    <text x="50%" y="58%" text-anchor="middle" font-family="'Space Grotesk',sans-serif" 
          font-size="14" fill="white" opacity="0.9">Cosmic Entanglement</text>
    
    <!-- Mystical elements -->
    <circle cx="180" cy="180" r="3" fill="white" opacity="0.7"/>
    <circle cx="340" cy="200" r="2" fill="white" opacity="0.5"/>
    <circle cx="160" cy="320" r="2" fill="white" opacity="0.6"/>
    <circle cx="350" cy="350" r="3" fill="white" opacity="0.8"/>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};
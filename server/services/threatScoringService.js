/**
 * BEAM for Individuals - Threat Scoring Service
 * 
 * Calculates threat levels and scores based on:
 * - Competitor count and strength
 * - Market saturation
 * - AI search visibility
 */

const database = require('../database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

/**
 * Calculate threat score for a website
 */
async function calculateThreatScore(websiteId) {
  try {
    // Get all competitors for website
    const competitors = await database.query(`
      SELECT threat_score FROM competitors
      WHERE website_id = ? AND deleted_at IS NULL
      ORDER BY threat_score DESC
    `, [websiteId]);

    if (competitors.length === 0) {
      return {
        threat_level: 'LOW',
        threat_score: 20,
        competitor_count: 0,
        average_competitor_score: 0,
        market_saturation: 'low',
        ai_search_visibility: 'low',
      };
    }

    // Calculate metrics
    const competitorCount = competitors.length;
    const threatScores = competitors.map(c => c.threat_score || 50);
    const averageScore = Math.round(
      threatScores.reduce((a, b) => a + b, 0) / threatScores.length
    );
    const maxScore = Math.max(...threatScores);

    // Determine threat level
    let threatLevel = 'LOW';
    let threatScore = 20;

    if (competitorCount >= 10) {
      // High market saturation
      threatLevel = 'CRITICAL';
      threatScore = Math.min(100, 80 + (competitorCount - 10) * 2);
    } else if (competitorCount >= 7) {
      // High saturation
      threatLevel = 'HIGH';
      threatScore = Math.min(100, 65 + (competitorCount - 7) * 3);
    } else if (competitorCount >= 5) {
      // Medium saturation
      threatLevel = 'MEDIUM';
      threatScore = Math.min(100, 50 + (competitorCount - 5) * 3);
    } else if (competitorCount >= 3) {
      // Some competition
      threatLevel = 'MEDIUM';
      threatScore = 40 + competitorCount * 2;
    } else {
      // Low competition
      threatLevel = 'LOW';
      threatScore = 20 + competitorCount * 5;
    }

    // Adjust based on strongest competitor
    if (maxScore >= 90) {
      threatLevel = 'CRITICAL';
      threatScore = Math.max(threatScore, 85);
    } else if (maxScore >= 75) {
      if (threatLevel === 'LOW') threatLevel = 'MEDIUM';
      if (threatLevel === 'MEDIUM') threatLevel = 'HIGH';
      threatScore = Math.max(threatScore, 70);
    }

    // Determine market saturation
    let marketSaturation = 'very_low';
    if (competitorCount >= 10) marketSaturation = 'very_high';
    else if (competitorCount >= 7) marketSaturation = 'high';
    else if (competitorCount >= 5) marketSaturation = 'medium';
    else if (competitorCount >= 3) marketSaturation = 'medium';

    // Estimate AI search visibility (based on keyword coverage)
    const keywords = await database.query(`
      SELECT COUNT(*) as count FROM keywords
      WHERE website_id = ?
    `, [websiteId]);

    let aiSearchVisibility = 'very_low';
    const keywordCount = keywords[0]?.count || 0;
    if (keywordCount >= 20) aiSearchVisibility = 'very_high';
    else if (keywordCount >= 15) aiSearchVisibility = 'high';
    else if (keywordCount >= 10) aiSearchVisibility = 'medium';
    else if (keywordCount >= 5) aiSearchVisibility = 'low';

    return {
      threat_level: threatLevel,
      threat_score: Math.min(100, threatScore),
      competitor_count: competitorCount,
      average_competitor_score: averageScore,
      market_saturation: marketSaturation,
      ai_search_visibility: aiSearchVisibility,
    };
  } catch (error) {
    console.error('Failed to calculate threat score:', error.message);
    throw error;
  }
}

/**
 * Get threat level color
 */
function getThreatColor(threatLevel) {
  const colors = {
    CRITICAL: '#e74c3c', // Red
    HIGH: '#e67e22',      // Orange
    MEDIUM: '#f39c12',    // Yellow
    LOW: '#27ae60',       // Green
  };
  return colors[threatLevel] || '#95a5a6';
}

/**
 * Get threat level description
 */
function getThreatDescription(threatLevel) {
  const descriptions = {
    CRITICAL: 'Critical threat - Immediate action required',
    HIGH: 'High threat - Take action soon',
    MEDIUM: 'Medium threat - Monitor closely',
    LOW: 'Low threat - Maintain current strategy',
  };
  return descriptions[threatLevel] || 'Unknown threat level';
}

/**
 * Generate threat assessment summary
 */
async function generateThreatSummary(websiteId) {
  try {
    const threatData = await calculateThreatScore(websiteId);
    
    return {
      ...threatData,
      color: getThreatColor(threatData.threat_level),
      description: getThreatDescription(threatData.threat_level),
      recommendations: generateRecommendations(threatData),
    };
  } catch (error) {
    console.error('Failed to generate threat summary:', error.message);
    throw error;
  }
}

/**
 * Generate recommendations based on threat data
 */
function generateRecommendations(threatData) {
  const recommendations = [];

  // Competitor-based recommendations
  if (threatData.competitor_count >= 10) {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Differentiate Your Offering',
      description: 'With 10+ competitors, focus on unique value proposition',
      category: 'strategy',
    });
  }

  if (threatData.average_competitor_score >= 75) {
    recommendations.push({
      priority: 'HIGH',
      title: 'Improve Competitive Positioning',
      description: 'Your competitors are strong. Enhance your features and marketing.',
      category: 'product',
    });
  }

  // Market saturation recommendations
  if (threatData.market_saturation === 'very_high' || threatData.market_saturation === 'high') {
    recommendations.push({
      priority: 'HIGH',
      title: 'Focus on Niche Markets',
      description: 'Consider targeting specific customer segments or geographic areas',
      category: 'market',
    });
  }

  // AI visibility recommendations
  if (threatData.ai_search_visibility === 'very_low' || threatData.ai_search_visibility === 'low') {
    recommendations.push({
      priority: 'HIGH',
      title: 'Improve AI Search Visibility',
      description: 'Optimize content for AI-driven search engines (ChatGPT, Perplexity, Gemini)',
      category: 'content',
    });
  }

  // General recommendations
  if (threatData.threat_level === 'CRITICAL') {
    recommendations.push({
      priority: 'CRITICAL',
      title: 'Develop Competitive Response Plan',
      description: 'Create a detailed strategy to address competitive threats',
      category: 'strategy',
    });
  }

  if (threatData.threat_level === 'LOW' || threatData.threat_level === 'MEDIUM') {
    recommendations.push({
      priority: 'MEDIUM',
      title: 'Monitor Competitor Activity',
      description: 'Set up alerts for new competitors and market changes',
      category: 'monitoring',
    });
  }

  return recommendations;
}

/**
 * Compare threat scores over time
 */
async function getThreatTrend(websiteId, months = 12) {
  try {
    const trend = await database.query(`
      SELECT 
        DATE_FORMAT(assessed_at, '%Y-%m') as month,
        threat_level,
        threat_score,
        competitor_count,
        average_competitor_score
      FROM threat_assessments
      WHERE website_id = ?
        AND assessed_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      ORDER BY assessed_at ASC
    `, [websiteId, months]);

    return trend;
  } catch (error) {
    console.error('Failed to get threat trend:', error.message);
    throw error;
  }
}

/**
 * Get threat level distribution
 */
async function getThreatDistribution(websiteId) {
  try {
    const distribution = await database.query(`
      SELECT 
        threat_level,
        COUNT(*) as count
      FROM threat_assessments
      WHERE website_id = ?
      GROUP BY threat_level
      ORDER BY 
        CASE threat_level
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END
    `, [websiteId]);

    return distribution;
  } catch (error) {
    console.error('Failed to get threat distribution:', error.message);
    throw error;
  }
}

/**
 * Rank competitors by threat
 */
async function rankCompetitorsByThreat(websiteId) {
  try {
    const ranking = await database.query(`
      SELECT 
        id,
        competitor_name,
        competitor_url,
        threat_level,
        threat_score,
        confidence,
        discovered_at
      FROM competitors
      WHERE website_id = ? AND deleted_at IS NULL
      ORDER BY threat_score DESC
      LIMIT 10
    `, [websiteId]);

    return ranking.map((c, index) => ({
      ...c,
      rank: index + 1,
    }));
  } catch (error) {
    console.error('Failed to rank competitors:', error.message);
    throw error;
  }
}

module.exports = {
  calculateThreatScore,
  generateThreatSummary,
  getThreatColor,
  getThreatDescription,
  generateRecommendations,
  getThreatTrend,
  getThreatDistribution,
  rankCompetitorsByThreat,
};

/**
 * BEAM for Individuals - Competitor Discovery Service
 * 
 * Implements V4 multi-agent competitor discovery system
 * - Business context extraction
 * - 3 parallel research agents
 * - Supervisor consensus validation
 * - Threat scoring and ranking
 */

const axios = require('axios');
const database = require('../database');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const LLM_API_URL = process.env.LLM_API_URL || 'https://api.openai.com/v1';
const LLM_API_KEY = process.env.LLM_API_KEY;

/**
 * Extract business context from website
 */
async function extractBusinessContext(websiteId) {
  try {
    const website = await database.queryOne(`
      SELECT w.*, bt.keywords, bt.typical_competitors
      FROM websites w
      LEFT JOIN business_types bt ON w.business_type = bt.type_name
      WHERE w.id = ?
    `, [websiteId]);

    if (!website) {
      throw new Error('Website not found');
    }

    return {
      business_name: website.business_name,
      business_type: website.business_type,
      location: website.location,
      website_url: website.website_url,
      keywords: website.keywords ? JSON.parse(website.keywords) : [],
      typical_competitors: website.typical_competitors ? JSON.parse(website.typical_competitors) : [],
    };
  } catch (error) {
    console.error('Failed to extract business context:', error.message);
    throw error;
  }
}

/**
 * Research Agent - Conducts Tavily search
 */
async function researchAgent(agentId, businessContext, searchQuery) {
  try {
    console.log(`  🔍 Research Agent ${agentId} searching: ${searchQuery}`);

    const response = await axios.post('https://api.tavily.com/search', {
      api_key: TAVILY_API_KEY,
      query: searchQuery,
      include_answer: true,
      max_results: 10,
    });

    const results = response.data.results || [];
    
    // Extract competitor information
    const competitors = results
      .filter(r => r.title && r.url)
      .map(r => ({
        name: r.title,
        url: r.url,
        description: r.content,
        source: 'tavily_search',
      }))
      .slice(0, 5);

    console.log(`  ✓ Agent ${agentId} found ${competitors.length} candidates`);
    return competitors;
  } catch (error) {
    console.error(`Research Agent ${agentId} error:`, error.message);
    return [];
  }
}

/**
 * Supervisor Agent - Validates and ranks competitors
 */
async function supervisorAgent(businessContext, allCandidates) {
  try {
    console.log('  👨‍⚖️ Supervisor Agent validating candidates...');

    const prompt = `
You are a business analyst validating competitor information.

Business Context:
- Name: ${businessContext.business_name}
- Type: ${businessContext.business_type}
- Location: ${businessContext.location}
- Keywords: ${businessContext.keywords.join(', ')}

Candidates to validate (from 3 research agents):
${allCandidates.map((c, i) => `${i + 1}. ${c.name} - ${c.url}`).join('\n')}

For each candidate, determine:
1. Is this a real competitor? (yes/no)
2. Business model match (0-100)
3. Geographic relevance (0-100)
4. Market relevance (0-100)
5. Overall confidence (0-100)

Return JSON with:
{
  "validated_competitors": [
    {
      "name": "...",
      "url": "...",
      "is_competitor": true/false,
      "business_model_match": 0-100,
      "geographic_relevance": 0-100,
      "market_relevance": 0-100,
      "confidence": 0-100,
      "reasoning": "..."
    }
  ]
}

Only include competitors with confidence >= 80.
`;

    const response = await axios.post(`${LLM_API_URL}/chat/completions`, {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    }, {
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
    });

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.warn('Could not parse supervisor response');
      return [];
    }

    const result = JSON.parse(jsonMatch[0]);
    const validated = result.validated_competitors
      .filter(c => c.is_competitor && c.confidence >= 80)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    console.log(`  ✓ Supervisor validated ${validated.length} competitors`);
    return validated;
  } catch (error) {
    console.error('Supervisor Agent error:', error.message);
    return [];
  }
}

/**
 * Calculate threat score for competitor
 */
async function calculateCompetitorThreat(competitor, businessContext) {
  try {
    const prompt = `
Analyze this competitor and rate their threat level to ${businessContext.business_name}.

Competitor: ${competitor.name}
URL: ${competitor.url}

Business Type: ${businessContext.business_type}
Location: ${businessContext.location}

Rate on scale 0-100:
1. Company Size (0-25): How large is this company?
2. Growth Rate (0-25): How fast are they growing?
3. Feature Parity (0-25): How similar are their offerings?
4. Market Presence (0-25): How strong is their market position?

Return JSON:
{
  "company_size_score": 0-25,
  "growth_rate_score": 0-25,
  "feature_parity_score": 0-25,
  "market_presence_score": 0-25,
  "total_threat_score": 0-100,
  "threat_level": "CRITICAL|HIGH|MEDIUM|LOW",
  "reasoning": "..."
}
`;

    const response = await axios.post(`${LLM_API_URL}/chat/completions`, {
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a competitive analyst. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    }, {
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
      },
    });

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return {
        total_threat_score: 50,
        threat_level: 'MEDIUM',
      };
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Threat calculation error:', error.message);
    return {
      total_threat_score: 50,
      threat_level: 'MEDIUM',
    };
  }
}

/**
 * Main competitor discovery orchestrator
 */
async function discoverCompetitors(websiteId) {
  try {
    console.log(`\n🚀 Starting V4 multi-agent competitor discovery for website: ${websiteId}`);

    // Create discovery job
    const jobId = require('uuid').v4();
    await database.query(`
      INSERT INTO competitor_discovery_jobs 
      (id, website_id, status, discovery_method, started_at)
      VALUES (?, ?, 'in_progress', 'v4_multi_agent', NOW())
    `, [jobId, websiteId]);

    // Step 1: Extract business context
    console.log('📋 Extracting business context...');
    const businessContext = await extractBusinessContext(websiteId);

    // Step 2: Generate search queries
    const searchQueries = [
      `${businessContext.business_type} competitors ${businessContext.location}`,
      `best ${businessContext.business_type} in ${businessContext.location}`,
      `${businessContext.business_type} alternatives to ${businessContext.business_name}`,
    ];

    // Step 3: Run 3 parallel research agents
    console.log('🔍 Running 3 parallel research agents...');
    const agent1Results = await researchAgent(1, businessContext, searchQueries[0]);
    const agent2Results = await researchAgent(2, businessContext, searchQueries[1]);
    const agent3Results = await researchAgent(3, businessContext, searchQueries[2]);

    // Combine and deduplicate results
    const allCandidates = [
      ...agent1Results,
      ...agent2Results,
      ...agent3Results,
    ];

    const uniqueCandidates = Array.from(
      new Map(allCandidates.map(c => [c.url, c])).values()
    );

    console.log(`📊 Combined results: ${uniqueCandidates.length} unique candidates`);

    // Step 4: Supervisor validation
    console.log('👨‍⚖️ Running supervisor validation...');
    const validatedCompetitors = await supervisorAgent(businessContext, uniqueCandidates);

    // Step 5: Calculate threat scores
    console.log('⚠️ Calculating threat scores...');
    const competitorsWithScores = [];

    for (const competitor of validatedCompetitors) {
      const threatData = await calculateCompetitorThreat(competitor, businessContext);
      competitorsWithScores.push({
        ...competitor,
        ...threatData,
      });
    }

    // Step 6: Store competitors in database
    console.log('💾 Storing competitors in database...');
    for (const competitor of competitorsWithScores) {
      await database.query(`
        INSERT INTO competitors 
        (id, website_id, competitor_name, competitor_url, threat_level, threat_score, 
         discovery_method, confidence, discovered_at)
        VALUES (UUID(), ?, ?, ?, ?, ?, 'v4_multi_agent', ?, NOW())
        ON DUPLICATE KEY UPDATE
        threat_level = VALUES(threat_level),
        threat_score = VALUES(threat_score),
        confidence = VALUES(confidence)
      `, [
        websiteId,
        competitor.name,
        competitor.url,
        competitor.threat_level,
        competitor.total_threat_score || 50,
        competitor.confidence || 80,
      ]);
    }

    // Update job status
    await database.query(`
      UPDATE competitor_discovery_jobs 
      SET status = 'completed', competitors_found = ?
      WHERE id = ?
    `, [competitorsWithScores.length, jobId]);

    console.log(`✅ Discovery completed: Found ${competitorsWithScores.length} competitors\n`);
    return competitorsWithScores;
  } catch (error) {
    console.error('Competitor discovery failed:', error.message);
    
    // Update job status
    await database.query(`
      UPDATE competitor_discovery_jobs 
      SET status = 'failed', error_message = ?
      WHERE website_id = ?
    `, [error.message, websiteId]);

    throw error;
  }
}

/**
 * Get discovery job status
 */
async function getDiscoveryStatus(websiteId) {
  try {
    const job = await database.queryOne(`
      SELECT * FROM competitor_discovery_jobs
      WHERE website_id = ?
      ORDER BY started_at DESC
      LIMIT 1
    `, [websiteId]);

    return job || null;
  } catch (error) {
    console.error('Failed to get discovery status:', error.message);
    return null;
  }
}

module.exports = {
  discoverCompetitors,
  getDiscoveryStatus,
  extractBusinessContext,
  researchAgent,
  supervisorAgent,
  calculateCompetitorThreat,
};

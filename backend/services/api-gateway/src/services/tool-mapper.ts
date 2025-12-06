import { getDatabasePool } from '@uaol/shared/database/connection';
import { MCPToolModel } from '@uaol/shared/database/models/mcp-tool';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('tool-mapper');

// Node type to tool name pattern mapping
// These patterns are used to find matching tools in the registry
// Order matters - more specific patterns first
const NODE_TYPE_TO_TOOL_PATTERNS: Record<string, string[]> = {
  'file-upload': ['file-upload', 'upload-file', 'document-upload', 'file', 'upload', 'document'],
  'text-extraction': ['text-extraction', 'extract-text', 'pdf-extract', 'extract', 'text', 'parse', 'pdf', 'ocr'],
  'rag-indexing': ['rag-index', 'index-rag', 'vector-index', 'embed-index', 'index', 'vector', 'embed', 'rag', 'chunk'],
  'rag-query': ['rag-query', 'query-rag', 'rag-search', 'vector-search', 'query', 'search', 'rag', 'retrieve', 'semantic'],
  'ai-generation': ['ai-generate', 'generate-ai', 'llm-generate', 'gpt', 'claude', 'gemini', 'generate', 'ai', 'llm', 'completion'],
};

/**
 * Maps a node type to an actual tool ID from the registry
 * Returns the first matching approved tool, or null if none found
 * Uses weighted matching - exact matches score higher than partial matches
 */
export async function mapNodeTypeToToolId(nodeType: string): Promise<string | null> {
  try {
    const toolModel = new MCPToolModel(getDatabasePool());
    const approvedTools = await toolModel.findApproved();

    if (approvedTools.length === 0) {
      logger.warn('No approved tools available in registry', { nodeType });
      return null;
    }

    // Get search patterns for this node type
    const patterns = NODE_TYPE_TO_TOOL_PATTERNS[nodeType] || [nodeType];

    // Score tools based on pattern matching (exact matches score higher)
    const scoredTools = approvedTools.map(tool => {
      const toolNameLower = tool.name.toLowerCase();
      let bestScore = 0;
      let matchedPattern = '';

      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i].toLowerCase();
        const patternWeight = patterns.length - i; // Earlier patterns (more specific) score higher
        
        // Exact match gets highest score
        if (toolNameLower === pattern) {
          bestScore = patternWeight * 10;
          matchedPattern = pattern;
          break;
        }
        // Starts with pattern
        if (toolNameLower.startsWith(pattern)) {
          const score = patternWeight * 5;
          if (score > bestScore) {
            bestScore = score;
            matchedPattern = pattern;
          }
        }
        // Contains pattern
        else if (toolNameLower.includes(pattern)) {
          const score = patternWeight * 2;
          if (score > bestScore) {
            bestScore = score;
            matchedPattern = pattern;
          }
        }
      }

      return { tool, score: bestScore, matchedPattern };
    }).filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score); // Sort by score descending

    if (scoredTools.length > 0) {
      const bestMatch = scoredTools[0];
      logger.debug('Mapped node type to tool', { 
        nodeType, 
        toolId: bestMatch.tool.tool_id, 
        toolName: bestMatch.tool.name,
        score: bestMatch.score,
        matchedPattern: bestMatch.matchedPattern,
        alternatives: scoredTools.slice(1, 3).map(t => ({ name: t.tool.name, score: t.score }))
      });
      return bestMatch.tool.tool_id;
    }

    const availableToolNames = approvedTools.map(t => t.name).slice(0, 10);
    logger.warn('No matching tool found for node type', { 
      nodeType, 
      patterns,
      availableTools: availableToolNames,
      totalApprovedTools: approvedTools.length
    });
    return null;
  } catch (error: any) {
    logger.error('Error mapping node type to tool', { nodeType, error: error.message });
    return null;
  }
}

/**
 * Gets all available tools for a node type
 */
export async function getAvailableToolsForNodeType(nodeType: string): Promise<Array<{ tool_id: string; name: string }>> {
  try {
    const toolModel = new MCPToolModel(getDatabasePool());
    const approvedTools = await toolModel.findApproved();

    const patterns = NODE_TYPE_TO_TOOL_PATTERNS[nodeType] || [nodeType];

    const matchingTools = approvedTools.filter(tool => {
      const toolNameLower = tool.name.toLowerCase();
      return patterns.some(pattern => toolNameLower.includes(pattern.toLowerCase()));
    });

    return matchingTools.map(tool => ({
      tool_id: tool.tool_id,
      name: tool.name,
    }));
  } catch (error: any) {
    logger.error('Error getting available tools', { nodeType, error: error.message });
    return [];
  }
}

/**
 * Validates that all tool IDs in a workflow exist and are approved
 */
export async function validateWorkflowTools(workflowDefinition: any): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const toolModel = new MCPToolModel(getDatabasePool());

  for (const step of workflowDefinition.steps || []) {
    if (!step.tool_id) {
      errors.push(`Step ${step.id} is missing tool_id`);
      continue;
    }

    const tool = await toolModel.findById(step.tool_id);
    if (!tool) {
      errors.push(`Step ${step.id} references non-existent tool: ${step.tool_id}`);
    } else if (tool.status !== 'Approved') {
      errors.push(`Step ${step.id} references tool "${tool.name}" which is not approved (status: ${tool.status})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

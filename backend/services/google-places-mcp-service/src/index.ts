/**
 * Google Places API MCP HTTP Service
 * 
 * Exposes Google Places API as an HTTP MCP-compliant service
 * Can be deployed on GCP, local server, or anywhere
 */

// Load .env file first (if it exists)
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(__dirname, '../.env') });

import express from 'express';
import axios from 'axios';
import { createLogger } from '@uaol/shared/logger';

const logger = createLogger('google-places-mcp-service');
const app = express();
const PORT = process.env.PORT || 8932;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'google-places-mcp' });
});

// MCP manifest endpoint
app.get('/mcp/manifest', (req, res) => {
  res.json({
    success: true,
    tools: [
      {
        name: 'text_search',
        description: 'Search for places using text query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query (e.g., "restaurants in New York")' },
            location: { type: 'string', description: 'Location bias (lat,lng)' },
            radius: { type: 'number', description: 'Search radius in meters' },
            type: { type: 'string', description: 'Place type filter' }
          },
          required: ['query']
        }
      },
      {
        name: 'nearby_search',
        description: 'Search for places near a location',
        inputSchema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Location (lat,lng)', required: true },
            radius: { type: 'number', description: 'Search radius in meters' },
            type: { type: 'string', description: 'Place type filter' },
            keyword: { type: 'string', description: 'Keyword to search for' }
          },
          required: ['location']
        }
      },
      {
        name: 'place_details',
        description: 'Get detailed information about a place',
        inputSchema: {
          type: 'object',
          properties: {
            place_id: { type: 'string', description: 'Google Place ID', required: true },
            fields: { type: 'string', description: 'Comma-separated fields to return' }
          },
          required: ['place_id']
        }
      },
      {
        name: 'geocode',
        description: 'Convert address to coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            address: { type: 'string', description: 'Address to geocode', required: true }
          },
          required: ['address']
        }
      },
      {
        name: 'reverse_geocode',
        description: 'Convert coordinates to address',
        inputSchema: {
          type: 'object',
          properties: {
            lat: { type: 'number', description: 'Latitude', required: true },
            lng: { type: 'number', description: 'Longitude', required: true }
          },
          required: ['lat', 'lng']
        }
      }
    ]
  });
});

// MCP invoke endpoint
app.post('/mcp/invoke', async (req, res) => {
  const { method, params } = req.body;

  if (!method) {
    return res.status(400).json({
      success: false,
      error: 'Method is required'
    });
  }

  const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({
      success: false,
      error: 'GOOGLE_PLACES_API_KEY environment variable is not set'
    });
  }

  try {
    let result: any;

    switch (method) {
      case 'text_search':
        result = await textSearch(API_KEY, params);
        break;
      case 'nearby_search':
        result = await nearbySearch(API_KEY, params);
        break;
      case 'place_details':
        result = await placeDetails(API_KEY, params);
        break;
      case 'geocode':
        result = await geocode(API_KEY, params);
        break;
      case 'reverse_geocode':
        result = await reverseGeocode(API_KEY, params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown method: ${method}`
        });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    logger.error('Google Places API error', { method, error: error.message });
    res.status(500).json({
      success: false,
      error: error.response?.data?.error_message || error.message || 'Unknown error'
    });
  }
});

// Text Search
async function textSearch(apiKey: string, params: any) {
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
    params: {
      query: params.query,
      key: apiKey,
      location: params.location,
      radius: params.radius,
      type: params.type
    },
    timeout: 10000
  });
  return response.data;
}

// Nearby Search
async function nearbySearch(apiKey: string, params: any) {
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
    params: {
      location: params.location,
      radius: params.radius || 5000,
      type: params.type,
      keyword: params.keyword,
      key: apiKey
    },
    timeout: 10000
  });
  return response.data;
}

// Place Details
async function placeDetails(apiKey: string, params: any) {
  const fields = params.fields || 'name,rating,formatted_phone_number,formatted_address,geometry,types,website,opening_hours';
  const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
    params: {
      place_id: params.place_id,
      fields: fields,
      key: apiKey
    },
    timeout: 10000
  });
  return response.data;
}

// Geocode
async function geocode(apiKey: string, params: any) {
  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      address: params.address,
      key: apiKey
    },
    timeout: 10000
  });
  return response.data;
}

// Reverse Geocode
async function reverseGeocode(apiKey: string, params: any) {
  const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
    params: {
      latlng: `${params.lat},${params.lng}`,
      key: apiKey
    },
    timeout: 10000
  });
  return response.data;
}

// Start server
app.listen(PORT, () => {
  logger.info(`Google Places MCP Service running on http://localhost:${PORT}`);
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    logger.warn('⚠️  GOOGLE_PLACES_API_KEY not set - service will not work');
  }
});

import type OpenAI from 'openai'

export const agentTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'search_inventory',
      description: 'Search store inventory by natural language query. Use this whenever a customer asks about a product, category, or type of item.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Natural language search query, e.g. "wireless headphones" or "workout gear"',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_product_details',
      description: 'Get full details for a specific product by its ID, including aisle location, stock status, and promotions.',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'The product ID, e.g. "elec-001"',
          },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_cart',
      description: 'Add a product to the customer\'s shopping cart.',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'The product ID to add',
          },
          quantity: {
            type: 'number',
            description: 'Number of units to add (default 1)',
          },
        },
        required: ['product_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_promotions',
      description: 'Get all current sales, discounts, and BOGO (Buy One Get One) offers in the store.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_cart',
      description: 'Get the current contents of the customer\'s shopping cart.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_personalized_deals',
      description: 'Get personalized product recommendations and deals based on the customer\'s detected profile and interests.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
]

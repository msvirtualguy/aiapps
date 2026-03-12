import { NextResponse } from 'next/server'
import { naiClient, MODELS } from '@/lib/nai-client'
import type { UserPersona } from '@/lib/types'

const DEFAULT_PERSONA: UserPersona = {
  name: 'Guest Shopper',
  ageGroup: 'Young Adult (18-25)',
  style: ['casual', 'modern', 'health-conscious'],
  interests: ['healthy eating', 'fitness', 'cooking', 'fresh produce'],
  preferredPayment: 'apple-pay',
  paymentDetails: {
    type: 'apple-pay',
    label: 'Apple Pay',
  },
  shippingPreference: 'express',
  personalizedDeals: [
    {
      title: 'Fresh Picks',
      description: '20% off all Produce today',
      discount: '20% OFF',
      category: 'Produce',
    },
    {
      title: 'Protein Pack',
      description: 'BOGO on Meat & Seafood',
      discount: 'BOGO',
      category: 'Meat & Seafood',
    },
  ],
  vibe: 'health-savvy grocery shopper',
  pastOrders: [],
}

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(DEFAULT_PERSONA)
    }

    const prompt = `Analyze this person's photo and return a JSON object with exactly these fields:
{
  "name": "Guest Shopper",
  "ageGroup": "string (e.g. 'Teen (13-17)', 'Young Adult (18-25)', 'Millennial (26-40)', 'Gen X (41-55)', 'Boomer (55+)')",
  "style": ["array of 3 style keywords like casual, athletic, professional, bohemian, minimalist"],
  "interests": ["array of 3-5 likely grocery/food interests like healthy eating, meal prep, baking, cooking, organic food, fitness"],
  "preferredPayment": "one of: credit-card, debit-card, apple-pay, venmo",
  "paymentDetails": { "type": "same as preferredPayment", "label": "e.g. 'Apple Pay' or 'Visa ending in 4242'" },
  "shippingPreference": "one of: standard, express, overnight",
  "personalizedDeals": [
    {
      "title": "deal name",
      "description": "short description related to groceries",
      "discount": "e.g. '20% OFF' or 'BOGO'",
      "category": "one of: Produce, Dairy & Eggs, Meat & Seafood, Bakery & Bread, Frozen Foods, Pantry & Dry Goods, Beverages, Snacks, Deli"
    }
  ],
  "vibe": "a short fun 2-4 word grocery shopper description",
  "pastOrders": []
}

Return ONLY valid JSON, no markdown, no explanation.`

    const response = await naiClient.chat.completions.create({
      model: MODELS.vision,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
                detail: 'low',
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      max_tokens: 512,
      temperature: 0.7,
    })

    const content = response.choices[0]?.message?.content ?? ''

    // Extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[analyze-user] No JSON in vision response, using default persona')
      return NextResponse.json(DEFAULT_PERSONA)
    }

    const persona = JSON.parse(jsonMatch[0]) as UserPersona
    return NextResponse.json(persona)
  } catch (err) {
    console.error('[analyze-user] Error:', err)
    // Never break the shopping flow — return default persona on any error
    return NextResponse.json(DEFAULT_PERSONA)
  }
}

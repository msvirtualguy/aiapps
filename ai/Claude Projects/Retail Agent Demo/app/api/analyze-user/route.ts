import { NextResponse } from 'next/server'
import { naiClient, MODELS } from '@/lib/nai-client'
import type { UserPersona } from '@/lib/types'

const DEFAULT_PERSONA: UserPersona = {
  ageGroup: 'Young Adult (18-25)',
  style: ['casual', 'modern', 'tech-forward'],
  interests: ['technology', 'fitness', 'music'],
  preferredPayment: 'apple-pay',
  shippingPreference: 'express',
  personalizedDeals: [
    {
      title: 'Tech Bundle',
      description: '20% off all Electronics today',
      discount: '20% OFF',
      category: 'Electronics',
    },
    {
      title: 'Fresh Fits',
      description: 'Buy 2 clothing items, get 1 free',
      discount: 'B2G1',
      category: 'Clothing',
    },
  ],
  vibe: 'tech-savvy trendsetter',
}

export async function POST(request: Request) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json(DEFAULT_PERSONA)
    }

    const prompt = `Analyze this person's photo and return a JSON object with exactly these fields:
{
  "ageGroup": "string (e.g. 'Teen (13-17)', 'Young Adult (18-25)', 'Millennial (26-40)', 'Gen X (41-55)', 'Boomer (55+)')",
  "style": ["array of 3 style keywords like casual, streetwear, preppy, athletic, professional, bohemian, minimalist, luxury"],
  "interests": ["array of 3-5 likely interests based on appearance like fitness, gaming, music, fashion, outdoor, cooking, art, sports, travel"],
  "preferredPayment": "one of: card, apple-pay, google-pay, buy-now-pay-later",
  "shippingPreference": "one of: standard, express, overnight",
  "personalizedDeals": [
    {
      "title": "deal name",
      "description": "short description",
      "discount": "e.g. '20% OFF' or 'BOGO'",
      "category": "product category"
    }
  ],
  "vibe": "a short fun 2-4 word description of their vibe, e.g. 'sporty minimalist icon'"
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

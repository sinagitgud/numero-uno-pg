import Anthropic from '@anthropic-ai/sdk';

const isOcrConfigured =
  process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY !== 'REPLACE_IN_PHASE_2';

let anthropic: Anthropic | null = null;

if (isOcrConfigured) {
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const ocrAvailable = !!anthropic;

export interface AadhaarOcrResult {
  name?: string;
  fathersName?: string;
  dateOfBirth?: string;
  aadhaarNumberMasked?: string;     // e.g. "XXXX XXXX 5678"
  aadhaarNumberEncrypted?: string;  // full number, to be encrypted by caller
  address?: string;
  gender?: string;
}

/**
 * Extract data from an Aadhaar card image using Claude Vision.
 * In dev mode (no API key), returns empty result.
 */
export async function extractAadhaarData(
  imageBuffer: Buffer,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp',
): Promise<AadhaarOcrResult> {
  if (!anthropic) {
    return {};
  }

  const base64 = imageBuffer.toString('base64');

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: `Extract information from this Aadhaar card. Return a JSON object with these fields (omit if not visible):
{
  "name": "full name as printed",
  "fathersName": "father/husband name if shown",
  "dateOfBirth": "DD/MM/YYYY",
  "aadhaarNumber": "12 digit number",
  "address": "full address",
  "gender": "Male/Female/Other"
}
Return only the JSON object, no explanation.`,
          },
        ],
      },
    ],
  });

  try {
    const text = (message.content[0] as any).text as string;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};

    const data = JSON.parse(jsonMatch[0]);
    const aadhaar = String(data.aadhaarNumber || '').replace(/\s/g, '');
    const masked = aadhaar.length === 12
      ? `XXXX XXXX ${aadhaar.slice(8)}`
      : undefined;

    return {
      name: data.name,
      fathersName: data.fathersName,
      dateOfBirth: data.dateOfBirth,
      aadhaarNumberMasked: masked,
      aadhaarNumberEncrypted: aadhaar || undefined, // caller should encrypt before storing
      address: data.address,
      gender: data.gender,
    };
  } catch {
    return {};
  }
}

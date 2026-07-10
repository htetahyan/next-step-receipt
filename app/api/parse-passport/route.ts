import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('passport') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No passport image provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-3.0-flash or fallback
    const model = genAI.getGenerativeModel({ model: 'gemini-3.0-flash' });

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const prompt = `
      Analyze this passport image and extract the following details accurately.
      Return the output STRICTLY as a JSON object with these keys:
      - "name": Full name (Given names + Surname)
      - "passport_no": Passport Number
      - "dob": Date of Birth (format YYYY-MM-DD if possible, otherwise exact text)
      - "nationality": Nationality code or country name
      - "expiry_date": Date of Expiry (format YYYY-MM-DD)
      - "gender": Gender (M/F/X)

      Only return the JSON. No markdown formatting, no backticks.
    `;

    const imageParts = [
      {
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text().trim();
    
    // Clean up any markdown formatting if the model still includes it
    const jsonStr = text.replace(/^```json/i, '').replace(/```$/i, '').trim();
    const parsedData = JSON.parse(jsonStr);

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('Error parsing passport:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse passport' }, { status: 500 });
  }
}

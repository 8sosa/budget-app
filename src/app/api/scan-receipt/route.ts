// src/app/api/scan-receipt/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";

// Only use OpenAI (Simpler & More Robust)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get Image URL
    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    console.log("Processing receipt with OpenAI:", imageUrl);

    // 3. Ask GPT-4o to extract data
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial assistant. Extract data from this receipt image.
          RETURN ONLY RAW JSON. NO MARKDOWN. NO CODE BLOCKS.
          
          Extract these specific fields:
          - merchant: The name of the store or restaurant. (Look for logos at the top).
          - date: The date in YYYY-MM-DD format.
          - total: The total amount paid as a number.
          - currency: The 3-letter currency code (e.g., USD).
          - category: One of [Food, Transport, Utilities, Entertainment, Shopping, Health, Housing, Other].
          - recipient: The name of the person receiving the bill (if visible).
          
          If a value is not found, return null.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Scan this receipt." },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      max_tokens: 300,
    });

    const aiResponse = completion.choices[0].message.content;
    const cleanJson = aiResponse?.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJson || "{}");

    return NextResponse.json({
      success: true,
      source: "openai",
      data: {
        merchant: data.merchant || "Unknown Merchant",
        date: data.date || new Date().toISOString(),
        total: data.total || 0,
        currency: data.currency || "USD",
        category: data.category || "Other",
        recipient: data.recipient || ""
      }
    });

  } catch (error) {
    console.error("Scan failed:", error);
    return NextResponse.json(
      { error: "Failed to scan receipt." }, 
      { status: 500 }
    );
  }
}
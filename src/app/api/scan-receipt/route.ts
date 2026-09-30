// src/app/api/scan-receipt/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import OpenAI from "openai";
import { authOptions } from "@/lib/auth";
import { normalizeCategory } from "@/lib/categories";
import { parseDateOnly } from "@/lib/dates";


export async function POST(req: Request) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get Image URL
    const { imageUrl } = await req.json();
    if (typeof imageUrl !== "string" || !imageUrl.startsWith("https://res.cloudinary.com/")) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    // 3. Ask GPT-4o to extract data (client created per request so builds don't need the key)
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
        // Only pass on a real YYYY-MM-DD date; the form falls back to today
        date: parseDateOnly(data.date) ? data.date.slice(0, 10) : null,
        total: Number(data.total) > 0 ? Number(data.total) : 0,
        currency: data.currency || "USD",
        category: normalizeCategory(data.category),
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
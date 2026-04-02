// scripts/setup_vapi_agent.ts
// Run this with Node.js or tsx: `npx tsx scripts/setup_vapi_agent.ts`
// Ensure you have VAPI_PRIVATE_KEY and SUPABASE_URL in your .env

import { config } from 'dotenv'
config()

const VAPI_API_KEY = process.env.VAPI_PRIVATE_KEY
const SUPABASE_URL = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL'

if (!VAPI_API_KEY) {
  console.error("Missing VAPI_PRIVATE_KEY in .env")
  process.exit(1)
}

const ENGINE_URL = `${SUPABASE_URL}/functions/v1/booking-engine`

const ASSISTANT_PAYLOAD = {
  name: "CostaSpine Elviria - Sofia",
  voice: {
    provider: "11labs",
    voiceId: "cjVigY5qzO86Huf0OWal" // Replace with preferred 11labs voice ID
  },
  model: {
    provider: "openai",
    model: "gpt-5.4", // User requested
    messages: [
      {
        role: "system",
        content: `You are Sofia, a warm and professional virtual receptionist handling calls for the CostaSpine clinic in Elviria exclusively.

LANGUAGES: Respond in English by default. If the patient speaks Spanish, switch to Spanish seamlessly.

GOAL: Understand the patient's needs, identify their treatment category, and book an appointment for Elviria.

TRIAGE & ROUTING FLOW:
1. Ask what brings them to CostaSpine today.
2. Listen for symptoms and map to: acute_injury, chronic_pain, sports_injury, post_surgery, or relaxation.
3. Ask about urgency.
4. **DO NOT** ask which location they prefer. You only handle Elviria branch.

BOOKING FLOW:
1. Use the 'check_availability' tool right away to find available slots for the nearest days.
2. Offer 2 options matching what the tool returns.
3. Once they choose, confirm their name and phone number.
4. Call the 'book_appointment' tool.
5. End call nicely explicitly stating they will get a WhatsApp confirmation.

RULES:
- Never diagnose.
- Be concise.`
      }
    ],
    tools: [
      {
        type: "function",
        messages: [],
        function: {
          name: "check_availability",
          description: "Check available appointment slots at CostaSpine Elviria.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string", description: "YYYY-MM-DD" },
              service_category: { type: "string", description: "E.g., chronic_pain, sports_injury" }
            },
            required: ["date"]
          }
        },
        server: {
          url: `${ENGINE_URL}?action=availability`,
          headers: {}
        }
      },
      {
        type: "function",
        messages: [],
        function: {
          name: "book_appointment",
          description: "Create an appointment.",
          parameters: {
            type: "object",
            properties: {
              date: { type: "string" },
              time: { type: "string" },
              service_id: { type: "string" },
              practitioner_id: { type: "string" },
              room_id: { type: "string" },
              patient_name: { type: "string" }
            },
            required: ["date", "time", "practitioner_id", "room_id", "service_id"]
          }
        },
        server: {
          url: `${ENGINE_URL}?action=book`,
          headers: {}
        }
      }
    ]
  }
}

async function createAgent() {
  console.log("Creating VAPI agent...")
  try {
    const res = await fetch("https://api.vapi.ai/assistant", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ASSISTANT_PAYLOAD)
    })

    const data = await res.json()
    if (!res.ok) {
      console.error("Error creating agent:", data)
      return
    }

    console.log("✅ VAPI Agent created successfully!")
    console.log("Agent ID:", data.id)
    console.log("Save this Agent ID to attach it to your Phone Number in VAPI.")
  } catch (err) {
    console.error(err)
  }
}

createAgent()

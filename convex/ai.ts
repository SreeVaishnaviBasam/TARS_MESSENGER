import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── AI Chat: fetch response + save as message ──────────
export const chatAndRespond = action({
    args: {
        conversationId: v.id("conversations"),
        message: v.string(),
        conversationHistory: v.optional(
            v.array(
                v.object({
                    role: v.string(),
                    content: v.string(),
                })
            )
        ),
    },
    handler: async (ctx, args) => {
        let aiResponse = "";

        // Try OpenAI first if key exists
        const apiKey = process.env.OPENAI_API_KEY;
        if (apiKey) {
            try {
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: "gpt-3.5-turbo",
                        messages: [
                            { role: "system", content: "You are TARS AI, a helpful assistant. Be concise." },
                            ...(args.conversationHistory || []).map(m => ({
                                role: m.role === "assistant" ? "assistant" as const : "user" as const,
                                content: m.content
                            })),
                            { role: "user" as const, content: args.message }
                        ],
                    }),
                });
                const data = await response.json();
                aiResponse = data.choices?.[0]?.message?.content || "";
            } catch (error) {
                console.error("OpenAI error:", error);
            }
        }

        // Fallback: Pollinations AI
        if (!aiResponse) {
            try {
                const history = (args.conversationHistory || [])
                    .slice(-3)
                    .map(m => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content}`)
                    .join("\n");

                const prompt = `System: You are TARS AI, a helpful assistant.\n${history}\nUser: ${args.message}\nAI:`;
                const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);

                if (response.ok) {
                    aiResponse = (await response.text()).trim();
                }

                // Last resort: simple prompt
                if (!aiResponse) {
                    const simple = await fetch(`https://text.pollinations.ai/${encodeURIComponent(args.message)}`);
                    if (simple.ok) {
                        aiResponse = (await simple.text()).trim();
                    }
                }
            } catch (error) {
                console.error("Pollinations error:", error);
            }
        }

        if (!aiResponse) {
            aiResponse = "I'm having trouble connecting right now. Please try again in a moment.";
        }

        // Save the AI response as a message using internal mutation (no auth needed)
        await ctx.runMutation(internal.messages.sendAIResponseInternal, {
            conversationId: args.conversationId,
            content: aiResponse,
        });

        return aiResponse;
    },
});

// ─── AI Image Generation ─────────────────────────────────
export const generateImage = action({
    args: { prompt: v.string() },
    handler: async (ctx, args) => {
        const encodedPrompt = encodeURIComponent(args.prompt);
        const seed = Math.floor(Math.random() * 1000000);
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
        return imageUrl;
    },
});

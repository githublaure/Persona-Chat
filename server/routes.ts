import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { insertCharacterSchema } from "@shared/schema";
import OpenAI from "openai";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hashed] = stored.split(":");
  if (!salt || !hashed) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashed, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post("/api/auth/register", async (req, res) => {
    try {
      const username = String(req.body?.username || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: "Username must be 3-50 characters" });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        passwordHash: hashPassword(password),
      });

      req.session.userId = user.id;
      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const username = String(req.body?.username || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      const user = await storage.getUserByUsername(username);
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", requireAuth, (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.clearCookie("persona.sid");
      res.status(204).send();
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUserById(req.session.userId!);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Error reading user:", error);
      res.status(500).json({ error: "Failed to fetch current user" });
    }
  });

  app.get("/api/characters", requireAuth, async (req, res) => {
    try {
      const chars = await storage.getCharacters(req.session.userId!);
      res.json(chars);
    } catch (error) {
      console.error("Error fetching characters:", error);
      res.status(500).json({ error: "Failed to fetch characters" });
    }
  });

  app.get("/api/characters/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const char = await storage.getCharacter(id);
      if (!char || (char.userId !== null && char.userId !== req.session.userId)) {
        return res.status(404).json({ error: "Character not found" });
      }
      res.json(char);
    } catch (error) {
      console.error("Error fetching character:", error);
      res.status(500).json({ error: "Failed to fetch character" });
    }
  });

  app.post("/api/characters", requireAuth, async (req, res) => {
    try {
      const parsed = insertCharacterSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid character data", details: parsed.error.flatten() });
      }
      const char = await storage.createCharacter(req.session.userId!, parsed.data);
      res.status(201).json(char);
    } catch (error) {
      console.error("Error creating character:", error);
      res.status(500).json({ error: "Failed to create character" });
    }
  });

  app.delete("/api/characters/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteCharacter(req.session.userId!, id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting character:", error);
      res.status(500).json({ error: "Failed to delete character" });
    }
  });

  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const convs = await storage.getConversations(req.session.userId!);
      res.json(convs);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const conv = await storage.getConversation(req.session.userId!, id);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
      res.json(conv);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { characterId } = req.body;
      if (!characterId) return res.status(400).json({ error: "characterId is required" });

      const character = await storage.getCharacter(characterId);
      if (!character || (character.userId !== null && character.userId !== req.session.userId)) {
        return res.status(404).json({ error: "Character not found" });
      }

      const conv = await storage.createConversation(req.session.userId!, {
        characterId,
        title: `Chat with ${character.name}`,
      });

      if (character.greeting) {
        await storage.createMessage(req.session.userId!, {
          conversationId: conv.id,
          role: "assistant",
          content: character.greeting,
        });
      }

      res.status(201).json(conv);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteConversation(req.session.userId!, id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const { content } = req.body;

      if (!content?.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const conv = await storage.getConversation(req.session.userId!, conversationId);
      if (!conv) return res.status(404).json({ error: "Conversation not found" });

      await storage.createMessage(req.session.userId!, {
        conversationId,
        role: "user",
        content: content.trim(),
      });

      await storage.touchConversation(req.session.userId!, conversationId);

      const allMessages = await storage.getMessages(req.session.userId!, conversationId);

      const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: conv.character.systemPrompt,
        },
        ...allMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      await storage.createMessage(req.session.userId!, {
        conversationId,
        role: "assistant",
        content: fullResponse,
      });

      await storage.touchConversation(req.session.userId!, conversationId);

      if (allMessages.length <= 2) {
        const titleContent = fullResponse.slice(0, 50).split("\n")[0];
        const title = titleContent.length > 40 ? titleContent.slice(0, 40) + "..." : titleContent;
        if (title.trim()) {
          await storage.updateConversationTitle(req.session.userId!, conversationId, title);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to generate response" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  return httpServer;
}

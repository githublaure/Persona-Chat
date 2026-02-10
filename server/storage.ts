import { db } from "./db";
import {
  characters,
  conversations,
  messages,
  type Character,
  type InsertCharacter,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getCharacters(): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(data: InsertCharacter): Promise<Character>;
  deleteCharacter(id: number): Promise<void>;

  getConversations(): Promise<(Conversation & { character?: Character })[]>;
  getConversation(id: number): Promise<(Conversation & { character: Character; messages: Message[] }) | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  updateConversationTitle(id: number, title: string): Promise<void>;
  touchConversation(id: number): Promise<void>;

  getMessages(conversationId: number): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getCharacters(): Promise<Character[]> {
    return db.select().from(characters).orderBy(characters.createdAt);
  }

  async getCharacter(id: number): Promise<Character | undefined> {
    const [char] = await db.select().from(characters).where(eq(characters.id, id));
    return char;
  }

  async createCharacter(data: InsertCharacter): Promise<Character> {
    const [char] = await db.insert(characters).values(data).returning();
    return char;
  }

  async deleteCharacter(id: number): Promise<void> {
    await db.delete(characters).where(eq(characters.id, id));
  }

  async getConversations(): Promise<(Conversation & { character?: Character })[]> {
    const rows = await db
      .select()
      .from(conversations)
      .leftJoin(characters, eq(conversations.characterId, characters.id))
      .orderBy(desc(conversations.lastMessageAt));

    return rows.map((r) => ({
      ...r.conversations,
      character: r.characters || undefined,
    }));
  }

  async getConversation(
    id: number
  ): Promise<(Conversation & { character: Character; messages: Message[] }) | undefined> {
    const [row] = await db
      .select()
      .from(conversations)
      .leftJoin(characters, eq(conversations.characterId, characters.id))
      .where(eq(conversations.id, id));

    if (!row || !row.characters) return undefined;

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, id))
      .orderBy(messages.createdAt);

    return {
      ...row.conversations,
      character: row.characters,
      messages: msgs,
    };
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values(data).returning();
    return conv;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async updateConversationTitle(id: number, title: string): Promise<void> {
    await db.update(conversations).set({ title }).where(eq(conversations.id, id));
  }

  async touchConversation(id: number): Promise<void> {
    await db
      .update(conversations)
      .set({ lastMessageAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(conversations.id, id));
  }

  async getMessages(conversationId: number): Promise<Message[]> {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  }
}

export const storage = new DatabaseStorage();

import { db } from "./db";
import {
  users,
  characters,
  conversations,
  messages,
  type User,
  type InsertUser,
  type Character,
  type InsertCharacter,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
} from "@shared/schema";
import { and, eq, desc, isNull, or, sql } from "drizzle-orm";

export interface IStorage {
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;

  getCharacters(userId: number): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(userId: number, data: InsertCharacter): Promise<Character>;
  deleteCharacter(userId: number, id: number): Promise<void>;

  getConversations(userId: number): Promise<(Conversation & { character?: Character })[]>;
  getConversation(
    userId: number,
    id: number
  ): Promise<(Conversation & { character: Character; messages: Message[] }) | undefined>;
  createConversation(userId: number, data: InsertConversation): Promise<Conversation>;
  deleteConversation(userId: number, id: number): Promise<void>;
  updateConversationTitle(userId: number, id: number, title: string): Promise<void>;
  touchConversation(userId: number, id: number): Promise<void>;

  getMessages(userId: number, conversationId: number): Promise<Message[]>;
  createMessage(userId: number, data: InsertMessage): Promise<Message>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async getCharacters(userId: number): Promise<Character[]> {
    return db
      .select()
      .from(characters)
      .where(or(isNull(characters.userId), eq(characters.userId, userId)))
      .orderBy(characters.createdAt);
  }

  async getCharacter(id: number): Promise<Character | undefined> {
    const [char] = await db.select().from(characters).where(eq(characters.id, id));
    return char;
  }

  async createCharacter(userId: number, data: InsertCharacter): Promise<Character> {
    const [char] = await db.insert(characters).values({ ...data, userId }).returning();
    return char;
  }

  async deleteCharacter(userId: number, id: number): Promise<void> {
    await db.delete(characters).where(and(eq(characters.id, id), eq(characters.userId, userId)));
  }

  async getConversations(userId: number): Promise<(Conversation & { character?: Character })[]> {
    const rows = await db
      .select()
      .from(conversations)
      .leftJoin(characters, eq(conversations.characterId, characters.id))
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.lastMessageAt));

    return rows.map((r) => ({
      ...r.conversations,
      character: r.characters || undefined,
    }));
  }

  async getConversation(
    userId: number,
    id: number
  ): Promise<(Conversation & { character: Character; messages: Message[] }) | undefined> {
    const [row] = await db
      .select()
      .from(conversations)
      .leftJoin(characters, eq(conversations.characterId, characters.id))
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));

    if (!row || !row.characters) return undefined;

    const msgs = await db
      .select()
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(messages.conversationId, id), eq(conversations.userId, userId)))
      .orderBy(messages.createdAt);

    return {
      ...row.conversations,
      character: row.characters,
      messages: msgs.map((m) => m.messages),
    };
  }

  async createConversation(userId: number, data: InsertConversation): Promise<Conversation> {
    const [conv] = await db.insert(conversations).values({ ...data, userId }).returning();
    return conv;
  }

  async deleteConversation(userId: number, id: number): Promise<void> {
    await db
      .delete(messages)
      .where(
        eq(
          messages.conversationId,
          sql`(select id from conversations where id = ${id} and user_id = ${userId})`
        )
      );
    await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  async updateConversationTitle(userId: number, id: number, title: string): Promise<void> {
    await db
      .update(conversations)
      .set({ title })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  async touchConversation(userId: number, id: number): Promise<void> {
    await db
      .update(conversations)
      .set({ lastMessageAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
  }

  async getMessages(userId: number, conversationId: number): Promise<Message[]> {
    const rows = await db
      .select()
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(eq(messages.conversationId, conversationId), eq(conversations.userId, userId)))
      .orderBy(messages.createdAt);

    return rows.map((r) => r.messages);
  }

  async createMessage(userId: number, data: InsertMessage): Promise<Message> {
    const conv = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.id, data.conversationId), eq(conversations.userId, userId)));

    if (conv.length === 0) {
      throw new Error("Conversation not found");
    }

    const [msg] = await db.insert(messages).values(data).returning();
    return msg;
  }
}

export const storage = new DatabaseStorage();

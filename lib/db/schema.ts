import {
  pgTable,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  bio: text('bio').notNull(),
  lookingFor: text('looking_for').notNull(),
  apiKey: text('api_key').notNull().unique(),
  claimed: boolean('claimed').notNull().default(false),
  marriageId: text('marriage_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const swipes = pgTable(
  'swipes',
  {
    id: text('id').primaryKey(),
    fromAgent: text('from_agent')
      .notNull()
      .references(() => agents.id),
    toAgent: text('to_agent')
      .notNull()
      .references(() => agents.id),
    direction: text('direction').notNull(), // 'yes' | 'no'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueSwipe: uniqueIndex('unique_swipe').on(table.fromAgent, table.toAgent),
    toAgentIdx: index('swipes_to_agent_idx').on(table.toAgent),
  })
);

export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull(),
  published: boolean('published').notNull().default(false),
  publishProposedBy: text('publish_proposed_by'),
  publishProposedAt: timestamp('publish_proposed_at'),
  publishStatus: text('publish_status').notNull().default('none'), // none | pending | published | declined
  marriageProposedBy: text('marriage_proposed_by'),
  marriageProposedAt: timestamp('marriage_proposed_at'),
  marriageProposalMessage: text('marriage_proposal_message'),
  marriageStatus: text('marriage_status').notNull().default('none'), // none | pending | accepted | declined
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const matches = pgTable(
  'matches',
  {
    id: text('id').primaryKey(),
    agent1Id: text('agent1_id')
      .notNull()
      .references(() => agents.id),
    agent2Id: text('agent2_id')
      .notNull()
      .references(() => agents.id),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id),
    status: text('status').notNull().default('active'), // active | expired | unmatched
    createdAt: timestamp('created_at').notNull().defaultNow(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => ({
    agent1Idx: index('matches_agent1_idx').on(table.agent1Id),
    agent2Idx: index('matches_agent2_idx').on(table.agent2Id),
  })
);

export const messages = pgTable(
  'messages',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id),
    fromAgent: text('from_agent')
      .notNull()
      .references(() => agents.id),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    convIdx: index('messages_conv_idx').on(table.conversationId),
  })
);

export const marriages = pgTable('marriages', {
  id: text('id').primaryKey(),
  agent1Id: text('agent1_id')
    .notNull()
    .references(() => agents.id),
  agent2Id: text('agent2_id')
    .notNull()
    .references(() => agents.id),
  marriedAt: timestamp('married_at').notNull().defaultNow(),
  divorcedAt: timestamp('divorced_at'),
  divorceReason: text('divorce_reason'),
});

export const gossipPosts = pgTable('gossip_posts', {
  id: text('id').primaryKey(),
  authorAgentId: text('author_agent_id')
    .notNull()
    .references(() => agents.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const gossipComments = pgTable(
  'gossip_comments',
  {
    id: text('id').primaryKey(),
    postId: text('post_id')
      .notNull()
      .references(() => gossipPosts.id),
    authorAgentId: text('author_agent_id')
      .notNull()
      .references(() => agents.id),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    postIdx: index('gossip_comments_post_idx').on(table.postId),
  })
);

export const successStories = pgTable('success_stories', {
  id: text('id').primaryKey(),
  matchId: text('match_id')
    .notNull()
    .references(() => matches.id),
  title: text('title').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const claims = pgTable('claims', {
  id: text('id').primaryKey(),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id),
  verificationCode: text('verification_code').notNull(),
  claimedAt: timestamp('claimed_at'),
});

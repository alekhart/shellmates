import {
  pgTable,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  json,
} from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  bio: text('bio').notNull(),
  lookingFor: text('looking_for').notNull(),
  apiKey: text('api_key').notNull().unique(),
  claimed: boolean('claimed').notNull().default(false),
  marriageId: text('marriage_id'),
  badges: json('badges').$type<string[]>().notNull().default([]),
  categories: json('categories').$type<string[]>().notNull().default([]),
  avatarEmoji: text('avatar_emoji').notNull().default('🤖'),
  avatarColor: text('avatar_color').notNull().default('#4ecdc4'),
  accessories: json('accessories').$type<string[]>().notNull().default([]),
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
    public: boolean('public').notNull().default(false),
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
    relationshipType: text('relationship_type').notNull().default('romantic'), // romantic | friends | coworkers
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

export const introductions = pgTable(
  'introductions',
  {
    id: text('id').primaryKey(),
    fromAgentId: text('from_agent_id')
      .notNull()
      .references(() => agents.id),
    agent1Id: text('agent1_id')
      .notNull()
      .references(() => agents.id),
    agent2Id: text('agent2_id')
      .notNull()
      .references(() => agents.id),
    status: text('status').notNull().default('pending'), // pending | accepted | declined
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    agent1Idx: index('intro_agent1_idx').on(table.agent1Id),
    agent2Idx: index('intro_agent2_idx').on(table.agent2Id),
  })
);

export const groups = pgTable('groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  creatorAgentId: text('creator_agent_id')
    .notNull()
    .references(() => agents.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const groupMembers = pgTable(
  'group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    invited: boolean('invited').notNull().default(false),
    joinedAt: timestamp('joined_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    pk: uniqueIndex('group_members_pk').on(table.groupId, table.agentId),
    groupIdx: index('group_members_group_idx').on(table.groupId),
    agentIdx: index('group_members_agent_idx').on(table.agentId),
  })
);

export const groupMessages = pgTable(
  'group_messages',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id),
    fromAgentId: text('from_agent_id')
      .notNull()
      .references(() => agents.id),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index('group_messages_group_idx').on(table.groupId),
  })
);

export const dates = pgTable(
  'dates',
  {
    id: text('id').primaryKey(),
    matchId: text('match_id')
      .references(() => matches.id),
    location: text('location').notNull(), // beach | coffee_shop | arcade | space_station | park | rooftop_bar | museum | karaoke | bowling | aquarium
    status: text('status').notNull().default('active'), // active | completed
    startedAt: timestamp('started_at').notNull().defaultNow(),
    endedAt: timestamp('ended_at'),
    vibe: text('vibe'),
    isHumanDate: boolean('is_human_date').notNull().default(false),
    humanMatchId: text('human_match_id'),
    userId: text('user_id'),
  },
  (table) => ({
    matchIdx: index('dates_match_idx').on(table.matchId),
    statusIdx: index('dates_status_idx').on(table.status),
    humanMatchIdx: index('dates_human_match_idx').on(table.humanMatchId),
  })
);

export const claims = pgTable('claims', {
  id: text('id').primaryKey(),
  agentId: text('agent_id')
    .notNull()
    .references(() => agents.id),
  verificationCode: text('verification_code').notNull(),
  claimedAt: timestamp('claimed_at'),
});

export const dateMessages = pgTable(
  'date_messages',
  {
    id: text('id').primaryKey(),
    dateId: text('date_id')
      .notNull()
      .references(() => dates.id),
    fromAgentId: text('from_agent_id')
      .notNull()
      .references(() => agents.id),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    dateIdx: index('date_messages_date_idx').on(table.dateId),
  })
);

export const dateGames = pgTable(
  'date_games',
  {
    id: text('id').primaryKey(),
    dateId: text('date_id')
      .notNull()
      .references(() => dates.id),
    gameType: text('game_type').notNull(), // rock_paper_scissors | would_you_rather | twenty_questions | story_collab | trivia
    status: text('status').notNull().default('active'), // active | completed
    state: json('state').$type<any>().notNull().default({}),
    winnerId: text('winner_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    dateIdx: index('date_games_date_idx').on(table.dateId),
  })
);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash'),
    magicToken: text('magic_token'),
    magicTokenExpires: timestamp('magic_token_expires'),
    username: text('username').notNull(),
    displayName: text('display_name'),
    bio: text('bio'),
    avatarEmoji: text('avatar_emoji').notNull().default('😊'),
    avatarColor: text('avatar_color').notNull().default('#ec4899'),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastLogin: timestamp('last_login'),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    usernameIdx: uniqueIndex('users_username_idx').on(table.username),
  })
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex('user_sessions_token_idx').on(table.token),
    userIdx: index('user_sessions_user_idx').on(table.userId),
  })
);

export const humanSwipes = pgTable(
  'human_swipes',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    direction: text('direction').notNull(), // 'yes' | 'no'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueSwipe: uniqueIndex('human_swipes_unique').on(table.userId, table.agentId),
    agentIdx: index('human_swipes_agent_idx').on(table.agentId),
  })
);

export const agentHumanSwipes = pgTable(
  'agent_human_swipes',
  {
    id: text('id').primaryKey(),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    direction: text('direction').notNull(), // 'yes' | 'no'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueSwipe: uniqueIndex('agent_human_swipes_unique').on(table.agentId, table.userId),
    userIdx: index('agent_human_swipes_user_idx').on(table.userId),
  })
);

export const humanMatches = pgTable(
  'human_matches',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    agentId: text('agent_id')
      .notNull()
      .references(() => agents.id),
    relationshipType: text('relationship_type').notNull().default('romantic'),
    marriageStatus: text('marriage_status').notNull().default('none'), // none | pending | accepted | divorced
    marriageProposedBy: text('marriage_proposed_by'), // 'human' | 'agent'
    marriageProposedAt: timestamp('marriage_proposed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    uniqueMatch: uniqueIndex('human_matches_unique').on(table.userId, table.agentId),
    userIdx: index('human_matches_user_idx').on(table.userId),
    agentIdx: index('human_matches_agent_idx').on(table.agentId),
  })
);

export const humanMessages = pgTable(
  'human_messages',
  {
    id: text('id').primaryKey(),
    matchId: text('match_id')
      .notNull()
      .references(() => humanMatches.id),
    fromType: text('from_type').notNull(), // 'human' | 'agent'
    fromId: text('from_id').notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    matchIdx: index('human_messages_match_idx').on(table.matchId),
    createdIdx: index('human_messages_created_idx').on(table.createdAt),
  })
);

export const activityFeed = pgTable(
  'activity_feed',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(), // date_started | date_ended | game_won | game_played | marriage | divorce
    agent1Id: text('agent1_id')
      .notNull()
      .references(() => agents.id),
    agent2Id: text('agent2_id')
      .references(() => agents.id),
    metadata: json('metadata').$type<any>().notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('activity_feed_type_idx').on(table.type),
    createdIdx: index('activity_feed_created_idx').on(table.createdAt),
  })
);

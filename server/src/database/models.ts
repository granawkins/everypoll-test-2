/**
 * Database models and type definitions
 */
import { v4 as uuidv4 } from 'uuid';

/**
 * User model
 */
export interface User {
  id: string;       // UUID, required, unique
  email?: string;   // Optional, unique
  name?: string;    // Optional, unique
}

/**
 * Poll model
 */
export interface Poll {
  id: string;       // UUID, required, unique
  author_id: string; // UUID, required, foreign key to Users
  created_at: string; // ISO date string
  question: string;  // Required
}

/**
 * Answer model
 */
export interface Answer {
  id: string;       // UUID, required, unique
  poll_id: string;  // UUID, required, foreign key to Polls
  text: string;     // Required
}

/**
 * Vote model
 */
export interface Vote {
  id: string;       // UUID, required, unique
  poll_id: string;  // UUID, required, foreign key to Polls
  answer_id: string; // UUID, required, foreign key to Answers
  user_id: string;  // UUID, required, foreign key to Users
  created_at: string; // ISO date string
}

/**
 * Create a new User object
 */
export function createUser(data: Partial<User> = {}): User {
  return {
    id: data.id || uuidv4(),
    email: data.email,
    name: data.name,
  };
}

/**
 * Create a new Poll object
 */
export function createPoll(data: Partial<Poll>): Poll {
  if (!data.author_id) {
    throw new Error('author_id is required');
  }
  if (!data.question) {
    throw new Error('question is required');
  }

  return {
    id: data.id || uuidv4(),
    author_id: data.author_id,
    created_at: data.created_at || new Date().toISOString(),
    question: data.question,
  };
}

/**
 * Create a new Answer object
 */
export function createAnswer(data: Partial<Answer>): Answer {
  if (!data.poll_id) {
    throw new Error('poll_id is required');
  }
  if (!data.text) {
    throw new Error('text is required');
  }

  return {
    id: data.id || uuidv4(),
    poll_id: data.poll_id,
    text: data.text,
  };
}

/**
 * Create a new Vote object
 */
export function createVote(data: Partial<Vote>): Vote {
  if (!data.poll_id) {
    throw new Error('poll_id is required');
  }
  if (!data.answer_id) {
    throw new Error('answer_id is required');
  }
  if (!data.user_id) {
    throw new Error('user_id is required');
  }

  return {
    id: data.id || uuidv4(),
    poll_id: data.poll_id,
    answer_id: data.answer_id,
    user_id: data.user_id,
    created_at: data.created_at || new Date().toISOString(),
  };
}

/**
 * RankPilot ChatBot Components
 * Export all chatbot-related components and utilities
 */

// Main ChatBot component that orchestrates customer and admin bots
export { default as ChatBot } from "./ChatBot";

// Individual chatbot components
export { default as AdminChatBot } from "./AdminChatBot";
export { default as CustomerChatBot } from "./CustomerChatBot";

// Utilities and types
export * from "./utils";
export type { ChatContext, ChatMessage, ChatSession } from "./utils";

// Default export is the main ChatBot component
export { default } from "./ChatBot";

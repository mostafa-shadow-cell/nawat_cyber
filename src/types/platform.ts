export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type RoomCategory =
  | 'network'
  | 'linux'
  | 'web'
  | 'forensics'
  | 'crypto';

export interface CodeSnippet {
  id: string;
  label?: string;
  language: 'bash' | 'sql' | 'http' | 'python' | 'text';
  code: string;
}

export interface RoomTask {
  id: string;
  stepNumber: number;
  titleAr: string;
  explanationAr: string[];
  snippets?: CodeSnippet[];
  questionAr: string;
  hintAr: string;
  flag: string;
  flagFormat: string;
  xp: number;
}

export interface SimulatedTerminalConfig {
  hostname: string;
  username: string;
  targetIp: string;
  cwd: string;
  files: Record<string, string>;
  customCommands: Record<string, string>;
}

export interface Room {
  id: string;
  slug: string;
  titleAr: string;
  subtitleAr: string;
  descriptionAr: string;
  difficulty: Difficulty;
  category: RoomCategory;
  estimatedMinutes: number;
  totalXp: number;
  targetIp: string;
  tools: string[];
  tasks: RoomTask[];
  terminal: SimulatedTerminalConfig;
}

export interface LearningPath {
  id: string;
  titleAr: string;
  descriptionAr: string;
  levelAr: string;
  roomIds: string[];
}

export interface UserProgress {
  solvedTaskIds: Record<string, string[]>;
  lastActiveRoomId: string | null;
  bountyPenaltyPoints?: number;
  closeAttemptBonusVisible?: boolean;
  closeAttemptCount?: number;
}

export interface TerminalEntry {
  id: string;
  command: string;
  output: string;
  isError?: boolean;
}

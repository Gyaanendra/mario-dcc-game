export type GameStatus =
  | 'LOBBY'
  | 'LEVEL_INTRO'
  | 'QUESTION_ACTIVE'
  | 'QUESTION_LOCKED'
  | 'REVEAL'
  | 'LEVEL_LEADERBOARD'
  | 'PAUSED'
  | 'BOWSER_STAGE'
  | 'PODIUM_WINNERS'
  | 'ENDED';

export type QuestionCategory =
  | 'PRACTICE'
  | 'PLACEMENT_TERMS'
  | 'CAREER_BASICS'
  | 'RESUME'
  | 'MYTH OR FACT?'
  | 'CHOOSE WISELY'
  | 'RED FLAG'
  | 'SUDDEN_DEATH';

export interface Question {
  id: number;
  level: number;
  category: QuestionCategory;
  prompt: string;
  option_a: string;
  option_b: string;
  option_c?: string | null;
  option_d?: string | null;
  correct_option: 'A' | 'B' | 'C' | 'D';
  explanation?: string | null;
  points: number;
  time_limit_sec: number;
  sort_order: number;
  is_practice: number;
}

export interface Player {
  id: string;
  student_id: string;
  name: string;
  avatar_id: string;
  is_connected: number;
  level1_score: number;
  level2_score: number;
  level3_score: number;
  total_coins: number;
  is_qualified_level2: number;
  is_qualified_level3: number;
  completed_pipes?: number;
  created_at?: string;
  last_ping_at?: string;
  session_token_hash?: string;
}

export interface PlayerAnswer {
  id?: number;
  player_id: string;
  question_id: number;
  selected_option: string;
  is_correct: number;
  response_time_ms: number;
  coins_awarded: number;
  submitted_at?: string;
}

export interface JudgeScore {
  id?: number;
  finalist_id: string;
  finalist_name?: string;
  student_id?: string;
  judge_name: string;
  clarity_score: number;      // 0-5
  reasoning_score: number;    // 0-5
  judgement_score: number;    // 0-5
  communication_score: number;// 0-5
  total_score: number;        // 0-20
  remarks?: string;
}

export interface GameStateRecord {
  id: number;
  current_level: number;
  game_status: GameStatus;
  active_question_id: number | null;
  question_start_time: number | null;
  question_duration_sec: number;
  sudden_death_active: number;
  updated_at?: string;
  deadline_at: number | null;
  remaining_ms: number;
  paused_at: number | null;
  speaker_id: string | null;
  speaker_deadline_at: number | null;
  speaker_remaining_ms: number;
  speaker_running: number;
  results_verified: number;
}

// WebSocket Protocols
export type ClientMessageType =
  | 'CLIENT_JOIN'
  | 'CLIENT_RECONNECT'
  | 'CLIENT_SUBMIT_ANSWER'
  | 'CLIENT_PIPE_READY'
  | 'CLIENT_PIPE_ANSWER'
  | 'CLIENT_FLAGPOLE_CLEAR'
  | 'CLIENT_HEARTBEAT';

export type HostMessageType =
  | 'HOST_AUTH'
  | 'HOST_START_LEVEL'
  | 'HOST_NEXT_QUESTION'
  | 'HOST_OPEN_QUESTION'
  | 'HOST_PAUSE_TIMER'
  | 'HOST_RESUME_TIMER'
  | 'HOST_EXTEND_TIMER'
  | 'HOST_LOCK_QUESTION'
  | 'HOST_REVEAL_ANSWER'
  | 'HOST_VOID_QUESTION'
  | 'HOST_SHOW_LEADERBOARD'
  | 'HOST_CUTOFF_L2'
  | 'HOST_CUTOFF_L3'
  | 'HOST_TRIGGER_SUDDEN_DEATH'
  | 'HOST_START_BOWSER_STAGE'
  | 'HOST_SELECT_SPEAKER'
  | 'HOST_SPEAKER_START'
  | 'HOST_SPEAKER_PAUSE'
  | 'HOST_SPEAKER_RESET'
  | 'HOST_SUBMIT_JUDGE_SCORE'
  | 'HOST_SUBMIT_FINAL_TIEBREAK'
  | 'HOST_VERIFY_RESULTS'
  | 'HOST_FINISH_AND_PODIUM'
  | 'HOST_RESET_GAME';

export type ServerBroadcastType =
  | 'SYNC_STATE'
  | 'PLAYER_JOINED'
  | 'QUESTION_STARTED'
  | 'TIMER_TICK'
  | 'QUESTION_LOCKED'
  | 'ANSWER_REVEALED'
  | 'LEADERBOARD_UPDATE'
  | 'CUTOFF_ANNOUNCED'
  | 'BOWSER_UPDATE'
  | 'PODIUM_REVEAL'
  | 'PIPE_READY_COUNT'
  | 'PIPE_QUEST_STATE'
  | 'PIPE_QUEST_RESULT'
  | 'FLAGPOLE_RESULT'
  | 'ERROR_MSG';

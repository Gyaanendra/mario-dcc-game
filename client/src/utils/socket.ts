import { useEffect, useState, useRef, useCallback } from 'react';

export interface GameState {
  current_level: number;
  game_status: string;
  active_question_id: number | null;
  question_start_time: number | null;
  question_duration_sec: number;
  remaining_seconds: number;
  timer_paused: boolean;
  sudden_death_active: number;
}

export interface PlayerData {
  id: string;
  student_id: string;
  name: string;
  avatar_id: string;
  level1_score: number;
  level2_score: number;
  level3_score: number;
  total_coins: number;
  is_qualified_level2: number;
  is_qualified_level3: number;
}

export interface QuestionData {
  id: number;
  level: number;
  category: string;
  prompt: string;
  option_a: string;
  option_b: string;
  option_c?: string | null;
  option_d?: string | null;
  time_limit_sec: number;
  points: number;
  correct_option?: string | null;
  explanation?: string | null;
}

export interface PillarAnswerRecord {
  id: number;
  player_id: string;
  player_name: string;
  student_id: string;
  pillar_id: number;
  question_id: number;
  selected_option: string;
  is_correct: number;
  submitted_at: string;
}

export interface PlayerRecord {
  id: string;
  student_id: string;
  name: string;
  avatar_id: string;
  is_connected: number;
  level1_score: number;
  level2_score: number;
  level3_score: number;
  is_qualified_level2: number;
  is_qualified_level3: number;
  created_at: string;
  last_ping_at: string;
}

export interface SocketHookState {
  isConnected: boolean;
  role: 'PLAYER' | 'PROJECTOR' | 'HOST' | null;
  gameState: GameState;
  player: PlayerData | null;
  activeQuestion: QuestionData | null;
  myAnswer: { selected_option: string; is_correct?: boolean | null; coins_awarded?: number | null } | null;
  answerStats: Record<string, number> | null;
  leaderboard: any[];
  podium: any[];
  finalists: any[];
  counts: { total: number; connected: number };
  lastError: string | null;
  remainingSeconds: number;
  pillarAnswers: PillarAnswerRecord[];
  hostPlayers: PlayerRecord[];
  send: (msg: any) => void;
  joinAsPlayer: (studentId: string, name: string, avatarId: string) => void;
  submitAnswer: (selectedOption: string) => void;
  submitPillarAnswer: (pillarId: number, questionId: number, selectedOption: string, isCorrect: boolean) => void;
}

export function useGameSocket(viewRole: 'PLAYER' | 'PROJECTOR' | 'HOST' = 'PLAYER'): SocketHookState {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    current_level: 0,
    game_status: 'LOBBY',
    active_question_id: null,
    question_start_time: null,
    question_duration_sec: 25,
    remaining_seconds: 25,
    timer_paused: false,
    sudden_death_active: 0
  });

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [myAnswer, setMyAnswer] = useState<any>(null);
  const [answerStats, setAnswerStats] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [podium, setPodium] = useState<any[]>([]);
  const [finalists, setFinalists] = useState<any[]>([]);
  const [counts, setCounts] = useState<{ total: number; connected: number }>({ total: 0, connected: 0 });
  const [lastError, setLastError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(25);
  const [pillarAnswers, setPillarAnswers] = useState<PillarAnswerRecord[]>([]);
  const [hostPlayers, setHostPlayers] = useState<PlayerRecord[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  };

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setLastError(null);

        if (viewRole === 'PROJECTOR') {
          ws.send(JSON.stringify({ type: 'PROJECTOR_CONNECT' }));
        } else if (viewRole === 'HOST') {
          const savedPin = localStorage.getItem('mcq_host_pin') || 'DCC2026';
          ws.send(JSON.stringify({ type: 'HOST_AUTH', pin: savedPin }));
        } else if (viewRole === 'PLAYER') {
          const savedPlayerId = localStorage.getItem('mcq_player_id');
          if (savedPlayerId) {
            ws.send(JSON.stringify({ type: 'CLIENT_RECONNECT', playerId: savedPlayerId }));
          }
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'SYNC_STATE':
              if (data.gameState) {
                setGameState(data.gameState);
                if (data.gameState.remaining_seconds !== undefined) {
                  setRemainingSeconds(data.gameState.remaining_seconds);
                }
              }
              if (data.player !== undefined) setPlayer(data.player);
              if (data.activeQuestion !== undefined) setActiveQuestion(data.activeQuestion);
              if (data.myAnswer !== undefined) setMyAnswer(data.myAnswer);
              if (data.answerStats) setAnswerStats(data.answerStats);
              if (data.leaderboard) setLeaderboard(data.leaderboard);
              if (data.podium) setPodium(data.podium);
              if (data.finalists) setFinalists(data.finalists);
              if (data.counts) setCounts(data.counts);
              if (data.pillarAnswers) setPillarAnswers(data.pillarAnswers);
              if (data.players) setHostPlayers(data.players);
              break;

            case 'JOIN_SUCCESS':
              if (data.playerId) {
                localStorage.setItem('mcq_player_id', data.playerId);
              }
              if (data.player) setPlayer(data.player);
              break;

            case 'SESSION_EXPIRED':
              localStorage.removeItem('mcq_player_id');
              setPlayer(null);
              break;

            case 'TIMER_TICK':
              setRemainingSeconds(data.remainingSeconds);
              break;

            case 'TIMER_PAUSED':
              setGameState((prev) => ({ ...prev, timer_paused: true }));
              break;

            case 'TIMER_RESUMED':
              setGameState((prev) => ({ ...prev, timer_paused: false }));
              if (data.remainingSeconds !== undefined) setRemainingSeconds(data.remainingSeconds);
              break;

            case 'TIMER_EXTENDED':
              setRemainingSeconds(data.remainingSeconds);
              break;

            case 'QUESTION_LOCKED':
              setGameState((prev) => ({ ...prev, game_status: 'QUESTION_LOCKED' }));
              if (data.answerStats) setAnswerStats(data.answerStats);
              break;

            case 'ANSWER_LOCKED':
              setMyAnswer({ selected_option: data.selectedOption, is_correct: null, coins_awarded: data.coinsAwarded });
              break;

            case 'ANSWER_REVEALED':
              setGameState((prev) => ({ ...prev, game_status: 'REVEAL' }));
              if (data.answerStats) setAnswerStats(data.answerStats);
              setActiveQuestion((prev) =>
                prev
                  ? {
                      ...prev,
                      correct_option: data.correct_option,
                      explanation: data.explanation
                    }
                  : null
              );
              break;

            case 'LEADERBOARD_UPDATE':
              setGameState((prev) => ({ ...prev, game_status: 'LEVEL_LEADERBOARD' }));
              if (data.leaderboard) setLeaderboard(data.leaderboard);
              break;

            case 'COUNTS_UPDATE':
              setCounts({ total: data.totalRegistered, connected: data.connectedPlayers });
              break;

            case 'PODIUM_REVEAL':
              setGameState((prev) => ({ ...prev, game_status: 'PODIUM_WINNERS' }));
              if (data.podium) setPodium(data.podium);
              break;

            case 'PILLAR_ANSWERS_UPDATE':
              if (data.pillarAnswers) setPillarAnswers(data.pillarAnswers);
              break;

            case 'PLAYERS_UPDATE':
              if (data.players) setHostPlayers(data.players);
              break;

            case 'PILLAR_ANSWER_SAVED':
            case 'PILLAR_ALREADY_ANSWERED':
              break;

            case 'ERROR_MSG':
              setLastError(data.message);
              break;
          }
        } catch (e) {
          console.error('[WS Parse Error]', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Exponential reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 1500);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.error('[WS Connect Error]', e);
    }
  }, [viewRole]);

  useEffect(() => {
    connect();

    // Heartbeat every 15s to keep mobile connection alive
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'CLIENT_HEARTBEAT' }));
      }
    }, 15000);

    return () => {
      clearInterval(pingInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const send = useCallback((msg: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const joinAsPlayer = useCallback((studentId: string, name: string, avatarId: string) => {
    send({
      type: 'CLIENT_JOIN',
      studentId,
      name,
      avatarId
    });
  }, [send]);

  const submitAnswer = useCallback((selectedOption: string) => {
    if (!activeQuestion) return;
    const responseTimeMs = (activeQuestion.time_limit_sec - remainingSeconds) * 1000;
    send({
      type: 'CLIENT_SUBMIT_ANSWER',
      questionId: activeQuestion.id,
      selectedOption,
      responseTimeMs: Math.max(500, responseTimeMs)
    });
  }, [send, activeQuestion, remainingSeconds]);

  const submitPillarAnswer = useCallback((pillarId: number, questionId: number, selectedOption: string, isCorrect: boolean) => {
    send({
      type: 'CLIENT_SUBMIT_PILLAR_ANSWER',
      pillarId,
      questionId,
      selectedOption,
      isCorrect
    });
  }, [send]);

  return {
    isConnected,
    role: viewRole,
    gameState,
    player,
    activeQuestion,
    myAnswer,
    answerStats,
    leaderboard,
    podium,
    finalists,
    counts,
    lastError,
    remainingSeconds,
    pillarAnswers,
    hostPlayers,
    send,
    joinAsPlayer,
    submitAnswer,
    submitPillarAnswer
  };
}

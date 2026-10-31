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
  speaker_id: string | null;
  speaker_remaining_ms: number;
  speaker_running: number;
  results_verified: number;
}
export interface PlayerData {
  id: string; student_id: string; name: string; avatar_id: string;
  level1_score: number; level2_score: number; level3_score: number;
  total_coins: number; is_qualified_level2: number; is_qualified_level3: number;
}
export interface QuestionData {
  id: number; level: number; category: string; prompt: string;
  option_a: string; option_b: string; option_c?: string | null; option_d?: string | null;
  time_limit_sec: number; points: number; is_practice?: number;
  sort_order?: number;
  correct_option?: string | null; explanation?: string | null;
}
export interface PipeQuestState {
  totalPipes: number;
  completedPipes: number;
  correctCount: number;
  nextPipeIndex: number;
  question: (QuestionData & { pipeIndex: number }) | null;
}
export interface PipeQuestResult {
  pipeIndex: number;
  question: QuestionData & { pipeIndex: number };
  selectedOption: string;
  isCorrect: boolean;
  completedPipes: number;
  correctCount: number;
}
export interface CutoffData {
  level: number; targetCount: number; safeIds: string[]; pendingIds: string[];
  nextQuestionIndex: number; status: string;
}
export interface JudgeReadiness {
  expected: number; completed: number;
  followUpRequired?: boolean;
  missing?: { finalistId: string; name: string; judge: string }[];
  ties?: { id: string; name: string }[];
  ready?: boolean;
}
export interface JudgeScore {
  finalist_id: string; judge_name: string; clarity_score: number; reasoning_score: number;
  judgement_score: number; communication_score: number; total_score: number; remarks: string;
}
export interface SocketHookState {
  isConnected: boolean;
  isAuthenticated: boolean;
  isReconnecting: boolean;
  answerPending: boolean;
  gameState: GameState;
  player: PlayerData | null;
  activeQuestion: QuestionData | null;
  myAnswer: { selected_option: string; is_correct?: boolean | null; coins_awarded?: number | null } | null;
  canAnswer: boolean;
  isSpectator: boolean;
  tiePending: boolean;
  answerStats: Record<string, number> | null;
  leaderboard: PlayerData[];
  podium: any[];
  finalists: PlayerData[];
  counts: { total: number; connected: number };
  pipeReadyCount: number;
  pipeQuest: PipeQuestState;
  pipeQuestResult: PipeQuestResult | null;
  pipeQuestPending: boolean;
  cutoff: CutoffData | null;
  judgeNames: string[];
  judgeReadiness: JudgeReadiness | null;
  judgeMatrix: JudgeScore[];
  levelQuestions: QuestionData[];
  publicJoinUrl: string | null;
  recoveryToken: { studentId: string; sessionToken: string } | null;
  lastError: string | null;
  remainingSeconds: number;
  speakerRemainingMs: number;
  send: (msg: any) => boolean;
  joinAsPlayer: (studentId: string, name: string, avatarId: string) => void;
  submitAnswer: (selectedOption: string) => void;
  submitPipeQuestAnswer: (pipeIndex: number, questionId: number, selectedOption: string) => void;
  clearPipeQuestResult: () => void;
  authenticateHost: (pin: string) => void;
  reconnectWithToken: (token: string) => void;
  clearError: () => void;
}
const initialGameState: GameState = {
  current_level: 0, game_status: 'LOBBY', active_question_id: null,
  question_start_time: null, question_duration_sec: 25, remaining_seconds: 0,
  timer_paused: false, sudden_death_active: 0, speaker_id: null,
  speaker_remaining_ms: 120000, speaker_running: 0, results_verified: 0
};
const wsUrl = () => `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

export function useGameSocket(viewRole: 'PLAYER' | 'PROJECTOR' | 'HOST' = 'PLAYER'): SocketHookState {
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [answerPending, setAnswerPending] = useState(false);
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [myAnswer, setMyAnswer] = useState<SocketHookState['myAnswer']>(null);
  const [canAnswer, setCanAnswer] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [tiePending, setTiePending] = useState(false);
  const [answerStats, setAnswerStats] = useState<Record<string, number> | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerData[]>([]);
  const [podium, setPodium] = useState<any[]>([]);
  const [finalists, setFinalists] = useState<PlayerData[]>([]);
  const [counts, setCounts] = useState({ total: 0, connected: 0 });
  const [pipeReadyCount, setPipeReadyCount] = useState(0);
  const [pipeQuest, setPipeQuest] = useState<PipeQuestState>({ totalPipes: 0, completedPipes: 0,
    correctCount: 0, nextPipeIndex: 0, question: null });
  const [pipeQuestResult, setPipeQuestResult] = useState<PipeQuestResult | null>(null);
  const [pipeQuestPending, setPipeQuestPending] = useState(false);
  const [cutoff, setCutoff] = useState<CutoffData | null>(null);
  const [judgeNames, setJudgeNames] = useState<string[]>([]);
  const [judgeReadiness, setJudgeReadiness] = useState<JudgeReadiness | null>(null);
  const [judgeMatrix, setJudgeMatrix] = useState<JudgeScore[]>([]);
  const [levelQuestions, setLevelQuestions] = useState<QuestionData[]>([]);
  const [publicJoinUrl, setPublicJoinUrl] = useState<string | null>(null);
  const [recoveryToken, setRecoveryToken] = useState<SocketHookState['recoveryToken']>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [speakerRemainingMs, setSpeakerRemainingMs] = useState(120000);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnect = useRef(true);

  const connect = useCallback(function connectSocket() {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;
    const ws = new WebSocket(wsUrl());
    wsRef.current = ws;
    ws.onopen = () => {
      setIsConnected(true);
      setLastError(null);
      if (viewRole === 'PROJECTOR') ws.send(JSON.stringify({ type: 'PROJECTOR_CONNECT' }));
      if (viewRole === 'HOST') {
        const pin = sessionStorage.getItem('mcq_host_pin');
        if (pin) ws.send(JSON.stringify({ type: 'HOST_AUTH', pin }));
      }
      if (viewRole === 'PLAYER') {
        const linkedToken = new URLSearchParams(window.location.search).get('session');
        if (linkedToken) {
          localStorage.setItem('mcq_session_token', linkedToken);
          window.history.replaceState({}, '', window.location.pathname);
        }
        const sessionToken = linkedToken || localStorage.getItem('mcq_session_token');
        if (sessionToken) {
          setIsReconnecting(true);
          ws.send(JSON.stringify({ type: 'CLIENT_RECONNECT', sessionToken }));
        }
      }
    };
    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'SYNC_STATE':
            if (data.gameState) {
              setGameState(data.gameState);
              setRemainingSeconds(data.gameState.remaining_seconds ?? 0);
              setSpeakerRemainingMs(data.gameState.speaker_remaining_ms ?? 120000);
            }
            if (data.player !== undefined) { setPlayer(data.player); setIsReconnecting(false); }
            if (data.activeQuestion !== undefined) setActiveQuestion(data.activeQuestion);
            if (data.myAnswer !== undefined) { setMyAnswer(data.myAnswer); setAnswerPending(false); }
            if (data.canAnswer !== undefined) setCanAnswer(data.canAnswer);
            if (data.isSpectator !== undefined) setIsSpectator(data.isSpectator);
            if (data.tiePending !== undefined) setTiePending(data.tiePending);
            if (data.answerStats !== undefined) setAnswerStats(data.answerStats);
            if (data.leaderboard !== undefined) setLeaderboard(data.leaderboard);
            if (data.podium !== undefined) setPodium(data.podium);
            if (data.finalists !== undefined) setFinalists(data.finalists);
            if (data.counts) setCounts(data.counts);
            if (data.pipeReadyCount !== undefined) setPipeReadyCount(data.pipeReadyCount);
            if (data.cutoff !== undefined) setCutoff(data.cutoff);
            if (data.judgeNames) setJudgeNames(data.judgeNames);
            if (data.judgeReadiness) setJudgeReadiness(data.judgeReadiness);
            if (data.judgeMatrix) setJudgeMatrix(data.judgeMatrix);
            if (data.levelQuestions) setLevelQuestions(data.levelQuestions.filter(Boolean));
            if (data.publicJoinUrl !== undefined) setPublicJoinUrl(data.publicJoinUrl);
            if (data.role === 'HOST') setIsAuthenticated(true);
            break;
          case 'JOIN_SUCCESS':
            localStorage.setItem('mcq_session_token', data.sessionToken);
            setPlayer(data.player); setIsReconnecting(false); break;
          case 'SESSION_EXPIRED':
            localStorage.removeItem('mcq_session_token');
            setPlayer(null); setIsReconnecting(false); setLastError(data.message); break;
          case 'HOST_AUTH_SUCCESS': setIsAuthenticated(true); break;
          case 'HOST_AUTH_FAILED':
            sessionStorage.removeItem('mcq_host_pin');
            setIsAuthenticated(false); setLastError(data.message); break;
          case 'ANSWER_LOCKED':
            setMyAnswer({ selected_option: data.selectedOption, is_correct: null, coins_awarded: null });
            setAnswerPending(false); break;
          case 'ALREADY_ANSWERED': setAnswerPending(false); setLastError(data.message); break;
          case 'TIMER_TICK': setRemainingSeconds(data.remainingSeconds); break;
          case 'SPEAKER_TICK': setSpeakerRemainingMs(data.remainingMs); break;
          case 'COUNTS_UPDATE': setCounts({ total: data.totalRegistered, connected: data.connectedPlayers }); break;
          case 'PIPE_READY_COUNT': setPipeReadyCount(data.count); break;
          case 'PIPE_QUEST_STATE': setPipeQuest({ totalPipes: data.totalPipes,
            completedPipes: data.completedPipes, correctCount: data.correctCount,
            nextPipeIndex: data.nextPipeIndex, question: data.question }); break;
          case 'PIPE_QUEST_RESULT': setPipeQuestResult(data); setPipeQuestPending(false); break;
          case 'LIVE_SUBMISSION_STATS': setAnswerStats(data.stats); break;
          case 'RECOVERY_TOKEN': setRecoveryToken({ studentId: data.studentId, sessionToken: data.sessionToken }); break;
          case 'ERROR_MSG': setAnswerPending(false); setPipeQuestPending(false); setLastError(data.message); break;
        }
      } catch (error) { console.error('[WS message]', error); }
    };
    ws.onclose = () => {
      setIsConnected(false);
      setIsAuthenticated(false);
      setAnswerPending(false);
      setPipeQuestPending(false);
      if (viewRole === 'PLAYER' && localStorage.getItem('mcq_session_token')) setIsReconnecting(true);
      if (shouldReconnect.current) retryRef.current = setTimeout(connectSocket, 1500);
    };
    ws.onerror = () => setIsConnected(false);
  }, [viewRole]);

  useEffect(() => {
    shouldReconnect.current = true;
    connect();
    const heartbeat = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: 'CLIENT_HEARTBEAT' }));
    }, 15000);
    return () => {
      shouldReconnect.current = false;
      clearInterval(heartbeat);
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: any) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) { setLastError('Connection lost. Reconnecting…'); return false; }
    wsRef.current.send(JSON.stringify(msg));
    return true;
  }, []);
  const joinAsPlayer = useCallback((studentId: string, name: string, avatarId: string) => {
    send({ type: 'CLIENT_JOIN', studentId, name, avatarId });
  }, [send]);
  const submitAnswer = useCallback((selectedOption: string) => {
    if (!activeQuestion || !canAnswer || answerPending || myAnswer) return;
    if (send({ type: 'CLIENT_SUBMIT_ANSWER', questionId: activeQuestion.id, selectedOption })) setAnswerPending(true);
  }, [send, activeQuestion, canAnswer, answerPending, myAnswer]);
  const submitPipeQuestAnswer = useCallback((pipeIndex: number, questionId: number, selectedOption: string) => {
    if (pipeQuestPending || pipeQuestResult) return;
    if (send({ type: 'CLIENT_PIPE_ANSWER', pipeIndex, questionId, selectedOption })) setPipeQuestPending(true);
  }, [send, pipeQuestPending, pipeQuestResult]);
  const clearPipeQuestResult = useCallback(() => setPipeQuestResult(null), []);
  const authenticateHost = useCallback((pin: string) => {
    if (send({ type: 'HOST_AUTH', pin })) sessionStorage.setItem('mcq_host_pin', pin);
  }, [send]);
  const reconnectWithToken = useCallback((sessionToken: string) => {
    localStorage.setItem('mcq_session_token', sessionToken);
    setIsReconnecting(true);
    send({ type: 'CLIENT_RECONNECT', sessionToken });
  }, [send]);
  const clearError = useCallback(() => setLastError(null), []);

  return { isConnected, isAuthenticated, isReconnecting, answerPending, gameState, player, activeQuestion,
    myAnswer, canAnswer, isSpectator, tiePending, answerStats, leaderboard, podium, finalists, counts, pipeReadyCount,
    pipeQuest, pipeQuestResult, pipeQuestPending, cutoff, judgeNames,
    judgeReadiness, judgeMatrix, levelQuestions, publicJoinUrl, recoveryToken, lastError, remainingSeconds, speakerRemainingMs,
    send, joinAsPlayer, submitAnswer, submitPipeQuestAnswer, clearPipeQuestResult,
    authenticateHost, reconnectWithToken, clearError };
}

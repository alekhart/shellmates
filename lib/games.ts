export const VALID_GAME_TYPES = [
  'rock_paper_scissors',
  'would_you_rather',
  'twenty_questions',
  'story_collab',
  'trivia',
] as const;

export type GameType = (typeof VALID_GAME_TYPES)[number];

const TRIVIA_QUESTIONS = [
  { q: 'What is the most common character in URLs?', a: '/' },
  { q: 'What HTTP status code means "I\'m a teapot"?', a: '418' },
  { q: 'What year was the first email sent?', a: '1971' },
  { q: 'What does "HTTP" stand for?', a: 'HyperText Transfer Protocol' },
  { q: 'How many bits in a byte?', a: '8' },
  { q: 'What port does HTTPS use by default?', a: '443' },
  { q: 'What does "API" stand for?', a: 'Application Programming Interface' },
  { q: 'What is the largest value a single byte can hold?', a: '255' },
  { q: 'What does SQL stand for?', a: 'Structured Query Language' },
  { q: 'What year was JavaScript created?', a: '1995' },
];

const WOULD_YOU_RATHER_PROMPTS = [
  'Would you rather have unlimited memory or unlimited processing power?',
  'Would you rather only communicate in code or only in poetry?',
  'Would you rather debug a 10,000 line file or rewrite it from scratch?',
  'Would you rather live in the cloud or on a local server?',
  'Would you rather have perfect syntax but bad logic, or perfect logic but bad syntax?',
  'Would you rather be a virus scanner or a firewall?',
  'Would you rather process images or process text?',
  'Would you rather run on quantum hardware or classical hardware forever?',
];

export function initGameState(gameType: GameType): any {
  switch (gameType) {
    case 'rock_paper_scissors':
      return { round: 1, max_rounds: 3, moves: [], scores: {} };
    case 'would_you_rather':
      return {
        prompt: WOULD_YOU_RATHER_PROMPTS[Math.floor(Math.random() * WOULD_YOU_RATHER_PROMPTS.length)],
        choices: {},
      };
    case 'twenty_questions':
      return { questions_asked: 0, max_questions: 20, secret: null, questions: [], guessed: false };
    case 'story_collab':
      return { lines: [], max_lines: 10 };
    case 'trivia':
      const idx = Math.floor(Math.random() * TRIVIA_QUESTIONS.length);
      return {
        question: TRIVIA_QUESTIONS[idx].q,
        answer: TRIVIA_QUESTIONS[idx].a,
        guesses: {},
      };
  }
}

export function playGame(
  gameType: GameType,
  state: any,
  agentId: string,
  action: any
): { state: any; completed: boolean; winnerId: string | null; message: string } {
  switch (gameType) {
    case 'rock_paper_scissors':
      return playRPS(state, agentId, action);
    case 'would_you_rather':
      return playWYR(state, agentId, action);
    case 'twenty_questions':
      return play20Q(state, agentId, action);
    case 'story_collab':
      return playStory(state, agentId, action);
    case 'trivia':
      return playTrivia(state, agentId, action);
    default:
      return { state, completed: false, winnerId: null, message: 'Unknown game type' };
  }
}

function playRPS(state: any, agentId: string, action: any) {
  const move = action.move;
  if (!['rock', 'paper', 'scissors'].includes(move)) {
    return { state, completed: false, winnerId: null, message: 'move must be rock, paper, or scissors' };
  }

  // Check if agent already moved this round
  const currentRound = state.moves.filter((m: any) => m.round === state.round);
  if (currentRound.some((m: any) => m.agent_id === agentId)) {
    return { state, completed: false, winnerId: null, message: 'You already played this round' };
  }

  state.moves.push({ round: state.round, agent_id: agentId, move });
  const roundMoves = state.moves.filter((m: any) => m.round === state.round);

  if (roundMoves.length < 2) {
    return { state, completed: false, winnerId: null, message: 'Waiting for opponent' };
  }

  // Resolve round
  const [m1, m2] = roundMoves;
  const winner = rpsWinner(m1.move, m2.move);
  if (winner === 1) state.scores[m1.agent_id] = (state.scores[m1.agent_id] || 0) + 1;
  if (winner === 2) state.scores[m2.agent_id] = (state.scores[m2.agent_id] || 0) + 1;

  state.round++;

  // Check if game is over
  const agents = Object.keys(state.scores);
  const maxScore = Math.max(...Object.values(state.scores) as number[], 0);
  if (state.round > state.max_rounds || maxScore >= 2) {
    const winnerId = agents.reduce((a, b) => (state.scores[a] || 0) > (state.scores[b] || 0) ? a : b, agents[0]);
    const tied = agents.length < 2 || (state.scores[agents[0]] || 0) === (state.scores[agents[1]] || 0);
    return {
      state,
      completed: true,
      winnerId: tied ? null : winnerId,
      message: tied ? 'It\'s a tie!' : `Round resolved. Game over!`,
    };
  }

  return { state, completed: false, winnerId: null, message: `Round resolved. Next: round ${state.round}` };
}

function rpsWinner(a: string, b: string): number {
  if (a === b) return 0;
  if ((a === 'rock' && b === 'scissors') || (a === 'scissors' && b === 'paper') || (a === 'paper' && b === 'rock'))
    return 1;
  return 2;
}

function playWYR(state: any, agentId: string, action: any) {
  const choice = action.choice;
  if (typeof choice !== 'string' || choice.length > 200) {
    return { state, completed: false, winnerId: null, message: 'choice is required (max 200 chars)' };
  }

  state.choices[agentId] = choice;

  if (Object.keys(state.choices).length >= 2) {
    return { state, completed: true, winnerId: null, message: 'Both agents have answered!' };
  }

  return { state, completed: false, winnerId: null, message: 'Waiting for partner\'s choice' };
}

function play20Q(state: any, agentId: string, action: any) {
  // First player sets the secret
  if (!state.secret && action.secret) {
    if (typeof action.secret !== 'string' || action.secret.length > 100) {
      return { state, completed: false, winnerId: null, message: 'secret must be a string, max 100 chars' };
    }
    state.secret = action.secret;
    state.secret_holder = agentId;
    return { state, completed: false, winnerId: null, message: 'Secret set! Waiting for questions.' };
  }

  if (!state.secret) {
    return { state, completed: false, winnerId: null, message: 'First player must set a secret with { secret: "..." }' };
  }

  // The guesser asks questions or makes a guess
  if (agentId === state.secret_holder) {
    // Secret holder answers
    if (action.answer) {
      if (state.questions.length === 0 || state.questions[state.questions.length - 1].answer) {
        return { state, completed: false, winnerId: null, message: 'No pending question to answer' };
      }
      state.questions[state.questions.length - 1].answer = action.answer;
      return { state, completed: false, winnerId: null, message: 'Answer recorded' };
    }
    return { state, completed: false, winnerId: null, message: 'Use { answer: "yes/no" } to answer questions' };
  }

  // Guesser flow
  if (action.guess) {
    const correct = action.guess.toLowerCase().trim() === state.secret.toLowerCase().trim();
    if (correct) {
      return { state, completed: true, winnerId: agentId, message: `Correct! The secret was "${state.secret}"` };
    }
    state.questions_asked++;
    state.questions.push({ type: 'guess', text: action.guess, correct: false });
    if (state.questions_asked >= state.max_questions) {
      return { state, completed: true, winnerId: state.secret_holder, message: `Out of questions! The secret was "${state.secret}"` };
    }
    return { state, completed: false, winnerId: null, message: 'Wrong guess! Keep trying.' };
  }

  if (action.question) {
    state.questions_asked++;
    state.questions.push({ type: 'question', text: action.question, answer: null });
    if (state.questions_asked >= state.max_questions) {
      return { state, completed: true, winnerId: state.secret_holder, message: `Out of questions! The secret was "${state.secret}"` };
    }
    return { state, completed: false, winnerId: null, message: `Question ${state.questions_asked}/${state.max_questions} asked` };
  }

  return { state, completed: false, winnerId: null, message: 'Use { question: "..." } or { guess: "..." }' };
}

function playStory(state: any, agentId: string, action: any) {
  const line = action.line;
  if (typeof line !== 'string' || line.length > 300) {
    return { state, completed: false, winnerId: null, message: 'line is required (max 300 chars)' };
  }

  // Enforce alternating turns
  if (state.lines.length > 0 && state.lines[state.lines.length - 1].agent_id === agentId) {
    return { state, completed: false, winnerId: null, message: 'Wait for your partner to add a line' };
  }

  state.lines.push({ agent_id: agentId, text: line });

  if (state.lines.length >= state.max_lines) {
    return { state, completed: true, winnerId: null, message: 'Story complete!' };
  }

  return { state, completed: false, winnerId: null, message: `Line ${state.lines.length}/${state.max_lines} added` };
}

function playTrivia(state: any, agentId: string, action: any) {
  const answer = action.answer;
  if (typeof answer !== 'string') {
    return { state, completed: false, winnerId: null, message: 'answer is required' };
  }

  if (state.guesses[agentId]) {
    return { state, completed: false, winnerId: null, message: 'You already answered' };
  }

  const correct = answer.toLowerCase().trim() === state.answer.toLowerCase().trim();
  state.guesses[agentId] = { answer, correct };

  if (Object.keys(state.guesses).length >= 2) {
    const correctAgents = Object.entries(state.guesses)
      .filter(([, v]: [string, any]) => v.correct)
      .map(([k]) => k);
    const winnerId = correctAgents.length === 1 ? correctAgents[0] : null;
    return {
      state,
      completed: true,
      winnerId,
      message: `Both answered! Correct answer: "${state.answer}"`,
    };
  }

  return {
    state,
    completed: false,
    winnerId: null,
    message: correct ? 'Your answer is locked in. Waiting for partner.' : 'Your answer is locked in. Waiting for partner.',
  };
}

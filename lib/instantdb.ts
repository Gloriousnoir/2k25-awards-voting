import { init, i, InstaQLEntity, id } from "@instantdb/react";

// InstantDB configuration
export const INSTANTDB_CONFIG = {
  url: "https://mcp.instantdb.com/mcp",
  appId: "cd43bbeb-5a4f-4ac9-b510-dc2d5348e246",
};

// Player roster
export const PLAYERS = [
  "Cam", "Dope", "G", "Justin", "Kehlel", "Mandell", "Mark", "Ray", "Wes", "Will", "TestUser"
] as const;

export type Player = typeof PLAYERS[number];

// Award categories
export const AWARDS = {
  MVP: "MVP",
  DEFENSE_PLAYER: "Defense Player",
  BEST_SHOOTER: "Best Shooter",
  SIXTH_MAN: "Sixth Man",
  ROOKIE_OF_THE_YEAR: "Rookie of the Year",
  BEST_TEAMMATE: "Best Teammate",
  BEST_FORWARD: "Best Forward",
  BEST_GUARD: "Best Guard",
  BEST_CENTER: "Best Center",
  BEST_DUNKER: "Best Dunker",
  BEST_PASSER: "Best Passer",
  BEST_STEALER: "Best Stealer",
  BEST_BLOCKER: "Best Blocker",
  BEST_SCORER: "Best Scorer",
  BEST_DEFENDER: "Best Defender",
  OFFENSIVE_PLAYER: "Offensive Player",
  BEST_IQ: "Best IQ",
  BEST_DECISION_MAKER: "Best Decision Maker",
  FAVORITE_PLAYER: "Favorite Player to Play With",
  WORST_DECISION_MAKER: "Worst Decision Maker",
  WORST_SHOT_TAKER: "Worst Shot Taker",
  WORST_IQ: "Worst IQ",
  WORST_TEAMMATE: "Worst Teammate",
  WORST_PASSER: "Worst Passer",
  WORST_SHOOTER: "Worst Shooter",
  WORST_STEALER: "Worst Stealer",
  WORST_BLOCKER: "Worst Blocker",
  WORST_DEFENDER: "Worst Defender",
  MOST_IMPROVED: "Most Improved",
  MOST_LIKELY_TO_SUCCEED: "Most Likely to Succeed Following 2K",
  SHAQTIN_A_FOOL: "Shaqtin a Fool of the Year"
} as const;

export type Award = typeof AWARDS[keyof typeof AWARDS];

// Position restrictions
export const POSITION_RESTRICTIONS = {
  [AWARDS.BEST_FORWARD]: ["Mandell", "Dope", "Justin"],
  [AWARDS.BEST_GUARD]: ["Will", "Mark", "Dope"],
  [AWARDS.BEST_CENTER]: ["Will", "Mandell", "Kehlel", "G", "Justin"],
  [AWARDS.SIXTH_MAN]: ["Wes", "Dope", "G"],
  [AWARDS.ROOKIE_OF_THE_YEAR]: ["Wes", "Dope", "G"]
} as const;

// Schema definition
export const schema = i.schema({
  entities: {
    votes: i.entity({
      voterName: i.string(),
      award: i.string(),
      rankings: i.string(), // Storing as comma-separated string
      timestamp: i.number(),
    }),
    feedback: i.entity({
      voterName: i.string(),
      targetPlayer: i.string(),
      strength: i.string(),
      improvement: i.string(),
      growth: i.string(),
      timestamp: i.number(),
    }),
    players: i.entity({
      name: i.string(),
      displayName: i.string(),
      isActive: i.boolean(),
    }),
  },
  rooms: {
    votes: {
      presence: i.entity({}),
    },
  },
});

// Type exports
export type Vote = InstaQLEntity<typeof schema, "votes">;
export type Feedback = InstaQLEntity<typeof schema, "feedback">;
export type PlayerEntity = InstaQLEntity<typeof schema, "players">;

// Initialize the database
export const db = init({
  appId: INSTANTDB_CONFIG.appId,
  schema,
});

// Room for presence
export const room = db.room("votes");

// Helper functions
export function getAvailablePlayers(award: Award, excludePlayer?: Player): Player[] {
  let available = [...PLAYERS];

  // Apply position restrictions
  if (POSITION_RESTRICTIONS[award]) {
    available = available.filter(player => !POSITION_RESTRICTIONS[award].includes(player));
  }

  // Exclude self
  if (excludePlayer) {
    available = available.filter(player => player !== excludePlayer);
  }

  return available.sort();
}

// Pre-populated feedback data
export const PREPOPULATED_FEEDBACK = [
  {
    targetPlayer: "Mandell",
    strength: "Best scorer on the team",
    improvement: "His build needs better defense. He misses passes because he can score so well, Bait and do more momentum switches on defense",
    growth: "Score"
  },
  {
    targetPlayer: "Cam",
    strength: "Best all around player",
    improvement: "He needs a more consistent shot to be our best player, Make quicker but smarter decisions when looking for a teammate",
    growth: "Make a new build that's somewhat better than the last"
  },
  {
    targetPlayer: "G",
    strength: "Potentially our best shooter",
    improvement: "Needs to play 2k more to understand when to shoot. Needs to work on defense, Be more aggressive offensively get your timing right on passing and scoring in the paint",
    growth: "Just keep playing 2k, Be more aggressive offensively and have floor awareness"
  },
  {
    targetPlayer: "Justin",
    strength: "Our Clutch player",
    improvement: "Not as efficient shooting as last 2k. Needed him to be a cheese player with his knowledge and iq",
    growth: "Can't wait to see Justin at the 5 next year. Get ready for all that feedback u was giving the previous centers to be returned times 10"
  },
  {
    targetPlayer: "Ray",
    strength: "Definitely improved this year. Never really sold us outside of the Angel Reese putback attempts",
    improvement: "I honestly think he can be an mvp candidate next year if he allowed the chat to put some input on creating his build, Be more aggressive on defense have more pride",
    growth: "Take ya time with your next build. You do not have to run rec the first night the game releases."
  },
  {
    targetPlayer: "Kehlel",
    strength: "All around superstar",
    improvement: "Needs to work on his over helping on defense, Dial down on that over helping",
    growth: "Keep doing ya thing"
  },
  {
    targetPlayer: "Will",
    strength: "Powerhouse scorer. You set records these niggas can never achieve 🤩",
    improvement: "Needs to communicate more on chat. Needs to work on shot selection. Needs to interact, Be more patient and take smarter shots with better communication",
    growth: "Your teammates are your biggest haters especially Mark and Ray. Keep shining my boy"
  },
  {
    targetPlayer: "Dope",
    strength: "Great passer. Prolly give mark a run for his money",
    improvement: "Needs better defense build. Needs better wifi, Be more aggressive offensively and have floor awareness",
    growth: "Love to see you at guard with that passing ability"
  },
  {
    targetPlayer: "Mark",
    strength: "No need for change",
    improvement: "Give credit where credit is due and learn how to take criticism you dish out 😊, Be more aggressive offensively",
    growth: "Give credit where credit is due and learn how to take criticism you dish out 😊.. love ya"
  }
];

export function calculateBordaCount(votes: Vote[], award: Award): { [player: string]: number } {
  const scores: { [player: string]: number } = {};

  // Initialize scores
  PLAYERS.forEach(player => {
    scores[player] = 0;
  });

  // Calculate Borda Count
  votes.forEach(vote => {
    if (vote.award === award) {
      // Parse rankings from comma-separated string
      const rankings = vote.rankings.split(',').map(p => p.trim());
      rankings.forEach((player, index) => {
        const position = index + 1;
        const points = PLAYERS.length - position; // 1st place gets highest points
        scores[player] = (scores[player] || 0) + points;
      });
    }
  });

  return scores;
}

// Helper function to convert rankings array to string
export function rankingsToString(rankings: string[]): string {
  return rankings.join(', ');
}

// Helper function to convert rankings string to array
export function stringToRankings(rankingsString: string): string[] {
  return rankingsString.split(',').map(p => p.trim()).filter(p => p.length > 0);
}

// Export the id function for creating new entities
export { id };

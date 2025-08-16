import { type Vote } from './instantdb';

// Deep analysis of vote counting logic
export function deepVoteAnalysis(votes: Vote[]): {
  totalVotes: number;
  voterCount: number;
  awardCount: number;
  playerVoteBreakdown: { [player: string]: any };
  summary: string;
  detailedBreakdown: string;
} {
  const totalVotes = votes.length;
  const uniqueVoters = new Set(votes.map(v => v.voterName));
  const uniqueAwards = new Set(votes.map(v => v.award));
  
  // Initialize player analysis
  const players = ['Cam', 'Dope', 'G', 'Justin', 'Kehlel', 'Mandell', 'Mark', 'Ray', 'Wes', 'Will'];
  const playerVoteBreakdown: { [player: string]: any } = {};
  
  players.forEach(player => {
    playerVoteBreakdown[player] = {
      totalVotesReceived: 0,
      awardsAppearedIn: new Set<string>(),
      voteDetails: [] as any[],
      positionInRankings: [] as number[]
    };
  });

  // Analyze each vote
  votes.forEach(vote => {
    const rankings = vote.rankings.split(',').map(p => p.trim());
    
    rankings.forEach((player, index) => {
      if (playerVoteBreakdown[player]) {
        playerVoteBreakdown[player].totalVotesReceived++;
        playerVoteBreakdown[player].awardsAppearedIn.add(vote.award);
        playerVoteBreakdown[player].voteDetails.push({
          award: vote.award,
          voter: vote.voterName,
          position: index + 1,
          timestamp: vote.timestamp
        });
        playerVoteBreakdown[player].positionInRankings.push(index + 1);
      }
    });
  });

  // Convert sets to counts and create summary
  let summary = `📊 VOTE ANALYSIS SUMMARY\n`;
  summary += `Total Votes in System: ${totalVotes}\n`;
  summary += `Unique Voters: ${uniqueVoters.size}\n`;
  summary += `Unique Awards: ${uniqueAwards.size}\n\n`;
  
  summary += `Player Vote Breakdown:\n`;
  summary += `Player      | Total Votes | Awards | Avg Position\n`;
  summary += `------------|-------------|--------|-------------\n`;
  
  players.forEach(player => {
    const data = playerVoteBreakdown[player];
    const avgPosition = data.positionInRankings.length > 0 
      ? (data.positionInRankings.reduce((a, b) => a + b, 0) / data.positionInRankings.length).toFixed(1)
      : 'N/A';
    
    summary += `${player.padEnd(11)} | ${data.totalVotesReceived.toString().padStart(11)} | ${data.awardsAppearedIn.size.toString().padStart(6)} | ${avgPosition.padStart(11)}\n`;
  });

  // Create detailed breakdown
  let detailedBreakdown = `🔍 DETAILED VOTE BREAKDOWN\n\n`;
  
  players.forEach(player => {
    const data = playerVoteBreakdown[player];
    detailedBreakdown += `=== ${player} ===\n`;
    detailedBreakdown += `Total Votes Received: ${data.totalVotesReceived}\n`;
    detailedBreakdown += `Awards Appeared In: ${data.awardsAppearedIn.size}\n`;
    detailedBreakdown += `Awards: ${Array.from(data.awardsAppearedIn).join(', ')}\n`;
    detailedBreakdown += `Average Position: ${data.positionInRankings.length > 0 
      ? (data.positionInRankings.reduce((a, b) => a + b, 0) / data.positionInRankings.length).toFixed(1)
      : 'N/A'}\n`;
    
    detailedBreakdown += `\nVote Details:\n`;
    data.voteDetails.forEach(detail => {
      detailedBreakdown += `  • ${detail.award} (${detail.position}${detail.position === 1 ? 'st' : detail.position === 2 ? 'nd' : detail.position === 3 ? 'rd' : 'th'}) by ${detail.voter}\n`;
    });
    detailedBreakdown += `\n`;
  });

  return {
    totalVotes,
    voterCount: uniqueVoters.size,
    awardCount: uniqueAwards.size,
    playerVoteBreakdown,
    summary,
    detailedBreakdown
  };
}

// Check if the "9 votes" refers to something else
export function checkVoteCountingLogic(votes: Vote[]): {
  possibleExplanations: string[];
  analysis: string;
} {
  const players = ['Cam', 'Dope', 'G', 'Justin', 'Kehlel', 'Mandell', 'Mark', 'Ray', 'Wes', 'Will'];
  const possibleExplanations: string[] = [];
  let analysis = `🔍 VOTE COUNTING LOGIC ANALYSIS\n\n`;

  // Check if "9 votes" means something other than total votes received
  analysis += `Possible explanations for "9 votes" vs "8 votes":\n\n`;

  // 1. Check if it's about unique award categories
  const playerAwardCategories: { [player: string]: Set<string> } = {};
  players.forEach(player => playerAwardCategories[player] = new Set());

  votes.forEach(vote => {
    const rankings = vote.rankings.split(',').map(p => p.trim());
    rankings.forEach(player => {
      if (playerAwardCategories[player]) {
        playerAwardCategories[player].add(vote.award);
      }
    });
  });

  analysis += `1. UNIQUE AWARD CATEGORIES:\n`;
  players.forEach(player => {
    const count = playerAwardCategories[player].size;
    analysis += `   ${player}: ${count} award categories\n`;
    if (count === 9) {
      possibleExplanations.push(`${player} appears in 9 different award categories`);
    }
  });

  // 2. Check if it's about being ranked in votes
  analysis += `\n2. TOTAL TIMES RANKED IN VOTES:\n`;
  const playerRankCounts: { [player: string]: number } = {};
  players.forEach(player => playerRankCounts[player] = 0);

  votes.forEach(vote => {
    const rankings = vote.rankings.split(',').map(p => p.trim());
    rankings.forEach(player => {
      if (playerRankCounts.hasOwnProperty(player)) {
        playerRankCounts[player]++;
      }
    });
  });

  players.forEach(player => {
    analysis += `   ${player}: ranked ${playerRankCounts[player]} times\n`;
    if (playerRankCounts[player] === 9) {
      possibleExplanations.push(`${player} was ranked 9 times total across all votes`);
    }
  });

  // 3. Check if it's about receiving votes in specific positions
  analysis += `\n3. POSITION-SPECIFIC ANALYSIS:\n`;
  const playerPositionCounts: { [player: string]: { [position: number]: number } } = {};
  players.forEach(player => {
    playerPositionCounts[player] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  });

  votes.forEach(vote => {
    const rankings = vote.rankings.split(',').map(p => p.trim());
    rankings.forEach((player, index) => {
      const position = index + 1;
      if (playerPositionCounts[player] && playerPositionCounts[player][position] !== undefined) {
        playerPositionCounts[player][position]++;
      }
    });
  });

  players.forEach(player => {
    const firstPlaceCount = playerPositionCounts[player][1];
    analysis += `   ${player}: ${firstPlaceCount} first place votes\n`;
    if (firstPlaceCount === 9) {
      possibleExplanations.push(`${player} received 9 first-place votes`);
    }
  });

  return {
    possibleExplanations,
    analysis
  };
}

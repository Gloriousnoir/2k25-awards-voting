import { type Vote } from './instantdb';

// Function to find duplicate votes
export function findDuplicateVotes(votes: Vote[]): {
  duplicates: Vote[];
  duplicateCount: number;
  summary: string;
} {
  const duplicates: Vote[] = [];
  const seen = new Set<string>();
  
  votes.forEach((vote) => {
    const key = `${vote.voterName}-${vote.award}`;
    if (seen.has(key)) {
      duplicates.push(vote);
    } else {
      seen.add(key);
    }
  });

  // Group duplicates by voter-award combination
  const duplicateGroups: { [key: string]: Vote[] } = {};
  duplicates.forEach(vote => {
    const key = `${vote.voterName}-${vote.award}`;
    if (!duplicateGroups[key]) {
      duplicateGroups[key] = [];
    }
    duplicateGroups[key].push(vote);
  });

  // Create summary
  let summary = `Found ${duplicates.length} duplicate votes:\n\n`;
  Object.entries(duplicateGroups).forEach(([key, votes]) => {
    const [voter, award] = key.split('-');
    summary += `• ${voter} has ${votes.length + 1} votes for "${award}"\n`;
  });

  return {
    duplicates,
    duplicateCount: duplicates.length,
    summary
  };
}

// Function to analyze vote distribution by player
export function analyzeVoteDistribution(votes: Vote[]): {
  playerVoteCounts: { [player: string]: number };
  playerAwardCounts: { [player: string]: number };
  summary: string;
} {
  const playerVoteCounts: { [player: string]: number } = {};
  const playerAwardCounts: { [player: string]: number } = {};
  const playerAwards: { [player: string]: Set<string> } = {};

  // Initialize
  ['Cam', 'Dope', 'G', 'Justin', 'Kehlel', 'Mandell', 'Mark', 'Ray', 'Wes', 'Will'].forEach(player => {
    playerVoteCounts[player] = 0;
    playerAwardCounts[player] = 0;
    playerAwards[player] = new Set();
  });

  // Count votes and awards for each player
  votes.forEach(vote => {
    const rankings = vote.rankings.split(',').map(p => p.trim());
    rankings.forEach(player => {
      if (playerVoteCounts.hasOwnProperty(player)) {
        playerVoteCounts[player]++;
        playerAwards[player].add(vote.award);
      }
    });
  });

  // Convert sets to counts
  Object.keys(playerAwards).forEach(player => {
    playerAwardCounts[player] = playerAwards[player].size;
  });

  // Create summary
  let summary = 'Vote Distribution Analysis:\n\n';
  summary += 'Player | Total Votes | Unique Awards\n';
  summary += '-------|-------------|--------------\n';
  
  Object.keys(playerVoteCounts).forEach(player => {
    summary += `${player.padEnd(7)} | ${playerVoteCounts[player].toString().padStart(11)} | ${playerAwardCounts[player].toString().padStart(13)}\n`;
  });

  return {
    playerVoteCounts,
    playerAwardCounts,
    summary
  };
}

// Function to check for data import issues
export function checkDataImportIssues(votes: Vote[]): {
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check for multiple voters with same name but different timestamps
  const voterGroups: { [name: string]: Vote[] } = {};
  votes.forEach(vote => {
    if (!voterGroups[vote.voterName]) {
      voterGroups[vote.voterName] = [];
    }
    voterGroups[vote.voterName].push(vote);
  });

  Object.entries(voterGroups).forEach(([voterName, voterVotes]) => {
    if (voterVotes.length > 30) { // More than total awards
      issues.push(`${voterName} has ${voterVotes.length} votes (more than total awards)`);
      recommendations.push(`Check for duplicate imports of ${voterName}'s data`);
    }
  });

  // Check for suspicious timestamp patterns
  const timestamps = votes.map(v => v.timestamp).sort();
  const timeRange = timestamps[timestamps.length - 1] - timestamps[0];
  if (timeRange < 1000 * 60 * 60) { // Less than 1 hour
    issues.push('All votes were created within a very short time period (possible bulk import)');
    recommendations.push('Verify that votes weren\'t imported multiple times');
  }

  // Check for exact duplicate rankings
  const rankingGroups: { [key: string]: Vote[] } = {};
  votes.forEach(vote => {
    const key = `${vote.voterName}-${vote.award}-${vote.rankings}`;
    if (!rankingGroups[key]) {
      rankingGroups[key] = [];
    }
    rankingGroups[key].push(vote);
  });

  Object.entries(rankingGroups).forEach(([key, votes]) => {
    if (votes.length > 1) {
      const [voter, award] = key.split('-');
      issues.push(`Exact duplicate found: ${voter} has ${votes.length} identical votes for "${award}"`);
      recommendations.push(`Remove ${votes.length - 1} duplicate votes for ${voter} in ${award}`);
    }
  });

  return { issues, recommendations };
}

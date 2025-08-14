import { db } from "./instantdb";
import { id } from "@instantdb/react";
import { rankingsToString } from "./instantdb";

// Interface for importing existing votes
export interface ExistingVote {
  voterName: string;
  award: string;
  rankings: string[];
  timestamp?: number;
}

// Function to import existing votes
export async function importExistingVotes(votes: ExistingVote[]) {
  const transactions = votes.map(vote => 
    db.tx.votes[id()].update({
      voterName: vote.voterName,
      award: vote.award,
      rankings: rankingsToString(vote.rankings), // Convert array to string
      timestamp: vote.timestamp || Date.now(),
    })
  );

  try {
    await db.transact(transactions);
    console.log(`Successfully imported ${votes.length} votes`);
    return true;
  } catch (error) {
    console.error('Error importing votes:', error);
    return false;
  }
}

// Function to clear all existing votes (admin only)
export async function clearAllVotes() {
  try {
    // Note: This is a destructive operation - use with caution
    // You might want to implement a more sophisticated clearing mechanism
    console.log('Clearing all votes...');
    // Implementation depends on your specific needs
    return true;
  } catch (error) {
    console.error('Error clearing votes:', error);
    return false;
  }
}

// Example of how to use this with your JSON data:
/*
// 1. Create a file called 'existing-votes.json' in your project root
// 2. Format your data like this:
[
  {
    "voterName": "Cam",
    "award": "MVP",
    "rankings": ["Mark", "Ray", "Will", "Kehlel", "Mandell"]
  },
  {
    "voterName": "Dope", 
    "award": "Best Shooter",
    "rankings": ["Justin", "G", "Mark", "Ray", "Will"]
  }
]

// 3. Import the data:
import { importExistingVotes } from './lib/data-import';
import existingVotesData from './existing-votes.json';

// Call this function when you're ready to import:
await importExistingVotes(existingVotesData);
*/

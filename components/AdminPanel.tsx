"use client";

import { useState } from "react";
import { db } from "../lib/instantdb";
import { id } from "@instantdb/react";
import { AWARDS, PLAYERS } from "../lib/instantdb";
import { findDuplicateVotes, analyzeVoteDistribution, checkDataImportIssues } from "../lib/duplicate-checker";

interface AdminPanelProps {
  onClose: () => void;
  votesData?: any;
  feedbackData?: any;
}

export default function AdminPanel({ onClose, votesData, feedbackData }: AdminPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [message, setMessage] = useState("");

  // Create test user with sample votes
  const createTestUser = async () => {
    setIsCreating(true);
    setMessage("");
    
    try {
      // Check if TestUser already exists by looking at the current votes data
      // This will be handled by the parent component's data
      setMessage("ℹ️ Creating test user... Please wait.");
      
      // Create test votes for "TestVoter" across all awards
      const testVotes = Object.values(AWARDS).map(award => {
        // Create a simple ranking for each award (using all available players)
        const availablePlayers = PLAYERS;
        const rankings = availablePlayers.slice(0, 5).join(", "); // Top 5 players
        
        return db.tx.votes[id()].update({
          voterName: "TestVoter",
          award: award,
          rankings: rankings,
          timestamp: Date.now(),
        });
      });

      // Create test feedback
      const testFeedback = PLAYERS.map(player => {
        return db.tx.feedback[id()].update({
          voterName: "TestVoter",
          targetPlayer: player,
          strength: `Test feedback strength for ${player}`,
          improvement: `Test feedback improvement for ${player}`,
          growth: `Test feedback growth for ${player}`,
          timestamp: Date.now(),
        });
      });

      // Execute all transactions
      await db.transact([...testVotes, ...testFeedback]);
      
      setMessage("✅ Test user 'TestVoter' created successfully with votes for all awards and feedback for all teammates!");
    } catch (error) {
      console.error("Error creating test user:", error);
      setMessage("❌ Error creating test user. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  // Cleanup test data
  const cleanupTestData = async () => {
    setIsCleaning(true);
    setMessage("");
    
    try {
      // Note: InstantDB doesn't support bulk delete operations in the same way
      // We'll need to handle this differently or just inform the user
      setMessage("⚠️ Bulk delete not supported. Please manually remove test data or contact support.");
    } catch (error) {
      console.error("Error cleaning up test data:", error);
      setMessage("❌ Error cleaning up test data. Please try again.");
    } finally {
      setIsCleaning(false);
    }
  };

  // Enhanced duplicate vote analysis
  const analyzeVotes = async () => {
    setIsCleaning(true);
    setMessage("");
    
    try {
      if (!votesData?.votes) {
        setMessage("❌ No votes data available.");
        return;
      }

      const votes = votesData.votes;
      
      // Check for duplicates
      const duplicateAnalysis = findDuplicateVotes(votes);
      
      // Analyze vote distribution
      const distributionAnalysis = analyzeVoteDistribution(votes);
      
      // Check for data import issues
      const importIssues = checkDataImportIssues(votes);
      
      // Create comprehensive report
      let report = "🔍 COMPREHENSIVE VOTE ANALYSIS\n\n";
      
      // Duplicate summary
      report += `📊 DUPLICATE VOTES:\n`;
      report += duplicateAnalysis.summary + "\n";
      
      // Distribution summary
      report += `📈 VOTE DISTRIBUTION:\n`;
      report += distributionAnalysis.summary + "\n";
      
      // Import issues
      if (importIssues.issues.length > 0) {
        report += `⚠️ DATA IMPORT ISSUES:\n`;
        importIssues.issues.forEach(issue => {
          report += `• ${issue}\n`;
        });
        report += "\n";
        
        report += `💡 RECOMMENDATIONS:\n`;
        importIssues.recommendations.forEach(rec => {
          report += `• ${rec}\n`;
        });
      } else {
        report += `✅ No data import issues detected\n`;
      }
      
      // Log full report to console
      console.log("=== COMPREHENSIVE VOTE ANALYSIS ===");
      console.log(report);
      
      // Show summary in UI
      if (duplicateAnalysis.duplicateCount > 0) {
        setMessage(`⚠️ Found ${duplicateAnalysis.duplicateCount} duplicate votes. Check console for full analysis.`);
      } else {
        setMessage(`✅ No duplicates found. Check console for full analysis.`);
      }
      
    } catch (error) {
      console.error("Error analyzing votes:", error);
      setMessage("❌ Error analyzing votes. Please try again.");
    } finally {
      setIsCleaning(false);
    }
  };

  // Delete TestUser votes
  const deleteTestUserVotes = async () => {
    setIsCleaning(true);
    setMessage("");
    
    try {
      if (!votesData?.votes) {
        setMessage("❌ No votes data available.");
        return;
      }

      const testUserVotes = votesData.votes.filter((v: any) => v.voterName === "TestVoter");
      const testUserFeedback = feedbackData?.feedback?.filter((f: any) => f.voterName === "TestVoter") || [];

      if (testUserVotes.length === 0 && testUserFeedback.length === 0) {
        setMessage("✅ No TestVoter data found to delete.");
        return;
      }

      setMessage(`🗑️ Found ${testUserVotes.length} votes and ${testUserFeedback.length} feedback items for TestVoter.`);
      
      // Log the data for manual deletion
      console.log("TestVoter votes to delete:", testUserVotes);
      console.log("TestVoter feedback to delete:", testUserFeedback);
      
      // Note: InstantDB doesn't support bulk delete, so we'll need to delete individually
      // For now, just show the data that needs to be deleted
      setMessage(`⚠️ Found ${testUserVotes.length} TestVoter votes and ${testUserFeedback.length} feedback items. Check console for details. Manual deletion required.`);
      
    } catch (error) {
      console.error("Error checking TestVoter data:", error);
      setMessage("❌ Error checking TestVoter data. Please try again.");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Admin Panel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl transition-colors"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Admin Controls</h3>
            <p className="text-gray-300 mb-4 text-lg">
              Welcome to the admin panel. Use this to manage the voting system.
            </p>
            
            {/* Test User Creation */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3 text-gray-200">Create Test User</h4>
              <p className="text-sm text-gray-400 mb-3">Create a test user to verify the voting process works correctly.</p>
              <button
                onClick={createTestUser}
                disabled={isCreating}
                className="bg-green-600 text-white font-medium py-3 px-6 rounded-lg text-lg transition-all duration-200 hover:bg-green-700 active:scale-95 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:hover:bg-gray-600"
              >
                {isCreating ? "Creating..." : "🧪 Create Test User & Votes"}
              </button>
            </div>

            {/* Test User Cleanup */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3 text-gray-200">Cleanup Test Data</h4>
              <p className="text-sm text-gray-400 mb-3">Remove test user and all associated votes after testing.</p>
              <button
                onClick={cleanupTestData}
                disabled={isCleaning}
                className="bg-red-600 text-white font-medium py-3 px-6 rounded-lg text-lg transition-all duration-200 hover:bg-red-700 active:scale-95 disabled:bg-red-700 disabled:cursor-not-allowed disabled:hover:bg-red-700"
              >
                {isCleaning ? "Cleaning..." : "🗑️ Remove Test User & Votes"}
              </button>
            </div>

            {/* Duplicate Vote Cleanup */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3 text-gray-200">Check for Duplicate Votes</h4>
              <p className="text-sm text-gray-400 mb-3">Identify duplicate votes that may be causing progress issues.</p>
              <button
                onClick={analyzeVotes}
                disabled={isCleaning}
                className="bg-yellow-600 text-white font-medium py-3 px-6 rounded-lg text-lg transition-all duration-200 hover:bg-yellow-700 active:scale-95 disabled:bg-yellow-700 disabled:cursor-not-allowed disabled:hover:bg-yellow-700"
              >
                {isCleaning ? "Analyzing..." : "🔍 Analyze Votes & Check Duplicates"}
              </button>
            </div>

            {/* Delete TestUser Data */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3 text-gray-200">Delete TestVoter Data</h4>
              <p className="text-sm text-gray-400 mb-3">Remove all TestVoter votes and feedback to clean up test data.</p>
              <button
                onClick={deleteTestUserVotes}
                disabled={isCleaning}
                className="bg-red-600 text-white font-medium py-3 px-6 rounded-lg text-lg transition-all duration-200 hover:bg-red-700 active:scale-95 disabled:bg-red-700 disabled:cursor-not-allowed disabled:hover:bg-red-700"
              >
                {isCleaning ? "Checking..." : "🗑️ Delete TestUser Data"}
              </button>
            </div>

            {/* Test User Status */}
            <div className="mb-6">
              <h4 className="text-lg font-medium mb-3 text-gray-200">Test User Status</h4>
              <p className="text-sm text-gray-400 mb-3">Check the current status of test data.</p>
              <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-300 mb-2">
                  <strong>TestVoter Votes:</strong> {votesData?.votes?.filter((v: any) => v.voterName === "TestVoter").length || 0}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  <strong>TestVoter Feedback:</strong> {feedbackData?.feedback?.filter((f: any) => f.voterName === "TestVoter").length || 0}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  <strong>Total Awards:</strong> {Object.keys(AWARDS).length}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  <strong>Total Votes in System:</strong> {votesData?.votes?.length || 0}
                </div>
                <div className="text-sm text-gray-300 mb-2">
                  <strong>Total Feedback in System:</strong> {feedbackData?.feedback?.length || 0}
                </div>
                {votesData?.votes?.filter((v: any) => v.voterName === "TestVoter").length > Object.keys(AWARDS).length && (
                  <div className="text-yellow-400 text-sm mt-2 p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                    ⚠️ Warning: TestVoter has more votes than awards! This indicates duplicate data.
                  </div>
                )}
                <details className="mt-3">
                  <summary className="text-blue-400 text-sm cursor-pointer hover:text-blue-300">
                    📊 Show Detailed Vote Breakdown
                  </summary>
                  <div className="mt-2 text-xs text-gray-400 space-y-1">
                    {votesData?.votes?.filter((v: any) => v.voterName === "TestVoter").map((vote: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                        <span className="text-gray-300">{vote.award}</span>
                        <div className="text-right">
                          <div className="text-gray-400">ID: {vote.id}</div>
                          <div className="text-gray-500 text-xs">{new Date(vote.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
                <details className="mt-3">
                  <summary className="text-green-400 text-sm cursor-pointer hover:text-green-300">
                    🔍 Show All Votes in System
                  </summary>
                  <div className="mt-2 text-xs text-gray-400 space-y-1 max-h-40 overflow-y-auto">
                    {votesData?.votes?.map((vote: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-700 rounded mb-1">
                        <div>
                          <span className="text-gray-300">{vote.voterName}</span>
                          <span className="text-gray-500 mx-2">→</span>
                          <span className="text-gray-400">{vote.award}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400 text-xs">ID: {vote.id}</div>
                          <div className="text-gray-500 text-xs">{new Date(vote.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`mt-4 p-4 rounded-lg text-base ${
                message.includes("✅") 
                  ? "bg-green-900/20 border border-green-500/30 text-green-200"
                  : message.includes("⚠️")
                    ? "bg-yellow-900/20 border border-yellow-500/30 text-yellow-200"
                    : "bg-red-900/20 border border-red-500/30 text-red-200"
              }`}>
                {message}
              </div>
            )}
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Available Awards</h3>
            <div className="grid grid-cols-2 gap-3 text-base">
              <div className="p-2 bg-gray-800 rounded border border-gray-700">MVP</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Defense Player</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Shooter</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Sixth Man</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Rookie of the Year</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Teammate</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Forward</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Guard</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Center</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Dunker</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Passer</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Stealer</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Blocker</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Scorer</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Defender</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Offensive Player</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best IQ</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Best Decision Maker</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Favorite Player to Play With</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst Decision Maker</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst Shot Taker</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst IQ</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst Teammate</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst Passer</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst Shooter</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst Stealer</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst Blocker</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Worst Defender</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Most Improved</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Most Likely to Succeed Following 2K</div>
              <div className="p-2 bg-gray-800 rounded border border-gray-700">Shaqtin a Fool of the Year</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

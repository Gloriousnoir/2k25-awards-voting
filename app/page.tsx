"use client";

import { useState, useEffect } from "react";
import { db, room, PLAYERS, AWARDS, getAvailablePlayers, calculateBordaCount, rankingsToString, stringToRankings, PREPOPULATED_FEEDBACK, type Vote, type Award, type Feedback } from "../lib/instantdb";
import { id } from "@instantdb/react";
import AdminPanel from "../components/AdminPanel";
import { findDuplicateVotes } from "../lib/duplicate-checker";

export default function VotingApp() {
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [currentAward, setCurrentAward] = useState<Award | null>(null);
  const [rankings, setRankings] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Feedback state for multiple players
  const [feedbackState, setFeedbackState] = useState<{[key: string]: {strength: string, improvement: string, growth: string}}>({});

  // Detailed results modal state
  const [showDetailedModal, setShowDetailedModal] = useState(false);
  const [detailedAward, setDetailedAward] = useState<Award | null>(null);

  // Browser voting restriction state
  const [browserVoter, setBrowserVoter] = useState<string | null>(null);
  const [hasVotedInBrowser, setHasVotedInBrowser] = useState(false);

  // Page flow state
  const [currentPage, setCurrentPage] = useState<'name-selection' | 'voting' | 'feedback' | 'results'>('name-selection');

  const { data: votesData } = db.useQuery({ votes: {} });
  const { data: feedbackData } = db.useQuery({ feedback: {} });
  const { peers } = room.usePresence();

  const votes = votesData?.votes || [];
  const feedback = feedbackData?.feedback || [];
  const numUsers = Object.keys(peers).length;

  // Calculate voting progress
  const userVotes = votes.filter((vote: Vote) => vote.voterName === selectedPlayer);
  const uniqueAwardsVoted = [...new Set(userVotes.map(vote => vote.award))];
  const votingProgress = uniqueAwardsVoted.length;
  const totalAwards = Object.keys(AWARDS).length;
  const isVotingComplete = votingProgress >= totalAwards;

  // Check if user has voted (for existing logic)
  const hasVoted = votes.some((vote: Vote) => vote.voterName === selectedPlayer);
  
  // Get available players for current award (excluding the voter)
  const availablePlayers = currentAward ? getAvailablePlayers(currentAward, selectedPlayer as any) : [];

  // Check if current award has already been voted for
  const hasVotedForCurrentAward = currentAward ? 
    votes.some((vote: Vote) => vote.voterName === selectedPlayer && vote.award === currentAward) : false;

  // Check browser voting restrictions on component mount
  useEffect(() => {
    const storedVoter = localStorage.getItem('2k25_awards_voter');
    const storedVoteStatus = localStorage.getItem('2k25_awards_voted');
    
    if (storedVoter && storedVoteStatus === 'true') {
      setBrowserVoter(storedVoter);
      setHasVotedInBrowser(true);
      setSelectedPlayer(storedVoter);
      setCurrentPage('results');
    }
  }, []);

  const handlePlayerSelect = (player: string) => {
    // Check if this browser has already voted for someone else
    if (browserVoter && browserVoter !== player) {
      alert(`This browser has already been used to vote for ${browserVoter}. You cannot vote for a different player.`);
      return;
    }

    // Check if this player has already been voted for in this browser
    if (hasVotedInBrowser && browserVoter === player) {
      // Allow viewing results for the same player
      setSelectedPlayer(player);
      setCurrentPage('results');
      return;
    }

    // Check if user has already completed all awards
    const playerVotes = votes.filter((vote: Vote) => vote.voterName === player);
    const playerUniqueAwards = [...new Set(playerVotes.map(vote => vote.award))];
    if (playerUniqueAwards.length >= totalAwards) {
      // User has completed everything, show results directly
      setSelectedPlayer(player);
      setCurrentPage('results');
      return;
    }
    
    // Find the next unvoted award to resume from
    const votedAwards = new Set(playerUniqueAwards);
    const nextAward = Object.values(AWARDS).find(award => !votedAwards.has(award)) || AWARDS.MVP;
    
    // Set the selected player and go to voting page
    setSelectedPlayer(player);
    setCurrentPage('voting');
    setCurrentAward(nextAward); // Resume from next unvoted award
    
    // Load existing rankings if this award has already been voted for
    const existingVote = votes.find((vote: Vote) => 
      vote.voterName === player && vote.award === nextAward
    );
    
    if (existingVote) {
      setRankings(stringToRankings(existingVote.rankings));
    } else {
      setRankings([]);
    }
    
    setShowDetailedModal(false);
    setDetailedAward(null);
  };

  // Handle ranking changes
  const handleRankingChange = (player: string, position: number) => {
    if (rankings.includes(player)) return;
    
    const newRankings = [...rankings];
    newRankings.splice(position, 0, player);
    setRankings(newRankings);
  };

  const submitVote = () => {
    if (!currentAward || !selectedPlayer) return;
    
    // Check if user has already voted for this award
    const existingVote = votes.find(vote => vote.voterName === selectedPlayer && vote.award === currentAward);
    if (existingVote) {
      alert(`You have already voted for ${currentAward}. You cannot vote for the same award twice.`);
      return;
    }
    
    if (rankings.length !== availablePlayers.length) {
      alert(`Please rank all ${availablePlayers.length} available players before submitting your vote.`);
    return;
  }
    const uniqueRankings = [...new Set(rankings)];
    if (uniqueRankings.length !== rankings.length) {
      alert("You have duplicate players in your rankings. Please fix this before submitting.");
      return;
    }

    // Submit the vote
    db.transact(
      db.tx.votes[id()].update({
        voterName: selectedPlayer,
        award: currentAward,
        rankings: rankingsToString(rankings),
        timestamp: Date.now(),
      })
    );

    // Set browser voting restrictions
    localStorage.setItem('2k25_awards_voter', selectedPlayer);
    localStorage.setItem('2k25_awards_voted', 'true');
    setBrowserVoter(selectedPlayer);
    setHasVotedInBrowser(true);

    // Auto-advance to next award or show feedback
    // Don't include currentAward in the count since it's being submitted now
    const remainingAwards = Object.values(AWARDS).filter(award => 
      !userVotes.map(v => v.award).includes(award) && award !== currentAward
    );

    if (remainingAwards.length > 0) {
      // Go to next award
      setCurrentAward(remainingAwards[0]);
      setRankings([]);
    } else {
      // All awards completed, show feedback
      setCurrentPage('feedback');
    }
  };

  const goToPreviousAward = () => {
    if (!currentAward) return;

    const currentIndex = Object.values(AWARDS).indexOf(currentAward);
    
    if (currentIndex > 0) {
      const previousAward = Object.values(AWARDS)[currentIndex - 1];
      setCurrentAward(previousAward);
      
      // Load previous rankings if they exist
      const previousVote = votes.find((vote: Vote) => 
        vote.voterName === selectedPlayer && vote.award === previousAward
      );
      
      if (previousVote) {
        // Convert string back to array for display
        const previousRankings = stringToRankings(previousVote.rankings);
        setRankings(previousRankings);
      } else {
        setRankings([]);
      }
    }
  };

  const goToNextAward = () => {
    if (!currentAward) return;

    const currentIndex = Object.values(AWARDS).indexOf(currentAward);
    
    if (currentIndex < Object.values(AWARDS).length - 1) {
      const nextAward = Object.values(AWARDS)[currentIndex + 1];
      setCurrentAward(nextAward);
      
      // Load next award rankings if they exist
      const nextVote = votes.find((vote: Vote) => 
        vote.voterName === selectedPlayer && vote.award === nextAward
      );
      
      if (nextVote) {
        // Convert string back to array for display
        const nextRankings = stringToRankings(nextVote.rankings);
        setRankings(nextRankings);
      } else {
        setRankings([]);
      }
    }
  };

  const goBackToNameSelection = () => {
    setCurrentPage('name-selection');
    setSelectedPlayer("");
    setCurrentAward(null);
    setRankings([]);
    setShowDetailedModal(false);
    setDetailedAward(null);
  };

  // Enhanced feedback functions
  const submitFeedbackForPlayer = (player: string) => {
    const playerFeedback = feedbackState[player];
    if (!playerFeedback?.strength || !playerFeedback?.improvement || !playerFeedback?.growth) {
      alert("Please fill out all feedback fields for this player.");
      return;
    }

    db.transact(
      db.tx.feedback[id()].update({
        voterName: selectedPlayer,
        targetPlayer: player,
        strength: playerFeedback.strength,
        improvement: playerFeedback.improvement,
        growth: playerFeedback.growth,
        timestamp: Date.now(),
      })
    );

    const newFeedbackState = { ...feedbackState };
    delete newFeedbackState[player];
    setFeedbackState(newFeedbackState);
  };

  const skipFeedbackForPlayer = (player: string) => {
    const newFeedbackState = { ...feedbackState };
    delete newFeedbackState[player];
    setFeedbackState(newFeedbackState);
  };

  const editFeedbackForPlayer = (player: string) => {
    const existingFeedback = feedback.find(f => f.voterName === selectedPlayer && f.targetPlayer === player);
    if (existingFeedback) {
      setFeedbackState({
        ...feedbackState,
        [player]: {
          strength: existingFeedback.strength,
          improvement: existingFeedback.improvement,
          growth: existingFeedback.growth
        }
      });
    }
  };

  const submitAllFeedback = () => {
    Object.keys(feedbackState).forEach(player => {
      const playerFeedback = feedbackState[player];
      if (playerFeedback?.strength && playerFeedback?.improvement && playerFeedback?.growth) {
  db.transact(
          db.tx.feedback[id()].update({
            voterName: selectedPlayer,
            targetPlayer: player,
            strength: playerFeedback.strength,
            improvement: playerFeedback.improvement,
            growth: playerFeedback.growth,
            timestamp: Date.now(),
    })
  );
}
    });
    setFeedbackState({});
  };

  const skipAllFeedback = () => {
    setFeedbackState({});
  };

  const completeFeedbackAndShowResults = () => {
    setCurrentPage('results');
  };

  const handleAdminLogin = () => {
    console.log("Admin login attempt:", { adminPassword, isCorrect: adminPassword === "admin123" });
    
    if (adminPassword === "admin123") {
      console.log("Password correct, setting admin state...");
      setIsAdmin(true);
      setShowAdminLogin(false);
      setShowAdminPanel(true); // Show the admin panel
      setAdminPassword("");
      console.log("Admin state updated, should show admin panel");
    } else {
      console.log("Password incorrect, showing alert");
      alert("Incorrect password");
    }
  };

  const handleAdminKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdminLogin();
    }
  };

  useEffect(() => {
    if (feedback && feedback.length === 0 && isAdmin) {
      PREPOPULATED_FEEDBACK.forEach(feedbackItem => {
        db.transact(
          db.tx.feedback[id()].update({
            voterName: "System",
            targetPlayer: feedbackItem.targetPlayer,
            strength: feedbackItem.strength,
            improvement: feedbackItem.improvement,
            growth: feedbackItem.growth,
            timestamp: Date.now(),
          })
        );
      });
    }
  }, [feedback, isAdmin]);

  // Render different pages based on currentPage state
  if (currentPage === 'name-selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-12">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                2K25 Awards
              </h1>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAdminLogin(true)}
                className="bg-white/80 backdrop-blur-sm text-gray-700 px-6 py-3 rounded-xl hover:bg-white/90 transition-all duration-200 border border-white/20 shadow-lg"
              >
                Admin
              </button>
              <button
                onClick={() => {
                  // Quick duplicate check
                  const duplicateAnalysis = findDuplicateVotes(votes);
                  if (duplicateAnalysis.duplicateCount > 0) {
                    alert(`Found ${duplicateAnalysis.duplicateCount} duplicate votes! Check console for details.`);
                    console.log("=== QUICK DUPLICATE CHECK ===");
                    console.log(duplicateAnalysis.summary);
                  } else {
                    alert("No duplicate votes found!");
                  }
                }}
                className="bg-yellow-500/80 backdrop-blur-sm text-white px-6 py-3 rounded-xl hover:bg-yellow-600/90 transition-all duration-200 border border-yellow-400/20 shadow-lg"
              >
                🔍 Check Duplicates
              </button>
            </div>
          </div>

          {/* Player Selection */}
          {!hasVotedInBrowser && (
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-semibold mb-8 text-gray-900">
                Select Your Name
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                Choose your name to begin voting for the 2K25 Awards
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {PLAYERS.map((player) => (
                  <button
                    key={player}
                    onClick={() => handlePlayerSelect(player)}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white/90 p-6 rounded-2xl text-xl font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 border border-white/20 shadow-lg hover:shadow-xl hover:-translate-y-1"
                  >
                    {player}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Browser Already Voted Warning */}
          {hasVotedInBrowser && browserVoter && (
            <div className="max-w-4xl mx-auto text-center">
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-8 shadow-xl">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  Browser Already Used for Voting
                </h2>
                <p className="text-xl text-gray-600 mb-6">
                  This browser has already been used to vote for <span className="font-semibold text-blue-600">{browserVoter}</span>.
                </p>
                <p className="text-lg text-gray-500 mb-8">
                  To maintain voting integrity, each browser can only be used to vote for one person.
                </p>
                <div className="space-x-4">
                  <button
                    onClick={() => {
                      setSelectedPlayer(browserVoter);
                      setCurrentPage('results');
                    }}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    🏆 View Results for {browserVoter}
                  </button>
                  <button
                    onClick={() => {
                      // Clear browser voting restrictions
                      localStorage.removeItem('2k25_awards_voter');
                      localStorage.removeItem('2k25_awards_voted');
                      setBrowserVoter(null);
                      setHasVotedInBrowser(false);
                    }}
                    className="bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 hover:from-red-600 hover:to-pink-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    🔄 Clear Browser Data
                  </button>
                </div>
                <div className="mt-6 p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Clearing browser data will allow you to vote for a different person, 
                    but this should only be done if you're using a shared device or need to change your vote.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-900">Admin Login</h2>
              <input
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={handleAdminKeyPress}
                className="w-full p-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 mb-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-4 px-6 rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {showAdminPanel && (
          <AdminPanel 
            onClose={() => setShowAdminPanel(false)} 
            votesData={votesData}
            feedbackData={feedbackData}
          />
        )}
      </div>
    );
  }

  // Voting page
  if (currentPage === 'voting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header with back button */}
          <div className="flex justify-between items-center mb-8">
            <button
              onClick={goBackToNameSelection}
              className="bg-white/80 backdrop-blur-sm text-gray-700 px-6 py-3 rounded-xl hover:bg-white/90 transition-all duration-200 border border-white/20 shadow-lg"
            >
              ← Back to Name Selection
            </button>
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                2K25 Awards
              </h1>
              <p className="text-xl text-gray-600 mt-2">Voting as {selectedPlayer}</p>
            </div>
            <button
              onClick={() => setShowAdminLogin(true)}
              className="bg-white/80 backdrop-blur-sm text-gray-700 px-6 py-3 rounded-xl hover:bg-white/90 transition-all duration-200 border border-white/20 shadow-lg"
            >
              Admin
            </button>
          </div>

          {/* Overall Voting Progress */}
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-6 shadow-xl">
            <div className="text-center mb-4">
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">
                Voting Progress for {selectedPlayer}
              </h2>
              <div className="text-lg text-gray-600 mb-3">
                {votingProgress} of {totalAwards} awards completed
                {isVotingComplete && (
                  <span className="text-green-600 ml-2 font-semibold">✓ All Done!</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    isVotingComplete 
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                      : 'bg-gradient-to-r from-blue-500 to-purple-600'
                  }`}
                  style={{ width: `${Math.min((votingProgress / totalAwards) * 100, 100)}%` }}
                ></div>
              </div>
              {isVotingComplete && (
                <p className="text-green-600 text-sm mt-2 font-medium">
                  🎉 You've completed all awards! Choose an option below.
                </p>
              )}
            </div>
            
            {/* Browser Voting Status */}
            {hasVotedInBrowser && (
              <div className="mt-4 p-3 bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 rounded-xl">
                <div className="flex items-center justify-center space-x-2 text-blue-700">
                  <span className="text-lg">🔒</span>
                  <span className="text-sm font-medium">
                    This browser is locked to {browserVoter} for voting integrity
                  </span>
                </div>
              </div>
            )}

            {/* Duplicate Vote Warning */}
            {userVotes.length > uniqueAwardsVoted.length && (
              <div className="mt-4 p-3 bg-yellow-50/80 backdrop-blur-sm border border-yellow-200/50 rounded-xl">
                <div className="flex items-center justify-center space-x-2 text-yellow-700">
                  <span className="text-lg">⚠️</span>
                  <span className="text-sm font-medium">
                    Duplicate votes detected: {userVotes.length} total votes for {uniqueAwardsVoted.length} unique awards
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Award Selection */}
          {!isVotingComplete && currentAward && (
            <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 mb-6 shadow-xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-4 text-gray-900">
                  {currentAward}
                </h2>
                <p className="text-lg text-gray-600 mb-6">
                  Rank the available players from best to worst for this award
                </p>
                <div className="text-sm text-gray-500">
                  <strong>Note:</strong> You cannot vote for yourself ({selectedPlayer})
                </div>
                
                {/* Already Voted Warning */}
                {hasVotedForCurrentAward && (
                  <div className="mt-4 p-3 bg-green-50/80 backdrop-blur-sm border border-green-200/50 rounded-xl">
                    <div className="flex items-center justify-center space-x-2 text-green-700">
                      <span className="text-lg">✅</span>
                      <span className="text-sm font-medium">
                        You have already voted for this award! You can review your rankings below.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between mb-6">
                <button
                  onClick={goToPreviousAward}
                  disabled={Object.values(AWARDS).indexOf(currentAward) === 0}
                  className="bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:bg-gray-200 active:scale-95 border border-white/20 shadow-lg disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  ← Previous Award
                </button>
                <button
                  onClick={goToNextAward}
                  disabled={Object.values(AWARDS).indexOf(currentAward) === Object.values(AWARDS).length - 1}
                  className="bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:bg-gray-200 active:scale-95 border border-white/20 shadow-lg disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  Next Award →
                </button>
              </div>

              {/* Voting Interface */}
              <div className="flex gap-2 min-w-0 overflow-hidden">
                {/* Available Players */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Available Players</h3>
                  <div className="space-y-2">
                    {availablePlayers.map((player) => (
                      <button
                        key={player}
                        onClick={() => handleRankingChange(player, rankings.length)}
                        disabled={rankings.includes(player)}
                        className={`w-full p-2 rounded-lg text-left transition-all duration-200 ${
                          rankings.includes(player)
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white/60 backdrop-blur-sm hover:bg-white/80 border border-white/30 shadow-md hover:shadow-lg transform hover:-translate-y-1'
                        }`}
                      >
                        <div className="flex items-center justify-between min-w-0">
                          <span className="font-medium text-gray-900 truncate text-sm">{player}</span>
                          {rankings.includes(player) && (
                            <span className="text-purple-600 font-bold text-xs flex-shrink-0 ml-1">
                              #{rankings.indexOf(player) + 1}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Your Rankings */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold mb-3 text-gray-900">Your Rankings</h3>
                  {rankings.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 text-xs">
                      Click on players to rank them
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {rankings.map((player, index) => (
                        <div
                          key={player}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-lg shadow-lg"
                        >
                          <div className="flex items-center justify-between min-w-0">
                            <div className="flex items-center space-x-1 min-w-0">
                              <span className="text-sm font-bold flex-shrink-0">{index + 1}</span>
                              <span className="font-medium truncate text-sm">{player}</span>
                            </div>
                            <button
                              onClick={() => {
                                const newRankings = rankings.filter((_, i) => i !== index);
                                setRankings(newRankings);
                              }}
                              className="text-white/80 hover:text-white text-lg transition-colors flex-shrink-0 ml-1"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center mt-8">
                <button
                  onClick={submitVote}
                  disabled={rankings.length !== availablePlayers.length || hasVotedForCurrentAward}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium py-4 px-8 rounded-xl transition-all duration-200 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:hover:from-gray-300 disabled:hover:to-gray-400"
                >
                  {hasVotedForCurrentAward 
                    ? "Already Voted ✓"
                    : rankings.length === availablePlayers.length
                      ? "Submit Vote"
                      : `Rank ${availablePlayers.length - rankings.length} more player${availablePlayers.length - rankings.length !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </div>
          )}

          {/* Completion Options */}
          {isVotingComplete && (
            <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-8 text-center shadow-xl">
              <h2 className="text-3xl font-bold mb-4 text-gray-900">🎉 All Awards Completed!</h2>
              <p className="text-xl text-gray-600 mb-8">
                You've successfully voted for all {totalAwards} awards. What would you like to do next?
              </p>
              <div className="space-x-4">
                <button
                  onClick={() => setCurrentPage('feedback')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  💬 Give Teammate Feedback
                </button>
                <button
                  onClick={() => setCurrentPage('results')}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium px-8 py-4 rounded-xl transition-all duration-200 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  🏆 View Results
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-center text-gray-900">Admin Login</h2>
              <input
                type="password"
                placeholder="Enter admin password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyPress={handleAdminKeyPress}
                className="w-full p-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl text-gray-900 mb-4 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium py-4 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Login
                </button>
                <button
                  onClick={() => setShowAdminLogin(false)}
                  className="flex-1 bg-gray-100 text-gray-700 font-medium py-4 px-6 rounded-xl hover:bg-gray-200 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Panel */}
        {showAdminPanel && (
          <AdminPanel 
            onClose={() => setShowAdminPanel(false)} 
            votesData={votesData}
            feedbackData={feedbackData}
          />
        )}
      </div>
    );
  }

  // Results page
  if (currentPage === 'results') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              🏆 2K25 Awards Results
            </h1>
            <p className="text-xl text-gray-600 mb-8">Final results for all awards</p>
            <button
              onClick={() => {
                setCurrentPage('name-selection');
                setCurrentAward(AWARDS.MVP);
                setRankings([]);
              }}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              ← Back to Voting
            </button>
          </div>

          {/* Awards Results Display */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {Object.values(AWARDS).map((award) => {
              const awardVotes = votes.filter((vote: Vote) => vote.award === award);
              if (awardVotes.length === 0) return null;

              const scores = calculateBordaCount(awardVotes, award);
              const sortedPlayers = Object.entries(scores)
                .sort(([, a], [, b]) => b - a)
                .filter(([, score]) => score > 0);

              // Get top 3 winners
              const top3 = sortedPlayers.slice(0, 3);
              const otherPlayers = sortedPlayers.slice(3);

              return (
                <div key={award} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {award}
                  </h3>
                  
                  {/* Top 3 Winners with Podium */}
                  <div className="mb-6">
                    <div className="flex items-end justify-center space-x-2 mb-4">
                      {/* 2nd Place */}
                      {top3[1] && (
                        <div className="text-center">
                          <div className="bg-gradient-to-br from-gray-400 to-gray-500 text-white text-lg font-bold px-4 py-3 rounded-t-xl border border-gray-300 shadow-lg">
                            {top3[1][0]}
                          </div>
                          <div className="bg-gradient-to-br from-gray-500 to-gray-600 text-white text-sm px-4 py-2 rounded-b-xl border border-gray-400 shadow-md">
                            {top3[1][1]} pts
                          </div>
                          <div className="text-2xl mt-2">🥈</div>
                        </div>
                      )}
                      
                      {/* 1st Place */}
                      {top3[0] && (
                        <div className="text-center">
                          <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 text-white text-xl font-bold px-6 py-4 rounded-t-xl border border-yellow-300 shadow-xl">
                            {top3[0][0]}
                          </div>
                          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white text-base px-6 py-2 rounded-b-xl border border-yellow-400 shadow-lg">
                            {top3[0][1]} pts
                          </div>
                          <div className="text-3xl mt-2">🥇</div>
                        </div>
                      )}
                      
                      {/* 3rd Place */}
                      {top3[2] && (
                        <div className="text-center">
                          <div className="bg-gradient-to-br from-orange-400 to-orange-500 text-white text-lg font-bold px-4 py-3 rounded-t-xl border border-orange-300 shadow-lg">
                            {top3[2][0]}
                          </div>
                          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-sm px-4 py-2 rounded-b-xl border border-orange-400 shadow-md">
                            {top3[2][1]} pts
                          </div>
                          <div className="text-2xl mt-2">🥉</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* All Players Results */}
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold mb-3 text-gray-800 text-center">All Results</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {sortedPlayers.map(([player, score], index) => (
                        <div key={player} className="flex justify-between items-center p-2 bg-white/60 backdrop-blur-sm rounded-lg border border-white/30">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                              index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' :
                              index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                              'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-medium text-gray-800">{player}</span>
                          </div>
                          <span className="text-blue-600 font-semibold">{score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Vote Count and Details Button */}
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-3">
                      {awardVotes.length} vote{awardVotes.length !== 1 ? 's' : ''}
                    </div>
                    <button
                      onClick={() => {
                        // Show detailed results modal
                        setDetailedAward(award);
                        setShowDetailedModal(true);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      📊 View All Results
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Teammate Feedback Display */}
          <div className="mt-16">
            <h2 className="text-4xl font-bold mb-8 text-center bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Teammate Feedback</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {PLAYERS.map((player) => {
                const playerFeedback = feedback.filter(f => f.targetPlayer === player);
                if (playerFeedback.length === 0) return null;
                return (
                  <div key={player} className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-2xl font-semibold mb-4 text-center bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                      {player}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-lg font-medium text-green-600 mb-2">💪 Strengths</h4>
                        <div className="space-y-2">
                          {playerFeedback.map((f, index) => (
                            <div key={index} className="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/30 shadow-md">
                              <p className="text-sm text-gray-500 mb-1">From: {f.voterName}</p>
                              <p className="text-gray-800">{f.strength}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-yellow-600 mb-2">🔧 Areas for Improvement</h4>
                        <div className="space-y-2">
                          {playerFeedback.map((f, index) => (
                            <div key={index} className="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/30 shadow-md">
                              <p className="text-sm text-gray-500 mb-1">From: {f.voterName}</p>
                              <p className="text-gray-800">{f.improvement}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-blue-600 mb-2">🌱 Growth Suggestions</h4>
                        <div className="space-y-2">
                          {playerFeedback.map((f, index) => (
                            <div key={index} className="bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/30 shadow-md">
                              <p className="text-sm text-gray-500 mb-1">From: {f.voterName}</p>
                              <p className="text-gray-800">{f.growth}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detailed Results Modal */}
        {showDetailedModal && detailedAward && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Detailed Results: {detailedAward}
                </h2>
                <button
                  onClick={() => {
                    setShowDetailedModal(false);
                    setDetailedAward(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-3xl transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Results Table */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Final Rankings</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 px-4 text-gray-600 font-semibold">Rank</th>
                        <th className="py-3 px-4 text-gray-600 font-semibold">Player</th>
                        <th className="py-3 px-4 text-gray-600 font-semibold">Points</th>
                        <th className="py-3 px-4 text-gray-600 font-semibold">Votes Received</th>
                      </tr>
                    </thead>
                    <tbody>
                      {votes.filter((vote: Vote) => vote.award === detailedAward)
                        .reduce((acc: any[], vote: Vote) => {
                          const rankings = stringToRankings(vote.rankings);
                          rankings.forEach((player, index) => {
                            const existing = acc.find(p => p.player === player);
                            if (existing) {
                              existing.points += PLAYERS.length - index;
                              existing.votes.push({ voter: vote.voterName, rank: index + 1 });
                            } else {
                              acc.push({
                                player,
                                points: PLAYERS.length - index,
                                votes: [{ voter: vote.voterName, rank: index + 1 }]
                              });
                            }
                          });
                          return acc;
                        }, [])
                        .sort((a, b) => b.points - a.points)
                        .map((result, index) => (
                          <tr key={result.player} className="border-b border-gray-200 hover:bg-gray-50/50">
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                                index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                                index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' :
                                index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-500 text-white' :
                                'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800">{result.player}</td>
                            <td className="py-3 px-4 text-blue-600 font-semibold">{result.points}</td>
                            <td className="py-3 px-4 text-gray-600">
                              {result.votes.length} vote{result.votes.length !== 1 ? 's' : ''}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Individual Vote Breakdown */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Individual Votes</h3>
                <div className="space-y-3">
                  {votes.filter((vote: Vote) => vote.award === detailedAward).map((vote: Vote, index) => {
                    const rankings = stringToRankings(vote.rankings);
                    return (
                      <div key={index} className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white/30 shadow-md">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-gray-500">Voter: <span className="text-gray-800 font-medium">{vote.voterName}</span></span>
                          <span className="text-xs text-gray-400">{new Date(vote.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rankings.map((player, rankIndex) => (
                            <div key={rankIndex} className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
                              <span className="text-purple-600 font-bold text-sm">#{rankIndex + 1}</span>
                              <span className="text-gray-700 text-sm">{player}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

  // Feedback page
  if (currentPage === 'feedback') {
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              🎯 Teammate Feedback
            </h1>
            <p className="text-xl text-gray-600 mb-6">Share constructive feedback to help everyone grow (optional)</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setCurrentPage('voting');
                  setCurrentAward(AWARDS.MVP);
                  setRankings([]);
                }}
                className="bg-gray-100 text-gray-700 font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:bg-gray-200 active:scale-95 border border-white/20 shadow-lg"
              >
                ← Back to Awards
              </button>
              <button
                onClick={completeFeedbackAndShowResults}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                🏆 View Final Results
              </button>
            </div>
          </div>

          {/* Feedback Dashboard */}
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-2xl p-6 mb-8 shadow-xl">
            {/* Feedback Progress */}
            <div className="text-center mb-6">
              <div className="text-lg text-gray-700 mb-3">
                Feedback Progress: {feedback.filter(f => f.voterName === selectedPlayer).length} of {PLAYERS.filter(p => p !== selectedPlayer).length} teammates
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${(feedback.filter(f => f.voterName === selectedPlayer).length / PLAYERS.filter(p => p !== selectedPlayer).length) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Feedback Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PLAYERS.filter(p => p !== selectedPlayer).map((player) => {
                const existingFeedback = feedback.find(f => f.voterName === selectedPlayer && f.targetPlayer === player);
                const hasFeedback = !!existingFeedback;

                return (
                  <div key={player} className="bg-white/60 backdrop-blur-sm border border-white/30 rounded-xl p-4 shadow-md">
                    <div className="text-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">{player}</h4>
                      {hasFeedback ? (
                        <span className="text-green-600 text-sm">✓ Feedback Given</span>
                      ) : (
                        <span className="text-gray-500 text-sm">No feedback yet</span>
                      )}
                    </div>

                    {!hasFeedback && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-green-600">
                            💪 Strength:
                          </label>
                          <textarea
                            placeholder="What they do well..."
                            className="w-full p-2 bg-white/80 border border-gray-200 rounded-lg text-gray-900 text-sm focus:border-green-500 focus:outline-none transition-colors"
                            rows={2}
                            onChange={(e) => {
                              const newFeedback = { ...feedbackState[player], strength: e.target.value };
                              setFeedbackState({ ...feedbackState, [player]: newFeedback });
                            }}
                            value={feedbackState[player]?.strength || ""}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1 text-yellow-600">
                            🔧 Improvement:
                          </label>
                          <textarea
                            placeholder="Areas to work on..."
                            className="w-full p-2 bg-white/80 border border-gray-200 rounded-lg text-gray-900 text-sm focus:border-yellow-500 focus:outline-none transition-colors"
                            rows={2}
                            onChange={(e) => {
                              const newFeedback = { 
                                ...feedbackState[player], 
                                improvement: e.target.value 
                              };
                              setFeedbackState({ ...feedbackState, [player]: newFeedback });
                            }}
                            value={feedbackState[player]?.improvement || ""}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1 text-blue-600">
                            🌱 Growth:
                          </label>
                          <textarea
                            placeholder="Development suggestions..."
                            className="w-full p-2 bg-white/80 border border-gray-200 rounded-lg text-gray-900 text-sm focus:border-blue-500 focus:outline-none transition-colors"
                            rows={2}
                            onChange={(e) => {
                              const newFeedback = { 
                                ...feedbackState[player], 
                                growth: e.target.value 
                              };
                              setFeedbackState({ ...feedbackState, [player]: newFeedback });
                            }}
                            value={feedbackState[player]?.growth || ""}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => submitFeedbackForPlayer(player)}
                            disabled={!feedbackState[player]?.strength || !feedbackState[player]?.improvement || !feedbackState[player]?.growth}
                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-medium py-2 px-3 rounded-lg transition-all duration-200 hover:from-green-600 hover:to-emerald-600 shadow-md disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:hover:from-gray-300 disabled:hover:to-gray-400"
                          >
                            Submit
                          </button>
                          <button
                            onClick={() => skipFeedbackForPlayer(player)}
                            className="bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-all duration-200 hover:from-gray-600 hover:to-gray-700 shadow-md"
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    )}

                    {hasFeedback && (
                      <div className="space-y-2">
                        <div className="text-xs text-gray-600">
                          <div className="font-medium text-green-600 mb-1">💪 Strength:</div>
                          <div className="text-gray-800">{existingFeedback.strength}</div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div className="font-medium text-yellow-600 mb-1">🔧 Improvement:</div>
                          <div className="text-gray-800">{existingFeedback.improvement}</div>
                        </div>
                        <div className="text-xs text-gray-600">
                          <div className="font-medium text-blue-600 mb-1">🌱 Growth:</div>
                          <div className="text-gray-800">{existingFeedback.growth}</div>
                        </div>
                        <button
                          onClick={() => editFeedbackForPlayer(player)}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-medium py-2 px-3 rounded-lg transition-all duration-200 hover:from-blue-600 hover:to-indigo-600 shadow-md mt-3"
                        >
                          Edit Feedback
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bulk Actions */}
            <div className="mt-8 text-center space-x-4">
              <button
                onClick={submitAllFeedback}
                disabled={Object.keys(feedbackState).length === 0}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:from-green-600 hover:to-emerald-600 shadow-lg disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:hover:from-gray-300 disabled:hover:to-gray-400"
              >
                📝 Submit All Feedback
              </button>
              <button
                onClick={skipAllFeedback}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium px-6 py-3 rounded-xl transition-all duration-200 hover:from-gray-600 hover:to-gray-700 shadow-lg"
              >
                ⏭️ Skip All Feedback
              </button>
            </div>
          </div>
        </div>
    </div>
  );
}

  // Default fallback - should not reach here
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 text-gray-900 p-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
      <button
          onClick={() => setCurrentPage('name-selection')}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
      >
          Go Back to Start
      </button>
      </div>
    </div>
  );
}
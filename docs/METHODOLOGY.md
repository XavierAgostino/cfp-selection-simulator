# Ranking Methodology Reference Guide

This document provides comprehensive technical documentation for the ranking algorithms used in the CFP Selection Simulator.

## Table of Contents

- [Overview](#overview)
- [Ensemble Approach](#ensemble-approach)
- [Individual Algorithms](#individual-algorithms)
  - [Colley Matrix Method](#colley-matrix-method)
  - [Massey Rating System](#massey-rating-system)
  - [Elo Rating System](#elo-rating-system)
  - [Strength of Record (SOR)](#strength-of-record-sor)
  - [Win Percentage](#win-percentage)
- [Data Adjustments](#data-adjustments)
- [Normalization and Weighting](#normalization-and-weighting)
- [Mathematical Details](#mathematical-details)
- [References](#references)

---

## Overview

The CFP Selection Simulator implements an ensemble ranking methodology that combines five distinct algorithms. Each algorithm evaluates teams from a different analytical perspective, creating a comprehensive and balanced evaluation framework.

### Design Philosophy

The methodology is designed around three core principles:

1. **Objectivity:** Mathematical algorithms eliminate subjective bias
2. **Transparency:** All calculations are reproducible and documented
3. **Comprehensiveness:** Multiple perspectives capture different aspects of team quality

### Evaluation Dimensions

The five algorithms cover four key evaluation dimensions:

| Dimension | Algorithms | Purpose |
|-----------|-----------|---------|
| **Resume Quality** | Colley Matrix, Win Percentage | What did the team accomplish? |
| **Predictive Power** | Massey Ratings, Elo System | How strong is the team fundamentally? |
| **Schedule Difficulty** | Strength of Record | Who did they play? |
| **Temporal Dynamics** | Elo System | How is performance trending? |

---

## Ensemble Approach

### Composite Score Formula

```
Composite Score = Σ(wi × Ri)
```

Where:
- `wi` = weight for algorithm i
- `Ri` = normalized rating from algorithm i

### Default Weights

| Algorithm | Weight | Rationale |
|-----------|--------|-----------|
| Colley Matrix | 20% | Pure resume evaluation |
| Massey Ratings | 25% | Strongest predictive component |
| Elo System | 20% | Dynamic temporal evaluation |
| Strength of Record | 20% | Schedule context |
| Win Percentage | 15% | Baseline sanity check |

### Weight Selection Rationale

**Massey Ratings (25%):** Highest weight due to predictive accuracy and margin-of-victory incorporation, making it the most comprehensive single metric.

**Colley, Elo, SOR (20% each):** Equal weighting provides balanced representation of resume quality, dynamic performance, and schedule difficulty.

**Win Percentage (15%):** Lower weight as it lacks contextual awareness, but serves as important baseline to ensure undefeated/one-loss teams receive appropriate credit.

---

## Individual Algorithms

### Colley Matrix Method

#### Philosophy
Pure win-loss evaluation using linear algebra. Completely ignores margin of victory to focus solely on game outcomes.

#### Historical Context
- Developed by Dr. Wesley Colley (Princeton University)
- Used in BCS computer rankings (2002-2013)
- Proven methodology with 10+ years of college football application

#### Mathematical Foundation

The Colley Matrix solves a system of linear equations where each game creates constraints.

**Basic Formula:**
```
Rating = (1 + Wins - Losses) / (2 + Total Games)
```

**Matrix Form:**
```
C × r = b
```

Where:
- `C` = Colley Matrix (team interactions)
- `r` = rating vector (unknown)
- `b` = performance vector (1 + wins - losses) / 2

**Matrix Construction:**

For each team i:
- Diagonal element: `C[i,i] = 2 + games_played[i]`
- Off-diagonal element: `C[i,j] = -games_between[i,j]`

#### Implementation Details

**Step 1:** Build interaction matrix tracking all games
```python
# Diagonal: 2 + total games played
C[i,i] = 2 + len(games_for_team_i)

# Off-diagonal: -1 for each game between teams
C[i,j] = -number_of_games_between_i_and_j
```

**Step 2:** Build performance vector
```python
b[i] = 1 + (wins[i] - losses[i]) / 2
```

**Step 3:** Solve system using linear algebra
```python
ratings = np.linalg.solve(C, b)
```

#### Strengths and Limitations

**Strengths:**
- Mathematically rigorous and reproducible
- No arbitrary parameters to tune
- Rewards quality wins over quantity
- Historical validation through BCS era

**Limitations:**
- Completely ignores margin of victory
- Close wins treated identically to blowouts
- Can be influenced by schedule luck early in season

#### Example Calculation

Team with 10-2 record playing 12 games:
```
Rating = (1 + 10 - 2) / (2 + 12)
Rating = 9 / 14
Rating = 0.643
```

Actual ratings adjust based on opponent quality through matrix solution.

---

### Massey Rating System

#### Philosophy
Predictive evaluation that treats ratings as indicators of team strength, where rating differential predicts point differential.

#### Historical Context
- Developed by Dr. Kenneth Massey (1997)
- Used in BCS computer rankings (1999-2013)
- Foundation for many modern predictive systems

#### Mathematical Foundation

The Massey method uses least-squares regression to find ratings that best predict game outcomes.

**Core Principle:**
```
Team_A_Rating - Team_B_Rating ≈ Point_Differential
```

**Optimization Goal:**
```
Minimize: Σ(Actual_Margin - Predicted_Margin)²
```

Where:
- `Predicted_Margin = Rating[i] - Rating[j]`
- `Actual_Margin = Score[i] - Score[j] (adjusted)`

#### Implementation Details

**Step 1:** Build game matrix
```python
M[game_num, home_team] = 1
M[game_num, away_team] = -1
```

**Step 2:** Create point differential vector (adjusted)
```python
# Apply MOV cap
raw_differential = home_score - away_score
capped_differential = np.clip(raw_differential, -28, 28)

# Apply home field adjustment
if not neutral_site:
    capped_differential -= 3.75

point_diff[game_num] = capped_differential
```

**Step 3:** Solve least-squares system
```python
# MT × M × ratings = MT × point_diff
MT_M = M.T @ M
MT_b = M.T @ point_diff

# Add constraint: sum of ratings = 0
MT_M[-1, :] = 1
MT_b[-1] = 0

ratings = np.linalg.solve(MT_M, MT_b)
```

#### Data Adjustments

**Margin of Victory Capping (28 points):**
- Prevents blowout wins from dominating ratings
- Based on research showing diminishing predictive value beyond 4 touchdowns
- Reduces incentive for running up score

**Home Field Advantage (3.75 points):**
- Adjusts for typical home team advantage
- Based on historical college football data
- Neutralizes location effect for fair comparison

#### Strengths and Limitations

**Strengths:**
- Strong predictive accuracy for future games
- Incorporates margin of victory appropriately
- Mathematically optimal (least-squares solution)
- Recognizes dominant performances

**Limitations:**
- Can overvalue blowout wins even with capping
- Sensitive to outlier games
- Requires careful MOV adjustment to prevent gaming

#### Example Calculation

Two teams with following results:
```
Team A: Beat Team C by 21, Beat Team D by 14
Team B: Beat Team C by 7, Beat Team E by 28 (capped to 28)

Solving least-squares:
Team B gets higher rating due to stronger average performance
```

---

### Elo Rating System

#### Philosophy
Dynamic game-by-game rating system where each result updates team strength estimates based on expected vs. actual performance.

#### Historical Context
- Developed by Arpad Elo for chess (1960s)
- Adapted for sports including NFL, NBA, college football
- Widely used due to simplicity and accuracy

#### Mathematical Foundation

**Core Formula:**
```
New_Rating = Old_Rating + K × (Actual_Result - Expected_Result)
```

Where:
- `K` = learning rate (32 for college football)
- `Actual_Result` = 1 for win, 0 for loss
- `Expected_Result` = win probability based on rating differential

**Expected Win Probability:**
```
Expected = 1 / (1 + 10^((Opponent_Rating - Your_Rating) / 400))
```

#### Implementation Details

**Initialization (Start of Season):**
```python
# Regress previous season ratings toward mean
base_rating = 1505
regression_factor = 0.67

new_rating = base_rating + regression_factor × (old_rating - base_rating)
```

**Game Update:**
```python
# Calculate expected result
rating_diff = team_rating - opponent_rating
expected = 1 / (1 + 10 ** (-rating_diff / 400))

# Update rating
actual = 1 if team_won else 0
rating_change = K × (actual - expected)
new_rating = team_rating + rating_change
```

**K-Factor (32):**
- Controls rating volatility
- Higher K = faster response to new information
- Lower K = more stable, slower adaptation

#### Season Regression

At start of each season, ratings regress toward mean (1505):
```python
opening_rating = 1505 + 0.67 × (closing_rating - 1505)
```

**Rationale:**
- Accounts for roster turnover, coaching changes
- Prevents perpetual advantages for historically strong programs
- Allows new teams to rise quickly with strong performance

#### Strengths and Limitations

**Strengths:**
- Automatically incorporates strength of schedule
- Rewards upsets appropriately
- Updates after every game (captures momentum)
- Well-tested across many sports

**Limitations:**
- Early season volatility due to limited data
- Slow to recognize drastic team changes
- No explicit margin of victory (though can be added)
- Requires historical data for accurate starting ratings

#### Example Calculation

**Scenario:** 1600-rated team plays 1500-rated team

```
Expected win probability = 1 / (1 + 10^((1500-1600)/400))
                        = 1 / (1 + 10^(-0.25))
                        = 1 / (1 + 0.562)
                        = 0.640 (64% chance to win)

If team wins:
New rating = 1600 + 32 × (1 - 0.640) = 1600 + 11.5 = 1611.5

If team loses:
New rating = 1600 + 32 × (0 - 0.640) = 1600 - 20.5 = 1579.5
```

---

### Strength of Record (SOR)

#### Philosophy
Evaluates how impressive a team's record is given the difficulty of opponents faced. Answers: "What probability would an average top-25 team have of achieving this record against this schedule?"

#### Mathematical Foundation

**Core Concept:**
```
SOR = P(Top-25 team achieves Team X's record vs Team X's schedule)
```

**Calculation Approach:**

For each game in team's schedule:
1. Estimate win probability for average top-25 team vs that opponent
2. Combine probabilities across all games to get overall record probability

**Simplified Formula:**
```
SOR = Π(Win_Prob_i)^(Wins_i) × Π(Loss_Prob_j)^(Losses_j)
```

Where:
- Win_Prob_i = probability of beating opponent i
- Loss_Prob_j = probability of losing to opponent j

#### Implementation Details

**Step 1:** Estimate opponent strength
```python
# Use composite or Elo ratings as opponent strength proxy
opponent_strength = opponent_composite_score
```

**Step 2:** Calculate win probability for each game
```python
# Baseline: average top-25 team (rating ~0.75)
baseline_rating = 0.75

# Win probability based on rating difference
win_prob = 1 / (1 + 10^((opponent_strength - baseline_rating) / 0.25))
```

**Step 3:** Combine across schedule
```python
sor_score = 1.0
for game in schedule:
    if game.won:
        sor_score *= win_probability[game]
    else:
        sor_score *= (1 - win_probability[game])
```

**Step 4:** Normalize to interpretable scale
```python
# Convert to log scale for better distribution
sor_normalized = -log10(sor_score)
```

#### Strengths and Limitations

**Strengths:**
- Explicitly rewards difficult schedules
- Context-aware (distinguishes road wins from home wins)
- Aligns with CFP committee methodology
- Handles unbalanced schedules fairly

**Limitations:**
- Requires accurate opponent strength estimates
- Complex calculation, less transparent
- Sensitive to strength estimation method
- Can create circular dependencies (team strength depends on opponent strength)

#### Example Comparison

**Team A:** 11-1 record
- Opponents average rank: 40
- Losses: #5 team (road)
- SOR: High (tough schedule, quality loss)

**Team B:** 11-1 record
- Opponents average rank: 70
- Losses: #35 team (home)
- SOR: Lower (easier schedule, bad loss)

SOR identifies Team A as more impressive despite identical records.

---

### Win Percentage

#### Philosophy
Simplest metric - pure wins divided by total games. Serves as baseline sanity check.

#### Mathematical Foundation

```
Win Percentage = Wins / (Wins + Losses)
```

No adjustments, no context, just raw performance.

#### Purpose in Ensemble

**Baseline Protection:**
- Ensures undefeated teams rank highly
- Prevents algorithmic quirks from undervaluing elite records
- Universal understanding and transparency

**Sanity Check:**
- If composite ranking wildly differs from win percentage order, signals potential issue
- Grounds complex algorithms in fundamental reality

#### Strengths and Limitations

**Strengths:**
- Completely transparent
- Universally understood
- No parameters to tune
- Immune to gaming

**Limitations:**
- Ignores opponent quality
- No schedule context
- Treats all wins equally
- Cannot distinguish between similar records

---

## Data Adjustments

### FBS Team Filtering

**Purpose:** Ensure analysis uses only Football Bowl Subdivision teams for fair comparison.

**Implementation:**
```python
fbs_teams = api.get_fbs_teams(year=season_year)
games_filtered = games[games['home_team'].isin(fbs_teams) &
                       games['away_team'].isin(fbs_teams)]
```

**Rationale:**
- FCS teams play different caliber of competition
- Including FCS would skew strength metrics
- Official CFP only considers FBS teams

### Temporal Filtering

**Exclusion of Weeks 0-4:**

**Rationale:**
- Early season data is noisy and unreliable
- Teams still adjusting to new roster/scheme
- Week 5+ provides stable, meaningful data

**Implementation:**
```python
games_filtered = games[games['week'] >= start_week]
```

### Margin of Victory Capping

**28-Point Cap:**

**Formula:**
```python
adjusted_mov = np.clip(raw_mov, -28, 28)
```

**Rationale:**
- Diminishing predictive value beyond 4 touchdowns
- Prevents incentive to run up score
- Reduces blowout game influence
- Based on empirical research

### Home Field Advantage Adjustment

**3.75-Point Adjustment:**

**Formula:**
```python
neutral_margin = raw_margin - (3.75 if not neutral_site else 0)
```

**Rationale:**
- Average home team advantage in college football
- Allows fair comparison of home/road/neutral games
- Based on historical game data analysis

---

## Normalization and Weighting

### Min-Max Normalization

All individual algorithm scores are normalized to [0, 1] scale before weighting:

```python
normalized_score = (score - min_score) / (max_score - min_score)
```

**Purpose:**
- Ensures comparable scales across algorithms
- Prevents one algorithm from dominating due to scale differences
- Maintains relative ordering within each algorithm

### Composite Score Calculation

**Step 1:** Normalize each algorithm
```python
for algorithm in ['colley', 'massey', 'elo', 'sor', 'win_pct']:
    normalized[algorithm] = (scores[algorithm] - scores[algorithm].min()) / \
                            (scores[algorithm].max() - scores[algorithm].min())
```

**Step 2:** Apply weights
```python
composite = (weights['colley'] * normalized['colley'] +
             weights['massey'] * normalized['massey'] +
             weights['elo'] * normalized['elo'] +
             weights['sor'] * normalized['sor'] +
             weights['win_pct'] * normalized['win_pct'])
```

**Step 3:** Rank by composite score
```python
final_rankings = teams.sort_values('composite', ascending=False)
final_rankings['rank'] = range(1, len(final_rankings) + 1)
```

---

## Mathematical Details

### Linear Algebra Solutions

Both Colley Matrix and Massey Ratings solve linear systems:

```
A × x = b
```

**Solution Method:**
```python
x = np.linalg.solve(A, b)
```

**Computational Complexity:**
- O(n³) for n teams using standard solvers
- Efficient for n ≈ 130 FBS teams
- Sparse matrix optimization possible but not necessary

### Convergence and Stability

**Elo System Convergence:**
- Ratings stabilize after ~8-10 games
- Early season has higher variance
- Season regression prevents runaway ratings

**Matrix Method Stability:**
- Both Colley and Massey guaranteed to have unique solutions
- Systems are well-conditioned for college football graphs
- Numerical stability validated across multiple seasons

### Handling Edge Cases

**Undefeated Teams:**
- Colley: Rating approaches 1.0
- Massey: Rating based on MOV against schedule
- Elo: Continues rising with each win
- SOR: Very high (low probability of perfection)
- Win%: 1.0

**Winless Teams:**
- Colley: Rating approaches 0.0
- Massey: Rating based on MOV (can be less than zero)
- Elo: Continues falling with each loss
- SOR: Low (schedule irrelevant with 0 wins)
- Win%: 0.0

---

## References

### Academic Papers

1. **Colley, W. N.** (2002). *Colley's Bias Free College Football Ranking Method: The Colley Matrix Explained*. Princeton University.

2. **Massey, K.** (1997). *Statistical Models Applied to the Rating of Sports Teams*. Bluefield College Mathematics Department.

3. **Elo, A. E.** (1978). *The Rating of Chessplayers, Past and Present*. Arco Publishing.

### College Football Data

4. **CollegeFootballData.com** - Primary data source for game results, team information, and advanced statistics.

5. **NCAA** - Official FBS team designations and conference affiliations.

### Historical Context

6. **BCS Computer Rankings** (1998-2013) - Historical application of Colley and Massey methods in official college football rankings.

7. **College Football Playoff Selection Committee** - Current official selection methodology and protocols.

---

## Glossary

**FBS (Football Bowl Subdivision):** Top tier of NCAA Division I college football (approximately 130 teams).

**MOV (Margin of Victory):** Point differential in a game (winner's score minus loser's score).

**Neutral Site:** Game played at location giving neither team home field advantage.

**Composite Score:** Weighted combination of multiple ranking algorithms.

**Normalization:** Scaling scores to common range (typically 0-1) for fair comparison.

**Least-Squares:** Mathematical optimization minimizing sum of squared errors.

**K-Factor:** Learning rate in Elo system controlling rating update magnitude.

**Regression:** Statistical adjustment toward mean value (used in Elo season initialization).

**SOR (Strength of Record):** Metric evaluating record quality given schedule difficulty.

**Resume:** Collection of wins and losses (with context of opponent quality).

**Power Rating:** Estimate of team's fundamental strength (predictive ability).

---

## Version History

**Version 1.0.0** (December 2024)
- Initial methodology documentation
- Five algorithm ensemble approach
- Default weights established
- Comprehensive mathematical foundations

---

*For questions or clarifications on methodology, please refer to project documentation or open an issue on the project repository.*

# CFP Selection Simulator - Ranking Methodology Summary

## How Teams Are Ranked

Your ranking system uses a **composite approach** that balances multiple perspectives on team quality.

### Final Composite Score Formula

```
Composite Score = 30% Resume + 40% Predictive + 15% SOR + 15% SOS
```

---

## Component Breakdown

### 1. Resume Rankings (30% of final score)

**What it measures:** What teams have accomplished (win/loss record only)

**Components:**
- **Colley Matrix (60% of resume)**
  - Pure win/loss evaluation using linear algebra
  - Formula: `b_i = 1 + 0.5*(wins - losses)`
  - No margin of victory
  
- **Win Percentage (40% of resume)**
  - Simple record: `Wins / (Wins + Losses)`

**Resume Score = 0.60 × Colley + 0.40 × Win%**

---

### 2. Predictive Rankings (40% of final score)

**What it measures:** How good teams are (using scoring margins)

**Components:**
- **Massey Ratings (50% of predictive)**
  - Uses point differential (capped at 28 points)
  - HFA-adjusted by 3.75 points
  - Colleyized version: `Cr = p` (uses Colley matrix structure)
  
- **Elo Ratings (50% of predictive)**
  - Dynamic game-by-game updates
  - Includes MOV multiplier: `S_adj = 1 / (1 + 10^(-(ScoreDiff - HFA)/C))`
  - K-factor = 85, MOV scale = 17

**Predictive Score = 0.50 × Massey + 0.50 × Elo**

---

### 3. Strength of Record - SOR (15% of final score)

**What it measures:** How impressive the record is given the schedule

- Uses Poisson Binomial Distribution
- Probability that an average Top-25 team would achieve same/better record
- Lower SOR = better record given schedule

---

### 4. Strength of Schedule - SOS (15% of final score)

**What it measures:** Difficulty of opponents faced

- Formula: `SOS = (2×OR + OOR)/3`
- OR = Opponents' win percentage
- OOR = Opponents' opponents' win percentage
- Prevents inflated schedules

---

## Normalization Process

All components are normalized to 0-1 scale using **Min-Max Normalization**:

```
normalized = (value - min) / (max - min)
```

This ensures:
- Colley ratings (0-1 scale) can be combined with Elo (1500+ scale)
- All metrics are on comparable scales
- No single algorithm dominates due to scale differences

---

## Final Ranking

1. All components normalized to 0-1
2. Weighted combination using formula above
3. Teams sorted by Composite Score (descending)
4. Rank assigned 1, 2, 3, ...

---

## Tie-Breaker Logic

When teams have very close composite scores (< 0.01 difference):

1. Head-to-head result
2. Record vs common opponents
3. SOS rank
4. SOR rank
5. Composite score

---

## Key Features

- **Resume vs Predictive Separation** - Balances "deserve to be in" vs "best team"
- **Schedule-Adjusted** - Accounts for strength of schedule (SOR/SOS)
- **MOV-Capped** - Prevents blowout stat-padding (28-point cap)
- **HFA-Adjusted** - Neutralizes home field advantage (3.75 points)
- **Mathematically Rigorous** - All formulas documented and reproducible


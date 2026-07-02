# Limitations and Ethics

## What This Simulator Is

A transparent **decision-support** tool for exploring CFP selection under published rules. It helps audit, explain, and stress-test ranking assumptions.

## What It Is Not

- Not an official CFP product
- Not a claim that the committee is "wrong"
- Not a substitute for human judgment in selection

## Known Limitations

1. **Committee subjectivity**: Real selection involves qualitative factors not fully captured in data
2. **Conference champion data**: Auto-bid logic requires accurate `conf_champ` labels; backtests may lack this
3. **Weight sensitivity**: Composite weights are configurable defaults, not committee-calibrated
4. **Selection Stability Index**: Stub in v2.0; full Monte Carlo sensitivity ships in v2.1
5. **4-team era (2014–2023)**: Validation uses top-12 ranking proxy, not historical 4-team bracket rules

## Responsible Use

Present model output alongside committee rankings and uncertainty. Avoid unsupported claims about bias or institutional favoritism without cited evidence.

"use client";

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ValidationTerm } from "@/components/explain/ValidationTerm";
import {
  ValidationTeamChip,
  ValidationTeamChipGroup,
} from "@/components/validation/ValidationTeamChip";
import { cn } from "@/lib/utils";
import {
  formatCommitteeOutlierLabel,
  formatPredictiveBaselineLabel,
  formatValidationFieldSizeLabel,
  formatValidationTargetLabel,
} from "@/lib/displayLabels";
import { predictiveModelTerm } from "@/lib/validationExplain";
import {
  agreementLabel,
  committeeHeadlineInterpretation,
  committeeVerdict,
  fieldAccuracyHeadlineInterpretation,
  fieldAccuracyHeadlineLabel,
  fieldAccuracyScopeSub,
  formatValidationGeneratedAt,
  meterWidth,
  num,
  pct,
  predictiveSignalHeadlineInterpretation,
  predictiveVerdict,
  seasonRange,
  selectionVerdict,
} from "@/lib/validationFormat";
import type {
  PredictiveValidationRow,
  ValidationPayload,
} from "@/lib/types";

/** Thin horizontal proportion meter (0–1) in the monochrome palette. */
function Meter({
  ratio,
  tone = "neutral",
  className,
}: {
  ratio: number | null;
  tone?: "neutral" | "gold";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-bar-track",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full",
          tone === "gold" ? "bg-tag-gold-text/70" : "bg-foreground/70",
        )}
        style={{ width: `${meterWidth(ratio)}%` }}
      />
    </div>
  );
}

function PredictiveModelLabel({ model }: { model: string }) {
  const label = formatPredictiveBaselineLabel(model);
  const term = predictiveModelTerm(model);
  const isComposite = model === "composite";

  if (term) {
    return (
      <ValidationTerm
        term={term}
        className={cn(
          "text-xs",
          isComposite ? "font-semibold text-tag-gold-text" : "text-muted-foreground",
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "text-xs",
        isComposite ? "font-semibold text-tag-gold-text" : "text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

/** A big-number headline stat with a label and a supporting line. */
function HeadlineStat({
  label,
  value,
  sub,
  chip,
}: {
  label: ReactNode;
  value: string;
  sub: string;
  chip?: string;
}) {
  return (
    <Card className="gap-2 border-border bg-card py-4">
      <CardHeader className="px-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-3xl font-semibold tabular-nums text-foreground">
          {value}
        </div>
        {chip ? (
          <p className="mt-1.5 text-xs font-medium text-foreground">{chip}</p>
        ) : null}
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {sub}
        </div>
      </CardContent>
    </Card>
  );
}

function OutlierChip() {
  return (
    <Badge variant="chip-gold" className="text-[10px]">
      {formatCommitteeOutlierLabel()}
    </Badge>
  );
}

function ValidationScopeStrip({
  years,
  outlierYears,
}: {
  years: number[];
  outlierYears: number[];
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/40 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ValidationTerm term="validation_scope" />
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
        {[
          "Retrospective",
          "Completed seasons only",
          <ValidationTerm key="era" term="era_correct_rules" className="normal-case" />,
          outlierYears.length > 0 ? (
            <span key="outliers" className="text-xs text-foreground">
              <ValidationTerm term="outlier_seasons" className="normal-case" /> labeled (
              {outlierYears.join(", ")})
            </span>
          ) : (
            <span key="outliers-fallback" className="text-xs text-foreground">
              <ValidationTerm term="outlier_seasons" className="normal-case" /> labeled where
              applicable
            </span>
          ),
        ].map((item, index) => (
          <li
            key={typeof item === "string" ? item : `item-${index}`}
            className="flex items-center gap-1.5 text-xs text-foreground"
          >
            <span className="size-1 shrink-0 rounded-full bg-tag-gold-text/80" />
            {item}
          </li>
        ))}
      </ul>
      {years.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Seasons in this artifact:{" "}
          <span className="font-medium text-foreground">{seasonRange(years)}</span>
          {years.length === 1 ? ", not all CFP history." : ""}
        </p>
      ) : null}
    </div>
  );
}

function ValidationArtifactFooter({ data }: { data: ValidationPayload }) {
  return (
    <Card className="border-border/60 bg-secondary/30 py-3">
      <CardContent className="px-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Validation artifact
        </p>
        <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">Generated</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {formatValidationGeneratedAt(data.generated_at)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Target</dt>
            <dd className="font-medium text-foreground">
              {formatValidationTargetLabel(data.target)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Seasons</dt>
            <dd className="font-medium tabular-nums text-foreground">
              {seasonRange(data.years)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              <ValidationTerm term="outlier_seasons" className="normal-case" />
            </dt>
            <dd className="font-medium text-foreground">
              {data.outlier_years.length > 0
                ? data.outlier_years.join(", ")
                : "None flagged"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Refresh with <span className="font-mono">sroom validate</span>.
        </p>
      </CardContent>
    </Card>
  );
}

export function ValidationDashboard({ data }: { data: ValidationPayload }) {
  const range = seasonRange(data.years);
  const selectionYears = data.selection.map((r) => r.year);
  const c = data.summary.committee;
  const s = data.summary.selection;
  const p = data.summary.predictive;

  const predictiveByYear = new Map<number, PredictiveValidationRow[]>();
  for (const row of data.predictive) {
    const list = predictiveByYear.get(row.year) ?? [];
    list.push(row);
    predictiveByYear.set(row.year, list);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        How the model&apos;s output compares to the real CFP Selection Committee
        across{" "}
        <span className="font-medium text-foreground">{range}</span>
        {data.years.length > 1 ? ` (${data.years.length} seasons)` : ""}. This is
        a retrospective accuracy check on finished seasons. The model is
        transparent and rules-based, and it will disagree with the committee.
        Those disagreements are the point.
      </p>

      <ValidationScopeStrip years={data.years} outlierYears={data.outlier_years} />

      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Each season is judged against the playoff format that actually applied
        that year, not today&apos;s rules. See{" "}
        <ValidationTerm term="era_correct_rules" className="normal-case" />.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {c ? (
          <HeadlineStat
            label={<ValidationTerm term="committee_agreement" />}
            value={num(c.mean_spearman_top12, 2)}
            chip={committeeHeadlineInterpretation(c.mean_spearman_top12)}
            sub={`Mean top-12 overlap ${pct(c.mean_top12_overlap)} across validated seasons (${agreementLabel(
              c.mean_spearman_top12,
            )}).`}
          />
        ) : null}
        {s ? (
          <HeadlineStat
            label={
              <ValidationTerm
                term="field_accuracy"
                overrideLabel={fieldAccuracyHeadlineLabel(selectionYears)}
              />
            }
            value={pct(s.correct_field_rate)}
            chip={fieldAccuracyHeadlineInterpretation(s.correct_field_rate)}
            sub={`${fieldAccuracyScopeSub(selectionYears)} Mean field overlap ${pct(
              s.mean_field_overlap,
            )}.`}
          />
        ) : null}
        {p ? (
          <HeadlineStat
            label={<ValidationTerm term="predictive_signal" />}
            value={pct(p.mean_win_accuracy)}
            chip={predictiveSignalHeadlineInterpretation()}
            sub={`How the composite's game-level signal scored completed games, not a live forecast. Brier ${num(
              p.mean_brier,
            )} (lower is better).`}
          />
        ) : null}
      </div>

      {data.committee.length > 0 ? (
        <Card className="border-border bg-card">
          <CardHeader className="px-4">
            <CardTitle>
              <ValidationTerm term="committee_alignment" className="text-base font-semibold normal-case" />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How closely the model reproduces the committee&apos;s ranking, by
              season. Overlap counts how many of the committee&apos;s teams the
              model also placed in the same band.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4">
            {data.committee.map((row) => (
              <div
                key={row.year}
                className="rounded-lg border border-border/60 bg-secondary/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.year}
                  </span>
                  {row.is_outlier ? <OutlierChip /> : null}
                  <span className="ml-auto text-xs text-muted-foreground">
                    Spearman (top-12){" "}
                    <span className="font-semibold tabular-nums text-foreground">
                      {num(row.spearman_top12, 2)}
                    </span>
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground/90">
                  {committeeVerdict(row)}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <ValidationTerm term="top12_overlap" className="normal-case" />
                      <span className="font-medium tabular-nums text-foreground">
                        {row.top12_overlap_label} ({pct(row.top12_overlap_ratio)})
                      </span>
                    </div>
                    <Meter ratio={row.top12_overlap_ratio} tone="gold" className="mt-1.5" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <ValidationTerm term="bubble_overlap" className="normal-case" />
                      <span className="font-medium tabular-nums text-foreground">
                        {row.bubble_overlap_label} ({pct(row.bubble_overlap_ratio)})
                      </span>
                    </div>
                    <Meter ratio={row.bubble_overlap_ratio} className="mt-1.5" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.selection.length > 0 ? (
        <Card className="border-border bg-card">
          <CardHeader className="px-4">
            <CardTitle>Era-correct field selection</CardTitle>
            <p className="text-sm text-muted-foreground">
              Each season is judged against the playoff format that actually
              applied that year (4-team, then 12-team), not today&apos;s rules.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-4">
            {data.selection.map((row) => (
              <div
                key={row.year}
                className="rounded-lg border border-border/60 bg-secondary/30 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {row.year}
                  </span>
                  <Badge variant="chip-neutral" className="text-[10px]">
                    {row.rule_target}
                  </Badge>
                  {row.is_outlier ? <OutlierChip /> : null}
                  <Badge
                    variant={row.correct_field_size ? "chip-green" : "chip-red"}
                    className="ml-auto text-[10px]"
                  >
                    {formatValidationFieldSizeLabel(row.correct_field_size)}
                  </Badge>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-foreground/90">
                  {selectionVerdict(row)}
                </p>

                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <ValidationTerm term="field_overlap" className="normal-case" />
                    <span className="font-medium tabular-nums text-foreground">
                      {row.field_overlap_label} ({pct(row.field_overlap_ratio)})
                    </span>
                  </div>
                  <Meter ratio={row.field_overlap_ratio} tone="gold" className="mt-1.5" />
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs">
                  <ValidationTeamChipGroup
                    label="Model added:"
                    teams={row.false_positives}
                    role="model_added"
                    year={row.year}
                    ruleTarget={row.rule_target}
                  />
                  <ValidationTeamChipGroup
                    label="Model dropped:"
                    teams={row.false_negatives}
                    role="model_dropped"
                    year={row.year}
                    ruleTarget={row.rule_target}
                  />
                  {row.first_team_out_ref || row.first_team_out_sim ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-muted-foreground">First team out:</span>
                      {row.first_team_out_ref ? (
                        <ValidationTeamChip
                          team={row.first_team_out_ref}
                          role="committee_first_out"
                          year={row.year}
                          ruleTarget={row.rule_target}
                        />
                      ) : (
                        <span className="text-muted-foreground">Committee none</span>
                      )}
                      <span className="text-muted-foreground">·</span>
                      {row.first_team_out_sim ? (
                        <ValidationTeamChip
                          team={row.first_team_out_sim}
                          role="model_first_out"
                          year={row.year}
                          ruleTarget={row.rule_target}
                        />
                      ) : (
                        <span className="text-muted-foreground">Model none</span>
                      )}
                    </div>
                  ) : null}
                  {row.seeding_within_one !== null ? (
                    <div className="flex items-center gap-1.5">
                      <ValidationTerm term="seeds_within_one" className="normal-case" />
                      <span className="font-medium tabular-nums text-foreground">
                        {pct(row.seeding_within_one)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {predictiveByYear.size > 0 ? (
        <Card className="border-border bg-card">
          <CardHeader className="px-4">
            <CardTitle>
              <ValidationTerm term="predictive_signal" className="text-base font-semibold normal-case" />
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How well the composite&apos;s game-level signal scored completed
              games, next to simpler baselines. Retrospective scoring on finished
              games, not a live forecast.
            </p>
            <p className="text-xs text-muted-foreground">
              Higher{" "}
              <ValidationTerm term="predictive_accuracy" className="normal-case" /> is
              better; lower{" "}
              <ValidationTerm term="predictive_brier" className="normal-case" /> is better.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4">
            {[...predictiveByYear.entries()]
              .sort(([a], [b]) => a - b)
              .map(([year, rows]) => {
                const composite = rows.find((r) => r.model === "composite");
                const baselines = rows.filter((r) => r.model !== "composite");
                return (
                  <div
                    key={year}
                    className="rounded-lg border border-border/60 bg-secondary/30 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {year}
                      </span>
                      {composite ? (
                        <span className="text-xs text-muted-foreground">
                          {formatPredictiveBaselineLabel(composite.model)} win accuracy{" "}
                          <span className="font-semibold tabular-nums text-foreground">
                            {pct(composite.win_accuracy)}
                          </span>
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-foreground/90">
                      {predictiveVerdict(year, rows)}
                    </p>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {[...(composite ? [composite] : []), ...baselines].map(
                        (r) => {
                          const isComposite = r.model === "composite";
                          return (
                            <div
                              key={r.model}
                              className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-xs"
                            >
                              <PredictiveModelLabel model={r.model} />
                              <Meter
                                ratio={r.win_accuracy}
                                tone={isComposite ? "gold" : "neutral"}
                              />
                              <span className="tabular-nums text-muted-foreground">
                                {pct(r.win_accuracy)} · Brier {num(r.brier_score)}
                              </span>
                            </div>
                          );
                        },
                      )}
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      ) : null}

      <ValidationArtifactFooter data={data} />
    </div>
  );
}

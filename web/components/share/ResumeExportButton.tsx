"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OffscreenExportLayer } from "@/components/share/OffscreenExportLayer";
import { ResumeShareCard } from "@/components/share/ResumeShareCard";
import { useActiveRun } from "@/components/team/useActiveRun";
import { fileSlug } from "@/lib/exportCsv";
import { exportNodeToPng } from "@/lib/exportImage";
import type { RecordMeta, TeamResume } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ResumeExportButtonProps {
  resume: TeamResume;
  recordMeta?: RecordMeta | null;
  season?: number;
  week?: number;
  className?: string;
}

/** "Download card" button: renders ResumeShareCard off-screen and saves a PNG. */
export function ResumeExportButton({
  resume,
  recordMeta,
  season,
  week,
  className,
}: ResumeExportButtonProps) {
  const stem = useActiveRun();
  const [exporting, setExporting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exporting) return;
    const node = cardRef.current;
    if (!node) return;
    let active = true;
    const runPart =
      stem ?? (season && week ? `${season}_week${week}` : "latest");
    const capture = async () => {
      try {
        await exportNodeToPng(
          node,
          `selection-room_${runPart}_${fileSlug(resume.team)}.png`,
        );
        if (active) toast.success("Resume card saved");
      } catch {
        if (active) toast.error("Couldn't render the resume card");
      } finally {
        if (active) setExporting(false);
      }
    };
    void capture();
    return () => {
      active = false;
    };
  }, [exporting, stem, season, week, resume.team]);

  return (
    <>
      <Button
        variant="outline"
        className={cn(className)}
        onClick={() => setExporting(true)}
        disabled={exporting}
      >
        <ImageDown data-icon="inline-start" />
        {exporting ? "Rendering…" : "Download card"}
      </Button>
      {exporting ? (
        <OffscreenExportLayer>
          <div ref={cardRef}>
            <ResumeShareCard
              resume={resume}
              recordMeta={recordMeta}
              season={season}
              week={week}
            />
          </div>
        </OffscreenExportLayer>
      ) : null}
    </>
  );
}

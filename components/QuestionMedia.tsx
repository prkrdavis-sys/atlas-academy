"use client";

import { CapitalDisplay } from "@/components/CapitalDisplay";
import { FlagDisplay, FlagGrid } from "@/components/FlagDisplay";
import { FlagCropDisplay } from "@/components/FlagCropDisplay";
import { NeighborCountryDisplay } from "@/components/NeighborCountryDisplay";
import { PopulationMatchupDisplay } from "@/components/PopulationMatchupDisplay";
import { ShapeContextDisplay, ShapeDisplay } from "@/components/ShapeDisplay";
import { isInvertedFlagRound } from "@/lib/question-presentation";
import type { Question } from "@/lib/types";

type QuestionMediaProps = {
  question: Question;
  /** Options removed by a 50/50; only meaningful for the flag grid. */
  hiddenOptions?: string[];
  /** Required only for flag-grid rounds, which answer by tapping a flag. */
  onSelectFlag?: (code: string) => void;
};

/**
 * The visual half of a question — flag, shape, capital photo, and so on. Shared
 * by GameBoard and VersusBoard so both render a question identically.
 */
export function QuestionMedia({
  question,
  hiddenOptions = [],
  onSelectFlag,
}: QuestionMediaProps) {
  const inverted = isInvertedFlagRound(question);

  return (
    <>
      {question.displayType === "flag" && (
        <FlagDisplay code={question.countryCode} size="md" inverted={inverted} />
      )}
      {question.displayType === "flag-crop" && (
        <FlagCropDisplay
          code={question.countryCode}
          orientation={question.flagCropOrientation}
          inverted={inverted}
        />
      )}
      {question.displayType === "shape" &&
        (question.shapeLayout === "context-map" ? (
          <ShapeContextDisplay code={question.countryCode} />
        ) : (
          <ShapeDisplay code={question.countryCode} compact />
        ))}
      {question.displayType === "capital" && (
        <CapitalDisplay
          code={question.countryCode}
          compact
          showLabel={question.mode !== "country-to-capital"}
        />
      )}
      {question.mode === "neighbor-quiz" && (
        <NeighborCountryDisplay code={question.countryCode} />
      )}
      {question.displayType === "population" && question.optionCodes && (
        <PopulationMatchupDisplay codes={question.optionCodes} />
      )}
      {question.displayType === "flags-grid" && question.optionCodes && onSelectFlag && (
        <FlagGrid
          codes={question.optionCodes.filter((code) => !hiddenOptions.includes(code))}
          onSelect={onSelectFlag}
          compact
          inverted={inverted}
        />
      )}
    </>
  );
}

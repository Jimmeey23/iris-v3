"use client";

import * as React from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { FilloutEmbed } from "./fillout-embed";
import { EVALUATION_FORMS, type EmbeddedForm } from "@/lib/iris/evaluation-forms";

/** The four Fillout/Zite evaluation forms, filled in place. Ported from iris-ai-v2 `/forms`. */
export function EvaluationForms() {
  const [active, setActive] = React.useState<EmbeddedForm>();

  if (active) {
    return (
      <section className="ef-stage">
        <div className="ef-stage-nav">
          <button className="btn" onClick={() => setActive(undefined)}><ArrowLeft size={14} />All forms</button>
          <div className="flex-row">
            <span className="badge">{active.template}</span>
            <span className={`badge ${active.apiPollable ? "green" : ""}`}>{active.apiPollable ? "API + webhook" : "Webhook"}</span>
            {active.embedKind === "fillout-v1" && (
              <a className="btn" href={`https://forms.fillout.com/t/${active.embedId}`} target="_blank" rel="noreferrer" aria-label="Open this form in a new tab"><ExternalLink size={14} /></a>
            )}
          </div>
        </div>
        <div className="ef-stage-head">
          <h3>{active.name}</h3>
          <p>{active.blurb}</p>
        </div>
        <FilloutEmbed key={active.embedId} embedId={active.embedId} kind={active.embedKind} height={active.height} />
      </section>
    );
  }

  return (
    <div className="ef-grid">
      {EVALUATION_FORMS.map((f) => (
        <button key={f.key} type="button" className="ef-card" onClick={() => setActive(f)}>
          <span className="ef-card-art"><img src={f.art} alt="" loading="lazy" /></span>
          <span className="ef-card-body">
            <span className={`badge ${f.apiPollable ? "green" : ""}`}>{f.apiPollable ? "API + webhook" : "Webhook"}</span>
            <h3>{f.name}</h3>
            <p>{f.blurb}</p>
            <span className="tag">{f.template}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

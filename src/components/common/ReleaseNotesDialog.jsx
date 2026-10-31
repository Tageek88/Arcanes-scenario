import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ResponsiveDialog from "@/components/common/ResponsiveDialog";
import { lightNotes, parseInline, parseReleaseNotes } from "@/lib/meta/releaseNotes";
import { RELEASE_VERSIONS, releaseNoteText } from "@/lib/services/releaseNotes";

function Inline({ text }) {
  return parseInline(text).map((part, index) => {
    if (part.type === "bold") return <strong key={index} className="font-semibold text-foreground">{part.value}</strong>;
    if (part.type === "code") return <code key={index} className="rounded bg-secondary px-1 py-0.5 font-mono text-xs text-foreground">{part.value}</code>;
    return <React.Fragment key={index}>{part.value}</React.Fragment>;
  });
}

function FullNotes({ markdown }) {
  const notes = parseReleaseNotes(markdown);
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      {notes.intro.map((line, index) => <p key={index}><Inline text={line} /></p>)}
      {notes.sections.map((section) => (
        <section key={section.heading} className="space-y-2">
          <h3 className="font-display text-sm font-semibold text-foreground">{section.heading}</h3>
          {section.blocks.map((block, index) =>
            block.type === "list" ? (
              <ul key={index} className="list-disc space-y-1.5 pl-5">
                {block.items.map((item, i) => <li key={i} className="break-words"><Inline text={item} /></li>)}
              </ul>
            ) : (
              <p key={index}><Inline text={block.text} /></p>
            )
          )}
        </section>
      ))}
    </div>
  );
}

function LightNotes({ markdown }) {
  const { intro, highlights } = lightNotes(markdown);
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      {intro && <p><Inline text={intro} /></p>}
      {highlights.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {highlights.map((item, index) => <li key={index} className="break-words text-foreground">{item}</li>)}
        </ul>
      )}
    </div>
  );
}

/**
 * Notes de version : résumé très court, version complète à la demande, et les versions précédentes.
 * @param {{ open: boolean, onOpenChange: (open: boolean) => void, currentVersion: string }} props
 */
export default function ReleaseNotesDialog({ open, onOpenChange, currentVersion }) {
  const [version, setVersion] = useState(currentVersion);
  const [full, setFull] = useState(false);

  useEffect(() => {
    if (open) {
      setVersion(currentVersion);
      setFull(false);
    }
  }, [open, currentVersion]);

  const markdown = releaseNoteText(version);
  const versions = RELEASE_VERSIONS.includes(currentVersion) ? RELEASE_VERSIONS : [currentVersion, ...RELEASE_VERSIONS];

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Notes de version"
      description={markdown ? "Ce qui change d'une version à l'autre." : undefined}
      footer={<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>}
    >
      <div className="space-y-4">
        <Select value={version} onValueChange={(value) => { setVersion(value); setFull(false); }}>
          <SelectTrigger aria-label="Version" className="h-9 w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {versions.map((value) => (
              <SelectItem key={value} value={value}>{value === currentVersion ? `${value} (installée)` : value}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!markdown ? (
          <p className="text-sm text-muted-foreground">Aucune note de version pour la {version}.</p>
        ) : (
          <>
            {full ? <FullNotes markdown={markdown} /> : <LightNotes markdown={markdown} />}
            <Button type="button" variant="outline" size="sm" onClick={() => setFull((value) => !value)}>
              {full ? "Revenir au résumé" : "Voir la version complète"}
            </Button>
          </>
        )}
      </div>
    </ResponsiveDialog>
  );
}

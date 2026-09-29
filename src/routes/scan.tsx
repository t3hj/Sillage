import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FragranceCard } from "@/components/FragranceCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATALOGUE, CATALOGUE_BY_ID } from "@/data/fragrances";
import type { Fragrance } from "@/data/types";
import { searchFragrances } from "@/lib/search";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan — Sillage" },
      {
        name: "description",
        content: "Scan a code on a bottle and match it against the local fragrance catalogue.",
      },
      { property: "og:title", content: "Scan — Sillage" },
      {
        property: "og:description",
        content: "Scan a code on a bottle and match it against the local fragrance catalogue.",
      },
    ],
  }),
  component: ScanPage,
});

type ScanState = "idle" | "camera" | "scanning" | "result" | "unknown";

/** Decode a scanned value into catalogue candidates, without pretending to know more than we do. */
export function matchScannedValue(value: string): Fragrance[] {
  const v = value.trim();
  if (!v) return [];
  // Sillage-generated codes look like sillage:<fragrance-id> or a link containing the id.
  const idMatch = /sillage[/:]([a-z0-9-]+)/i.exec(v);
  if (idMatch) {
    const f = CATALOGUE_BY_ID.get(idMatch[1]!.toLowerCase());
    if (f) return [f];
  }
  // A bare catalogue id.
  const direct = CATALOGUE_BY_ID.get(v.toLowerCase());
  if (direct) return [direct];
  // A plain product code (EAN/UPC) is never guessable — no fake identification.
  if (/^\d{8,14}$/.test(v)) return [];
  // Otherwise treat it as a text query.
  return searchFragrances(CATALOGUE, v).slice(0, 4);
}

function ScanPage() {
  const [state, setState] = useState<ScanState>("idle");
  const [error, setError] = useState("");
  const [scanned, setScanned] = useState("");
  const [matches, setMatches] = useState<Fragrance[]>([]);
  const [manual, setManual] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const present = useCallback(
    (value: string) => {
      stop();
      const m = matchScannedValue(value);
      setScanned(value);
      setMatches(m);
      setState(m.length > 0 ? "result" : "unknown");
    },
    [stop],
  );

  const startCamera = useCallback(async () => {
    setError("");
    if (!("BarcodeDetector" in window)) {
      setError(
        "This browser doesn't support in-browser code detection. Enter the code manually below.",
      );
      setState("idle");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setState("camera");
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new (
        window as unknown as {
          BarcodeDetector: new (o?: object) => {
            detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]>;
          };
        }
      ).BarcodeDetector();
      setState("scanning");
      const tick = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          rafRef.current = requestAnimationFrame(() => void tick());
          return;
        }
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0]!.rawValue) {
            present(codes[0]!.rawValue);
            return;
          }
        } catch {
          /* transient decode failure — keep looking */
        }
        rafRef.current = requestAnimationFrame(() => void tick());
      };
      rafRef.current = requestAnimationFrame(() => void tick());
    } catch {
      setError("Camera access was declined or is unavailable. You can enter a code manually.");
      setState("idle");
    }
  }, [present]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Scan
        </h1>
        <p className="text-sm text-muted-foreground">
          Point your camera at a QR code or barcode. Sillage only identifies codes it can match
          against its own catalogue — it will never guess a fragrance from an unknown barcode.
        </p>
      </div>

      {state === "camera" || state === "scanning" ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-black">
            <video
              ref={videoRef}
              className="max-h-[60vh] w-full object-contain"
              muted
              playsInline
            />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {state === "scanning" ? "Looking for a code…" : "Starting camera…"}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              stop();
              setState("idle");
            }}
          >
            Stop camera
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Button onClick={() => void startCamera()}>Start camera</Button>
          <div className="space-y-2">
            <p className="text-sm font-medium">Or enter a code manually</p>
            <div className="flex gap-2">
              <Input
                placeholder="QR value, product code or fragrance name…"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && manual.trim()) {
                    e.preventDefault();
                    present(manual);
                  }
                }}
                aria-label="Enter a code manually"
              />
              <Button onClick={() => manual.trim() && present(manual)} disabled={!manual.trim()}>
                Look up
              </Button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {error}
        </p>
      ) : null}

      {state === "result" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Scanned: <code className="break-all">{scanned}</code>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {matches.map((f) => (
              <FragranceCard key={f.id} fragrance={f} />
            ))}
          </div>
        </div>
      ) : null}

      {state === "unknown" ? (
        <div className="space-y-3 rounded-2xl border border-dashed border-border p-6">
          <p role="status" className="text-sm">
            Scanned <code className="break-all">{scanned}</code> but it doesn’t match anything in
            the catalogue. Try searching for the fragrance by name instead, or add it manually.
          </p>
          <Button asChild variant="outline">
            <Link to="/discover">Search the catalogue</Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

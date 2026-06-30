/**
 * Build-time extraction: Persian font archive -> src/assets/fonts/iranyekanx/
 *
 * Produces IRANYekanX Pro `.woff2` files from the committed font archive and
 * prepares them for wiring via `next/font/local`. This step is *subject to the
 * owner's licensing permission*: IRANYekanX Pro is a licensed commercial font.
 *
 * The font archive is typically header-encrypted; supply the password via the
 * `FONT_RAR_PASSWORD` environment variable. If the archive cannot be opened
 * (no permission / no password / unsupported), the script exits gracefully with
 * guidance rather than failing the build — the application ships with the
 * documented OFL fallback (Vazirmatn) until the licensed font is provided.
 *
 * Requirements: 1.3, 14.3
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, readdirSync, cpSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const ARCHIVE = join(ROOT, "private-assets/fonts/IRANYekanX Pro.rar");
const DEST = join(ROOT, "src/assets/fonts/iranyekanx");

function tryExtract(tmp: string): boolean {
  const password = process.env.FONT_RAR_PASSWORD;
  const args = ["x", "-y", `-o${tmp}`];
  if (password) args.push(`-p${password}`);
  args.push(ARCHIVE);
  try {
    execFileSync("7z", args, { stdio: "pipe" });
    return true;
  } catch (err) {
    console.warn(
      "[extract:fonts] could not open the font archive (it is likely " +
        "header-encrypted / licensed). Set FONT_RAR_PASSWORD if you have " +
        "permission, or provide the licensed .woff2 files manually.",
    );
    return false;
  }
}

function collectFontFiles(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) collectFontFiles(p, acc);
    else if ([".woff2", ".woff", ".ttf", ".otf"].includes(extname(name.name).toLowerCase()))
      acc.push(p);
  }
  return acc;
}

function main(): void {
  if (!existsSync(ARCHIVE)) {
    console.warn(`[extract:fonts] font archive not found: ${ARCHIVE} (skipping).`);
    return;
  }

  const tmp = join(ROOT, ".tmp-fonts-extract");
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  if (!tryExtract(tmp)) {
    rmSync(tmp, { recursive: true, force: true });
    return;
  }

  const fonts = collectFontFiles(tmp);
  const woff2 = fonts.filter((f) => f.toLowerCase().endsWith(".woff2"));

  mkdirSync(DEST, { recursive: true });
  if (woff2.length > 0) {
    for (const f of woff2) cpSync(f, join(DEST, f.split("/").pop()!));
    console.log(`[extract:fonts] copied ${woff2.length} .woff2 file(s) into ${DEST}.`);
    console.log("[extract:fonts] now activate the localFont block in src/app/fonts.ts.");
  } else if (fonts.length > 0) {
    console.warn(
      "[extract:fonts] archive contained only non-woff2 fonts " +
        `(${fonts.map((f) => extname(f)).join(", ")}). Convert them to .woff2 ` +
        "(e.g. with fonttools) and place them in src/assets/fonts/iranyekanx/.",
    );
  } else {
    console.warn("[extract:fonts] no font files found in the archive.");
  }

  rmSync(tmp, { recursive: true, force: true });
}

main();

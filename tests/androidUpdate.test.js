import { describe, it, expect } from "vitest";
import { parseVersion, compareVersions, findApkAsset, checkAndroidUpdate } from "@/lib/services/androidUpdate";

const apk = (name = "Arcanes.Scenario-1.12.0.apk") => ({ name, size: 5_000_000, browser_download_url: `https://github.com/Tageek88/Arcanes-scenario/releases/download/v1.12.0/${name}` });
const reply = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });

describe("mise à jour Android : règles", () => {
  it("parseVersion et compareVersions", () => {
    expect(parseVersion("v1.11.1")).toEqual([1, 11, 1]);
    expect(parseVersion("abc")).toBeNull();
    expect(compareVersions("1.12.0", "1.11.9")).toBe(1);
    expect(compareVersions("1.9.0", "1.11.0")).toBe(-1);
    expect(compareVersions("1.2.3", "v1.2.3")).toBe(0);
    expect(compareVersions("x", "1.0.0")).toBe(0);
  });

  it("findApkAsset : seulement un .apk hébergé par GitHub", () => {
    expect(findApkAsset({ assets: [{ name: "notes.md", browser_download_url: "https://github.com/a.md" }, apk()] })?.name).toBe("Arcanes.Scenario-1.12.0.apk");
    expect(findApkAsset({ assets: [{ name: "x.apk", browser_download_url: "http://evil.test/x.apk" }] })).toBeNull();
    expect(findApkAsset({})).toBeNull();
  });

  it("nouvelle version avec APK : disponible", async () => {
    const result = await checkAndroidUpdate("1.11.1", reply({ tag_name: "v1.12.0", assets: [apk()] }));
    expect(result).toMatchObject({ ok: true, available: true, version: "1.12.0", size: 5_000_000 });
    expect(result.url).toMatch(/^https:\/\/github\.com\/.*\.apk$/);
  });

  it("même version ou plus ancienne : à jour", async () => {
    expect(await checkAndroidUpdate("1.12.0", reply({ tag_name: "v1.12.0", assets: [apk()] }))).toMatchObject({ ok: true, available: false });
  });

  it("nouvelle version sans APK : noApk", async () => {
    expect(await checkAndroidUpdate("1.11.1", reply({ tag_name: "v1.12.0", assets: [] }))).toMatchObject({ ok: true, available: false, noApk: true, version: "1.12.0" });
  });

  it("erreurs : HTTP, tag illisible, réseau, délai", async () => {
    expect(await checkAndroidUpdate("1.0.0", reply({}, false, 403))).toMatchObject({ ok: false });
    expect(await checkAndroidUpdate("1.0.0", reply({ tag_name: "bêta" }))).toMatchObject({ ok: false });
    expect(await checkAndroidUpdate("1.0.0", async () => { throw new TypeError("net"); })).toMatchObject({ ok: false });
    const abort = async () => { const e = new Error("a"); e.name = "AbortError"; throw e; };
    expect((await checkAndroidUpdate("1.0.0", abort)).error).toMatch(/délai/);
  });
});

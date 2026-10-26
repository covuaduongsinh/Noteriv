import { lookup } from "node:dns/promises";
import net from "node:net";

// Sync remotes (Git, WebDAV) are addresses users type, fetched by the worker from inside our network. Only public
// hosts are reached: a URL naming localhost, a private range or the cloud metadata address would otherwise let a
// user read internal services through sync. The name is resolved here and every address checked; a DNS answer that
// changes between this check and git/axios connecting is not covered (the worker's own network is the other half).

function privateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  );
}

function privateV6(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true;
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]);
  return /^f[cd]/.test(s) || /^fe[89ab]/.test(s) || s.startsWith("ff");
}

export function isPrivateAddress(ip: string): boolean {
  const kind = net.isIP(ip);
  return kind === 4 ? privateV4(ip) : kind === 6 ? privateV6(ip) : true;
}

/** Throws unless `url` names a host whose every address is public. Tests against local remotes set SYNC_ALLOW_LOCAL_REMOTES=1. */
export async function assertPublicRemote(url: string): Promise<void> {
  if (process.env.SYNC_ALLOW_LOCAL_REMOTES === "1") return;
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new Error("invalid remote URL");
  }
  // No host at all: a local path or file:// URL.
  if (!host) throw new Error("remote host is not a public address");
  const addresses = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("remote host is not a public address");
  }
}

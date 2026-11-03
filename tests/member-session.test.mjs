import test from "node:test";
import assert from "node:assert/strict";
import { memberSession } from "../src/lib/member-session.ts";
const request = (header) =>
  new Request("https://brujula.test/api/intelligence", {
    headers: header ? { authorization: header } : {},
  });
test("public source reads require a verified non-anonymous member and preserve the beta allowlist", async () => {
  const verified = [];
  const deps = {
    enabled: true,
    configured: true,
    betaUserIds: " owner-a, owner-b ",
    verify: async (token) => {
      verified.push(token);
      return { id: "owner-b", isAnonymous: false };
    },
  };
  assert.equal(
    await memberSession(request("Bearer valid-token"), deps),
    "owner-b",
  );
  assert.deepEqual(verified, ["valid-token"]);
  await assert.rejects(
    () =>
      memberSession(request("Bearer valid-token"), {
        ...deps,
        betaUserIds: "owner-a",
      }),
    (e) => e.status === 403,
  );
});
test("missing or malformed tokens and disabled services never call the verifier", async () => {
  let calls = 0;
  const deps = {
    enabled: true,
    configured: true,
    verify: async () => {
      calls++;
      return { id: "owner-a", isAnonymous: false };
    },
  };
  for (const header of [null, "valid-token", "Bearer token extra"])
    await assert.rejects(
      () => memberSession(request(header), deps),
      (e) => e.status === 401,
    );
  for (const config of [{ enabled: false }, { configured: false }])
    await assert.rejects(
      () => memberSession(request("Bearer token"), { ...deps, ...config }),
      (e) => e.status === 503,
    );
  assert.equal(calls, 0);
});
test("invalid and anonymous sessions are refused even when the token is present", async () => {
  for (const member of [
    null,
    { id: "owner-a", isAnonymous: true },
    { id: "", isAnonymous: false },
  ])
    await assert.rejects(
      () =>
        memberSession(request("Bearer token"), {
          enabled: true,
          configured: true,
          verify: async () => member,
        }),
      (e) => e.status === 401,
    );
});

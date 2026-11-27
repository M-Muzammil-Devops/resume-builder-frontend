"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Send, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { AdminAccess, Perms, Team, TeamMember } from "./types";
import { ago, cx, initials } from "./format";
import s from "./AdminV2.module.css";

const ROLE_LABEL: Record<string, string> = { SUPER_ADMIN: "Super Admin", OPERATIONS: "Operations", SUPPORT: "Support", ANALYST: "Analyst", CUSTOM: "Custom" };
const ROLE_PILL: Record<string, string> = { SUPER_ADMIN: s.pV, OPERATIONS: s.pB, SUPPORT: s.pC, ANALYST: s.pA, CUSTOM: s.pN };
const PERMS: { key: keyof Perms; short: string; label: string; cls?: string }[] = [
  { key: "canRead", short: "R", label: "Read" },
  { key: "canWrite", short: "W", label: "Write" },
  { key: "canDelete", short: "D", label: "Delete", cls: s.pDe },
  { key: "canBilling", short: "B", label: "Billing", cls: s.pBi },
  { key: "canSystem", short: "S", label: "System", cls: s.pSy },
];
const STATUS_PILL: Record<string, string> = { ACTIVE: s.pG, INVITED: s.pA, DISABLED: s.pR };

function Check2({ on, disabled, label, onToggle }: { on: boolean; disabled?: boolean; label: string; onToggle?: () => void }) {
  return (
    <button type="button" className={cx(s.cb, on && s.cbOn)} aria-pressed={on} aria-label={label} disabled={disabled} onClick={onToggle}>
      {on && <Check size={13} strokeWidth={3} aria-hidden="true" />}
    </button>
  );
}

export function TeamPanel({ access, meEmail }: { access: AdminAccess | null; meEmail: string }) {
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "ANALYST" });
  const [custom, setCustom] = useState<Perms>({ canRead: true, canWrite: false, canDelete: false, canBilling: false, canSystem: false });
  const editable = Boolean(access?.superAdmin);

  const load = useCallback(async () => {
    try {
      setTeam(await apiFetch<Team>("/admin/team"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the team");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  function defaults(role: string): Perms {
    const r = team?.roles.find((x) => x.role === role);
    return r ? { canRead: true, canWrite: r.canWrite, canDelete: r.canDelete, canBilling: r.canBilling, canSystem: r.canSystem } : custom;
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy("invite");
    setError(null);
    setOk(null);
    try {
      const res = await apiFetch<{ member: TeamMember; emailed: boolean }>("/admin/team/invite", {
        method: "POST",
        body: JSON.stringify({ email: form.email, name: form.name || undefined, role: form.role, permissions: form.role === "CUSTOM" ? custom : undefined }),
      });
      setOk(`${res.member.email} invited${res.emailed ? " — invite email sent" : ""}. They sign in at /admin/login with this email.`);
      setForm({ email: "", name: "", role: form.role });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(null);
    }
  }

  async function update(m: TeamMember, patch: Record<string, unknown>) {
    setBusy(m.id);
    setError(null);
    try {
      await apiFetch(`/admin/team/${encodeURIComponent(m.id)}`, { method: "PATCH", body: JSON.stringify(patch) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  async function remove(m: TeamMember) {
    if (!window.confirm(`Remove ${m.email} from the admin team?`)) return;
    setBusy(m.id);
    try {
      await apiFetch(`/admin/team/${encodeURIComponent(m.id)}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(null);
    }
  }

  const all = team ? [...team.owners, ...team.members] : [];
  const formPerms = form.role === "CUSTOM" ? custom : defaults(form.role);

  return (
    <>
      <div className={s.sh}>
        <div>
          <h2>Manage team</h2>
          <p>Give team members Read, Write, Delete, Billing or System access to this console</p>
        </div>
      </div>
      {error && <div className={s.error} role="alert">{error}</div>}
      {ok && <div className={s.notice} role="status">{ok}</div>}
      {!editable && <div className={s.notice}>Only a Super Admin can invite or change team members.</div>}

      <section className={cx(s.card, s.pad)}>
        <div className={s.ttl}><div><h3>Team members</h3><small>{all.length} people with console access</small></div></div>
        <div className={s.tw}>
          <table className={cx(s.table, s.rt)}>
            <thead><tr><th>Member</th><th>Role</th><th>Permissions</th><th>Status</th><th>Last active</th><th className={s.right}>Actions</th></tr></thead>
            <tbody>
              {all.map((m) => {
                const self = m.email.toLowerCase() === meEmail.toLowerCase();
                const locked = m.owner || !editable || busy === m.id;
                return (
                  <tr key={m.id}>
                    <td className={s.tdFull}>
                      <div className={s.u}>
                        <span className={cx(s.av, s.avSm)} aria-hidden="true">{initials(m.name, m.email)}</span>
                        <div style={{ minWidth: 0 }}>
                          <b style={{ display: "block" }}>{m.name || m.email.split("@")[0]}{self ? " (you)" : ""}</b>
                          <small className={s.mute} style={{ overflowWrap: "anywhere" }}>{m.email}</small>
                        </div>
                      </div>
                    </td>
                    <td data-l="Role">
                      {locked || self ? (
                        <span className={cx(s.pill, ROLE_PILL[m.role] || s.pN)}>{m.owner ? "Owner · Super Admin" : ROLE_LABEL[m.role] || m.role}</span>
                      ) : (
                        <select className={s.select} value={m.role} aria-label={`Role for ${m.email}`} onChange={(e) => void update(m, { role: e.target.value })}>
                          {Object.keys(ROLE_LABEL).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                        </select>
                      )}
                    </td>
                    <td data-l="Permissions">
                      <div className={s.perm}>
                        {PERMS.map((p) => (
                          <span key={p.key} className={cx(m[p.key] && s.pOn, p.cls)} title={`${p.label}: ${m[p.key] ? "yes" : "no"}`}>{p.short}</span>
                        ))}
                      </div>
                    </td>
                    <td data-l="Status"><span className={cx(s.pill, STATUS_PILL[m.status] || s.pN)}>{m.status.charAt(0) + m.status.slice(1).toLowerCase()}</span></td>
                    <td data-l="Last active">{ago(m.lastActiveAt)}</td>
                    <td className={cx(s.right, s.tdFull)}>
                      {!m.owner && editable && !self ? (
                        <div className={s.acts}>
                          <button type="button" className={cx(s.btn, s.sm)} disabled={busy === m.id} onClick={() => void update(m, { status: m.status === "DISABLED" ? "ACTIVE" : "DISABLED" })}>
                            {m.status === "DISABLED" ? "Enable" : "Disable"}
                          </button>
                          <button type="button" className={cx(s.btn, s.sm, s.iconOnly, s.danger)} disabled={busy === m.id} onClick={() => void remove(m)} aria-label={`Remove ${m.email}`} title="Remove">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={s.mute}>{m.owner ? "Protected" : "—"}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className={cx(s.grid, s.gT)}>
        <section className={cx(s.card, s.pad)}>
          <div className={s.ttl}><div><h3>Role permissions</h3><small>Tick a box to change one member (Custom role keeps your choices)</small></div></div>
          <div className={s.tw}>
            <table className={cx(s.table, s.mx)}>
              <thead><tr><th>Member</th>{PERMS.map((p) => <th key={p.key}>{p.label}</th>)}</tr></thead>
              <tbody>
                {all.map((m) => {
                  const self = m.email.toLowerCase() === meEmail.toLowerCase();
                  const locked = m.owner || !editable || self || m.role === "SUPER_ADMIN" || busy === m.id;
                  return (
                    <tr key={m.id}>
                      <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>{m.name || m.email}</td>
                      {PERMS.map((p) => (
                        <td key={p.key}>
                          <Check2
                            on={m[p.key]}
                            disabled={locked || p.key === "canRead"}
                            label={`${p.label} for ${m.email}`}
                            onToggle={() => void update(m, { role: "CUSTOM", permissions: { ...PERMS.reduce((a, x) => ({ ...a, [x.key]: m[x.key] }), {} as Perms), [p.key]: !m[p.key] } })}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={s.keyl}>
            <span>R Read = view everything</span><span>W Write = edit</span><span>D Delete</span><span>B Billing</span><span>S System = health, audit, settings</span>
          </div>
        </section>

        <section className={cx(s.card, s.pad)}>
          <div className={s.ttl}><div><h3>Invite team member</h3><small>They sign in with this email at /admin/login</small></div></div>
          <form onSubmit={invite}>
            <div className={s.fl}>
              <label htmlFor="v2-inv-email">Email</label>
              <input id="v2-inv-email" type="email" required className={s.input} placeholder="name@company.com" value={form.email} maxLength={254}
                onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!editable} />
            </div>
            <div className={s.fl}>
              <label htmlFor="v2-inv-name">Name (optional)</label>
              <input id="v2-inv-name" className={s.input} placeholder="Full name" value={form.name} maxLength={100}
                onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!editable} />
            </div>
            <div className={s.fl}>
              <span className={s.flabel}>Role</span>
              <div className={s.rolep} role="group" aria-label="Role">
                {Object.keys(ROLE_LABEL).map((r) => (
                  <button key={r} type="button" aria-pressed={form.role === r} onClick={() => setForm({ ...form, role: r })} disabled={!editable}>{ROLE_LABEL[r]}</button>
                ))}
              </div>
            </div>
            <div className={s.fl}>
              <span className={s.flabel}>Access</span>
              <div className={s.permRow}>
                {PERMS.map((p) => (
                  <label key={p.key}>
                    <input
                      type="checkbox"
                      checked={formPerms[p.key]}
                      disabled={!editable || form.role !== "CUSTOM" || p.key === "canRead"}
                      onChange={(e) => setCustom({ ...custom, [p.key]: e.target.checked })}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" className={cx(s.btn, s.primary, s.full)} disabled={!editable || busy === "invite"}>
              <Send size={14} aria-hidden="true" /> {busy === "invite" ? "Sending…" : "Send invite"}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}

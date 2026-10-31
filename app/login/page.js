"use client";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Login() {
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  async function go(e) {
    e.preventDefault();
    try { await api("POST", "/api/auth", { password: pw }); window.location.href = "/"; } catch (e2) { setErr(e2.message); }
  }
  return (
    <form className="card" onSubmit={go} style={{ maxWidth: 360, margin: "12vh auto" }}>
      <h1>Sign in</h1><label>Password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      {err && <div className="msg err">{err}</div>}<div className="actions"><span /><button className="btn">Enter</button></div>
    </form>
  );
}

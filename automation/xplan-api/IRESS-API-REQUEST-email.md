# Email to Iress / XPLAN account executive — API access request

> Fill the [bracketed] bits and send. Copy to your licensee contact at Pareto Group.

---

**To:** [Iress / XPLAN account executive]
**Cc:** [Pareto Group licensee contact]
**Subject:** API Agreement + Custom Integration app key — Risk Researcher quoting

Hi [Account Exec name],

We'd like to set up a **Custom Integration** with our XPLAN site so we can quote and
compare insurance via Risk Researcher programmatically. Could you please help us put the
following in place:

**1. API Agreement**
- An API Agreement for our practice under **Pareto Group Pty Ltd, AFSL 418700**.

**2. Custom Integration app key**
- A **Custom Integration** app key (direct Xplan API layer access), created by the Iress team —
  not a Standard/BFF integration, as we need Risk Researcher access.
- Our XPLAN site: **[site URL / site ID]**

**3. OAuth 2.0 credentials & endpoints**
- `client_id` and `client_secret` for the key.
- The **authorization endpoint** and **token endpoint** URLs for our site.
- Please **register this redirect URI**: `http://localhost:8765/callback`
- Confirm support for **Authorization Code + PKCE** and **refresh tokens**.

**4. Capabilities / scopes to assign**
- **Risk Researcher** — quote **and** comparison.
- **Client / Entity read** — to pull client details to quote on.
- **IPS (policy / in-force cover) read** — to populate current cover.
- Please tell us the **exact scope names** to request for each.

**5. Key question on Risk Researcher**
- Does the Custom API let us **initiate a new Risk Researcher quote/comparison run**
  programmatically, or is it **read-only** (retrieve quotes/comparisons created in the UI)?
- If write/run is supported, please point us to the **endpoint spec / Swagger** for the
  Risk Researcher quote and comparison resources.

**6. Test environment**
- If available, access to a **non-production / training site** (or a dummy client) so we can
  validate the integration before touching live client data.

For context, this powers an internal tool that turns Risk Researcher quotes into our standard
client insurance report — read/quote access only, no changes to client records required (unless
running a quote necessarily creates a quote record, which is fine).

Thanks very much,

[Your name]
Authorised Representative — AR No. 001313019
Pareto Group Pty Ltd, AFSL 418700
[phone] · [email]

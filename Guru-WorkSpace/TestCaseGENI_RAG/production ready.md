# TestCaseGENI — Production Migration Guide (Laptop → Linux VM)

**Scope:** Internal QA environment (non-HTTPS). Move the full RAG setup (Qdrant + ingestion scripts + web app/agent) from the development Mac to a single production Linux VM, secured and run as services.
**Audience:** QA engineering / DevOps.
**Last updated:** 25 Sep 2026.

> **Read first — assumptions** (adjust if your environment differs)
> - Target OS: **Ubuntu Server 22.04 / 24.04 LTS** (x86_64), single VM, `sudo` access.
> - The web app is reached over **plain HTTP on port 80** (nginx), **inside the corporate network / VPN only**. No TLS certificate is used. Qdrant and the app listen on **127.0.0.1 only**.
> - Outbound calls to OpenAI, Jira and Figma still use HTTPS. Those services require it, and it isn't configurable.
> - LLM: **OpenAI** (current default, `LLM_PROVIDER=openai`). Ollama is covered as an option.
> - Qdrant version on the Mac is **v1.13.6** (per README). Confirm with `curl -s http://localhost:6333` → `"version"`.
> - Items marked **⚠ Decision / approval** need an owner's sign-off (IT security, data owner, legal) before go-live.

---

## Contents

1. [Target architecture](#1-target-architecture)
2. [Decisions & approvals before you start](#2-decisions--approvals-before-you-start)
3. [VM sizing](#3-vm-sizing)
4. [Prepare on the current Mac](#4-prepare-on-the-current-mac)
5. [Provision & harden the VM](#5-provision--harden-the-vm)
6. [Install Qdrant](#6-install-qdrant)
7. [Deploy the application](#7-deploy-the-application)
8. [Migrate the data](#8-migrate-the-data)
9. [Run the web app as a service](#9-run-the-web-app-as-a-service)
10. [nginx reverse proxy (HTTP) & access control](#10-nginx-reverse-proxy-http--access-control)
11. [Smoke tests & acceptance](#11-smoke-tests--acceptance)
12. [Operations: backups, updates, monitoring](#12-operations-backups-updates-monitoring)
13. [Rollback plan](#13-rollback-plan)
14. [Known limitations & production gaps](#14-known-limitations--production-gaps)
15. [Go-live checklist](#15-go-live-checklist)
16. [Appendix: env reference, file list, troubleshooting](#16-appendix)

---

## 1. Target architecture

```
                 Users (browser, corporate network / VPN)
                                  │ HTTP :80 (internal network only)
                                  ▼
 ┌──────────────────────────── Production VM ─────────────────────────────┐
 │  nginx  (IP allowlist, auth, 20 MB upload limit, 15 min timeout)       │
 │    │ http://127.0.0.1:8080                                             │
 │    ▼                                                                   │
 │  testcasegeni.service  (uvicorn, 2 workers, user: testcasegeni)        │
 │    webapp/server.py → testcase_agent.py → rag_core.py                  │
 │    ├── sentence-transformers all-MiniLM-L6-v2 (local, CPU)             │
 │    ├── Qdrant  http://127.0.0.1:6333  (api-key)                         │
 │    └── outbound HTTPS → OpenAI / Jira / Figma (only what you enable)    │
 │                                                                        │
 │  qdrant.service  (binary v1.13.x, user: qdrant, /var/lib/qdrant)       │
 │  cron: nightly Qdrant snapshot + config backup → backup storage        │
 └────────────────────────────────────────────────────────────────────────┘
```

**Directory layout on the VM**

| Path | Purpose | Owner |
|------|---------|-------|
| `/opt/testcasegeni/` | Application code (this project) + `venv/` | `testcasegeni` |
| `/opt/testcasegeni/.env` | Secrets & settings (chmod 600) | `testcasegeni` |
| `/opt/testcasegeni/test_cases_inbox/`, `test_cases_processed/` | Excel exports (ingestion input / archive) | `testcasegeni` |
| `/opt/testcasegeni/generated_test_cases/` | Audit copy of every generation run | `testcasegeni` |
| `/opt/testcasegeni/.cache/huggingface/` | Embedding model cache | `testcasegeni` |
| `/opt/qdrant/qdrant` | Qdrant binary | `root` |
| `/var/lib/qdrant/storage`, `/var/lib/qdrant/snapshots` | Qdrant data & snapshots | `qdrant` |
| `/etc/qdrant/qdrant.env` | Qdrant API key (chmod 600) | `root` |
| `/var/backups/testcasegeni/` | Local backup staging | `root` |

---

## 2. Decisions & approvals before you start

| # | Item | Why it matters | Owner |
|---|------|----------------|-------|
| 1 | **⚠ LLM provider & data approval** | With `LLM_PROVIDER=openai`, Jira story text, design documents, Figma text/screenshots and retrieved test cases are sent to OpenAI. Confirm this is approved for this data class, or use Ollama (local) instead. | Data owner / InfoSec / Legal |
| 2 | **⚠ Data residency** | If the VM, OpenAI processing or backups are in a different region than the source data, confirm this is allowed. | InfoSec / Legal |
| 3 | **⚠ User authentication** | The app has **no built-in login**. Choose: corporate SSO in front of nginx (recommended), or nginx Basic Auth + VPN-only access as an interim measure. | IT / InfoSec |
| 4 | DNS name (optional) | e.g. `testcasegeni.<internal-domain>`, or use the VM's internal IP. No certificate is needed. | IT |
| 4a | **Plain HTTP (internal QA setup)** | Acceptable for an internal QA tool on the corporate network. Keep in mind that without TLS, everything between browser and VM travels **unencrypted**: uploaded design docs, generated test cases, chat content and, if Basic Auth is used, the **password** (only base64-encoded). Make sure the VM is **not reachable from the internet** and check that this matches your internal policy. | You / InfoSec (confirm) |
| 5 | Outbound firewall rules | The VM needs HTTPS egress to `api.openai.com` (if used), your Jira host, `api.figma.com` (if used). Model download needs Hugging Face once (or copy the cache — §7.4). | Network team |
| 6 | Backup target | Where nightly snapshots go (NFS share, object storage, backup agent). | IT |
| 7 | Data migration method | **A: re-ingest from Excel** (recommended) or **B: Qdrant snapshot** (§8). | You |

---

## 3. VM sizing

Starting point for ~2–10k test cases and a small team (≤ 20 concurrent users) with **OpenAI** as the LLM:

| Resource | Recommended | Notes |
|----------|-------------|-------|
| vCPU | 4 | Embedding runs on CPU; generation runs 3 LLM calls in parallel per request (`LLM_PARALLEL`). |
| RAM | 8–16 GB | Each uvicorn worker loads PyTorch + MiniLM (roughly 0.5–1 GB each). Qdrant with 2,250 × 384-dim vectors needs very little. |
| Disk | 40 GB SSD | OS + venv (PyTorch is large) + snapshots + Excel archive. |
| GPU | Not needed | — unless you run **Ollama** locally. |

> **Using Ollama on the same VM?** Sizing is driven by the model (e.g. a Qwen 128K-context model). That typically needs a GPU with enough VRAM, or a separate GPU VM. Size it with your infra team. The numbers above do **not** cover it.

These are estimates. Measure on the VM (§11) and adjust.

---

## 4. Prepare on the current Mac

### 4.1 ⚠ Secrets hygiene (do this first)

The project `.env` currently sits in a **Google Drive–synced folder** and contains real credentials (`JIRA_TOKEN`, `OPENAI_API_KEY`, `ZEPHYR_TOKEN`, …).

1. **Do not copy this `.env` to the VM.** Create a fresh one on the VM (§7.5).
2. For production, **issue new credentials** (ideally a service account for Jira, a separate OpenAI project key with a spend limit). Then **rotate/revoke the ones stored in the synced folder**.
3. Never commit `.env` to git. Add it to `.gitignore` (§4.4).

### 4.2 Bring the local data up to date (only if you plan to use snapshots)

The loader was changed on 25 Sep 2026: deterministic IDs, glossary tags, Zephyr multi-step merge, NaN fix. If you choose **snapshot migration (Option B)**, first re-ingest locally so the snapshot contains the corrected data:

```bash
cd "<local TestCaseGENI_RAG folder>" && source venv/bin/activate
curl -X POST "http://localhost:6333/collections/jira_test_cases_all/snapshots"    # safety backup
python3 ingest_from_excel.py test_cases_processed/ --clear --no-move
python3 check_qdrant_data.py products          # expect INTERACT : 2250 (current data)
```

With **Option A** (re-ingest on the VM) you can skip this.

### 4.3 Record versions (for reproducibility)

```bash
source venv/bin/activate
python3 --version                  # currently 3.14.6 on the Mac
pip freeze > /tmp/pip-freeze-mac.txt
curl -s http://localhost:6333 | python3 -m json.tool   # Qdrant version
```

Keep these with the change record.

### 4.4 Package the code

**Recommended: a private git repository** (company Git server) with this `.gitignore`:

```gitignore
.env
venv/
__pycache__/
.DS_Store
*.bak_*
~$*
generated_test_cases/
test_cases_HMA-*.json
test_cases_HMA-*.xlsx
```

Excel exports (`test_cases_processed/`) are **confidential test assets**. Either keep them in the repo only if it is access-controlled, or transfer them separately (§8).

**Alternative: rsync over SSH** straight from the Mac:

```bash
rsync -avz --progress \
  --exclude '.env' --exclude 'venv/' --exclude '__pycache__/' --exclude '.DS_Store' \
  --exclude '*.bak_*' --exclude '~$*' --exclude 'generated_test_cases/' \
  "<local TestCaseGENI_RAG folder>/" <admin>@<VM_HOST>:/tmp/testcasegeni/
```

**Files that must reach the VM**

| Needed | Files |
|--------|-------|
| Web app | `webapp/` (server.py, testcase_agent.py, rag_core.py, static/index.html, requirements.txt) |
| Shared modules | `glossary.py`, `glossary.json`, `products.py`, `config.json` |
| Ingestion / admin | `ingest_from_excel.py`, `tag_existing_points.py`, `check_qdrant_data.py` |
| Data (Option A) | `test_cases_processed/**.xlsx` (and anything still in `test_cases_inbox/`) |
| Docs | `README.md`, `webapp/README_WEBAPP.md`, this file |

**Do not deploy** these legacy/dev scripts. They don't use the Qdrant API key, and some open unauthenticated ports on `0.0.0.0`: `search_wrapper.py` (port 8001), `embedding_service.py`, `delete.py`, `inspect_qdrant.py`, `diagnostics-Rag.py`, `repare.py`, `sertup_multi_project.py`, `agent.py`, `agent_V01.py`, `test_jira.py`. If you need `agent.py` (CLI) in production, add `api_key=os.getenv("QDRANT_API_KEY") or None` to its `QdrantClient(...)` call first.

---

## 5. Provision & harden the VM

```bash
# As an admin user on the VM
sudo apt update && sudo apt -y upgrade
sudo apt -y install python3 python3-venv python3-pip git curl nginx ufw unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades        # automatic security patches

# Service accounts (no login shell)
sudo useradd --system --create-home --home-dir /opt/testcasegeni --shell /usr/sbin/nologin testcasegeni
sudo useradd --system --no-create-home --shell /usr/sbin/nologin qdrant

# Firewall: only SSH + HTTP (80) from the corporate network. 6333/6334/8080 stay local-only.
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
CORPORATE_CIDR=10.0.0.0/8        # <- replace with your corporate / VPN range
sudo ufw allow from "$CORPORATE_CIDR" to any port 80 proto tcp   # NOT 'anywhere'
sudo ufw enable
sudo ufw status verbose
```

Also: SSH key-only login (`PasswordAuthentication no`), a time sync service (`timedatectl`), and your company's standard endpoint/monitoring agents.

**Python version:** Ubuntu 24.04 ships Python 3.12, Ubuntu 22.04 ships 3.10. The code uses modern type hints (`str | None`), which need **Python ≥ 3.10**. Use the distro Python. You don't need to match the Mac's 3.14.

---

## 6. Install Qdrant

Use the **same minor version** as the Mac (v1.13.x) if you will restore a snapshot. Qdrant restores snapshots only into the **same or the next minor version**. With Option A you may pick a newer version.

### 6.1 Binary install (matches the current setup)

```bash
QDRANT_VERSION=v1.13.6
cd /tmp
# Check the exact asset name on https://github.com/qdrant/qdrant/releases/tag/${QDRANT_VERSION}
curl -LO "https://github.com/qdrant/qdrant/releases/download/${QDRANT_VERSION}/qdrant-x86_64-unknown-linux-gnu.tar.gz"
sudo mkdir -p /opt/qdrant && sudo tar -xzf qdrant-x86_64-unknown-linux-gnu.tar.gz -C /opt/qdrant
sudo mkdir -p /var/lib/qdrant/storage /var/lib/qdrant/snapshots /etc/qdrant
sudo chown -R qdrant:qdrant /var/lib/qdrant
/opt/qdrant/qdrant --version
```

### 6.2 API key + local-only binding

```bash
# Generate a strong key and store it root-only
QKEY=$(openssl rand -hex 32)
sudo tee /etc/qdrant/qdrant.env >/dev/null <<EOF
QDRANT__SERVICE__HOST=127.0.0.1
QDRANT__SERVICE__API_KEY=${QKEY}
QDRANT__STORAGE__STORAGE_PATH=/var/lib/qdrant/storage
QDRANT__STORAGE__SNAPSHOTS_PATH=/var/lib/qdrant/snapshots
QDRANT__TELEMETRY_DISABLED=true
EOF
sudo chmod 600 /etc/qdrant/qdrant.env
echo "Save this key for the app .env (QDRANT_API_KEY): ${QKEY}"
```

### 6.3 systemd unit

`/etc/systemd/system/qdrant.service`:

```ini
[Unit]
Description=Qdrant vector database
After=network.target

[Service]
User=qdrant
Group=qdrant
EnvironmentFile=/etc/qdrant/qdrant.env
WorkingDirectory=/var/lib/qdrant
ExecStart=/opt/qdrant/qdrant
Restart=on-failure
RestartSec=5
LimitNOFILE=65535
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=/var/lib/qdrant

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now qdrant
sudo systemctl status qdrant --no-pager
curl -s -H "api-key: <QDRANT_API_KEY>" http://127.0.0.1:6333/collections     # → {"result":{"collections":[]},...}
curl -s http://127.0.0.1:6333/collections                                    # without key → 401/403 expected
```

> **Alternative: Docker** (`qdrant/qdrant:v1.13.6`, volume on `/qdrant/storage`, publish as `-p 127.0.0.1:6333:6333`). Pass the same `QDRANT__*` variables with `--env-file`. Do not publish the ports on `0.0.0.0`.

---

## 7. Deploy the application

### 7.1 Place the code

```bash
# from git
sudo -u testcasegeni git clone <PRIVATE_REPO_URL> /opt/testcasegeni/app-tmp
sudo -u testcasegeni bash -c 'shopt -s dotglob; mv /opt/testcasegeni/app-tmp/* /opt/testcasegeni/ && rmdir /opt/testcasegeni/app-tmp'
# or from the rsync staging folder
# sudo rsync -a /tmp/testcasegeni/ /opt/testcasegeni/ && sudo chown -R testcasegeni:testcasegeni /opt/testcasegeni
```

### 7.2 Virtual environment & dependencies

On Linux, the default PyTorch wheel pulls in large CUDA libraries. Install the **CPU build first**, then the rest:

```bash
cd /opt/testcasegeni
sudo -u testcasegeni python3 -m venv venv
sudo -u testcasegeni venv/bin/pip install --upgrade pip
sudo -u testcasegeni venv/bin/pip install torch --index-url https://download.pytorch.org/whl/cpu
sudo -u testcasegeni venv/bin/pip install -r webapp/requirements.txt pandas tqdm
```

`webapp/requirements.txt` does not include `pandas`/`tqdm`, which the ingestion scripts need. The line above adds them.

### 7.3 Pin what you tested

```bash
sudo -u testcasegeni venv/bin/pip freeze > /opt/testcasegeni/requirements.lock.txt
```

Commit `requirements.lock.txt`. Future installs use `pip install -r requirements.lock.txt` (after installing CPU torch as above) so every environment is identical.

### 7.4 Embedding model (all-MiniLM-L6-v2)

The first run downloads the model from Hugging Face. Pre-load it into a fixed cache so the service doesn't need internet access afterwards:

```bash
sudo -u testcasegeni HF_HOME=/opt/testcasegeni/.cache/huggingface \
  venv/bin/python -c "from sentence_transformers import SentenceTransformer as S; print(S('all-MiniLM-L6-v2').encode('ok').shape)"
# → (384,)
```

No internet from the VM? On the Mac, copy `~/.cache/huggingface/hub/models--sentence-transformers--all-MiniLM-L6-v2` to `/opt/testcasegeni/.cache/huggingface/hub/` on the VM. Then set `HF_HUB_OFFLINE=1` in the service (§9).

### 7.5 Create the production `.env`

`/opt/testcasegeni/.env` (use **new** credentials, §4.1):

```ini
# --- Qdrant ---
QDRANT_URL=http://127.0.0.1:6333
QDRANT_API_KEY=<QDRANT_API_KEY>
QDRANT_COLLECTION=jira_test_cases_all

# --- LLM ---
LLM_PROVIDER=openai                 # or: ollama
OPENAI_API_KEY=<OPENAI_API_KEY>
OPENAI_MODEL=gpt-4o
# OLLAMA_URL=http://127.0.0.1:11434
# OLLAMA_MODEL=qwen-128k:latest
# OLLAMA_VISION=false

# --- Integrations (optional) ---
JIRA_BASE_URL=https://<your-jira-host>
JIRA_EMAIL=<SERVICE_ACCOUNT_EMAIL>
JIRA_TOKEN=<JIRA_API_TOKEN>
FIGMA_TOKEN=<FIGMA_READONLY_TOKEN>

# --- App ---
APP_HOST=127.0.0.1
APP_PORT=8080
MAX_UPLOAD_MB=15
LLM_TIMEOUT=180
LLM_MAX_RETRIES=3
LLM_PARALLEL=3
```

```bash
sudo chown testcasegeni:testcasegeni /opt/testcasegeni/.env
sudo chmod 600 /opt/testcasegeni/.env
```

### 7.6 Folders and ownership

```bash
cd /opt/testcasegeni
sudo -u testcasegeni venv/bin/python products.py --create-folders     # from config.json
sudo -u testcasegeni mkdir -p generated_test_cases
sudo -u testcasegeni venv/bin/python glossary.py --check               # → ✓ glossary OK
sudo chown -R testcasegeni:testcasegeni /opt/testcasegeni
```

---

## 8. Migrate the data

Choose **one** option.

### Option A — Re-ingest from Excel on the VM (recommended)

Cleanest result: uses the latest loader (deterministic IDs, glossary tags, multi-step merge). You only need the Excel files.

```bash
# 1. Copy the Excel exports (from the Mac)
rsync -avz --exclude '~$*' "<local TestCaseGENI_RAG folder>/test_cases_processed/" \
  <admin>@<VM_HOST>:/tmp/tc_processed/
sudo rsync -a /tmp/tc_processed/ /opt/testcasegeni/test_cases_processed/
sudo chown -R testcasegeni:testcasegeni /opt/testcasegeni/test_cases_processed

# 2. Ingest (run from the project root - the scripts use relative paths and ./.env)
cd /opt/testcasegeni
sudo -u testcasegeni HF_HOME=/opt/testcasegeni/.cache/huggingface \
  venv/bin/python ingest_from_excel.py test_cases_processed/ --clear --no-move

# 3. Verify
sudo -u testcasegeni venv/bin/python check_qdrant_data.py products     # INTERACT : 2250 (current data)
sudo -u testcasegeni venv/bin/python tag_existing_points.py             # dry run → "to update: 0"
```

### Option B — Qdrant snapshot transfer

Moves the exact vectors. Requires §4.2 first, and a Qdrant on the VM at the same or next minor version.

```bash
# On the Mac
curl -s -X POST "http://localhost:6333/collections/jira_test_cases_all/snapshots"
#   → note "name": "jira_test_cases_all-<id>-<date>.snapshot"
curl -o jira_test_cases_all.snapshot \
  "http://localhost:6333/collections/jira_test_cases_all/snapshots/<SNAPSHOT_NAME>"
scp jira_test_cases_all.snapshot <admin>@<VM_HOST>:/tmp/

# On the VM - upload & restore (creates the collection if missing)
curl -X POST "http://127.0.0.1:6333/collections/jira_test_cases_all/snapshots/upload?priority=snapshot" \
  -H "api-key: <QDRANT_API_KEY>" \
  -H "Content-Type:multipart/form-data" \
  -F "snapshot=@/tmp/jira_test_cases_all.snapshot"

cd /opt/testcasegeni && sudo -u testcasegeni venv/bin/python check_qdrant_data.py products
```

Still copy the Excel files (Option A step 1) so future re-ingests are possible on the VM.

### Acceptance criteria for the data

- [ ] Point count on the VM = point count on the Mac (currently **2,250**).
- [ ] `check_qdrant_data.py products` shows the expected products.
- [ ] `tag_existing_points.py` dry run reports **0** points to update (RTP 2,150 · A/B Testing 196 for the current data).
- [ ] A known query returns the same top results on the Mac and the VM (§11).

---

## 9. Run the web app as a service

`/etc/systemd/system/testcasegeni.service`:

```ini
[Unit]
Description=TestCaseGENI web app (FastAPI/uvicorn)
After=network.target qdrant.service
Wants=qdrant.service

[Service]
User=testcasegeni
Group=testcasegeni
WorkingDirectory=/opt/testcasegeni
Environment=HF_HOME=/opt/testcasegeni/.cache/huggingface
Environment=HF_HUB_OFFLINE=1
Environment=PYTHONUNBUFFERED=1
ExecStart=/opt/testcasegeni/venv/bin/uvicorn server:app \
  --app-dir /opt/testcasegeni/webapp \
  --host 127.0.0.1 --port 8080 \
  --workers 2 --proxy-headers --forwarded-allow-ips 127.0.0.1
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/testcasegeni

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now testcasegeni
sudo systemctl status testcasegeni --no-pager
curl -s http://127.0.0.1:8080/api/health | python3 -m json.tool
```

Notes:
- The app reads `/opt/testcasegeni/.env` itself (via `python-dotenv`). No `EnvironmentFile` is needed.
- **Workers:** each worker loads its own copy of the embedding model. Start with 2 and increase only if CPU and RAM allow (§3).
- **Long requests:** a full-coverage generation can run for several minutes. `/api/generate` runs in a worker thread (fixed 25 Sep 2026), so chat and health checks keep answering during a generation.
- **Config changes** (`glossary.json`, `config.json`) are cached per process. Apply them with `sudo systemctl restart testcasegeni`.

---

## 10. nginx reverse proxy (HTTP) & access control

The site is served over **plain HTTP on port 80**, with no certificate. Because the traffic isn't encrypted, the **network allowlist is the main access control**: only corporate / VPN address ranges may connect. Keep §2 item 4a signed off.

`/etc/nginx/sites-available/testcasegeni`:

```nginx
server {
    listen 80;
    server_name testcasegeni.<internal-domain> <VM_INTERNAL_IP>;

    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy same-origin always;

    client_max_body_size 20m;          # app limit is MAX_UPLOAD_MB=15
    proxy_read_timeout 900s;           # full-coverage generation can take minutes
    proxy_send_timeout 900s;

    # ---- 1) Network allowlist (REQUIRED with plain HTTP) ----
    allow 10.0.0.0/8;                  # <- replace with your corporate / VPN ranges
    deny  all;

    # ---- 2) User login (optional, pick one) ----
    # (a) Basic Auth: simple, but over HTTP the password travels unencrypted.
    #     Use unique passwords that are not anyone's corporate/SSO password.
    # auth_basic           "TestCaseGENI";
    # auth_basic_user_file /etc/nginx/.htpasswd_testcasegeni;
    # (b) Corporate SSO via an auth proxy (e.g. oauth2-proxy + your IdP). Most IdPs require
    #     HTTPS redirect URLs, so check with IT whether SSO is possible without TLS.

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Only if you enable Basic Auth (option 2a):
sudo apt -y install apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd_testcasegeni YOUR_USERNAME

sudo ln -s /etc/nginx/sites-available/testcasegeni /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Notes:
- With the allowlist only, anyone on the allowed network can use the tool and the app can't tell users apart. There is no per-user audit trail (§14).
- To add HTTPS later, add a `listen 443 ssl` server block with a corporate certificate and redirect port 80 to it. Nothing in the app needs to change.

---

## 11. Smoke tests & acceptance

Run from a client machine (replace host and credentials):

```bash
H=http://testcasegeni.YOUR_DOMAIN      # or http://VM_INTERNAL_IP
AUTH=""                                  # if Basic Auth is enabled: AUTH="-u YOUR_USERNAME"
curl -s $AUTH $H/api/health | python3 -m json.tool      # qdrant:true, llm:true, points:2250
curl -s $AUTH $H/api/products                            # product counts
curl -s $AUTH $H/api/features                            # A/B Testing, RTP counts
curl -s $AUTH -X POST $H/api/search -H 'Content-Type: application/json' \
     -d '{"query":"RTP mobile channel","top_k":5}' | python3 -m json.tool | grep '"key"'
```

Direct access must be blocked (run from a client machine):

```bash
curl -m 5 http://<VM_IP>:6333/collections      # must time out / be refused
curl -m 5 http://<VM_IP>:8080/api/health       # must time out / be refused
```

**UI acceptance (browser):**

| # | Test | Expected |
|---|------|----------|
| 1 | Open `http://<host>/` from an allowed network | UI loads (login prompt first if Basic Auth is on); header badges show Qdrant / LLM / Jira green |
| 1a | Open the site from a network **outside** the allowlist | `403 Forbidden` |
| 2 | Sidebar | Product and Feature counts match §8 acceptance |
| 3 | Chat: "Which test cases cover A/B testing branch selection?" | Answer cites `[HMI-T…]` keys; references expandable |
| 4 | Generate with a real story ID | Requirements tab populated, test cases generated, Excel export downloads |
| 5 | Generate with a PDF design doc (≤ 15 MB) | Works; a 25 MB file is rejected with a clear message |
| 6 | Two users in parallel (one generating, one chatting) | Chat keeps responding during the generation |
| 7 | `sudo systemctl restart testcasegeni` | Service is back within ~30 s; UI works |
| 8 | Reboot the VM | Qdrant, app and nginx start automatically; data intact |

Record the timings (chat response, generation of ~15 cases) as your production baseline.

---

## 12. Operations: backups, updates, monitoring

### 12.1 Nightly backup

`/usr/local/sbin/testcasegeni-backup.sh`:

```bash
#!/usr/bin/env bash
# Nightly: Qdrant collection snapshot + app config + Excel sources. Keeps 14 days locally.
set -euo pipefail
source /etc/qdrant/qdrant.env                       # provides QDRANT__SERVICE__API_KEY
KEY="$QDRANT__SERVICE__API_KEY"; Q=http://127.0.0.1:6333; C=jira_test_cases_all
DEST=/var/backups/testcasegeni/$(date +%F); mkdir -p "$DEST"

NAME=$(curl -sf -X POST -H "api-key: $KEY" "$Q/collections/$C/snapshots" \
       | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["name"])')
curl -sf -H "api-key: $KEY" "$Q/collections/$C/snapshots/$NAME" -o "$DEST/$NAME"
curl -sf -X DELETE -H "api-key: $KEY" "$Q/collections/$C/snapshots/$NAME" >/dev/null   # free server disk

tar -czf "$DEST/app-config.tgz" -C /opt/testcasegeni config.json glossary.json requirements.lock.txt
tar -czf "$DEST/excel-sources.tgz" -C /opt/testcasegeni test_cases_processed
tar -czf "$DEST/generated.tgz"    -C /opt/testcasegeni generated_test_cases

find /var/backups/testcasegeni -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "backup ok: $DEST"
```

```bash
sudo chmod 700 /usr/local/sbin/testcasegeni-backup.sh
sudo mkdir -p /var/backups/testcasegeni && sudo chmod 700 /var/backups/testcasegeni
echo '30 1 * * * root /usr/local/sbin/testcasegeni-backup.sh >> /var/log/testcasegeni-backup.log 2>&1' \
  | sudo tee /etc/cron.d/testcasegeni-backup
sudo /usr/local/sbin/testcasegeni-backup.sh          # run once now
```

- Ship `/var/backups/testcasegeni` to your backup target (§2 item 6). A backup that stays on the same VM doesn't protect you if the VM is lost.
- `.env` is **not** in the backup on purpose. Keep secrets in your vault / password manager.
- **Test a restore** at least once before go-live (Option B commands in §8) on a scratch VM or a test collection name.

### 12.2 Adding / updating test cases

```bash
# drop new Zephyr exports into test_cases_inbox/<PRODUCT>/current/ (via SFTP/rsync), then:
cd /opt/testcasegeni
sudo -u testcasegeni HF_HOME=/opt/testcasegeni/.cache/huggingface HF_HUB_OFFLINE=1 \
  venv/bin/python ingest_from_excel.py test_cases_inbox/          # NO --clear: adds/updates
sudo -u testcasegeni venv/bin/python check_qdrant_data.py products
```

- Re-ingesting the same export **updates** its cases (deterministic IDs). It never duplicates them.
- **Never use `--clear` in production** unless you intend a full rebuild. Take a snapshot first.

### 12.3 Glossary / products changes

Edit `glossary.json` or `config.json` → `glossary.py --check` / `products.py --create-folders` → `tag_existing_points.py --apply` (glossary) → `sudo systemctl restart testcasegeni`. For aliases to affect the vectors themselves, re-ingest the affected files.

### 12.4 Code updates

```bash
cd /opt/testcasegeni && sudo -u testcasegeni git pull
sudo -u testcasegeni venv/bin/pip install -r requirements.lock.txt
sudo systemctl restart testcasegeni && curl -s http://127.0.0.1:8080/api/health
```

Test changes on a staging copy first when possible.

### 12.5 Qdrant upgrades

Take a snapshot → upgrade **one minor version at a time** → restart → verify counts. Read the Qdrant release notes for each version.

### 12.6 Logs & monitoring

| What | Command / approach |
|------|--------------------|
| App logs | `journalctl -u testcasegeni -f` |
| Qdrant logs | `journalctl -u qdrant -f` |
| nginx | `/var/log/nginx/access.log`, `error.log` |
| Health probe | Monitor `GET /api/health` every 1–5 min. Alert if `qdrant` or `llm` is `false` or the request fails. |
| Disk | Alert at 80 % on `/` and `/var/lib/qdrant` |
| Cost | Set a monthly spend limit and alerts on the OpenAI project/key |

---

## 13. Rollback plan

1. Keep the Mac environment **untouched** until production sign-off (it remains a working fallback).
2. If the VM deployment fails: stop sending users to the new URL (DNS/link) and use the Mac setup meanwhile.
3. Data rollback on the VM: restore the last snapshot (§8 Option B upload with `priority=snapshot`) or re-ingest from `test_cases_processed/`.
4. Code rollback: `git checkout <previous tag>` → `pip install -r requirements.lock.txt` → restart the service.

---

## 14. Known limitations & production gaps

Be explicit about these with stakeholders. They are **not** solved by this migration:

| Gap | Impact | Recommended next step |
|-----|--------|-----------------------|
| No built-in authentication / roles | Anyone who passes nginx can use everything; no per-user audit | Corporate SSO in front of nginx; later pass the user identity into the app and log it with each generation |
| Generation audit files contain confidential content | `generated_test_cases/*.json` hold story/design excerpts | Restrict VM access; add a retention policy (e.g. 90 days) |
| Single VM, no high availability | Downtime during patching or failure | Acceptable for an internal tool; or run Qdrant as a managed/clustered service later |
| Retrieval recall for "list all X" questions | Top-K=5 can miss items (e.g. RTP mobile channel) | Planned: dual query, MMR diversity, keyword/full-text index; interim: raise Top-K |
| No rate limiting / cost guard in the app | One user can trigger many expensive generations | nginx `limit_req` on `/api/generate`; OpenAI spend limits |
| No automated test suite / CI | Regressions caught manually | Add pytest smoke tests for ingest, retrieval and API; run them before each deploy |
| Plain HTTP (no TLS) | Traffic on the internal network is readable by anyone who can capture it | Fine for internal QA; add HTTPS (§10 note) if the tool is ever exposed more widely or handles more sensitive data |
| Legacy scripts not production-safe | Some bind `0.0.0.0` without auth, none use the Qdrant API key | Don't deploy them (§4.4) |
| LLM output quality | Generated cases still need QA review; `<TBD>` items need PO input | Keep the human review step; track the acceptance rate |

---

## 15. Go-live checklist

**Approvals**
- [ ] LLM data processing approved (OpenAI) or Ollama chosen (§2.1)
- [ ] Data residency confirmed (§2.2)
- [ ] Access control method approved (§2.3)

**Security**
- [ ] New production credentials issued; credentials in the synced `.env` rotated (§4.1)
- [ ] `/opt/testcasegeni/.env` and `/etc/qdrant/qdrant.env` are `chmod 600`
- [ ] Qdrant requires an API key; 6333/6334/8080 not reachable from outside (§11)
- [ ] Plain HTTP confirmed OK for this internal QA setup (§2 item 4a)
- [ ] Port 80 reachable only from corporate / VPN ranges (ufw + nginx `allow`/`deny`); VM not internet-facing
- [ ] Legacy scripts not deployed / not running

**Data**
- [ ] Point count and product/feature counts match (§8)
- [ ] Known queries give the same results as on the Mac

**Operations**
- [ ] `qdrant`, `testcasegeni`, `nginx` enabled and survive a reboot
- [ ] Nightly backup runs, is copied off the VM, and a restore was tested
- [ ] Health monitoring and disk alerts configured
- [ ] OpenAI spend limit set
- [ ] Runbook owner and on-call contact documented

**Acceptance**
- [ ] UI tests 1–8 in §11 passed; baseline timings recorded
- [ ] Sign-off by QA lead / product owner

---

## 16. Appendix

### 16.1 Environment variables (app `.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `QDRANT_URL` | `http://localhost:6333` | Qdrant endpoint |
| `QDRANT_API_KEY` | – | Sent as `api-key` header (supported since 25 Sep 2026 in `rag_core.py`, `ingest_from_excel.py`, `tag_existing_points.py`, `check_qdrant_data.py`) |
| `QDRANT_COLLECTION` | `jira_test_cases_all` | Collection used by the web app |
| `EMBEDDING_MODEL` | `all-MiniLM-L6-v2` | Must match the model used at ingestion |
| `LLM_PROVIDER` | `openai` | `openai` or `ollama` |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | –, `gpt-4o` | OpenAI access / model |
| `OLLAMA_URL`, `OLLAMA_MODEL`, `OLLAMA_VISION` | `http://localhost:11434`, `qwen-128k:latest`, `false` | Local LLM option |
| `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_TOKEN` | – | Story ID input |
| `FIGMA_TOKEN` | – | Figma link input |
| `APP_HOST`, `APP_PORT` | `127.0.0.1`, `8080` | Only used by `python3 webapp/server.py`; the systemd unit passes host/port to uvicorn directly |
| `MAX_UPLOAD_MB` | `15` | Upload limit (keep below nginx `client_max_body_size`) |
| `LLM_TIMEOUT`, `LLM_MAX_RETRIES` | `180`, `3` | Per-call timeout / retries |
| `LLM_MAX_TOKENS`, `LLM_PARALLEL`, `REQS_PER_CALL`, `HARD_CAP_CASES` | `8000`, `3`, `4`, `200` | Generation tuning |
| `DOC_SECTION_CHARS`, `MAX_DOC_CHARS` | `10000`, `60000` | Design-doc handling |

Service-level: `HF_HOME`, `HF_HUB_OFFLINE` (model cache, §7.4 / §9).

### 16.2 Ports

| Port | Service | Exposure |
|------|---------|----------|
| 80 | nginx (HTTP) | Corporate network / VPN ranges only |
| 8080 | uvicorn (app) | 127.0.0.1 only |
| 6333 / 6334 | Qdrant REST / gRPC | 127.0.0.1 only |
| 11434 | Ollama (if used) | 127.0.0.1 only |

### 16.3 Troubleshooting

| Symptom | Likely cause | Check / fix |
|---------|--------------|-------------|
| `/api/health` → `qdrant: false`, 401/403 in logs | Missing or wrong `QDRANT_API_KEY` | Compare the app `.env` with `/etc/qdrant/qdrant.env`; restart the app |
| App fails at start: `OSError ... all-MiniLM-L6-v2` | Model not in cache while `HF_HUB_OFFLINE=1` | Redo §7.4 as user `testcasegeni` with the same `HF_HOME` |
| 502 Bad Gateway | App not running | `systemctl status testcasegeni`, `journalctl -u testcasegeni -n 100` |
| 504 during generation | nginx timeout shorter than the generation | `proxy_read_timeout 900s`; or lower `Max test cases` |
| 413 on upload | File above the nginx or app limit | `client_max_body_size` / `MAX_UPLOAD_MB` |
| Ingest: `Permission denied` | Ran as another user / wrong ownership | Run with `sudo -u testcasegeni` from `/opt/testcasegeni`; `chown -R` |
| Ingest finds no files / wrong product | Folder not in `config.json` or not UPPER_CASE | `python3 products.py` |
| Snapshot upload gives an empty collection | Default priority `replica` | Use `?priority=snapshot` |
| Snapshot restore fails with a version error | Qdrant minor version gap > 1 | Install the matching v1.13.x, or use Option A |
| Glossary / product edits not visible | Cached per process | `sudo systemctl restart testcasegeni` |

### 16.4 References

- Qdrant snapshots: https://qdrant.tech/documentation/snapshots/
- Qdrant security (API keys, bind address, TLS): https://qdrant.tech/documentation/security/
- Qdrant production checklist: https://qdrant.tech/documentation/production-checklist/
- Project docs: `README.md`, `webapp/README_WEBAPP.md`

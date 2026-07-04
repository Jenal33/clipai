# AGENTS.md — ClipAI Working Contract

> **Status:** GUIDANCE FILE — Kontrak kerja AI untuk project ClipAI.
> **Source:** Adapted from `frandika06/docs-ai` — `ai-rules/` adalah IMMUTABLE templates.

---

## Project Structure — ClipAI

```
/home/je3393/clipai/
├── AGENTS.md                  ← File ini — kontrak kerja AI
├── ai-rules/                  ← IMMUTABLE — template dari docs-ai (AI hanya baca)
├── .git/                      ← Git ada di ROOT project (bukan di sub-folder)
├── .env.local                 ← Credentials (R2, DB, OWNER_PASSWORD)
├── prisma/                    ← Prisma ORM schema + migrations
├── src/                       ← Next.js App Router (frontend + API routes)
│   ├── app/                   ← Pages, layouts, API routes
│   │   ├── api/               ← Backend API endpoints
│   │   │   ├── auth/          ← Auth (NextAuth)
│   │   │   ├── clips/         ← Clip CRUD + generate
│   │   │   └── ...
│   │   ├── clipper/           ← UI utama (page.tsx)
│   │   ├── dashboard/         ← User dashboard
│   │   └── ...
│   ├── components/            ← React components
│   └── lib/                   ← Utilities (prisma client, etc.)
├── public/                    ← Static assets + clip storage
└── python-backend/            ← Python FastAPI backend (port 8000)
    └── main.py                ← yt-dlp → ffmpeg → AssemblyAI → GPT → ffmpeg cut → R2
```

### Key Differences from Standard docs-ai Template:

| Aspek | docs-ai Default | ClipAI Aktual |
|-------|----------------|---------------|
| **Git location** | `apps/` atau `backend/`+`frontend/` | **Root project** (`.git/` di `/home/je3393/clipai/`) |
| **Stack** | Monolith (apps/) atau Fullstack (backend/+frontend/) | **Next.js + Python** hybrid |
| **Python backend** | Tidak ada | Ada di `python-backend/` |
| **Port** | - | Next.js:3000, Python:8000 |

---

## Aturan Kerja AI

### 1) Git & Branch

- **Git ada di ROOT** — `cd /home/je3393/clipai` lalu `git status`
- Branch: `main` (stabil), `dev` (pengembangan)
- AI **tidak commit langsung ke `main`**
- Commit: `feat:`, `fix:`, `refactor:`, `chore:`

### 2) DILARANG

- ❌ Ubah `.env.local` tanpa izin
- ❌ Refactor besar / sweeping changes tanpa persetujuan
- ❌ Ubah file di `ai-rules/` (IMMUTABLE)
- ❌ Hardcode credentials di kode

### 3) WAJIB

- ✅ File kecil, 1 perubahan → 1 commit
- ✅ Self-review sebelum commit (`git diff`)
- ✅ Ikuti security standard (`ai-rules/security/`)
- ✅ Ikuti coding standards (`ai-rules/coding-standards/`)
- ✅ Update `dev-docs/` setelah selesai task (dari template `ai-rules/dev-docs-ai-templates/`)
- ✅ Update `dev-docs/ai/CURRENT_STATE.md` dan `dev-docs/ai/TASKS.md`

### 4) ClipAI-Specific Rules

- **Python backend** ada di `python-backend/main.py` — jalankan dengan `cd python-backend && python3 -m uvicorn main:app --host 0.0.0.0 --port 8000`
- **AssemblyAI** API key di `main.py` (hardcode, jangan ubah)
- **Cloudflare R2** credentials di `.env.local`
- **Owner login**: 5 klik logo + URL `?akses=dewa`
- **Queue**: Sekarang langsung sync (tanpa BullMQ) — `generate/route.ts` POST ke Python, dapat r2Urls, update DB langsung
- **Progress webhook**: Python POST ke `/api/clips/progress` → update DB → frontend polling 3s
- **Dark mode**: Tailwind v4 `@custom-variant dark`, `next-themes` + `lucide-react`

### 5) Output Folders (Dibuat AI dari template `ai-rules/`)

| Folder | Template Source | Kapan |
|--------|----------------|-------|
| `dev-docs/` | `ai-rules/dev-docs-ai-templates/` | Setiap task |
| `planning/` | `ai-rules/planning-templates/` | New feature / revamp |
| `reports/` | `ai-rules/TASK_REPORT_TEMPLATE.md` | Setiap selesai task batch |

Semua folder output **di project root**, paralel dengan `ai-rules/` dan folder kode.

### 6) Preflight

```bash
cd /home/je3393/clipai
git status                          # Pastikan clean
git branch --show-current           # Pastikan bukan main
git pull --rebase                   # Sync
```

### 7) Merge Policy

```bash
cd /home/je3393/clipai
git checkout main
git pull --rebase
git merge --no-commit --no-ff dev
git restore --source=HEAD --staged --worktree ai-rules dev-docs planning reports
git commit -m "merge: dev -> main (exclude ai-rules + output)"
git push
```

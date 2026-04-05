# Wolf Creek Lodge

An open-source, agent-driven vacation rental platform for [Wolf Ridge Resort](https://wolfcreeklodge.us) in Winthrop, WA.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/wolfcreeklodge/wolf-creek-lodge.git
cd wolf-creek-lodge

# Set up environment
cp .env.example .env
# Edit .env with your values

# Launch
docker compose up -d --build
```

The website will be available at `http://localhost:8080`.

## Architecture

| Service | Port | Description |
|---------|------|-------------|
| **website** | 8080 → 3000 | Next.js — human-facing web application |
| **database** | 5432 | PostgreSQL — single source of truth |

See [wolf-creek-lodge-prd.md](./wolf-creek-lodge-prd.md) for the full product requirements.

## License

Open source — license TBD.

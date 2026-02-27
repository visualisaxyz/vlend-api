# vLend API

API server for the [vLend](https://github.com/visualisaxyz/vlend) lending protocol on **MegaETH mainnet** (Chain ID 4326).

## Overview

vLend API provides REST endpoints for protocol data: vaults, collaterals, stability pool, VLEND staking, TVL, yields, and prices.

## Requirements

- Node.js 16.x+
- MegaETH RPC URL
- Supabase (for protocol stats and whitelist)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your values:

```
MEGAETH_RPC_URL=https://mainnet.megaeth.com/rpc
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com)
2. In **SQL Editor**, run the schema from `supabase/schema.sql` to create the required tables
3. Copy your project URL and anon key from **Project Settings > API** into `.env`

### Protocol statistics (historical_statistics)

`/protocolStats` reads from the Supabase `historical_statistics` table. That table is populated by calling `/refreshStatistics`, which fetches data from the chain and writes it to Supabase.

**First-time setup:** Call the refresh endpoint once to populate the table:

```bash
curl https://api.vlend.visualisa.xyz/refreshStatistics
```

## Run

```bash
npm start
```

Server runs at `http://127.0.0.1:3000`.

## API Endpoints

| Endpoint                               | Description                             |
| -------------------------------------- | --------------------------------------- |
| `GET /`                                | List all routes                         |
| `GET /chain`                           | Chain configuration                     |
| `GET /abi/list`                        | List available ABIs                     |
| `GET /abi/:filename`                   | Get ABI by filename                     |
| `GET /collaterals`                     | Collateral tokens (WETH)                |
| `GET /vaults`                          | All vaults                              |
| `GET /vaults/:address`                 | Vault details                           |
| `GET /vaultsByUser/:address`           | Vaults by user                          |
| `GET /vaultsByCollateral/:address`     | Vaults by collateral                    |
| `GET /redeemableVaults`                | Redeemable vaults                       |
| `GET /liquidatableVaults`              | Liquidatable vaults                     |
| `GET /protocolStats`                   | Protocol statistics                     |
| `GET /refreshStatistics`               | Refresh stats from chain → Supabase     |
| `GET /vlend_staking/overview`          | VLEND staking overview                  |
| `GET /stability_pool/overview`         | Stability pool overview                 |
| `GET /stability_pool/rewards/:address` | User stability pool rewards             |
| `GET /yields/overview`                 | Yields (Stability Pool + VLEND Staking) |
| `GET /prices`                          | VLEND and vUSD prices                   |
| `GET /tvl`                             | Total value locked                      |

## Environment Variables

| Variable          | Required | Description                          |
| ----------------- | -------- | ------------------------------------ |
| `MEGAETH_RPC_URL` | Yes      | MegaETH mainnet RPC URL              |
| `SUPABASE_URL`    | Yes      | Supabase project URL                 |
| `SUPABASE_KEY`    | Yes      | Supabase anon/publishable key        |
| `PORT`            | No       | Server port (default: 3000)          |

## Docker

```bash
docker build -t vlend-api .
docker run -d -p 3000:3000 \
  -e MEGAETH_RPC_URL=https://mainnet.megaeth.com/rpc \
  -e SUPABASE_URL=your-supabase-url \
  -e SUPABASE_KEY=your-supabase-key \
  --name vlend-api vlend-api
```

## License

ISC

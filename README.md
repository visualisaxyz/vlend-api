# vLend API

API server for the [vLend](https://github.com/visualisaxyz/vlend) lending protocol on **MegaETH mainnet** (Chain ID 4326).

## Overview

vLend API provides REST endpoints for protocol data: vaults, collaterals, stability pool, VLEND staking, TVL, yields, and prices.

## Requirements

- Node.js 16.x+
- MegaETH RPC URL

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```
MEGAETH_RPC_URL=https://rpc.megaeth.org
PORT=3000
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
| `GET /vlend_staking/overview`          | VLEND staking overview                  |
| `GET /stability_pool/overview`         | Stability pool overview                 |
| `GET /stability_pool/rewards/:address` | User stability pool rewards             |
| `GET /yields/overview`                 | Yields (Stability Pool + VLEND Staking) |
| `GET /prices`                          | VLEND and vUSD prices                   |
| `GET /tvl`                             | Total value locked                      |

## Environment Variables

| Variable          | Required | Description                 |
| ----------------- | -------- | --------------------------- |
| `MEGAETH_RPC_URL` | Yes      | MegaETH mainnet RPC URL     |
| `PORT`            | No       | Server port (default: 3000) |

## Docker

```bash
docker build -t vlend-api .
docker run -d -p 3000:3000 -e MEGAETH_RPC_URL=https://rpc.megaeth.org --name vlend-api vlend-api
```

## License

ISC

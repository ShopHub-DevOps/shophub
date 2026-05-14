# ShopHub

ShopHub is a platform that lets users deploy and manage their own e-commerce shops on a Kubernetes cluster. A signed-in user creates a shop through an admin panel, and the platform provisions the required infrastructure (application replicas, database, notifications channel, payment wallet) via a custom Kubernetes operator.

## Role of this repository

This repository contains the ShopHub web application: the admin panel users interact with to manage their shops. A signed-in user can create a new shop, change its configuration (name, availability tier, wallet address, database type), and delete shops they own. Per-tenant Shop applications live in a separate repository.

## Tech stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js 20 |
| Backend language | TypeScript |
| Backend framework | NestJS |
| Frontend framework | Next.js (React) |
| Web3 (optional auth) | wagmi + viem + Metamask (Ethereum Sepolia testnet) |
| Database | PostgreSQL |
| Container registry | GitHub Container Registry (`ghcr.io/shophub-devops`) |
| Local Kubernetes | kind |

## Running locally

To be documented once the backend and frontend are initialized. See the issues in this repository for the M1 task list.

## Related repositories

| Repository | Purpose |
|---|---|
| [shop](https://github.com/ShopHub-DevOps/shop) | Per-tenant shop application deployed by the operator |
| [shop-operator](https://github.com/ShopHub-DevOps/shop-operator) | Kubernetes operator that provisions shops on behalf of ShopHub |
| [helm-charts](https://github.com/ShopHub-DevOps/helm-charts) | Helm charts for all services |
| [kube-state](https://github.com/ShopHub-DevOps/kube-state) | Declarative cluster state |

## License

MIT. See [LICENSE](./LICENSE).

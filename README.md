# Router Registry

A simple smart contract that maintains a registry of validated routers with their metadata. Serves as a trusted source for router validation for other TON contracts.

## Quick Start

### Installation

```bash
npm install
```

### Build Contracts

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Code Generation

```bash
npm run codegen
```

### Deploy Contract

```bash
npx blueprint run deployRegistry
```

## Documentation

- **[Architecture](.docs/architecture.md)** - Contract structure, methods, and message flows
- **[Scripts](.docs/scripts.md)** - Usage guide for all interaction scripts

## Key Features

- **Router Registry**: Curated list of approved routers with version and type metadata
- **Public Validation**: Anyone can validate router legitimacy
- **Admin Management**: Add/remove routers with batch operations support
- **Secure Ownership**: Two-step admin transfer process

## Usage

Interact with deployed contracts using blueprint scripts:

```bash
# Get registry state
npx blueprint run getRegistryData <registry_address>

# Validate a router
npx blueprint run validateRouter <registry_address> <router_address>

# Get all routers
npx blueprint run getAllRouters <registry_address>

# Admin: Add router
npx blueprint run addRouter <registry_address> <router_address> <version> <type>
```

See [Scripts Documentation](.docs/scripts.md) for complete usage guide.

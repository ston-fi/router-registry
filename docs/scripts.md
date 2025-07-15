# Registry Scripts

Collection of scripts for interacting with the Registry contract.

## Usage

All scripts are run via blueprint:

```bash
npx blueprint run <script_name> <arguments>
```

## Available Scripts

### 1. deployRegistry.ts

Deploys a new Registry contract

```bash
npx blueprint run deployRegistry
```

### 2. getRegistryData.ts

Reads the current state of the Registry contract

```bash
npx blueprint run getRegistryData <registry_address>
```

**Parameters:**

- `registry_address` - Registry contract address

**Example:**

```bash
npx blueprint run getRegistryData EQA1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### 3. validateRouter.ts

Validates a router in the registry

```bash
npx blueprint run validateRouter <registry_address> <router_address>
```

**Parameters:**

- `registry_address` - Registry contract address
- `router_address` - Router address to validate
- `response_address` - Address to receive the response

**Example:**

```bash
npx blueprint run validateRouter EQA123... EQB456...
```

### 4. getAllRouters.ts

Retrieves all routers from the registry

```bash
npx blueprint run getAllRouters <registry_address>
```

**Parameters:**

- `registry_address` - Registry contract address

**Example:**

```bash
npx blueprint run getAllRouters EQA123...
```

**Note:** The response (AllRoutersMessage) will be sent to your address containing the complete router dictionary.

### 5. addRouter.ts

Adds a new router to the registry (admin only)

```bash
npx blueprint run addRouter <registry_address> <router_address> <router_id> <router_type> <version_major> <version_minor> [version_development]
```

**Parameters:**

- `registry_address` - Registry contract address
- `router_address` - Router address to add
- `router_id` - Router ID (number)
- `router_type` - Router type (number)
- `version_major` - Major version number (0-255)
- `version_minor` - Minor version number (0-255)
- `version_development` - Development version text (optional, max 32 bytes UTF-8)

**Example:**

```bash
npx blueprint run addRouter EQA123... EQB456... 1 1 0 1 "stable"
npx blueprint run addRouter EQA123... EQB456... 2 2 1 2 "beta"
npx blueprint run addRouter EQA123... EQB456... 3 1 0 1
```

### 6. removeRouter.ts

Removes a router from the registry (admin only)

```bash
npx blueprint run removeRouter <registry_address> <router_address>
```

**Parameters:**

- `registry_address` - Registry contract address
- `router_address` - Router address to remove

**Example:**

```bash
npx blueprint run removeRouter EQA123... EQB456...
```

### 7. addRouterBatch.ts

Adds multiple routers in a single transaction (admin only)

```bash
npx blueprint run addRouterBatch <registry_address>
```

**Parameters:**

- `registry_address` - Registry contract address

**Note:** Modify the routers in the script code for your specific use case.

### 8. removeRouterBatch.ts

Removes multiple routers in a single transaction (admin only)

```bash
npx blueprint run removeRouterBatch <registry_address>
```

**Parameters:**

- `registry_address` - Registry contract address

**Note:** Modify the routers in the script code for your specific use case.

### 9. giveOwnership.ts

Transfers admin rights to another address (current admin only)

```bash
npx blueprint run giveOwnership <registry_address> <next_admin_address>
```

**Parameters:**

- `registry_address` - Registry contract address
- `next_admin_address` - New admin address

**Example:**

```bash
npx blueprint run giveOwnership EQA123... EQB456...
```

### 10. takeOwnership.ts

Accepts admin rights (nextAdmin only)

```bash
npx blueprint run takeOwnership <registry_address>
```

**Parameters:**

- `registry_address` - Registry contract address

**Example:**

```bash
npx blueprint run takeOwnership EQA123...
```

## Access Rights

- **Public methods:** `validateRouter`, `getAllRouters`, `getRegistryData`
- **Admin only:** `addRouter`, `removeRouter`, `addRouterBatch`, `removeRouterBatch`, `giveOwnership`
- **NextAdmin only:** `takeOwnership`

## Notes

- All scripts use 0.05 TON for gas
- queryId is automatically generated based on current timestamp
- For batch operations, modify the script code with your specific routers

import { Blockchain, SandboxContract, TreasuryContract, internal } from '@ton/sandbox';
import { Address, Cell, toNano, beginCell } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import {
    Registry,
    RouterDescription,
    RouterVersion,
    storeAllRoutersMessage,
    storeRouterValidatedMessage,
} from '../build/Registry';
import { cellToRouters, routersToCodegenDict, assertMsgBodyEqual, createVersionBuffer } from '../utils';
import { RegistryErrors } from '../wrappers/Registry';

const HOLE_ADDR = Address.parse('0:0000000000000000000000000000000000000000000000000000000000000000');
const QUERY_ID = 10n;

const DEFAULT_ROUTER_VERSION: RouterVersion = {
    kind: 'RouterVersion' as const,
    version_major: 0,
    version_minor: 0,
    version_development: createVersionBuffer(''),
};

const DEFAULT_ROUTER_DESCRIPTION: RouterDescription = {
    kind: 'RouterDescription' as const,
    router_id: 0n,
    router_type: 0,
    version: DEFAULT_ROUTER_VERSION,
};

describe('Registry', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Registry');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let admin: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let registry: SandboxContract<Registry>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        admin = await blockchain.treasury('admin');
        user = await blockchain.treasury('user');

        registry = blockchain.openContract(
            Registry.createFromConfig(
                {
                    kind: 'RegistryStorage',
                    admin: admin.address,
                    nextAdmin: HOLE_ADDR,
                    routers: { kind: 'Maybe_nothing' },
                },
                code,
            ),
        );

        const deployResult = await registry.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: registry.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        const data = await registry.getRegistryData();
        expect(data.admin).toEqualAddress(admin.address);
        expect(data.nextAdmin).toEqualAddress(HOLE_ADDR);
        expect(data.routers).toStrictEqual({ kind: 'Maybe_nothing' });
    });

    // ==== CUSTOM ASSERTIONS ====

    async function assertAddRouter(
        routerAddress: Address,
        description: RouterDescription = DEFAULT_ROUTER_DESCRIPTION,
        sender: SandboxContract<TreasuryContract> = admin,
        _registry: SandboxContract<Registry> = registry,
        exitCode: number = 0,
    ) {
        const result = await _registry.sendAddRouter(sender.getSender(), toNano('0.05'), {
            queryId: QUERY_ID,
            router: routerAddress,
            description,
        });

        if (exitCode === 0) {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                success: true,
            });

            const data = await registry.getRegistryData();
            expect(data.routers.kind).toBe('Maybe_just');
            if (data.routers.kind === 'Maybe_just') {
                expect(cellToRouters(data.routers.value).get(routerAddress.toString())).toStrictEqual(description);
            }
        } else {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                exitCode,
            });
        }

        return result;
    }

    async function assertRemoveRouter(
        routerAddress: Address,
        sender: SandboxContract<TreasuryContract> = admin,
        _registry: SandboxContract<Registry> = registry,
        exitCode: number = 0,
    ) {
        const result = await _registry.sendRemoveRouter(sender.getSender(), toNano('0.05'), {
            queryId: QUERY_ID,
            router: routerAddress,
        });

        if (exitCode === 0) {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                success: true,
            });

            const data = await registry.getRegistryData();
            if (data.routers.kind === 'Maybe_just') {
                expect(cellToRouters(data.routers.value).has(routerAddress.toString())).toBe(false);
            }
        } else {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                exitCode,
            });
        }

        return result;
    }

    async function assertValidateRouter(
        routerAddress: Address,
        responseAddress: Address,
        sender: SandboxContract<TreasuryContract> = user,
        _registry: SandboxContract<Registry> = registry,
        exitCode: number = 0,
        forwardPayload: Cell | null = null,
    ) {
        const result = await _registry.sendValidateRouter(sender.getSender(), toNano('0.05'), {
            queryId: QUERY_ID,
            router: routerAddress,
            response: responseAddress,
            forwardPayload: forwardPayload ? { kind: 'Maybe_just', value: forwardPayload } : { kind: 'Maybe_nothing' },
        });

        if (exitCode === 0) {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                success: true,
            });

            const data = await _registry.getRegistryData();
            let routerDetails: RouterDescription | null = null;

            if (data.routers.kind === 'Maybe_just') {
                const routers = cellToRouters(data.routers.value);
                routerDetails = routers.get(routerAddress.toString()) || null;
            }

            // Check if RouterValidatedMessage was sent to response address
            expect(result.transactions).toHaveTransaction({
                from: registry.address,
                to: responseAddress,
                success: true,
                body: assertMsgBodyEqual(
                    storeRouterValidatedMessage({
                        kind: 'RouterValidatedMessage',
                        queryId: QUERY_ID,
                        router: routerAddress,
                        details: routerDetails!,
                        forwardPayload: forwardPayload
                            ? { kind: 'Maybe_just', value: forwardPayload }
                            : { kind: 'Maybe_nothing' },
                    }),
                ),
            });
        } else {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                exitCode,
            });
        }

        return result;
    }

    async function assertAddRouterBatch(
        routers: Map<string, RouterDescription>,
        sender: SandboxContract<TreasuryContract> = admin,
        _registry: SandboxContract<Registry> = registry,
        exitCode: number = 0,
    ) {
        const result = await _registry.sendAddRouterBatch(sender.getSender(), toNano('0.1'), {
            queryId: QUERY_ID,
            routers: routersToCodegenDict(routers),
        });

        if (exitCode === 0) {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                success: true,
            });

            const data = await registry.getRegistryData();

            // If routers map is empty, storage should remain empty
            if (routers.size === 0) {
                // For empty batch, the storage might stay unchanged
                // Don't assert specific state, just that transaction succeeded
            } else {
                expect(data.routers.kind).toBe('Maybe_just');
                if (data.routers.kind === 'Maybe_just') {
                    const registryRouters = cellToRouters(data.routers.value);
                    for (const [addr, desc] of routers) {
                        expect(registryRouters.get(addr)).toStrictEqual(desc);
                    }
                }
            }
        } else {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                exitCode,
            });
        }

        return result;
    }

    async function assertRemoveRouterBatch(
        routerAddresses: Address[],
        sender: SandboxContract<TreasuryContract> = admin,
        _registry: SandboxContract<Registry> = registry,
        exitCode: number = 0,
    ) {
        // Create a dictionary with routers to remove
        const routersToRemove = new Map<string, RouterDescription>();
        for (const addr of routerAddresses) {
            routersToRemove.set(addr.toString(), {
                kind: 'RouterDescription',
                router_id: 0n,
                router_type: 0,
                version: DEFAULT_ROUTER_VERSION,
            });
        }

        const result = await _registry.sendRemoveRouterBatch(sender.getSender(), toNano('0.1'), {
            queryId: QUERY_ID,
            routers: routersToCodegenDict(routersToRemove),
        });

        if (exitCode === 0) {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                success: true,
            });

            const data = await registry.getRegistryData();
            if (data.routers.kind === 'Maybe_just') {
                const registryRouters = cellToRouters(data.routers.value);
                for (const addr of routerAddresses) {
                    expect(registryRouters.has(addr.toString())).toBe(false);
                }
            }
        } else {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                exitCode,
            });
        }

        return result;
    }

    async function assertSetRouters(
        routers: Map<string, RouterDescription>,
        sender: SandboxContract<TreasuryContract> = admin,
        _registry: SandboxContract<Registry> = registry,
        exitCode: number = 0,
    ) {
        const result = await _registry.sendSetRouters(sender.getSender(), toNano('0.1'), {
            queryId: QUERY_ID,
            routers: routersToCodegenDict(routers),
        });

        if (exitCode === 0) {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                success: true,
            });

            const data = await registry.getRegistryData();

            // Check that the dictionary was completely replaced
            if (routers.size === 0) {
                expect(data.routers.kind).toBe('Maybe_nothing');
            } else {
                expect(data.routers.kind).toBe('Maybe_just');
                if (data.routers.kind === 'Maybe_just') {
                    const registryRouters = cellToRouters(data.routers.value);

                    // Check that all provided routers are in the registry
                    for (const [addr, desc] of routers) {
                        expect(registryRouters.get(addr)).toStrictEqual(desc);
                    }

                    // Check that the registry has exactly the same number of routers
                    expect(registryRouters.size).toBe(routers.size);
                }
            }
        } else {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                exitCode,
            });
        }

        return result;
    }

    async function assertGetAllRouters(
        responseAddress: Address,
        sender: SandboxContract<TreasuryContract> = user,
        _registry: SandboxContract<Registry> = registry,
        exitCode: number = 0,
        _forwardPayload: Cell | null = null,
    ) {
        const forwardPayload = _forwardPayload
            ? { kind: 'Maybe_just' as const, value: _forwardPayload }
            : { kind: 'Maybe_nothing' as const };
        const result = await _registry.sendGetAllRouters(sender.getSender(), toNano('0.05'), {
            queryId: QUERY_ID,
            response: responseAddress,
            forwardPayload,
        });

        if (exitCode === 0) {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                success: true,
            });

            const data = await _registry.getRegistryData();

            // Check if AllRoutersMessage was sent to response address
            expect(result.transactions).toHaveTransaction({
                from: registry.address,
                to: responseAddress,
                success: true,
                body: assertMsgBodyEqual(
                    storeAllRoutersMessage({
                        kind: 'AllRoutersMessage',
                        queryId: QUERY_ID,
                        routers: data.routers,
                        forwardPayload: forwardPayload,
                    }),
                ),
            });
        } else {
            expect(result.transactions).toHaveTransaction({
                from: sender.address,
                to: registry.address,
                exitCode,
            });
        }

        return result;
    }

    // ==== TESTS ====

    describe('AddRouter', () => {
        it('should accept add router message from admin', async () => {
            const router = await blockchain.treasury('router');
            await assertAddRouter(router.address);
        });

        it('should reject add router message from non-admin', async () => {
            const router = await blockchain.treasury('router');
            await assertAddRouter(router.address, DEFAULT_ROUTER_DESCRIPTION, user, registry, RegistryErrors.NOT_ADMIN);
        });

        it('should handle different router descriptions', async () => {
            const router1 = await blockchain.treasury('router1');
            const router2 = await blockchain.treasury('router2');

            await assertAddRouter(router1.address, DEFAULT_ROUTER_DESCRIPTION);

            await assertAddRouter(router2.address, {
                kind: 'RouterDescription',
                router_id: 1n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 3,
            });
        });

        it('should overwrite existing router', async () => {
            const router = await blockchain.treasury('router');

            // Add router first time
            await assertAddRouter(router.address);

            // Add same router with different description
            await assertAddRouter(router.address);
        });
    });

    describe('RemoveRouter', () => {
        let router: SandboxContract<TreasuryContract>;

        beforeEach(async () => {
            router = await blockchain.treasury('router');
            await assertAddRouter(router.address);
        });

        it('should accept remove router message from admin', async () => {
            await assertRemoveRouter(router.address);
        });

        it('should reject remove router message from non-admin', async () => {
            await assertRemoveRouter(router.address, user, registry, RegistryErrors.NOT_ADMIN);
        });

        it('should fail to remove non-existent router', async () => {
            const nonExistentRouter = await blockchain.treasury('nonExistent');
            await assertRemoveRouter(nonExistentRouter.address, admin, registry, RegistryErrors.ROUTER_NOT_FOUND);
        });
    });

    describe('ValidateRouter', () => {
        let router: SandboxContract<TreasuryContract>;
        let responseReceiver: SandboxContract<TreasuryContract>;

        beforeEach(async () => {
            router = await blockchain.treasury('router');
            responseReceiver = await blockchain.treasury('response');

            await assertAddRouter(router.address);
        });

        it('should validate existing router', async () => {
            await assertValidateRouter(router.address, responseReceiver.address);
        });

        it('should fail to validate non-existent router', async () => {
            const nonExistentRouter = await blockchain.treasury('nonExistent');
            await assertValidateRouter(
                nonExistentRouter.address,
                responseReceiver.address,
                user,
                registry,
                RegistryErrors.ROUTER_NOT_FOUND,
            );
        });

        it('should validate router with forward payload', async () => {
            const forwardPayload = beginCell().storeUint(123, 32).endCell();
            await assertValidateRouter(router.address, responseReceiver.address, user, registry, 0, forwardPayload);
        });

        it('should allow any user to validate router', async () => {
            const anyUser = await blockchain.treasury('anyUser');
            await assertValidateRouter(router.address, responseReceiver.address, anyUser);
        });
    });

    describe('GetAllRouters', () => {
        let responseReceiver: SandboxContract<TreasuryContract>;

        beforeEach(async () => {
            responseReceiver = await blockchain.treasury('response');
        });

        it('should return empty router dict when no routers exist', async () => {
            await assertGetAllRouters(responseReceiver.address);
        });

        it('should return all routers when they exist', async () => {
            const router1 = await blockchain.treasury('router1');
            const router2 = await blockchain.treasury('router2');

            // Add some routers
            await assertAddRouter(router1.address, DEFAULT_ROUTER_DESCRIPTION);

            await assertAddRouter(router2.address, {
                kind: 'RouterDescription',
                version: DEFAULT_ROUTER_VERSION,
                router_id: 1n,
                router_type: 2,
            });

            await assertGetAllRouters(responseReceiver.address);
        });

        it('should work with forward payload', async () => {
            const router = await blockchain.treasury('router');

            await assertAddRouter(router.address, DEFAULT_ROUTER_DESCRIPTION);

            const forwardPayload = beginCell().storeUint(123, 32).endCell();
            await assertGetAllRouters(responseReceiver.address, user, registry, 0, forwardPayload);
        });

        it('should allow any user to get all routers', async () => {
            const router = await blockchain.treasury('router');
            const anyUser = await blockchain.treasury('anyUser');

            await assertAddRouter(router.address);

            await assertGetAllRouters(responseReceiver.address, anyUser);
        });
    });

    describe('AddRouterBatch', () => {
        it('should accept add router batch message from admin', async () => {
            const router1 = await blockchain.treasury('router1');
            const router2 = await blockchain.treasury('router2');

            const routers = new Map<string, RouterDescription>([
                [router1.address.toString(), DEFAULT_ROUTER_DESCRIPTION],
                [router2.address.toString(), DEFAULT_ROUTER_DESCRIPTION],
            ]);

            await assertAddRouterBatch(routers);
        });

        it('should reject add router batch message from non-admin', async () => {
            const router1 = await blockchain.treasury('router1');
            const routers = new Map<string, RouterDescription>([
                [router1.address.toString(), DEFAULT_ROUTER_DESCRIPTION],
            ]);

            await assertAddRouterBatch(routers, user, registry, RegistryErrors.NOT_ADMIN);
        });

        it('should handle empty batch', async () => {
            await assertAddRouterBatch(new Map());
        });
    });

    describe('RemoveRouterBatch', () => {
        let router1: SandboxContract<TreasuryContract>;
        let router2: SandboxContract<TreasuryContract>;

        beforeEach(async () => {
            router1 = await blockchain.treasury('router1');
            router2 = await blockchain.treasury('router2');

            await assertAddRouter(router1.address);

            await assertAddRouter(router2.address, {
                kind: 'RouterDescription',
                router_id: 2n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 2,
            });
        });

        it('should accept remove router batch message from admin', async () => {
            await assertRemoveRouterBatch([router1.address, router2.address]);
        });

        it('should reject remove router batch message from non-admin', async () => {
            await assertRemoveRouterBatch([router1.address], user, registry, RegistryErrors.NOT_ADMIN);
        });

        it('should handle empty batch', async () => {
            await assertRemoveRouterBatch([]);
        });
    });

    describe('SetRouters', () => {
        it('should accept set routers message from admin', async () => {
            // First add some routers
            const router1 = await blockchain.treasury('router1');
            const router2 = await blockchain.treasury('router2');
            await assertAddRouter(router1.address);
            await assertAddRouter(router2.address);

            // Now set a completely different set of routers
            const router3 = await blockchain.treasury('router3');
            const router4 = await blockchain.treasury('router4');
            const newRouters = new Map<string, RouterDescription>();
            newRouters.set(router3.address.toString(), {
                kind: 'RouterDescription',
                router_id: 3n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 3,
            });
            newRouters.set(router4.address.toString(), {
                kind: 'RouterDescription',
                router_id: 4n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 4,
            });

            await assertSetRouters(newRouters);

            // Verify old routers are no longer in the registry
            const data = await registry.getRegistryData();
            expect(data.routers.kind).toBe('Maybe_just');
            if (data.routers.kind === 'Maybe_just') {
                const registryRouters = cellToRouters(data.routers.value);
                expect(registryRouters.has(router1.address.toString())).toBe(false);
                expect(registryRouters.has(router2.address.toString())).toBe(false);
            }
        });

        it('should reject set routers message from non-admin', async () => {
            const router1 = await blockchain.treasury('router1');
            const routers = new Map<string, RouterDescription>();
            routers.set(router1.address.toString(), DEFAULT_ROUTER_DESCRIPTION);

            await assertSetRouters(routers, user, registry, RegistryErrors.NOT_ADMIN);
        });

        it('should handle empty routers set', async () => {
            // First add some routers
            const router1 = await blockchain.treasury('router1');
            await assertAddRouter(router1.address);

            // Now set empty routers
            await assertSetRouters(new Map());
        });

        it('should handle setting single router', async () => {
            const router1 = await blockchain.treasury('router1');
            const routers = new Map<string, RouterDescription>();
            routers.set(router1.address.toString(), {
                kind: 'RouterDescription',
                router_id: 1n,
                version: {
                    kind: 'RouterVersion',
                    version_major: 1,
                    version_minor: 0,
                    version_development: createVersionBuffer('test'),
                },
                router_type: 1,
            });

            await assertSetRouters(routers);
        });

        it('should handle setting multiple routers', async () => {
            const router1 = await blockchain.treasury('router1');
            const router2 = await blockchain.treasury('router2');
            const router3 = await blockchain.treasury('router3');

            const routers = new Map<string, RouterDescription>();
            routers.set(router1.address.toString(), {
                kind: 'RouterDescription',
                router_id: 1n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 1,
            });
            routers.set(router2.address.toString(), {
                kind: 'RouterDescription',
                router_id: 2n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 2,
            });
            routers.set(router3.address.toString(), {
                kind: 'RouterDescription',
                router_id: 3n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 3,
            });

            await assertSetRouters(routers);
        });

        it('should completely replace existing routers', async () => {
            // First add some routers via batch
            const router1 = await blockchain.treasury('router1');
            const router2 = await blockchain.treasury('router2');
            const initialRouters = new Map<string, RouterDescription>();
            initialRouters.set(router1.address.toString(), DEFAULT_ROUTER_DESCRIPTION);
            initialRouters.set(router2.address.toString(), DEFAULT_ROUTER_DESCRIPTION);
            await assertAddRouterBatch(initialRouters);

            // Now set completely different routers
            const router3 = await blockchain.treasury('router3');
            const newRouters = new Map<string, RouterDescription>();
            newRouters.set(router3.address.toString(), {
                kind: 'RouterDescription',
                router_id: 3n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 3,
            });

            await assertSetRouters(newRouters);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle multiple operations in sequence', async () => {
            const router1 = await blockchain.treasury('router1');
            const router2 = await blockchain.treasury('router2');
            const router3 = await blockchain.treasury('router3');
            const responseReceiver = await blockchain.treasury('response');

            // Add routers individually
            await assertAddRouter(router1.address);

            await assertAddRouter(router2.address, {
                kind: 'RouterDescription',
                router_id: 2n,
                version: DEFAULT_ROUTER_VERSION,
                router_type: 2,
            });

            // Validate existing router
            await assertValidateRouter(router1.address, responseReceiver.address);

            // Add router batch
            const batchRouters = new Map([
                [
                    router3.address.toString(),
                    {
                        kind: 'RouterDescription' as const,
                        version: DEFAULT_ROUTER_VERSION,
                        router_type: 3,
                        router_id: 3n,
                    },
                ],
            ]);
            await assertAddRouterBatch(batchRouters);

            // Remove router individually
            await assertRemoveRouter(router1.address);

            // Validate after removal should fail
            await assertValidateRouter(
                router1.address,
                responseReceiver.address,
                user,
                registry,
                RegistryErrors.ROUTER_NOT_FOUND,
            );

            // Remove batch
            await assertRemoveRouterBatch([router2.address, router3.address]);

            // Validate final state
            const data = await registry.getRegistryData();
            expect(data.routers).toStrictEqual({ kind: 'Maybe_nothing' });
        });

        it('should handle workchain validation', async () => {
            // Test that masterchain addresses are rejected
            const mcRouter = Address.parse('-1:0000000000000000000000000000000000000000000000000000000000000000');
            await assertAddRouter(
                mcRouter,
                DEFAULT_ROUTER_DESCRIPTION,
                admin,
                registry,
                RegistryErrors.INVALID_ROUTER_WORKCHAIN,
            );

            // Test that basechain addresses are accepted
            const bcRouter = await blockchain.treasury('router');
            await assertAddRouter(bcRouter.address, DEFAULT_ROUTER_DESCRIPTION);
        });
    });

    describe('Error handling', () => {
        it('should handle unknown operations', async () => {
            // Send a message with unknown op code by using internal send
            const result = await blockchain.sendMessage(
                internal({
                    from: user.address,
                    to: registry.address,
                    value: toNano('0.05'),
                    body: beginCell().storeUint(0x12345678, 32).endCell(),
                }),
            );

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: registry.address,
                success: false,
                exitCode: RegistryErrors.UNKNOWN_OP,
            });
        });

        it('should handle malformed messages', async () => {
            // Send a message with empty body
            const result = await blockchain.sendMessage(
                internal({
                    from: user.address,
                    to: registry.address,
                    value: toNano('0.05'),
                    body: Cell.EMPTY,
                }),
            );

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: registry.address,
                success: true, // Empty body is allowed according to contract logic
            });
        });
    });

    describe('Ownership management', () => {
        it('should allow admin to give ownership', async () => {
            const newAdmin = await blockchain.treasury('newAdmin');

            const result = await registry.sendGiveOwnership(admin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
                nextAdmin: newAdmin.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: registry.address,
                success: true,
            });

            const data = await registry.getRegistryData();
            expect(data.admin).toEqualAddress(admin.address);
            expect(data.nextAdmin).toEqualAddress(newAdmin.address);
        });

        it('should not allow non-admin to give ownership', async () => {
            const newAdmin = await blockchain.treasury('newAdmin');

            const result = await registry.sendGiveOwnership(user.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
                nextAdmin: newAdmin.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: registry.address,
                exitCode: RegistryErrors.NOT_ADMIN,
            });

            const data = await registry.getRegistryData();
            expect(data.admin).toEqualAddress(admin.address);
            expect(data.nextAdmin).toEqualAddress(HOLE_ADDR);
        });

        it('should allow next admin to take ownership', async () => {
            const newAdmin = await blockchain.treasury('newAdmin');

            // First, give ownership
            await registry.sendGiveOwnership(admin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
                nextAdmin: newAdmin.address,
            });

            // Then, take ownership
            const result = await registry.sendTakeOwnership(newAdmin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
            });

            expect(result.transactions).toHaveTransaction({
                from: newAdmin.address,
                to: registry.address,
                success: true,
            });

            const data = await registry.getRegistryData();
            expect(data.admin).toEqualAddress(newAdmin.address);
            expect(data.nextAdmin).toEqualAddress(HOLE_ADDR);
        });

        it('should not allow non-next-admin to take ownership', async () => {
            const newAdmin = await blockchain.treasury('newAdmin');

            // First, give ownership
            await registry.sendGiveOwnership(admin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
                nextAdmin: newAdmin.address,
            });

            // Try to take ownership with wrong sender
            const result = await registry.sendTakeOwnership(user.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: registry.address,
                exitCode: RegistryErrors.NOT_NEXT_ADMIN,
            });

            const data = await registry.getRegistryData();
            expect(data.admin).toEqualAddress(admin.address);
            expect(data.nextAdmin).toEqualAddress(newAdmin.address);
        });

        it('should not allow taking ownership when nextAdmin is not set', async () => {
            const result = await registry.sendTakeOwnership(user.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: registry.address,
                exitCode: RegistryErrors.NOT_NEXT_ADMIN,
            });

            const data = await registry.getRegistryData();
            expect(data.admin).toEqualAddress(admin.address);
            expect(data.nextAdmin).toEqualAddress(HOLE_ADDR);
        });

        it('should handle complete ownership transfer workflow', async () => {
            const newAdmin = await blockchain.treasury('newAdmin');
            const anotherAdmin = await blockchain.treasury('anotherAdmin');

            // Original admin gives ownership to newAdmin
            await registry.sendGiveOwnership(admin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
                nextAdmin: newAdmin.address,
            });

            // NewAdmin takes ownership
            await registry.sendTakeOwnership(newAdmin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
            });

            // Verify newAdmin is now the admin
            let data = await registry.getRegistryData();
            expect(data.admin).toEqualAddress(newAdmin.address);
            expect(data.nextAdmin).toEqualAddress(HOLE_ADDR);

            // NewAdmin gives ownership to anotherAdmin
            await registry.sendGiveOwnership(newAdmin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
                nextAdmin: anotherAdmin.address,
            });

            // Verify transfer
            data = await registry.getRegistryData();
            expect(data.admin).toEqualAddress(newAdmin.address);
            expect(data.nextAdmin).toEqualAddress(anotherAdmin.address);

            // AnotherAdmin takes ownership
            await registry.sendTakeOwnership(anotherAdmin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
            });

            // Verify final state
            data = await registry.getRegistryData();
            expect(data.admin).toEqualAddress(anotherAdmin.address);
            expect(data.nextAdmin).toEqualAddress(HOLE_ADDR);
        });
    });

    describe('SetCode', () => {
        it('should accept set code message from admin', async () => {
            const newCode = beginCell().storeUint(123, 32).endCell();

            const result = await registry.sendSetCode(admin.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
                code: newCode,
            });

            expect(result.transactions).toHaveTransaction({
                from: admin.address,
                to: registry.address,
                success: true,
            });

            const contractData = await blockchain.getContract(registry.address);
            if (contractData.accountState?.type !== 'active') {
                throw new Error('Contract is not active');
            }
            expect(contractData.accountState.state.code).toEqualCell(newCode);
        });

        it('should reject set code message from non-admin', async () => {
            const newCode = beginCell().storeUint(123, 32).endCell();

            const result = await registry.sendSetCode(user.getSender(), toNano('0.05'), {
                queryId: QUERY_ID,
                code: newCode,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: registry.address,
                exitCode: RegistryErrors.NOT_ADMIN,
            });

            const contractData = await blockchain.getContract(registry.address);
            if (contractData.accountState?.type !== 'active') {
                throw new Error('Contract is not active');
            }
            expect(contractData.accountState.state.code).not.toEqualCell(newCode);
        });
    });
});

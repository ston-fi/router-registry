import { toNano, Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Registry } from '../build/Registry';

export async function run(provider: NetworkProvider, args: string[]) {
    const registryAddress = args[0];
    const routerAddress = args[1];

    if (!registryAddress || !routerAddress) {
        console.log('Usage: npx blueprint run validateRouter <registry_address> <router_address>');
        process.exit(1);
    }

    const responseAddress = provider.sender().address;
    if (!responseAddress) {
        console.log('Sender address is not set');
        process.exit(1);
    }

    const registry = provider.open(Registry.createFromAddress(Address.parse(registryAddress)));

    await registry.sendValidateRouter(provider.sender(), toNano('0.05'), {
        queryId: BigInt(Date.now()),
        router: Address.parse(routerAddress),
        response: responseAddress,
        forwardPayload: { kind: 'Maybe_nothing' },
    });

    console.log('Validate router message sent successfully');
}

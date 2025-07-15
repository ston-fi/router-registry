import { toNano, Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Registry } from '../build/Registry';

export async function run(provider: NetworkProvider, args: string[]) {
    const registryAddress = args[0];

    if (!registryAddress) {
        console.log('Usage: npx blueprint run getAllRouters <registry_address>');
        process.exit(1);
    }

    const responseAddress = provider.sender().address;
    if (!responseAddress) {
        console.log('Sender address is not set');
        process.exit(1);
    }

    const registry = provider.open(Registry.createFromAddress(Address.parse(registryAddress)));

    console.log('Sending GetAllRouters request...');
    await registry.sendGetAllRouters(provider.sender(), toNano('0.05'), {
        queryId: BigInt(Date.now()),
        response: responseAddress,
        forwardPayload: { kind: 'Maybe_nothing' },
    });

    console.log('GetAllRouters message sent successfully!');
    console.log('Response will be sent to:', responseAddress.toString());
    console.log('');
    console.log('Note: The response (AllRoutersMessage) will be sent to your address.');
}

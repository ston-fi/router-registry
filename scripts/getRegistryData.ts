import { Address } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { Registry } from '../build/Registry';
import { codegenDictToRouters } from '../utils';

export async function run(provider: NetworkProvider, args: string[]) {
    const registryAddress = args[0];
    if (!registryAddress) {
        console.log('Usage: npx blueprint run getRegistryData <registry_address>');
        process.exit(1);
    }

    const registry = provider.open(Registry.createFromAddress(Address.parse(registryAddress)));

    const data = await registry.getRegistryData();

    console.log('Registry Data:');
    console.log('Admin:', data.admin?.toString());
    console.log('Next Admin:', data.nextAdmin?.toString());
    console.log('Routers:', codegenDictToRouters(data.routers));
}

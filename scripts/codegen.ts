import { generateContractWrapper } from '@eliseev_s/tolk-tlb-transpiler';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function main() {
    console.log('Building registry contract codegen...');
    const contractName = 'Registry';
    const contractDir = join(process.cwd(), 'contracts');
    const commonDir = join(contractDir, 'common');
    const registryDir = join(contractDir, 'registry');

    const interfacesCode = readFileSync(join(commonDir, 'interfaces.tolk'), 'utf8');
    const gettersCode = readFileSync(join(registryDir, 'get.tolk'), 'utf8');
    const registryStorageCode = readFileSync(join(registryDir, 'storage.tolk'), 'utf8');
    const versionCode = readFileSync(join(registryDir, 'version.tolk'), 'utf8');

    const registryFullCode = [interfacesCode, registryStorageCode, versionCode].join('\n');
    const registryAllGetters = [gettersCode, versionCode].join('\n');

    const res = await generateContractWrapper(registryFullCode, registryAllGetters, contractName);

    const buildPath = join(process.cwd(), 'build');
    if (!existsSync(buildPath)) {
        mkdirSync(buildPath, { recursive: true });
    }

    const genDir = join(buildPath, contractName);
    if (!existsSync(genDir)) {
        mkdirSync(genDir, { recursive: true });
    }

    const tlbPath = join(genDir, `${contractName}.tlb`);
    writeFileSync(tlbPath, res.tlbString);
    console.log(`Generated TLB file: ${tlbPath}`);

    const wrapperPath = join(genDir, `${contractName}.ts`);
    writeFileSync(wrapperPath, res.fullCode);
    console.log(`Generated wrapper file: ${wrapperPath}`);

    // create index.ts file in genDir which exports all the types from the wrapper
    const indexPath = join(genDir, 'index.ts');
    writeFileSync(indexPath, `export * from './${contractName}';`);
    console.log(`Generated index file: ${indexPath}`);
}

if (require.main === module) {
    main().catch(console.error);
}

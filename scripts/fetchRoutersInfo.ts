import { crc32 } from 'zlib';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TonClient4 } from '@ton/ton';
import { DEX } from '@ston-fi/sdk';

import { RouterDescription, RouterVersion } from '../build/Registry';

type RouterApiInfo = {
    address: string;
    major_version: number;
    minor_version: number;
    pton_master_address: string;
    pton_wallet_address: string;
    pton_version: string;
    router_type: string;
};

type Replace<T extends object, R extends object> = Omit<T, keyof R> & R;

export type ReadbleRouterDescription = Replace<
    RouterDescription,
    {
        router_id: string;
        version: Replace<RouterVersion, { version_development: string }>;
    }
>;

export async function run() {
    const endpoint = process.env.ENDPOINT_URL;
    if (!endpoint) {
        throw new Error('ENDPOINT_URL is not set');
    }

    const client = new TonClient4({ endpoint });

    const routersApiUrl = 'https://api.ston.fi/v1/routers?dex_v2=true';
    const response = await fetch(routersApiUrl).then((res) => res.json());

    const routers: RouterApiInfo[] = response.router_list;

    const routerDescriptions: Record<string, ReadbleRouterDescription> = {};

    for (const router of routers) {
        let routerId = 0n;
        let developmentVersion = '';

        if (router.major_version >= 2) {
            const routerContract = client.open(DEX.v2_1.Router.CPI.create(router.address));

            const routerData = await routerContract.getRouterData();
            routerId = BigInt(routerData.routerId);
            developmentVersion = (await routerContract.getRouterVersion()).development;
        }

        const routerDescription: ReadbleRouterDescription = {
            kind: 'RouterDescription',
            router_id: routerId.toString(),
            router_type: crc32(router.router_type),
            version: {
                kind: 'RouterVersion',
                version_major: router.major_version,
                version_minor: router.minor_version,
                version_development: developmentVersion,
            },
        };

        routerDescriptions[router.address] = routerDescription;

        console.log('router:', router.address, 'description:', routerDescription);
    }

    const buildFolder = join(process.cwd(), 'build');
    if (!existsSync(buildFolder)) {
        mkdirSync(buildFolder, { recursive: true });
    }
    const outputFile = join(buildFolder, 'routerDescriptions.json');
    writeFileSync(outputFile, JSON.stringify(routerDescriptions, null, 2));
    console.log(`Router descriptions saved to ${outputFile}`);
}

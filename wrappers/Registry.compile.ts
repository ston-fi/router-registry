import { CompilerConfig } from '@ton/blueprint';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';

import { genVersionTolkGetMethod } from '../utils/version';

export const compile: CompilerConfig = {
    lang: 'tolk',
    entrypoint: 'contracts/registry.tolk',
    withStackComments: true, // Fift output will contain comments, if you wish to debug its output
    withSrcLineComments: true, // Fift output will contain .tolk lines as comments
    experimentalOptions: '', // you can pass experimental compiler options here

    preCompileHook: async () => {
        const { version } = JSON.parse(readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
        const getMethod = genVersionTolkGetMethod(version);

        const getMethodPath = path.join(process.cwd(), 'contracts', 'registry', 'version.tolk');
        writeFileSync(getMethodPath, getMethod, 'utf8');
    },
};

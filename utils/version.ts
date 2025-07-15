import { readFileSync } from 'fs';

/**
 * Parses a semantic version string into its components
 *
 * @param versionString - Optional version string to parse (defaults to reading from package.json)
 * @returns Tuple containing [major, minor, patch, development] version components
 *
 * @example
 * ```typescript
 * parseVersion("1.2.3")          // [1, 2, 3, 'patch3']
 * parseVersion("1.2.0")          // [1, 2, 0, 'release']
 * parseVersion("1.2.3-beta1.0")  // [1, 2, 3, 'beta1.0']
 *
 * // Read from package.json
 * const [major, minor, patch, dev] = parseVersion();
 * ```
 *
 * @remarks
 * The development string follows these rules:
 * - If version has a hyphen (e.g., "1.2.3-beta"), everything after the hyphen is the development string
 * - If no hyphen and patch is 0 (e.g., "1.2.0"), development string is "release"
 * - If no hyphen and patch is not 0 (e.g., "1.2.3"), development string is "patch" + patch number
 */
function parseVersion(versionString?: string): [number, number, number, string] {
    try {
        let data: { version: string };
        if (versionString === undefined) {
            data = JSON.parse(readFileSync('package.json', 'utf8'));
        } else {
            data = { version: versionString };
        }
        let numerical = data.version.split('.');
        numerical[2] = numerical[2].split('-')[0];

        let developmentRaw = data.version.split('-');
        let development =
            developmentRaw.length > 1
                ? developmentRaw[1]
                : Number(numerical[2]) === 0
                  ? 'release'
                  : `patch${numerical[2]}`;

        return [Number(numerical[0]), Number(numerical[1]), Number(numerical[2]), development];
    } catch {
        throw new Error("Could not parse version, example: '1.0.0-beta1.0'");
    }
}

export function genVersionTolkGetMethod(versionString: string) {
    const [major, minor, _, development] = parseVersion(versionString);
    return `
struct ContractVersion {
    major: uint8;
    minor: uint8;
    development: slice;
}

get fun getVersion(): ContractVersion {
    return ContractVersion {
        major: ${major},
        minor: ${minor},
        development: "${development}",
    }
}
`.trim();
}

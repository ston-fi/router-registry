/**
 * Registry contract error codes
 * These constants should match the error codes defined in contracts/common/errors.tolk
 */
export const RegistryErrors = {
    /** Router not found in the registry */
    ROUTER_NOT_FOUND: 123,

    /** Sender is not an admin */
    NOT_ADMIN: 124,

    /** Router address is not in basechain (workchain != 0) */
    INVALID_ROUTER_WORKCHAIN: 125,

    /** Sender is not the next admin */
    NOT_NEXT_ADMIN: 126,

    /** Not enough gas */
    NOT_ENOUGH_GAS: 127,

    /** Unknown operation code */
    UNKNOWN_OP: 0xffff,
} as const;

export type RegistryErrorCode = (typeof RegistryErrors)[keyof typeof RegistryErrors];

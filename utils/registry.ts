import { Address, beginCell, Cell, Dictionary, DictionaryValue } from '@ton/core';
import { loadRouterDescription, Maybe, RouterDescription, storeRouterDescription } from '../build/Registry';

const reistryRoutersKeyLen = 256;
const reistryRoutersKey = Dictionary.Keys.BigUint(reistryRoutersKeyLen);

const routerDictValue: DictionaryValue<RouterDescription> = {
    serialize: (src, builder) => builder.store(storeRouterDescription(src)),
    parse: (src) => loadRouterDescription(src),
};

function safeHex(hex: string): string {
    return hex.length % 2 ? '0' + hex : hex;
}

function addrToDictKey(addr: Address): bigint {
    const hex = addr.hash.toString('hex');
    return BigInt(`0x${safeHex(hex)}`);
}

function dictKeyToAddr(key: bigint): Address {
    const hex = key.toString(16);
    return Address.parse('0:' + safeHex(hex));
}

export function packRoutersDict(routers: Map<string, RouterDescription>) {
    const dict = Dictionary.empty(reistryRoutersKey, routerDictValue);

    for (const [key, value] of routers) {
        dict.set(addrToDictKey(Address.parse(key)), value);
    }

    return dict;
}

export function dictToCell(dict: Dictionary<bigint, RouterDescription>): Cell {
    return beginCell()
        .store((b) => dict.storeDirect(b, reistryRoutersKey, routerDictValue))
        .endCell();
}

export function dictFromCell(cell: Cell): Dictionary<bigint, RouterDescription> {
    return Dictionary.loadDirect(reistryRoutersKey, routerDictValue, cell.beginParse());
}

export function cellToRouters(cell: Cell): Map<string, RouterDescription> {
    return unpackRoutersDict(dictFromCell(cell));
}

export function cellFromRouters(routers: Map<string, RouterDescription>): Cell {
    return dictToCell(packRoutersDict(routers));
}

export function unpackRoutersDict(dict: Dictionary<bigint, RouterDescription>) {
    const routers = new Map<string, RouterDescription>();

    for (const [key, value] of dict) {
        routers.set(dictKeyToAddr(key).toString(), value);
    }

    return routers;
}

export function routersToCodegenDict(routers: Map<string, RouterDescription>): Maybe<Cell> {
    const dict = packRoutersDict(routers);

    return dict.size === 0 ? { kind: 'Maybe_nothing' } : { kind: 'Maybe_just', value: dictToCell(dict) };
}

export function codegenDictToRouters(dict: Maybe<Cell>): Map<string, RouterDescription> {
    return unpackRoutersDict(
        dict.kind === 'Maybe_just'
            ? Dictionary.loadDirect(reistryRoutersKey, routerDictValue, dict.value.beginParse())
            : Dictionary.empty(reistryRoutersKey, routerDictValue),
    );
}

export function createVersionBuffer(text: string): Buffer {
    const buffer = Buffer.from(text, 'utf8');
    if (buffer.length > 32) {
        throw new Error('Version development text is too long (max 32 bytes)');
    }
    const paddedBuffer = Buffer.alloc(32);
    buffer.copy(paddedBuffer);
    return paddedBuffer;
}

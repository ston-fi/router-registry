import "./params";
import "./utils";

const ERROR_ROUTER_NOT_FOUND = 123;
const ERROR_NOT_ADMIN = 124;
const ERROR_INVALID_WORKCHAIN = 125;
const ERROR_NOT_NEXT_ADMIN = 126;
const ERROR_NOT_ENOUGH_GAS = 127;
const ERROR_UNKNOWN_OP = 0xFFFF;

struct asserts {}

fun asserts.minMsgValue(): void {
    assert(getMsgValue() >= REGISTRY_MIN_GAS, ERROR_NOT_ENOUGH_GAS);
}

fun asserts.minBatchMsgValue(): void {
    assert(getMsgValue() >= REGISTRY_BATCH_MIN_GAS, ERROR_NOT_ENOUGH_GAS);
}

fun asserts.senderIsAdmin(registryAdmin: address): void {
    assert(getMsgSender() == registryAdmin, ERROR_NOT_ADMIN);
}

fun asserts.basechainWc(wc: int): void {
    assert(wc == BASECHAIN_WC, ERROR_INVALID_WORKCHAIN);
}

fun asserts.basechainAddress(addr: address): void {
    asserts.basechainWc(addr.getWorkchain());
}

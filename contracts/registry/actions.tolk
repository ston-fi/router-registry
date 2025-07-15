import "../common/params";
import "../common/utils";

struct registryActions {}

fun registryActions.reserve() {
    reserveMaxBalance(REGISTRY_MIN_STORAGE);
}

fun registryActions.reserveAndSendExcess(dest: address, queryId: uint64) {
    registryActions.reserve();
    return sendExcessMessage(dest, queryId, 0, SEND_MODE_CARRY_ALL_BALANCE);
}
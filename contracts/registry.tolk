tolk 1.0;

import "./common/interfaces";
import "./common/errors";

import "./registry/get";
import "./registry/version";
import "./registry/msgs/any";
import "./registry/msgs/admin";
import "./registry/msgs/next-admin";

fun onInternalMessage(inMsg: InMessage): void {
    asserts.basechainAddress(inMsg.senderAddress);

    val msg = lazy RegistryInternalMessage.fromSlice(inMsg.body);

    match (msg) {
        // PUBLIC CALLS:
        ValidateRouterMessage => {
            return validateRouter(msg);
        },
        GetAllRoutersMessage => {
            return getAllRouters(msg);
        },

        // ADMIN CALLS:
        AddRouterMessage => {
            return addRouter(inMsg.senderAddress, msg);
        },
        RemoveRouterMessage => {
            return removeRouter(inMsg.senderAddress, msg);
        },
        AddRouterBatchMessage => {
            return addRouterBatch(inMsg.senderAddress, msg);
        },
        RemoveRouterBatchMessage => {
            return removeRouterBatch(inMsg.senderAddress, msg);
        },
        SetRoutersMessage => {
            return setRouters(inMsg.senderAddress, msg);
        },
        GiveOwnershipMessage => {
            return giveOwnership(inMsg.senderAddress, msg);
        },
        SetCodeMessage => {
            return setCodeHandler(inMsg.senderAddress, msg);
        },

        // NEXT ADMIN CALLS:
        TakeOwnershipMessage => {
            return takeOwnership(inMsg.senderAddress, msg);
        },

        else => {
            assert(inMsg.body.isEmpty()) throw ERROR_UNKNOWN_OP;
        }
    }
}
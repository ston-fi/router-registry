import "@stdlib/tvm-dicts";

import "../../common/interfaces";
import "../../common/params";
import "../../common/errors";

import "../storage";
import "../actions";

fun addRouter(senderAddress: address, data: AddRouterMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.senderIsAdmin(storage.admin);
    asserts.minMsgValue();

    // Extract hash part from address to use as dictionary key
    var (routerWc, routerHash) = data.router.getWorkchainAndHash();
    asserts.basechainWc(routerWc);

    // TODO: can we conviniently store original description slice from message?
    storage.routers.uDictSetBuilder(ROUTER_DICT_KEY_BITS, routerHash, beginCell().storeAny(data.description));

    storage.save();

    registryActions.reserveAndSendExcess(senderAddress, data.queryId);
}

fun removeRouter(senderAddress: address, data: RemoveRouterMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.senderIsAdmin(storage.admin);
    asserts.minMsgValue();

    var (routerWc, routerHash) = data.router.getWorkchainAndHash();
    asserts.basechainWc(routerWc);
    
    var deleted = storage.routers.uDictDelete(ROUTER_DICT_KEY_BITS, routerHash);
    assert(deleted, ERROR_ROUTER_NOT_FOUND);
    
    storage.save();

    registryActions.reserveAndSendExcess(senderAddress, data.queryId);
}

fun addRouterBatch(senderAddress: address, data: AddRouterBatchMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.senderIsAdmin(storage.admin);
    asserts.minBatchMsgValue();

    // Iterate through the batch dictionary and add each router
    var (routerHash, routerValue, found) = data.routers.uDictGetFirst(ROUTER_DICT_KEY_BITS);
    
    while (found) {
        storage.routers.uDictSet(ROUTER_DICT_KEY_BITS, routerHash!!, routerValue!!);
        (routerHash, routerValue, found) = data.routers.uDictGetNext(ROUTER_DICT_KEY_BITS, routerHash!!);
    }
    
    storage.save();

    registryActions.reserveAndSendExcess(senderAddress, data.queryId);
}

fun removeRouterBatch(senderAddress: address, data: RemoveRouterBatchMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.senderIsAdmin(storage.admin);
    asserts.minBatchMsgValue();

    // Iterate through the batch dictionary and remove each router
    var (routerHash, routerValue, found) = data.routers.uDictGetFirst(ROUTER_DICT_KEY_BITS);
    
    while (found) {
        storage.routers.uDictDelete(ROUTER_DICT_KEY_BITS, routerHash!!);
        (routerHash, routerValue, found) = data.routers.uDictGetNext(ROUTER_DICT_KEY_BITS, routerHash!!);
    }

    storage.save();

    registryActions.reserveAndSendExcess(senderAddress, data.queryId);
}

fun setRouters(senderAddress: address, data: SetRoutersMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.senderIsAdmin(storage.admin);
    asserts.minBatchMsgValue();

    // Simply replace the entire routers dictionary
    storage.routers = data.routers;
    storage.save();

    registryActions.reserveAndSendExcess(senderAddress, data.queryId);
}

fun giveOwnership(senderAddress: address, data: GiveOwnershipMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.senderIsAdmin(storage.admin);
    asserts.minMsgValue();

    asserts.basechainAddress(data.nextAdmin);

    storage.nextAdmin = data.nextAdmin;
    storage.save();

    registryActions.reserveAndSendExcess(senderAddress, data.queryId);
}

fun setCodeHandler(senderAddress: address, data: SetCodeMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.senderIsAdmin(storage.admin);
    asserts.minMsgValue();

    contract.setCodePostponed(data.code);
    registryActions.reserveAndSendExcess(senderAddress, data.queryId);
}
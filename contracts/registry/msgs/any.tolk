import "@stdlib/tvm-dicts";

import "../../common/errors";
import "../../common/params";
import "../../common/interfaces";

import "../storage";
import "../actions";

@inline
fun validateRouter(data: ValidateRouterMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.minMsgValue();

    var (routerWc, routerHash) = data.router.getWorkchainAndHash();
    assert(routerWc == 0, ERROR_INVALID_WORKCHAIN);

    var (detailsSlice, found) = storage.routers.uDictGet(ROUTER_DICT_KEY_BITS, routerHash);
    assert(found, ERROR_ROUTER_NOT_FOUND);

    var response = createMessage({
        dest: data.response,
        value: 0,
        bounce: false,
        body: RouterValidatedMessage{
            queryId: data.queryId,
            router: data.router,
            // TODO: can we store detailsSlice directly as slice instead converting to RouterDescription?
            details: RouterDescription.fromSlice(detailsSlice!!),
            forwardPayload: data.forwardPayload
        }
    });

    registryActions.reserve();
    return response.send(SEND_MODE_CARRY_ALL_BALANCE);
}

@inline
fun getAllRouters(data: GetAllRoutersMessage): void {
    var storage = lazy RegistryStorage.load();
    asserts.minMsgValue();

    var response = createMessage({
        dest: data.response,
        value: 0,
        bounce: false,
        body: AllRoutersMessage{
            queryId: data.queryId,
            routers: storage.routers,
            forwardPayload: data.forwardPayload
        }
    });

    registryActions.reserve();
    return response.send(SEND_MODE_CARRY_ALL_BALANCE);
}

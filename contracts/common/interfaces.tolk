struct RouterVersion {
    version_major: uint8;
    version_minor: uint8;
    version_development: bits256;
}

struct RouterDescription {
    router_type: uint32;
    router_id: uint64;
    version: RouterVersion;
}

// ADMIN CALLS:

struct (0x8fcafedc) AddRouterMessage {
    queryId: uint64;
    router: address;
    description: RouterDescription;
}

struct (0xbd7d4010) RemoveRouterMessage {
    queryId: uint64;
    router: address;
}

struct (0x378494a8) AddRouterBatchMessage {
    queryId: uint64;
    routers: dict;
}

struct (0x4fab8d19) RemoveRouterBatchMessage {
    queryId: uint64;
    routers: dict;
}

struct (0x6b2e3c4d) SetRoutersMessage {
    queryId: uint64;
    routers: dict;
}

struct (0x9c7b2f83) GiveOwnershipMessage {
    queryId: uint64;
    nextAdmin: address;
}

struct (0x8ce119a8) SetCodeMessage {
    queryId: uint64;
    code: cell;
}

struct (0x3e4a5d92) TakeOwnershipMessage {
    queryId: uint64;
}

// PUBLIC MESSAGES:

struct (0x4284435c) ValidateRouterMessage {
    queryId: uint64;
    router: address;
    response: address;
    forwardPayload: cell?;
}

struct (0x0fe62da7) RouterValidatedMessage {
    queryId: uint64;
    router: address;
    details: RouterDescription;
    forwardPayload: cell?;
}

struct (0x2f8d1e5a) GetAllRoutersMessage {
    queryId: uint64;
    response: address;
    forwardPayload: cell?;
}

struct (0x8c9a3b7d) AllRoutersMessage {
    queryId: uint64;
    routers: dict;
    forwardPayload: cell?;
}


// REGISTRY KNOWN INTERNAL MESSAGES:

type RegistryInternalMessage = 
    ValidateRouterMessage
    | GetAllRoutersMessage
    | AddRouterMessage 
    | RemoveRouterMessage 
    | AddRouterBatchMessage 
    | RemoveRouterBatchMessage
    | SetRoutersMessage
    | GiveOwnershipMessage 
    | SetCodeMessage
    | TakeOwnershipMessage;

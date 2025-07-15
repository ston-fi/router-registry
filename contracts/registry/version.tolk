struct ContractVersion {
    major: uint8;
    minor: uint8;
    development: slice;
}

get fun getVersion(): ContractVersion {
    return ContractVersion {
        major: 0,
        minor: 1,
        development: "release",
    }
}
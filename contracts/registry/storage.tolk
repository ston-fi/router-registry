struct RegistryStorage {
    admin: address;
    nextAdmin: address;
    routers: dict;
}

fun RegistryStorage.load(): RegistryStorage {
    return RegistryStorage.fromCell(contract.getData());
}

fun RegistryStorage.save(self) {
    contract.setData(self.toCell())
}

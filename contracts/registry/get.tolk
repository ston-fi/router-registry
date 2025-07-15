import "../common/interfaces.tolk";
import "./storage.tolk";

get fun getRegistryData(): RegistryStorage {
    return RegistryStorage.load();
}
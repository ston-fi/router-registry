import "../../common/params";
import "../../common/errors";
import "../../common/interfaces";
import "../../common/utils";
import "../storage";

fun takeOwnership(senderAddress: address, data: TakeOwnershipMessage): void {
    var storage = lazy RegistryStorage.load();
    
    // Check that sender is the nextAdmin
    assert(senderAddress == storage.nextAdmin, ERROR_NOT_NEXT_ADMIN);
    
    // Transfer ownership
    storage.admin = storage.nextAdmin;
    storage.nextAdmin = HOLE_ADDRESS;
    
    storage.save();

    sendExcessMessage(senderAddress, data.queryId);
}
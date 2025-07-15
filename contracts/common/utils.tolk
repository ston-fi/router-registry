import "@stdlib/gas-payments";

fun getMsgValue(): int asm "INCOMINGVALUE FIRST";

fun getMsgSender(): address asm "INMSG_SRC";

struct (0xd53276db) ExcessMessage {
    queryId: uint64;
}

fun sendExcessMessage(dest: address, queryId: uint64, value: int = ton("0"), mode: int = SEND_MODE_CARRY_ALL_REMAINING_MESSAGE_VALUE) {
    val msg = createMessage({
        bounce: true,
        value, 
        dest,
        body: ExcessMessage{ queryId },
    });
    return msg.send(mode);
}

fun reserveMaxBalance(_balance: int) {
    reserveToncoinsOnBalance(
        max((contract.getOriginalBalance() + contract.getStoragePaidPayment()) - getMsgValue(), 
            _balance
        ), RESERVE_MODE_EXACT_AMOUNT
    );
}

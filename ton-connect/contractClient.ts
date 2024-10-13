import { Address, beginCell, toNano } from '@ton/ton';



export async function purchaseForTon() {
    var body = beginCell()
        .storeUint(1, 32)
        .storeUint(0, 64)
    .endCell()

    const payload = Buffer.from(body.toBoc()).toString("base64");
    return { payload };
}


export function purchaseForJetton(args: {
    amount: bigint; // decimal usdt = 6, jetton = 9
    destinationAddress: Address;
    responsAddress: Address;
}) {
    var body = beginCell()
        .storeUint(0xf8a7ea5, 32)
        .storeUint(0, 64)
        .storeCoins(args.amount)
        .storeAddress(args.destinationAddress)
        .storeAddress(args.responsAddress)
        .storeBit(0)
        .storeCoins(toNano("0.2")) // минимум для успешной транзакции
        .storeBit(0)
    .endCell();

    const payload = Buffer.from(body.toBoc()).toString("base64");

    return { payload };
}


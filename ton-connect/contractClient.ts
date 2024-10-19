import { Address, beginCell, toNano, TonClient, TupleBuilder } from '@ton/ton';

const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: "a49cf7ff14b615806caa6494d6af3ad683ceeaeb30a6fd865a20d4eaac2b1c75" // you can get an api key from @tonapibot bot in Telegram
});


export async function purchaseForTon() { // начни с этого 
    var msgBody = beginCell()
        .storeUint(1, 32)
        .storeUint(0, 64)
    .endCell().toBoc().toString("base64");

    return { msgBody };
}

export async function getUserWallet(args: {
    client: TonClient;
    jettonMasterAddress: Address;
    walletAddress: Address;
}) {
    const tuple = new TupleBuilder();
    tuple.writeAddress(args.walletAddress);
    const response = await args.client.runMethod(args.jettonMasterAddress, "get_wallet_address", tuple.build());
    
    const jettonWallet = response.stack.readAddress();
    console.log(jettonWallet)

    return { jettonWallet }
}


export function purchaseForJetton(args: {
    amount: bigint; // decimal usdt = 6, jetton = 9
    destinationAddress: Address;
    responsAddress: Address;
}) {
    var msgBody = beginCell()
        .storeUint(0xf8a7ea5, 32)
        .storeUint(0, 64)
        .storeCoins(args.amount)
        .storeAddress(args.destinationAddress)
        .storeAddress(args.responsAddress)
        .storeBit(0)
        .storeCoins(toNano("0.2")) // минимум для успешной транзакции
        .storeBit(0)
    .endCell().toBoc().toString("base64");

    return { msgBody };
}

getUserWallet({
    client: client,
    jettonMasterAddress: Address.parse("kQCmdQyNeqcrPHxyqZmw4JTrbyGzrrKLnPU5iG7oBntiwsX3"),
    walletAddress: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO")
})

import { toNano, Address, Dictionary, TonClient, beginCell } from '@ton/ton';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';

const client = new TonClient({
    endpoint: "https://testnet.toncenter.com/api/v2/jsonRPC",
    apiKey: "b2f5b5d58f553b4f9f29e6a3ae7def64682b1c6c8ef2a6eb0858538027c67122" // you can get an api key from @tonapibot bot in Telegram
});


type AddrList = Dictionary<Address, Boolean>;

export async function run(provider: NetworkProvider) {

    let whitelist: AddrList = Dictionary.empty();
        whitelist.set(Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"), false);
        whitelist.set(Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"), false);


    const nftCollection = provider.open(NftCollection.createFromConfig({
        owner_address: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"),
        buyer_limit_silver: 20,
        ton_price_silver: toNano("1"),
        jetton_price_gold: BigInt(5 * 10 ** 6),
        nft_item_code: await compile("NftItem"),
        whitelist: whitelist,
        content_collection: "https://raw.githubusercontent.com/RUGPOLICE/NFT/refs/heads/main/Metadata_Collection.json",
        content_item: "https://raw.githubusercontent.com/RUGPOLICE/NFT/refs/heads/main/",
        content_item_gold: "Metadata_DEP_NFT.json",
        content_item_silver: "Metadata_Gen_NFT.json",
        royalty_params_data: {
            royaltyAddress: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"),
            royaltyBase: 100,
            royaltyFactor: 1
        }
    }, await compile('NftCollection')));

    const res = await client.runMethod(Address.parse("kQCmdQyNeqcrPHxyqZmw4JTrbyGzrrKLnPU5iG7oBntiwsX3"), "get_wallet_address", [{
        type: 'slice',
        cell: beginCell().storeAddress(nftCollection.address).endCell()
    }])

    // добавить функцию для вычеслениия адресса 
    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'), res.stack.readAddress());

    await provider.waitForDeploy(nftCollection.address);
}

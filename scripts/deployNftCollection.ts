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

    const nftCollection = provider.open(NftCollection.createFromConfig({
        owner_address: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"),
        buyer_limit_silver: 1090,
        ton_price_silver: toNano("0.2"),
        jetton_price_gold: toNano("0.4"),
        nft_item_code: await compile("NftItem"),
        whitelist: whitelist,
        content_collection: "https://s.getgems.io/nft/c/65f1941c8d4e725b494dd4b2/edit/meta-1718748682486.json",
        content_item: "https://s.getgems.io/nft/c/65f1941c8d4e725b494dd4b2/",
        content_item_gold: "7/meta.json",
        content_item_silver: "2000003/meta.json",
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

    // run methods on `nftCollection`
}

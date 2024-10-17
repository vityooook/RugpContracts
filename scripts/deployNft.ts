import { toNano, Address, Dictionary, TonClient, beginCell } from '@ton/ton';
import { NftCollection } from '../wrappers/NftCollection';
import { compile, NetworkProvider } from '@ton/blueprint';


export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromAddress(Address.parse("kQD3_-phF79hrOM51GZWEpYBwzsnu7iJrdGwrqh9TjwGDDa0")))

    // добавить функцию для вычеслениия адресса 
    await nftCollection.sendDeployNft(provider.sender(), {
        itemIndex: 2,
        itemOwnerAddress: Address.parse("0QAFyfwn13L8oi30vdWBV41zFaHzCa6mJpVEjCeaDUAqmGcO"),
        itemContent: "Metadata_OFF_NFT.json"
    })


    // run methods on `nftCollection`
}

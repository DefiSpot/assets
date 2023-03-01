import axios from 'axios';
import fs from 'fs';
import tokensWithoutImages from './tokensWithoutImages.json' assert { type: 'json' };
import tokensUrlMap from './tokensUrlMap.json' assert { type: 'json' };

const imageUrlRepo = '';

const meta = await axios.get(imageUrlRepo);

const tokens = meta.data.tokens;

const dirPath = './tokenImages/';

await getImages(0, 100);

async function getImages(start, end) {

    let tokensSlice = tokens.slice(start,end);

    if(end > tokens.length) {
        return;
    }
    
    await Promise.all(tokensSlice.map(async token => {
        const blockchainDir = dirPath + token.blockchain

        if(!fs.existsSync(blockchainDir)) {
            fs.mkdirSync(blockchainDir);
        }

        const ticker =  getTicker(token)
            
        await axios({
            method: 'get',
            url: token.image,
            responseType: 'stream'
        })
        .then(function (response) {
            const fileType = response.headers['content-type'];
            let fileExtension = "." + fileType.split('/')[1]

            if(fileExtension.includes('octet')) {
                fileExtension = '.png';
            }
            else if(fileExtension.includes("+")) {
                fileExtension = '.svg';
            }

            const filePath = blockchainDir + '/' + ticker.replace('/', '') + fileExtension

            if(!fs.existsSync(filePath)) {
                response.data.pipe(fs.createWriteStream(filePath));
            }
                    
            if(!tokensUrlMap.hasOwnProperty(token.blockchain)) {
                tokensUrlMap[token.blockchain] = {};
            }

            if(!tokensUrlMap[token.blockchain].hasOwnProperty(ticker)) {
                tokensUrlMap[token.blockchain][ticker] = 'https://github.com/DefiSpot/assets/blob/main' + filePath.substring(1)
            }

        })
        .catch(function (error) {
            if(!tokensWithoutImages.hasOwnProperty(token.blockchain)) {
                tokensWithoutImages[token.blockchain] = [];
            }

            if(!tokensWithoutImages[token.blockchain].includes(ticker)) {
                tokensWithoutImages[token.blockchain].push(ticker)
            }

            if(!error.message.includes('404')) {
                console.log(console.log('error', error.message))
            }
        })
    }))
    
    await new Promise(resolve => setTimeout(()=>{getImages(start + 100, end + 100)}, "5000"));
}
    
exportToJson('./tokensWithoutImages.json', tokensWithoutImages)
exportToJson('./tokensUrlMap.json', tokensUrlMap)

console.log('done')

function getTicker(token) {
    return token.symbol + (token.address ? '-' + token.address : '')
}

function exportToJson(path, data) {
     fs.writeFile(path, JSON.stringify(data), (err) => {
            if (err) {
                console.log('Error writing file:', err);
                console.log('path', path);
                console.log('data', data);
            } 
     });
}

